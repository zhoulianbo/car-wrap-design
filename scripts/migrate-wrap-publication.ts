/** Local SQLite migration. Backs up before changing data; no storage deletions.
 * pnpm exec tsx scripts/migrate-wrap-publication.ts [--apply] [--database=file:...]
 */
import { resolve } from 'node:path';
import { createClient } from '@libsql/client';

import { loadEnvFiles } from '../src/lib/env';
import { imageWrapDocument } from '../src/lib/wrap-document';

loadEnvFiles();
const url =
  process.argv.find((x) => x.startsWith('--database='))?.slice(11) ||
  process.env.DATABASE_URL ||
  'file:data/local.db';
if (!url.startsWith('file:'))
  throw new Error('Local SQLite only; review remote migrations separately');
const client = createClient({ url });
try {
  const columns = (
    await client.execute('PRAGMA table_info(user_wrap)')
  ).rows.map((x) => x.name);
  if (columns.includes('generation_id')) {
    console.log('Already migrated');
  } else {
    const wraps = (await client.execute('SELECT * FROM user_wrap')).rows;
    const designs = (await client.execute('SELECT * FROM design')).rows;
    const gens = (
      await client.execute(
        "SELECT g.*,t.options FROM ai_generation g JOIN ai_task t ON t.id=g.ai_task_id WHERE g.status='succeeded' AND g.output_url IS NOT NULL"
      )
    ).rows;
    console.log({
      wraps: wraps.length,
      designs: designs.length,
      successfulGenerations: gens.length,
    });
    if (process.argv.includes('--apply')) {
      const backup =
        resolve(url.slice(5)) + `.before-publication-${Date.now()}.bak`;
      await client.execute(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
      console.log('Backup:', backup);
      const tx = await client.transaction('write');
      try {
        for (const sql of [
          'ALTER TABLE user_wrap ADD COLUMN uses_ai integer NOT NULL DEFAULT 0',
          'ALTER TABLE user_wrap ADD COLUMN open_to_gallery integer NOT NULL DEFAULT 1',
          "ALTER TABLE user_wrap ADD COLUMN moderation_status text NOT NULL DEFAULT 'pending'",
          'ALTER TABLE user_wrap ADD COLUMN generation_id text',
          'CREATE UNIQUE INDEX user_wrap_generation_id_unique ON user_wrap(generation_id)',
          'ALTER TABLE design ADD COLUMN source_version integer NOT NULL DEFAULT 1',
        ])
          await tx.execute(sql);
        for (const d of designs) {
          let wrapId = d.source_wrap_id;
          if (!wrapId) {
            wrapId = crypto.randomUUID();
            await tx.execute({
              sql: 'INSERT INTO user_wrap(id,user_id,vehicle_slug,name,template_version,canvas_json,texture_key,texture_url,finish,version,status,created_at,updated_at,uses_ai,open_to_gallery,moderation_status) VALUES(?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?)',
              args: [
                wrapId,
                d.owner_id,
                d.vehicle_slug,
                d.title,
                d.template_version,
                d.snapshot_json,
                d.texture_key,
                d.texture_url,
                d.finish,
                'saved',
                d.published_at,
                d.updated_at,
                d.uses_ai,
                d.visibility === 'private' ? 0 : 1,
                d.visibility === 'private' ? 'private' : d.moderation_status,
              ],
            });
            await tx.execute({
              sql: 'UPDATE design SET source_wrap_id=? WHERE id=?',
              args: [wrapId, d.id],
            });
          }
          await tx.execute({
            sql: 'UPDATE user_wrap SET uses_ai=MAX(uses_ai,?),open_to_gallery=?,moderation_status=? WHERE id=?',
            args: [
              d.uses_ai,
              d.visibility === 'private' ? 0 : 1,
              d.visibility === 'private' ? 'private' : d.moderation_status,
              wrapId,
            ],
          });
          if (String(d.publish_key).startsWith('generation:'))
            await tx.execute({
              sql: 'UPDATE user_wrap SET generation_id=? WHERE id=?',
              args: [String(d.publish_key).slice(11), wrapId],
            });
          await tx.execute({
            sql: 'UPDATE design SET source_version=(SELECT version FROM user_wrap WHERE id=?) WHERE id=?',
            args: [wrapId, d.id],
          });
        }
        for (const g of gens) {
          const existing = await tx.execute({
            sql: 'SELECT id FROM user_wrap WHERE generation_id=?',
            args: [g.id],
          });
          if (existing.rows.length) continue;
          const id = crypto.randomUUID();
          const open =
            JSON.parse(String(g.options || '{}')).openToGallery !== false;
          await tx.execute({
            sql: 'INSERT INTO user_wrap(id,user_id,vehicle_slug,name,template_version,canvas_json,texture_key,texture_url,finish,version,status,created_at,updated_at,uses_ai,open_to_gallery,moderation_status,generation_id) VALUES(?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?)',
            args: [
              id,
              g.user_id,
              g.vehicle_slug,
              '',
              g.template_version,
              JSON.stringify(imageWrapDocument(String(g.output_url))),
              g.output_key,
              g.output_url,
              'gloss',
              'saved',
              g.created_at,
              g.updated_at,
              1,
              open ? 1 : 0,
              open ? 'pending' : 'private',
              g.id,
            ],
          });
        }
        // Unpublished records belong to the user library. Keep approved/hidden community records.
        // Their previous fields remain recoverable in the database backup.
        await tx.execute(
          "DELETE FROM design WHERE moderation_status IN ('pending','rejected','private') OR visibility='private'"
        );
        for (const col of ['name', 'cover_key', 'cover_url'])
          await tx.execute(`ALTER TABLE user_wrap DROP COLUMN ${col}`);
        const violations = await tx.execute('PRAGMA foreign_key_check');
        if (violations.rows.length) throw new Error('Foreign key check failed');
        await tx.commit();
        console.log(
          'Migrated user assets and publications; storage objects untouched.'
        );
      } catch (e) {
        await tx.rollback();
        throw e;
      } finally {
        tx.close();
      }
    } else console.log('Dry run only; use --apply to back up and migrate.');
  }
} finally {
  client.close();
}
