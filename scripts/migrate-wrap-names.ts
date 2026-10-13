/** Local SQLite only. Dry run by default; --apply backs up before adding/backfilling names.
 * node --import tsx scripts/migrate-wrap-names.ts [--apply] [--database=file:...]
 */
import { resolve } from 'node:path';
import { createClient } from '@libsql/client';

import { loadEnvFiles } from '../src/lib/env';
import type { VehicleSlug } from '../src/lib/vehicle-catalog';
import { aiWrapName, vehicleWrapName } from '../src/lib/wrap-naming';

loadEnvFiles();
const url =
  process.argv.find((arg) => arg.startsWith('--database='))?.slice(11) ||
  process.env.DATABASE_URL ||
  'file:data/local.db';
if (!url.startsWith('file:'))
  throw new Error('Local SQLite only; review remote migrations separately');
const client = createClient({ url });
try {
  const hasName = (
    await client.execute('PRAGMA table_info(user_wrap)')
  ).rows.some((row) => row.name === 'name');
  const rows = (
    await client.execute(`
    SELECT w.id, w.vehicle_slug, ${hasName ? 'w.name' : "''"} AS name, g.prompt,
      (SELECT d.title FROM design d WHERE d.source_wrap_id = w.id AND d.deleted_at IS NULL
       ORDER BY d.updated_at DESC LIMIT 1) AS title
    FROM user_wrap w LEFT JOIN ai_generation g ON g.id = w.generation_id
  `)
  ).rows;
  const updates = rows
    .filter((row) => !String(row.name || '').trim())
    .map((row) => ({
      id: String(row.id),
      name:
        String(row.title || '').trim() ||
        (row.prompt
          ? aiWrapName(String(row.prompt))
          : vehicleWrapName(row.vehicle_slug as VehicleSlug)),
    }));
  console.log({
    addColumn: !hasName,
    backfill: updates.length,
    total: rows.length,
  });
  if (process.argv.includes('--apply') && (!hasName || updates.length)) {
    const backup =
      resolve(url.slice(5)) + `.before-wrap-names-${Date.now()}.bak`;
    await client.execute(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
    console.log('Backup:', backup);
    const tx = await client.transaction('write');
    try {
      if (!hasName)
        await tx.execute(
          "ALTER TABLE user_wrap ADD COLUMN name text NOT NULL DEFAULT ''"
        );
      for (const row of updates)
        await tx.execute({
          sql: "UPDATE user_wrap SET name = ? WHERE id = ? AND trim(name) = ''",
          args: [row.name, row.id],
        });
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
    console.log('Names migrated; timestamps and editor versions preserved.');
  }
} finally {
  client.close();
}
