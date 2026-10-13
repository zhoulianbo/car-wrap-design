/** Isolated API checks with temporary SQLite and mocked HTTP. No external requests. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, generateKeyPairSync, verify } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';

const directory = mkdtempSync(join(tmpdir(), 'prompt-safety-'));
process.env.DATABASE_URL = `file:${join(directory, 'test.db')}`;
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DB_SINGLETON_ENABLED = 'true';
process.env.AUTH_SECRET = 'isolated-prompt-safety-fixture-secret-only';
const database = createClient({ url: process.env.DATABASE_URL });
await database.executeMultiple(
  execFileSync(
    'pnpm',
    [
      'exec',
      'drizzle-kit',
      'export',
      '--dialect',
      'sqlite',
      '--schema',
      'src/config/db/schema.sqlite.ts',
    ],
    { encoding: 'utf8' }
  )
);

const { getAuth } = await import('../src/core/auth');
const { db } = await import('../src/core/db');
const { user, aiGeneration, aiTask } = await import('../src/config/db/schema');
const { saveConfigs } = await import('../src/modules/config/service');
const { grant, getBalance, getFrozenBalance } =
  await import('../src/modules/credits/service');
const { StorageManager } = await import('../src/core/storage');
const { Route } = await import('../src/routes/api/ai-generations/index');
const { requestWrapGeneration } =
  await import('../src/lib/wrap-generation-client');
const { m } = await import('../src/paraglide/messages.js');
const { locales, overwriteGetLocale } =
  await import('../src/paraglide/runtime.js');
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const credentials = {
  waffo_merchant_id: 'MER_1234567890123456789012',
  waffo_private_key: privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString(),
};
await saveConfigs({
  ...credentials,
  // Safety checks must run even when Waffo checkout is disabled.
  waffo_enabled: 'false',
  wrap_generation_provider: 'grsai',
  grsai_api_key: 'fixture-only',
  grsai_base_url: 'https://fixture.invalid',
  app_url: 'https://fixture.invalid',
  assets_url: 'https://fixture.invalid',
  r2_access_key: 'fixture-only',
  r2_secret_key: 'fixture-only',
  r2_bucket_name: 'fixture-only',
});
await db().insert(user).values({
  id: 'owner',
  name: 'Fixture',
  email: 'owner@fixture.invalid',
});
await grant({ userId: 'owner', credits: 1000 });
const auth = getAuth();
const originalSession = auth.api.getSession;
auth.api.getSession = async () => ({ user: { id: 'owner' } });
const post = Route.options.server!.handlers as {
  POST: (context: { request: Request }) => Promise<Response>;
};
const originalFetch = globalThis.fetch;
const originalExists = StorageManager.prototype.exists;
const originalPublicUrl = StorageManager.prototype.getPublicUrl;
// Existing prepared guide fixture keeps these safety checks free of R2 calls.
StorageManager.prototype.exists = async () => true;
StorageManager.prototype.getPublicUrl = ({ key }) =>
  `https://fixture.invalid/${key}`;
let locale: (typeof locales)[number] = 'en';
overwriteGetLocale(() => locale);
let safetyResponse = () => Response.json({ data: { action: 'allow' } });
let safetyCalls = 0;
let providerCalls = 0;
let submittedPrompt = '';
globalThis.fetch = async (url, init) => {
  if (String(url) === 'https://fixture.invalid/templates/tesla/cybertruck.png')
    return new Response(
      readFileSync('public/imgs/templates/tesla/cybertruck.png')
    );
  if (
    String(url) === 'https://api.waffo.ai/v1/actions/verification/scan-prompt'
  ) {
    safetyCalls++;
    assert.equal(init?.method, 'POST');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('X-Merchant-Id'), credentials.waffo_merchant_id);
    const body = String(init?.body);
    const canonical = [
      'POST',
      '/v1/actions/verification/scan-prompt',
      headers.get('X-Timestamp'),
      createHash('sha256').update(body).digest('base64'),
    ].join('\n');
    assert.ok(
      verify(
        'RSA-SHA256',
        Buffer.from(canonical),
        publicKey,
        Buffer.from(headers.get('X-Signature')!, 'base64')
      )
    );
    const payload = JSON.parse(body);
    assert.equal(payload.locale, locale === 'zh' ? 'zh' : 'en');
    assert.equal(payload.semantic, 'enforce');
    submittedPrompt = payload.prompt;
    assert.ok(init?.signal, 'The safety request must have a timeout');
    return safetyResponse();
  }
  if (String(url) === '/api/ai-generations') {
    return post.POST({
      request: new Request('https://fixture.invalid/api/ai-generations', init),
    });
  }
  assert.equal(String(url), 'https://fixture.invalid/v1/draw/completions');
  providerCalls++;
  return Response.json({ code: 0, data: { id: `provider-${providerCalls}` } });
};
const input = {
  vehicleSlug: 'cybertruck' as const,
  prompt: '  Blue geometric wrap  ',
  colors: [],
  openToGallery: true,
};

try {
  for (const language of locales) {
    locale = language;
    safetyResponse = () => Response.json({ data: { action: 'block' } });
    await assert.rejects(requestWrapGeneration(input), {
      message: m['common.error_code.AI_CONTENT_BLOCKED']({}, { locale }),
      errorCode: 'AI_CONTENT_BLOCKED',
    });
    assert.equal(submittedPrompt, input.prompt.trim());
    assert.equal(providerCalls, 0);
    assert.equal(await getBalance('owner'), 1000);
    assert.equal(await getFrozenBalance('owner'), 0);
    assert.equal((await db().select().from(aiTask)).length, 0);
    assert.equal((await db().select().from(aiGeneration)).length, 0);
  }

  // The API also scans optional free-form style text, including direct callers.
  const blocked = await post.POST({
    request: new Request('https://fixture.invalid/api/ai-generations', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        mode: 'text-to-image',
        style: 'racing stripes',
        locale,
        idempotencyKey: 'style-safety-check',
      }),
    }),
  });
  assert.equal(blocked.status, 422);
  assert.equal(submittedPrompt, 'Blue geometric wrap\nracing stripes');

  const outcomes = [
    () => Response.json({ data: { action: 'allow' } }),
    () =>
      Response.json({
        data: { action: 'review', reasonCode: 'review_required' },
      }),
    () =>
      Response.json({
        data: { action: 'review', reasonCode: 'service_degraded' },
      }),
    () => Response.json({ data: { action: 'unexpected' } }),
    () => Response.json({}),
    () => new Response('invalid JSON'),
    () => Response.json({ errors: [{ message: 'private upstream details' }] }),
    () =>
      Response.json({ errors: [{ message: 'unauthorized' }] }, { status: 401 }),
    () => new Response('', { status: 429, headers: { 'Retry-After': '60' } }),
    () => new Response('', { status: 503 }),
    () => {
      throw new TypeError('Network error');
    },
    () => {
      throw new DOMException('Timed out', 'TimeoutError');
    },
  ];
  for (const response of outcomes) {
    safetyResponse = response;
    const before = providerCalls;
    const checks = safetyCalls;
    const created = await requestWrapGeneration(input);
    assert.equal(created.status, 'processing');
    assert.equal(providerCalls, before + 1, 'Non-block outcomes must generate');
    assert.equal(
      safetyCalls,
      checks + 1,
      'Exactly one safety request per submission'
    );
  }
  for (const privateKey of ['', 'invalid-key']) {
    await saveConfigs({ waffo_private_key: privateKey });
    const checks = safetyCalls;
    const before = providerCalls;
    await requestWrapGeneration(input);
    assert.equal(safetyCalls, checks);
    assert.equal(
      providerCalls,
      before + 1,
      'Configuration failures must also proceed'
    );
  }
  assert.equal(await getBalance('owner'), 1000 - providerCalls * 10);
  assert.equal(await getFrozenBalance('owner'), providerCalls * 10);
  console.log(
    'PASS: signed scan requests, shared client/API, all locale block messages and SDK locale fallback, no tasks or credit holds on block, style coverage, and all non-block/error outcomes continue. No external requests.'
  );
} finally {
  globalThis.fetch = originalFetch;
  StorageManager.prototype.exists = originalExists;
  StorageManager.prototype.getPublicUrl = originalPublicUrl;
  auth.api.getSession = originalSession;
  database.close();
}
