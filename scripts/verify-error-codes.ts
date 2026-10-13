/** Isolated transport/i18n checks. No real users, storage, or paid AI requests. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ApiError, apiGet, apiGetBlob, apiUpload } from '../src/lib/api-client';
import {
  ERROR_CODES,
  generationErrorCode,
  resolveErrorCode,
} from '../src/lib/error-codes';
import { getErrorMessage } from '../src/lib/error-message';
import { enforceMinIntervalRateLimit } from '../src/lib/rate-limit';
import { respData, respErr, respOk } from '../src/lib/resp';
import { getLocale, overwriteGetLocale } from '../src/paraglide/runtime.js';

const en = JSON.parse(readFileSync('messages/en/common.json', 'utf8')).common
  .error_code;
const zh = JSON.parse(readFileSync('messages/zh/common.json', 'utf8')).common
  .error_code;
assert.deepEqual(Object.keys(en).sort(), Object.keys(ERROR_CODES).sort());
assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
const catalogs = Object.fromEntries(
  ['en', 'zh', 'de', 'it', 'ko'].map((locale) => [
    locale,
    JSON.parse(readFileSync(`messages/${locale}/common.json`, 'utf8')).common
      .error_code,
  ])
);
const originalGetLocale = getLocale;
const originalFetch = globalThis.fetch;
const originalXhr = globalThis.XMLHttpRequest;
const expectCode =
  (code: keyof typeof ERROR_CODES, locale: 'en' | 'zh') => (error: unknown) => {
    assert(error instanceof ApiError);
    assert.equal(error.errorCode, code);
    assert.equal(error.message, (locale === 'en' ? en : zh)[code]);
    return true;
  };
try {
  for (const locale of ['en', 'zh', 'de', 'it', 'ko'] as const) {
    assert.deepEqual(
      Object.keys(catalogs[locale]).sort(),
      Object.keys(en).sort()
    );
    overwriteGetLocale(() => locale);
    assert.equal(
      getErrorMessage('output_moderation'),
      catalogs[locale].AI_OUTPUT_MODERATED
    );
  }
  assert.equal(generationErrorCode('output_moderation'), 'AI_OUTPUT_MODERATED');
  assert.equal(generationErrorCode('unknown_failure'), 'AI_GENERATION_FAILED');
  for (const locale of ['en', 'zh'] as const) {
    overwriteGetLocale(() => locale);
    for (const code of Object.keys(en))
      assert.equal(getErrorMessage(code), (locale === 'en' ? en : zh)[code]);
    for (const [message, code] of [
      ['Unauthorized', 'UNAUTHORIZED'],
      ['Insufficient credits', 'INSUFFICIENT_CREDITS'],
      ['Wrap changed in another tab', 'CONFLICT'],
      ['SQL private-detail token=secret', 'REQUEST_FAILED'],
    ] as const) {
      const body = await respErr(message).json();
      assert.equal(body.errorCode, code);
      assert.equal(body.code, -1);
      assert(!body.message.includes('secret'));
      globalThis.fetch = async () => Response.json(body);
      await assert.rejects(apiGet('/fixture'), expectCode(code, locale));
    }
    // Legacy envelopes and stale sessions are still correctly recognized.
    globalThis.fetch = async () =>
      Response.json({ code: -1, message: 'Insufficient credits' });
    await assert.rejects(
      apiGet('/fixture'),
      expectCode('INSUFFICIENT_CREDITS', locale)
    );
    globalThis.fetch = async () =>
      new Response('login required', { status: 401 });
    await assert.rejects(
      apiGetBlob('/fixture'),
      expectCode('UNAUTHORIZED', locale)
    );
    globalThis.fetch = async () =>
      new Response('<html>busy</html>', { status: 503 });
    await assert.rejects(
      apiGet('/fixture'),
      expectCode('SERVICE_UNAVAILABLE', locale)
    );
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    await assert.rejects(
      apiGet('/fixture'),
      expectCode('NETWORK_ERROR', locale)
    );
    globalThis.fetch = async () =>
      Response.json({ code: 0, data: 'not-success' }, { status: 403 });
    await assert.rejects(apiGet('/fixture'), expectCode('FORBIDDEN', locale));
    globalThis.fetch = async () => respData({ value: 42 });
    assert.deepEqual(await apiGet('/fixture'), { value: 42 });
    globalThis.fetch = async () => respOk();
    assert.equal(await apiGet('/fixture'), undefined);
    globalThis.fetch = async () =>
      new Response('image', { headers: { 'Content-Type': 'image/png' } });
    assert.equal(await (await apiGetBlob('/fixture')).text(), 'image');
    assert.equal(
      getErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD' }),
      (locale === 'en' ? en : zh).INVALID_CREDENTIALS
    );
    // Upload errors must follow the same translation and status handling.
    class XhrFixture {
      status = 401;
      statusText = '';
      response = null;
      responseType = '';
      upload = {};
      onload?: () => void;
      open() {}
      send() {
        this.onload?.();
      }
    }
    globalThis.XMLHttpRequest = XhrFixture as unknown as typeof XMLHttpRequest;
    await assert.rejects(
      apiUpload('/fixture', new FormData()),
      expectCode('UNAUTHORIZED', locale)
    );
  }
  assert.equal(
    generationErrorCode('Insufficient credits'),
    'AI_GENERATION_FAILED'
  );
  assert.equal(generationErrorCode('Unauthorized'), 'AI_GENERATION_FAILED');
  assert.equal(generationErrorCode('upstream status 429'), 'AI_RATE_LIMITED');
  assert.equal(generationErrorCode('provider timed out'), 'AI_TIMEOUT');
  assert.equal(
    generationErrorCode('content_policy_violation'),
    'AI_CONTENT_BLOCKED'
  );
  assert.equal(
    resolveErrorCode(new ApiError(-1, 'Insufficient credits')),
    'INSUFFICIENT_CREDITS'
  );
  assert.equal(
    resolveErrorCode(new ApiError(-1, 'Wrap changed in another tab')),
    'CONFLICT'
  );
  const request = new Request('https://fixture.invalid/rate-limit');
  assert.equal(
    enforceMinIntervalRateLimit(request, {
      intervalMs: 10000,
      keyPrefix: 'error-code-check',
    }),
    null
  );
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 10000,
    keyPrefix: 'error-code-check',
  })!;
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).errorCode, 'RATE_LIMITED');
  assert(limited.headers.get('retry-after'));
  console.log(
    'Passed: bilingual error catalogs, JSON/blob/upload transport, auth, credits, conflict, provider classification, rate limiting, and success responses.'
  );
} finally {
  globalThis.fetch = originalFetch;
  globalThis.XMLHttpRequest = originalXhr;
  overwriteGetLocale(originalGetLocale);
}
