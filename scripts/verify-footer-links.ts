/** Real isolated D1/KV checks. No production data or external providers. */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';

const directory = mkdtempSync(join(tmpdir(), 'car-wrap-footer-links-'));
const proxy = await getPlatformProxy<{
  DB: { prepare(query: string): any };
  CONFIG_KV: {
    get(
      key: string,
      options: { type: 'text'; cacheTtl: number }
    ): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}>({ configPath: 'wrangler.jsonc', persist: { path: directory } });

process.env.DATABASE_PROVIDER = 'd1';
let queries = 0;
let failPublish = false;
const bindings = {
  DB: {
    prepare(query: string) {
      queries++;
      return proxy.env.DB.prepare(query);
    },
  },
  CONFIG_KV: {
    get: proxy.env.CONFIG_KV.get.bind(proxy.env.CONFIG_KV),
    put(key: string, value: string) {
      if (failPublish) throw new Error('Simulated KV failure');
      return proxy.env.CONFIG_KV.put(key, value);
    },
  },
};
const globals = globalThis as typeof globalThis & {
  __CF_ENV__?: typeof bindings;
};
globals.__CF_ENV__ = bindings;

try {
  const sql = readFileSync('drizzle/0001_abnormal_luckman.sql', 'utf8');
  for (const statement of sql.split('--> statement-breakpoint')) {
    await proxy.env.DB.prepare(statement.trim()).run();
  }
  const columns = await proxy.env.DB.prepare(
    'PRAGMA table_info(footer_link)'
  ).all();
  assert.ok(
    !columns.results.some((column: { name: string }) =>
      ['locale', 'status'].includes(column.name)
    )
  );

  const {
    listFooterLinks,
    saveFooterLink,
    deleteFooterLink,
    syncFooterLinksToKv,
    getPublicFooterLinks,
  } = await import('../src/modules/footer-links/service');
  const { FOOTER_LINK_KV_KEY } = await import('../src/lib/footer-link-cache');
  const { CONFIG_KV_KEY } = await import('../src/modules/config/service');
  assert.equal(FOOTER_LINK_KV_KEY.split(':')[0], CONFIG_KV_KEY.split(':')[0]);
  assert.deepEqual(await getPublicFooterLinks(), []);
  assert.equal(queries, 0, 'An empty KV must not query D1');

  const input = {
    group: 'friend',
    title: 'Directory & <review>',
    url: 'https://example.com/?x=1&y=2',
    imageUrl: '',
    altText: '',
    rel: '',
    sort: 20,
  };
  for (const invalid of [
    { ...input, url: 'javascript:alert(1)' },
    { ...input, url: 'data:text/html,hello' },
    { ...input, url: 'https://user:password@example.com' },
    { ...input, group: 'badge' },
    { ...input, imageUrl: 'javascript:alert(1)' },
    { ...input, rel: 'opener' },
    { ...input, sort: -1 },
    { ...input, sort: 0.5 },
    { ...input, title: ' ' },
  ])
    await assert.rejects(saveFooterLink(invalid));
  assert.equal(queries, 0, 'Invalid input must not write to D1');

  assert.deepEqual(await saveFooterLink(input), { synced: true });
  const [first] = await listFooterLinks();
  assert.equal(first.title, input.title);
  assert.equal(first.rel, 'noopener');
  const beforeRead = queries;
  assert.deepEqual(await getPublicFooterLinks(), [first]);
  assert.equal(queries, beforeRead, 'Public reads use KV only');

  await saveFooterLink({
    ...input,
    group: 'badge',
    title: 'Badge',
    imageUrl: 'https://example.com/badge.svg',
    altText: 'Listed on Example',
    sort: 5,
    rel: 'nofollow ugc',
  });
  let snapshot = await getPublicFooterLinks();
  assert.equal(snapshot[0].group, 'badge');
  assert.equal(snapshot[0].altText, 'Listed on Example');
  assert.equal(snapshot[0].rel, 'nofollow ugc noopener');

  await saveFooterLink({ ...input, title: 'Updated' }, first.id);
  assert.equal(
    (await getPublicFooterLinks()).find((link) => link.id === first.id)?.title,
    'Updated'
  );
  failPublish = true;
  assert.deepEqual(
    await saveFooterLink({ ...input, title: 'Saved despite outage' }, first.id),
    { synced: false }
  );
  assert.equal(
    (await listFooterLinks()).find((link) => link.id === first.id)?.title,
    'Saved despite outage'
  );
  assert.equal(
    (await getPublicFooterLinks()).find((link) => link.id === first.id)?.title,
    'Updated'
  );
  failPublish = false;
  assert.deepEqual(await syncFooterLinksToKv(), { synced: true });
  assert.equal(
    (await getPublicFooterLinks()).find((link) => link.id === first.id)?.title,
    'Saved despite outage'
  );
  assert.equal(
    (await listFooterLinks()).length,
    2,
    'Sync retries must not create duplicate links'
  );

  failPublish = true;
  assert.deepEqual(await deleteFooterLink(first.id), { synced: false });
  failPublish = false;
  await deleteFooterLink(first.id);
  assert.ok(
    !(await getPublicFooterLinks()).some((link) => link.id === first.id)
  );
  snapshot = await getPublicFooterLinks();
  await deleteFooterLink(snapshot[0].id);
  assert.deepEqual(
    await getPublicFooterLinks(),
    [],
    'Deleting the final link publishes an empty snapshot'
  );

  await proxy.env.CONFIG_KV.put(FOOTER_LINK_KV_KEY, 'invalid JSON');
  const beforeInvalid = queries;
  assert.deepEqual(await getPublicFooterLinks(), []);
  assert.equal(queries, beforeInvalid, 'Corrupt KV must not fall back to D1');
  await proxy.env.CONFIG_KV.put(
    FOOTER_LINK_KV_KEY,
    JSON.stringify([{ ...first, url: 'javascript:alert(1)' }])
  );
  assert.deepEqual(await getPublicFooterLinks(), []);
  globals.__CF_ENV__ = undefined;
  assert.deepEqual(await getPublicFooterLinks(), []);
  assert.equal(
    queries,
    beforeInvalid,
    'Missing production binding must not fall back to D1'
  );
  console.log(
    'PASS: footer link validation, D1 CRUD, KV-only reads, ordering, edit/delete publication, sync failure recovery, and shared config prefix.'
  );
} finally {
  globals.__CF_ENV__ = undefined;
  await proxy.dispose();
}
