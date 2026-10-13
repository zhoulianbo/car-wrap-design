/** Real local D1 + KV integration checks in isolated storage; no remote writes. */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';

const persistPath = mkdtempSync(join(tmpdir(), 'car-wrap-config-kv-'));
const proxy = await getPlatformProxy<{
  DB: {
    prepare(query: string): any;
    batch(statements: any[]): Promise<any[]>;
  };
  CONFIG_KV: {
    get(
      key: string,
      options: { type: 'text'; cacheTtl: number }
    ): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}>({ configPath: 'wrangler.jsonc', persist: { path: persistPath } });

process.env.DATABASE_PROVIDER = 'd1';
process.env.CONFIG_ENCRYPTION_KEY = 'isolated-config-test-encryption-key';
let dbQueries = 0;
let kvReads = 0;
let failPublish = false;
const bindings = {
  DB: {
    prepare(query: string) {
      dbQueries++;
      return proxy.env.DB.prepare(query);
    },
    batch(statements: any[]) {
      return proxy.env.DB.batch(statements);
    },
  },
  CONFIG_KV: {
    get(key: string, options: { type: 'text'; cacheTtl: number }) {
      kvReads++;
      return proxy.env.CONFIG_KV.get(key, options);
    },
    put(key: string, value: string) {
      if (failPublish) return Promise.reject(new Error('simulated KV failure'));
      return proxy.env.CONFIG_KV.put(key, value);
    },
  },
};
(globalThis as any).__CF_ENV__ = bindings;

try {
  await proxy.env.DB.prepare(
    'CREATE TABLE config (name TEXT UNIQUE NOT NULL, value TEXT)'
  ).run();
  const settings = await import('../src/modules/config/service');
  await assert.rejects(settings.getAllConfigs(), /snapshot missing/);
  assert.equal(dbQueries, 0, 'missing KV must not fall back to D1');

  await settings.saveConfigs({
    app_name: 'KV Test',
    grsai_api_key: 'test-provider-secret',
    auth_secret: 'must-be-ignored',
  });
  const rawKv = await proxy.env.CONFIG_KV.get(settings.CONFIG_KV_KEY, {
    type: 'text',
    cacheTtl: 60,
  });
  const raw = JSON.parse(rawKv!);
  assert.match(raw.grsai_api_key, /^enc:v1:/);
  assert.equal(raw.auth_secret, undefined);
  const dbSecret = await proxy.env.DB.prepare(
    "SELECT value FROM config WHERE name='grsai_api_key'"
  ).first();
  assert.match(dbSecret.value, /^enc:v1:/);

  const beforeRuntime = dbQueries;
  for (let i = 0; i < 3; i++) {
    const runtime = await settings.getAllConfigs();
    assert.equal(runtime.app_name, 'KV Test');
    assert.equal(runtime.grsai_api_key, 'test-provider-secret');
  }
  assert.equal(
    dbQueries,
    beforeRuntime,
    'runtime KV reads must perform zero D1 queries'
  );

  await proxy.env.DB.prepare(
    "UPDATE config SET value='DB changed' WHERE name='app_name'"
  ).run();
  const beforeAdminKv = kvReads;
  const admin = await settings.getAdminConfigs();
  assert.equal(admin.app_name, 'DB changed', 'admin reads fresh DB values');
  assert.ok(settings.isMaskedConfigValue(admin.grsai_api_key));
  assert.equal(kvReads, beforeAdminKv, 'admin display does not read KV');
  assert.equal((await settings.getAllConfigs()).app_name, 'KV Test');

  failPublish = true;
  await assert.rejects(
    settings.saveConfigs({ app_name: 'Saved despite KV failure' }),
    /KV sync failed/
  );
  assert.equal(
    (await settings.getAdminConfigs()).app_name,
    'Saved despite KV failure'
  );
  failPublish = false;
  await settings.saveConfigs({ grsai_api_key: admin.grsai_api_key });
  assert.equal(
    (await settings.getAllConfigs()).app_name,
    'Saved despite KV failure',
    'masked-only retry republishes snapshot'
  );

  await settings.replaceCustomConfigs([
    { key: 'custom.example', value: 'keep' },
    { key: 'custom.api_key', value: 'custom-secret' },
  ]);
  assert.equal((await settings.getAllConfigs())['custom.example'], 'keep');
  assert.ok(
    settings.isMaskedConfigValue(
      (await settings.getCustomConfigs()).find(
        (row) => row.key === 'custom.api_key'
      )!.value
    )
  );
  await settings.replaceCustomConfigs([
    { key: 'custom.example', value: 'updated' },
  ]);
  assert.equal(
    (await settings.getAllConfigs())['custom.api_key'],
    undefined,
    'deleted custom config is removed from KV'
  );
  await assert.rejects(
    settings.replaceCustomConfigs([{ key: 'app_name', value: 'invalid' }]),
    /Reserved key/
  );

  await settings.saveConfigs(
    Object.fromEntries(
      Array.from({ length: 120 }, (_, i) => [`test.${i}`, String(i)])
    )
  );
  assert.equal(
    (await settings.getAllConfigs())['test.119'],
    '119',
    'D1 batch does not exceed bound-parameter limits'
  );

  const publicConfigs = settings.filterPublicConfigs(
    await settings.getAllConfigs(),
    ['app_name', 'grsai_api_key', 'auth_secret']
  );
  assert.deepEqual(Object.keys(publicConfigs), ['app_name']);

  await proxy.env.CONFIG_KV.put(settings.CONFIG_KV_KEY, '{"bad":42}');
  await assert.rejects(settings.getAllConfigs(), /Invalid config KV/);
  delete (bindings as any).CONFIG_KV;
  await assert.rejects(settings.getAllConfigs(), /binding/);
  console.log(
    'PASS: D1 batch saves, encrypted KV, zero runtime D1 queries, fresh admin reads, masking, custom deletion, retry, and invalid/missing KV.'
  );
} finally {
  await proxy.dispose();
  rmSync(persistPath, { recursive: true, force: true });
  delete (globalThis as any).__CF_ENV__;
}
