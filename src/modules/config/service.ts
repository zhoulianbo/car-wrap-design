import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { config } from '@/config/db/schema';
import { CONFIG_KV_PREFIX } from '@/config/kv';
import { decryptSecret, encryptSecret } from '@/lib/crypto';

import { getSettings } from './settings';

export type ConfigMap = Record<string, string>;

// In-memory cache
let cachedConfigs: ConfigMap | null = null;
let cacheTime = 0;
const CACHE_TTL = 86400_000; // 1 day

export const CONFIG_KV_KEY = `${CONFIG_KV_PREFIX}settings:v1`;
const CONFIG_KV_CACHE_TTL_SECONDS = 24 * 60 * 60; // 1 day; KV uses seconds.

type ConfigKv = {
  get(
    key: string,
    options: { type: 'text'; cacheTtl: number }
  ): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

function getConfigKv(): ConfigKv | undefined {
  const globals = globalThis as typeof globalThis & {
    __CF_ENV__?: { CONFIG_KV?: ConfigKv };
    __env__?: { CONFIG_KV?: ConfigKv };
  };
  const binding = (globals.__CF_ENV__ ?? globals.__env__)?.CONFIG_KV;
  if (!binding && envConfigs.database_provider === 'd1') {
    throw new Error('Config KV binding "CONFIG_KV" not found.');
  }
  if (binding && !process.env.CONFIG_ENCRYPTION_KEY) {
    throw new Error('CONFIG_ENCRYPTION_KEY is required for config KV.');
  }
  return binding;
}

async function decodeConfigs(stored: ConfigMap): Promise<ConfigMap> {
  const result: ConfigMap = {};
  for (const [name, value] of Object.entries(stored)) {
    if (PROTECTED_CONFIG_KEYS.has(name)) continue;
    const plain = await decryptSecret(value);
    if (plain === null) {
      console.warn(`[config] failed to decrypt "${name}", skipping`);
      continue;
    }
    result[name] = plain;
  }
  return result;
}

async function getStoredDbConfigs(): Promise<ConfigMap> {
  const rows = await db().select().from(config);
  return Object.fromEntries(
    rows
      .filter(
        (row: { name: string; value: string | null }) =>
          row.name && row.value != null && !PROTECTED_CONFIG_KEYS.has(row.name)
      )
      .map((row: { name: string; value: string }) => [row.name, row.value])
  );
}

/** Publish the authoritative DB snapshot; never include environment secrets. */
export async function syncConfigsToKv(): Promise<void> {
  cachedConfigs = null;
  cacheTime = 0;
  const kv = getConfigKv();
  if (!kv) return; // Local Node development keeps using the database.

  const stored = await getStoredDbConfigs();
  // Also encrypt legacy plaintext secrets before publishing them to KV.
  for (const [name, value] of Object.entries(stored)) {
    if (isSecretConfigKey(name)) stored[name] = await encryptSecret(value);
  }
  try {
    await kv.put(CONFIG_KV_KEY, JSON.stringify(stored));
  } catch {
    throw new Error(
      'Settings saved to database, but KV sync failed. Please save again.'
    );
  }
}

/**
 * Read directly from the database for the admin UI, without the runtime cache.
 */
export async function getDbConfigs(): Promise<ConfigMap> {
  if (!envConfigs.database_url && envConfigs.database_provider !== 'd1') {
    return {};
  }
  return decodeConfigs(await getStoredDbConfigs());
}

/**
 * Runtime config: KV on Workers, database cache in local Node development.
 */
export async function getAllConfigs(): Promise<ConfigMap> {
  const kv = getConfigKv();
  if (kv) {
    const snapshot = await kv.get(CONFIG_KV_KEY, {
      type: 'text',
      cacheTtl: CONFIG_KV_CACHE_TTL_SECONDS,
    });
    if (snapshot === null) {
      throw new Error(
        'Config KV snapshot missing. Sync settings before deployment.'
      );
    }
    const stored: unknown = JSON.parse(snapshot);
    if (
      !stored ||
      Array.isArray(stored) ||
      typeof stored !== 'object' ||
      Object.values(stored).some((value) => typeof value !== 'string')
    ) {
      throw new Error(
        'Invalid config KV snapshot. Please sync settings again.'
      );
    }
    return { ...envConfigs, ...(await decodeConfigs(stored as ConfigMap)) };
  }

  if (!cachedConfigs || Date.now() - cacheTime >= CACHE_TTL) {
    cachedConfigs = await getDbConfigs();
    cacheTime = Date.now();
  }
  return { ...envConfigs, ...cachedConfigs };
}

/**
 * Keys that must never be written through the admin UI / DB config layer.
 *
 * These are infrastructure-critical or session-signing secrets that should
 * only ever come from environment variables. Allowing a compromised admin
 * (or a confused-deputy bug) to overwrite them would let an attacker rotate
 * the session-signing key out from under us, swap the database connection,
 * etc.
 */
const PROTECTED_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'auth_secret',
  'database_url',
  'database_auth_token',
  'database_provider',
  'db_schema',
  'db_singleton_enabled',
  'db_max_connections',
]);

/**
 * Keys whose values are secrets: encrypted at rest in the config table and
 * masked when returned to the admin UI.
 *
 * Derived from the settings definitions (password fields + private keys),
 * plus a name-pattern fallback so env-only secrets (e.g. stripe_secret_key)
 * and future custom keys are covered without registration.
 */
const SECRET_SETTING_NAMES: ReadonlySet<string> = new Set(
  getSettings()
    .filter((s) => s.type === 'password' || s.name.endsWith('_private_key'))
    .map((s) => s.name)
);

const SECRET_KEY_PATTERN =
  /(?:^|[_.:-])(secret|secret_key|token|password|private_key|api_key|access_key|api_v3_key)$/;

export function isSecretConfigKey(name: string): boolean {
  return SECRET_SETTING_NAMES.has(name) || SECRET_KEY_PATTERN.test(name);
}

/** Mask marker — secrets never start with bullets, so it's unambiguous. */
const MASK_PREFIX = '••••••••';

/**
 * Mask a secret for display: keep the last 4 chars when long enough to be
 * unidentifiable from them, otherwise mask entirely.
 */
export function maskConfigValue(value: string): string {
  return value.length > 8 ? MASK_PREFIX + value.slice(-4) : MASK_PREFIX;
}

/** A masked value round-tripped from the admin UI means "unchanged". */
export function isMaskedConfigValue(value: string): boolean {
  return value.startsWith(MASK_PREFIX);
}

function upsertConfig(
  database: ReturnType<typeof db>,
  name: string,
  value: string
) {
  const insert = database.insert(config).values({ name, value });
  return envConfigs.database_provider === 'mysql'
    ? insert.onDuplicateKeyUpdate({ set: { value } })
    : insert.onConflictDoUpdate({ target: config.name, set: { value } });
}

/** D1 uses atomic batch; other database drivers support interactive transactions. */
async function writeConfigEntries(
  entries: Array<[string, string]>,
  toDelete: string[] = []
) {
  getConfigKv(); // Validate the binding/key before committing settings changes.
  const database = db();
  const statements = (target: ReturnType<typeof db>) => [
    ...toDelete.map((name) =>
      target.delete(config).where(eq(config.name, name))
    ),
    ...entries.map(([name, value]) => upsertConfig(target, name, value)),
  ];
  if (entries.length || toDelete.length) {
    if (envConfigs.database_provider === 'd1') {
      await database.batch(statements(database));
    } else {
      await database.transaction(async (tx: ReturnType<typeof db>) => {
        for (const statement of statements(tx)) await statement;
      });
    }
  }
  // Publish even when all inputs were masked, so a failed publish can be retried.
  await syncConfigsToKv();
}

/**
 * Save multiple configs to database (upsert). Protected keys are silently
 * dropped — see PROTECTED_CONFIG_KEYS. Masked values round-tripped from the
 * admin UI are skipped (the user didn't change them). Secret keys are
 * encrypted at rest — see SECRET_SETTING_NAMES / SECRET_KEY_PATTERN.
 */
export async function saveConfigs(configs: ConfigMap) {
  const entries = await Promise.all(
    Object.entries(configs)
      .filter(
        ([name, value]) =>
          !PROTECTED_CONFIG_KEYS.has(name) && !isMaskedConfigValue(value)
      )
      .map(
        async ([name, value]): Promise<[string, string]> =>
          isSecretConfigKey(name)
            ? [name, await encryptSecret(value)]
            : [name, value]
      )
  );
  await writeConfigEntries(entries);
}

/**
 * Get a single config value.
 */
export async function getConfig(name: string): Promise<string | undefined> {
  const configs = await getAllConfigs();
  return configs[name];
}

/**
 * Configs sanitized for the admin settings UI: protected keys removed,
 * secret values masked. Never send getAllConfigs() to a client — it
 * contains every env secret in plaintext.
 */
export async function getAdminConfigs(): Promise<ConfigMap> {
  const configs = { ...envConfigs, ...(await getDbConfigs()) };
  const result: ConfigMap = {};
  for (const [name, value] of Object.entries(configs)) {
    if (PROTECTED_CONFIG_KEYS.has(name)) continue;
    result[name] =
      isSecretConfigKey(name) && value ? maskConfigValue(value) : value;
  }
  return result;
}

// --- Custom configs -------------------------------------------------------

/** Valid custom config key: letters, digits, and `_ . : -`. */
const CUSTOM_KEY_PATTERN = /^[A-Za-z0-9_.:-]+$/;

/**
 * Keys that are "known" to the system — predefined settings plus every env
 * config key — and therefore not user-managed custom keys.
 */
function reservedConfigKeys(): Set<string> {
  return new Set<string>([
    ...getSettings().map((s) => s.name),
    ...Object.keys(envConfigs),
    ...PROTECTED_CONFIG_KEYS,
  ]);
}

export interface CustomConfig {
  key: string;
  value: string;
}

/**
 * Custom (user-defined) configs: DB-stored key/value pairs that aren't part
 * of any predefined setting or env key. Secret-like values are masked before
 * returning to the admin UI.
 */
export async function getCustomConfigs(): Promise<CustomConfig[]> {
  const reserved = reservedConfigKeys();
  const dbConfigs = await getDbConfigs();
  return Object.entries(dbConfigs)
    .filter(([name]) => !reserved.has(name))
    .map(([key, value]) => ({
      key,
      value: isSecretConfigKey(key) && value ? maskConfigValue(value) : value,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Replace the entire set of custom configs: upsert the provided pairs and
 * delete any previously-stored custom key that's no longer present. Reserved
 * keys are rejected so the custom tab can't shadow a predefined setting.
 */
export async function replaceCustomConfigs(
  pairs: CustomConfig[]
): Promise<void> {
  const reserved = reservedConfigKeys();
  const seen = new Set<string>();
  const clean: Array<[string, string]> = [];

  for (const pair of pairs) {
    const key = (pair?.key ?? '').trim();
    if (!key) continue; // skip blank rows
    if (reserved.has(key)) throw new Error(`Reserved key not allowed: ${key}`);
    if (!CUSTOM_KEY_PATTERN.test(key)) throw new Error(`Invalid key: ${key}`);
    if (seen.has(key)) throw new Error(`Duplicate key: ${key}`);
    seen.add(key);
    clean.push([key, pair.value ?? '']);
  }

  const dbConfigs = await getDbConfigs();
  const existingCustom = Object.keys(dbConfigs).filter((n) => !reserved.has(n));
  const keep = new Set(clean.map(([k]) => k));
  const toDelete = existingCustom.filter((k) => !keep.has(k));

  const entries = await Promise.all(
    clean
      .filter(([, value]) => !isMaskedConfigValue(value))
      .map(
        async ([name, value]): Promise<[string, string]> =>
          isSecretConfigKey(name)
            ? [name, await encryptSecret(value)]
            : [name, value]
      )
  );

  await writeConfigEntries(entries, toDelete);
}

/**
 * Filter configs to only include public-safe keys.
 */
export function filterPublicConfigs(
  configs: ConfigMap,
  publicKeys: string[]
): ConfigMap {
  const result: ConfigMap = {};
  for (const key of publicKeys) {
    if (PROTECTED_CONFIG_KEYS.has(key) || isSecretConfigKey(key)) continue;
    if (key in configs) {
      result[key] = configs[key];
    }
  }
  return result;
}
