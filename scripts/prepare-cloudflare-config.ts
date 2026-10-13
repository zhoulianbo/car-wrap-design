/**
 * Prepare encrypted config imports without changing the source database.
 * Run: pnpm exec node --import tsx scripts/prepare-cloudflare-config.ts
 * Outputs are private, ignored files under .wrangler/bootstrap/ and .dev.vars.
 * Import commands are documented in docs/cloudflare-deployment.md.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@libsql/client';
import { unstable_readConfig } from 'wrangler';

import { loadEnvFiles } from '../src/lib/env';

loadEnvFiles();
const sourceEncryptionKey = process.env.CONFIG_ENCRYPTION_KEY;
const sourceUrl = process.env.DATABASE_URL || 'file:data/local.db';
if (!sourceUrl.startsWith('file:')) {
  throw new Error('This bootstrap expects the local SQLite test database.');
}
const worker = unstable_readConfig({ config: 'wrangler.jsonc' });
const outputDir = resolve('.wrangler/bootstrap');
mkdirSync(outputDir, { recursive: true, mode: 0o700 });
const secretsPath = resolve('.wrangler/production-secrets.json');
const secrets: Record<string, string> = existsSync(secretsPath)
  ? JSON.parse(readFileSync(secretsPath, 'utf8'))
  : {
      AUTH_SECRET: randomBytes(32).toString('base64'),
      CONFIG_ENCRYPTION_KEY:
        sourceEncryptionKey || randomBytes(32).toString('base64'),
    };
if (!secrets.AUTH_SECRET || !secrets.CONFIG_ENCRYPTION_KEY) {
  throw new Error(
    'Production secret file is incomplete; do not rotate its encryption key.'
  );
}

const { CONFIG_KV_KEY, isSecretConfigKey } =
  await import('../src/modules/config/service');
const { decryptSecret, encryptSecret } = await import('../src/lib/crypto');
const client = createClient({ url: sourceUrl });
try {
  const rows = (await client.execute('SELECT name, value FROM config')).rows;
  const stored: Record<string, string> = {};
  const protectedNames = new Set([
    'auth_secret',
    'database_url',
    'database_auth_token',
    'database_provider',
    'db_schema',
    'db_singleton_enabled',
    'db_max_connections',
  ]);
  for (const row of rows) {
    if (!row.name || row.value == null || protectedNames.has(String(row.name)))
      continue;
    // Decrypt using the source key before encrypting with the production key.
    process.env.CONFIG_ENCRYPTION_KEY = sourceEncryptionKey;
    if (!sourceEncryptionKey) delete process.env.CONFIG_ENCRYPTION_KEY;
    const plain = await decryptSecret(String(row.value));
    if (plain === null)
      throw new Error(`Cannot decrypt source setting: ${row.name}`);
    process.env.CONFIG_ENCRYPTION_KEY = secrets.CONFIG_ENCRYPTION_KEY;
    stored[String(row.name)] = isSecretConfigKey(String(row.name))
      ? await encryptSecret(plain)
      : plain;
  }
  stored.app_url = String(worker.vars.VITE_APP_URL);
  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const statements = Object.entries(stored).map(
    ([name, value]) =>
      `INSERT INTO config (name, value) VALUES (${quote(name)}, ${quote(value)}) ON CONFLICT(name) DO UPDATE SET value=excluded.value;`
  );
  writeFileSync(
    resolve(outputDir, 'config.sql'),
    statements.join('\n') + '\n',
    { mode: 0o600 }
  );
  writeFileSync(resolve(outputDir, 'config-kv.json'), JSON.stringify(stored), {
    mode: 0o600,
  });

  // Seed only the access-control dictionary, without test users or assignments.
  const databasePath = resolve(sourceUrl.slice('file:'.length));
  const rbacSql = ['role', 'permission', 'role_permission'].flatMap((table) =>
    execFileSync('sqlite3', [databasePath, `.dump ${table}`], {
      encoding: 'utf8',
    })
      .split('\n')
      .filter((line) => line.startsWith('INSERT INTO'))
      .map((line) => line.replace(/^INSERT INTO/, 'INSERT OR IGNORE INTO'))
  );
  writeFileSync(resolve(outputDir, 'rbac.sql'), rbacSql.join('\n') + '\n', {
    mode: 0o600,
  });
  writeFileSync(secretsPath, JSON.stringify(secrets, null, 2) + '\n', {
    mode: 0o600,
  });
  // Wrangler local preview needs the SAME encryption key as the imported rows.
  writeFileSync(
    '.dev.vars',
    Object.entries({
      ...secrets,
      AUTH_TRUSTED_ORIGINS: 'http://localhost:3100,http://127.0.0.1:3100',
    })
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join('\n') + '\n',
    { mode: 0o600 }
  );
  console.log(
    `Prepared ${Object.keys(stored).length} settings, KV key ${CONFIG_KV_KEY}, and ${rbacSql.length} RBAC records. Secret values were not printed.`
  );
} finally {
  client.close();
  if (sourceEncryptionKey)
    process.env.CONFIG_ENCRYPTION_KEY = sourceEncryptionKey;
  else delete process.env.CONFIG_ENCRYPTION_KEY;
}
