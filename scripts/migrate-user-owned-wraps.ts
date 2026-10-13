/** Local SQLite only. Remote/production migrations must be reviewed separately.
 * node --import tsx scripts/migrate-user-owned-wraps.ts [--apply] [--database=file:...]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient, type InValue, type Row } from '@libsql/client';

import { loadEnvFiles } from '../src/lib/env';

loadEnvFiles();
const url =
  process.argv.find((arg) => arg.startsWith('--database='))?.slice(11) ||
  process.env.DATABASE_URL ||
  'file:data/local.db';
if (!url.startsWith('file:'))
  throw new Error('This migration only accepts a local SQLite file');
const client = createClient({ url });
try {
  const tables = (
    await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
  ).rows.map((row) => row.name);
  if (tables.includes('user_wrap')) {
    if (tables.includes('wrap_project'))
      throw new Error('Mixed schema detected; inspect before migrating');
    console.log('Already migrated');
  } else {
    const read = async (table: string) =>
      (await client.execute(`SELECT * FROM ${table}`)).rows;
    const wraps = await read('wrap_project');
    const assets = await read('project_asset');
    const generations = await read('ai_generation');
    const designs = await read('design');
    const remixes = await read('design_remix');
    const uploads = assets.filter((a) =>
      ['upload', 'storage', 'ai-input'].includes(String(a.kind))
    );
    const unknown = assets.filter(
      (a) =>
        ![
          'upload',
          'storage',
          'ai-input',
          'preview',
          'ai-output',
          'official-design',
          'export',
        ].includes(String(a.kind))
    );
    if (unknown.length)
      throw new Error('Unknown asset kinds; classify before migrating');
    console.log({
      wraps: wraps.length,
      uploadedAttachments: uploads.length,
      otherAssets: assets.length - uploads.length,
      generations: generations.length,
      designs: designs.length,
      remixes: remixes.length,
    });
    if (!process.argv.includes('--apply')) {
      console.log(
        'Read-only audit complete. Use --apply to back up and migrate the local database.'
      );
    } else {
      const backup =
        resolve(url.slice(5)) + `.before-user-owned-${Date.now()}.bak`;
      await client.execute(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
      console.log(`Backup: ${backup}`);
      const byAsset = new Map(assets.map((a) => [a.id, a]));
      const byWrap = new Map(wraps.map((w) => [w.id, w]));
      const byDesign = new Map(designs.map((d) => [d.id, d]));
      const resolveImages = (
        wrap: Row | undefined,
        snapshot?: string,
        coverId?: Row[string]
      ) => {
        let document: { nodes?: { imageUrl?: string }[] } = {};
        try {
          document = JSON.parse(snapshot || String(wrap?.canvas_json || '{}'));
        } catch {
          /* Keep original snapshot untouched. */
        }
        const imageUrl =
          document.nodes?.length === 1
            ? document.nodes[0]?.imageUrl
            : undefined;
        const owned = assets
          .filter(
            (a) => a.project_id === wrap?.id && a.owner_id === wrap?.user_id
          )
          .sort((a, b) => Number(b.created_at) - Number(a.created_at));
        const texture =
          (imageUrl
            ? assets.find((a) => a.public_url === imageUrl)
            : undefined) ||
          owned.find((a) =>
            ['ai-output', 'official-design', 'export'].includes(String(a.kind))
          );
        const cover = byAsset.get(coverId ?? wrap?.preview_asset_id ?? null);
        return {
          texture_key: texture?.storage_key ?? null,
          texture_url: texture?.public_url ?? imageUrl ?? null,
          cover_key: cover?.storage_key ?? texture?.storage_key ?? null,
          cover_url:
            cover?.public_url ?? texture?.public_url ?? imageUrl ?? null,
          finish: 'gloss',
        };
      };
      await client.execute('PRAGMA foreign_keys = OFF');
      const tx = await client.transaction('write');
      try {
        // Read all old data first; replacement and verification are one transaction.
        for (const table of [
          'design_remix',
          'ai_generation',
          'design',
          'project_asset',
          'wrap_project',
        ]) {
          await tx.execute(`DROP TABLE ${table}`);
        }
        const ddl = readFileSync(
          new URL('./migrations/user-owned-wraps-schema.sql', import.meta.url),
          'utf8'
        );
        for (const statement of ddl
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean))
          await tx.execute(statement);
        const insert = async (table: string, row: Record<string, InValue>) => {
          const columns = (
            await tx.execute(`PRAGMA table_info(${table})`)
          ).rows.map((c) => String(c.name));
          const entries = Object.entries(row).filter(
            ([key, value]) => columns.includes(key) && value !== undefined
          );
          await tx.execute({
            sql: `INSERT INTO ${table} (${entries.map(([k]) => k).join(',')}) VALUES (${entries.map(() => '?').join(',')})`,
            args: entries.map(([, value]) => value),
          });
        };
        for (const w of wraps) {
          const source = byDesign.get(w.source_design_id);
          const images = resolveImages(w);
          const fallback = source
            ? resolveImages(
                byWrap.get(source.project_id),
                String(source.snapshot_json),
                source.cover_asset_id
              )
            : undefined;
          await insert('user_wrap', {
            ...w,
            ...images,
            texture_key: images.texture_key ?? fallback?.texture_key ?? null,
            texture_url: images.texture_url ?? fallback?.texture_url ?? null,
            cover_key: images.cover_key ?? fallback?.cover_key ?? null,
            cover_url: images.cover_url ?? fallback?.cover_url ?? null,
          });
        }
        for (const a of uploads)
          await insert('user_asset', {
            ...a,
            kind: 'upload',
            source: 'upload',
          });
        for (const g of generations) {
          const w = byWrap.get(g.project_id);
          if (!w || w.user_id !== g.user_id)
            throw new Error('Generation owner/context mismatch');
          const output = byAsset.get(g.output_asset_id);
          await insert('ai_generation', {
            ...g,
            vehicle_slug: w.vehicle_slug,
            template_version: w.template_version,
            output_key: output?.storage_key ?? null,
            output_url: output?.public_url ?? null,
            completion_claim: null,
            completion_claimed_at: null,
          });
        }
        for (const d of designs) {
          const w = byWrap.get(d.project_id);
          await insert('design', {
            ...d,
            ...resolveImages(w, String(d.snapshot_json), d.cover_asset_id),
            source_wrap_id: d.project_id,
            template_version: w?.template_version ?? 'legacy',
          });
        }
        for (const r of remixes)
          await insert('design_remix', {
            ...r,
            target_wrap_id: r.target_project_id,
          });
        for (const [table, expected] of [
          ['user_wrap', wraps.length],
          ['user_asset', uploads.length],
          ['ai_generation', generations.length],
          ['design', designs.length],
          ['design_remix', remixes.length],
        ] as const) {
          const [row] = (
            await tx.execute(`SELECT count(*) AS total FROM ${table}`)
          ).rows;
          if (Number(row.total) !== expected)
            throw new Error(`Row count mismatch: ${table}`);
        }
        if ((await tx.execute('PRAGMA foreign_key_check')).rows.length)
          throw new Error('Foreign key check failed');
        await tx.commit();
        console.log(
          'Migration committed; row counts and foreign keys verified. No storage objects were removed.'
        );
      } catch (error) {
        await tx.rollback();
        throw error;
      } finally {
        await client.execute('PRAGMA foreign_keys = ON');
      }
    }
  }
} finally {
  client.close();
}
