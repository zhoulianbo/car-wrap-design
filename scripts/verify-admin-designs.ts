/** Isolated persistence and cover validation checks; no production DB or R2 access. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import sharp from 'sharp';

const directory = mkdtempSync(join(tmpdir(), 'admin-designs-'));
process.env.DATABASE_URL = `file:${join(directory, 'test.db')}`;
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DB_SINGLETON_ENABLED = 'true';
const client = createClient({ url: process.env.DATABASE_URL });
await client.executeMultiple(
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
const {
  createAdminDesign,
  getAdminDesignByKey,
  listHeroDesigns,
  setDesignHeroVisibility,
  moderateDesign,
  publishDesign,
  recordDesignDownload,
  listPublicDesigns,
  listPublicDesignPage,
  setDesignLike,
} = await import('../src/modules/design-gallery/service');
const { getWrap } = await import('../src/modules/user-wraps/service');
const { readWebp } = await import('../src/lib/wrap-image-storage');
await client.execute(
  "INSERT INTO user (id, name, email) VALUES ('owner', 'Test Owner', 'owner@example.test')"
);
const input = {
  ownerId: 'owner',
  vehicleSlug: 'model-3-legacy' as const,
  title: 'Test wrap',
  publishKey: 'admin:test:create-1',
  textureKey: 'design/test.webp',
  textureUrl: 'https://assets.example.test/design/test.webp',
  coverKey: 'cover/test.webp',
  coverUrl: 'https://assets.example.test/cover/test.webp',
};
const created = await createAdminDesign(input);
assert.equal(created.ownerId, 'owner');
assert.equal(created.moderationStatus, 'approved');
assert.equal(created.usesAi, false);
const wrap = await getWrap('owner', created.sourceWrapId!);
assert.equal(wrap.textureKey, input.textureKey);
assert.equal('coverKey' in wrap, false);
assert.equal(wrap.vehicleSlug, input.vehicleSlug);
assert.ok(
  JSON.parse(wrap.canvasJson).nodes[0].imageUrl.startsWith(
    `/api/wraps/${wrap.id}?texture=1&source=`
  )
);
assert.equal((await createAdminDesign(input)).id, created.id);
await assert.rejects(
  createAdminDesign({ ...input, ownerId: 'missing', publishKey: 'invalid' }),
  /User not found/
);
// Force the second insert to fail: the first insert must be rolled back too.
await client.execute(
  "CREATE TRIGGER reject_design BEFORE INSERT ON design WHEN NEW.title = 'reject' BEGIN SELECT RAISE(ABORT, 'test failure'); END"
);
await assert.rejects(
  createAdminDesign({ ...input, title: 'reject', publishKey: 'rollback' })
);
assert.equal(
  (await client.execute('SELECT count(*) AS total FROM user_wrap')).rows[0]
    .total,
  1
);
assert.equal(await getAdminDesignByKey('rollback'), undefined);
// Hero curation is opt-in, per vehicle, and always obeys public moderation.
assert.deepEqual(await listHeroDesigns(input.vehicleSlug), []);
await setDesignHeroVisibility(created.id, true);
assert.equal((await listHeroDesigns(input.vehicleSlug))[0].id, created.id);
await moderateDesign({ designId: created.id, status: 'hidden' });
assert.deepEqual(await listHeroDesigns(input.vehicleSlug), []);
await moderateDesign({ designId: created.id, status: 'approved' });
await client.execute({
  sql: 'UPDATE design SET visibility = ? WHERE id = ?',
  args: ['private', created.id],
});
assert.deepEqual(await listHeroDesigns(input.vehicleSlug), []);
await client.execute({
  sql: 'UPDATE design SET visibility = ? WHERE id = ?',
  args: ['public', created.id],
});
for (let i = 0; i < 10; i++) {
  const item = await createAdminDesign({ ...input, publishKey: `hero-${i}` });
  await setDesignHeroVisibility(item.id, true);
}
const anotherModel = await createAdminDesign({
  ...input,
  vehicleSlug: 'model-y-2025-premium',
  publishKey: 'hero-other-model',
});
await setDesignHeroVisibility(anotherModel.id, true);
assert.equal((await listHeroDesigns(input.vehicleSlug)).length, 8);
assert.ok(
  (await listHeroDesigns(input.vehicleSlug)).every(
    (item: { vehicleSlug: string }) => item.vehicleSlug === input.vehicleSlug
  )
);
assert.equal(
  (await listHeroDesigns('model-y-2025-premium'))[0].id,
  anotherModel.id
);
await setDesignHeroVisibility(anotherModel.id, false);
assert.deepEqual(await listHeroDesigns('model-y-2025-premium'), []);
await assert.rejects(setDesignHeroVisibility('missing', true), /not found/);
const regularPublication = await publishDesign({
  userId: 'owner',
  wrapId: wrap.id,
  title: 'User publication',
  visibility: 'public',
  publishKey: 'regular-user',
});
assert.equal(
  regularPublication.status,
  'approved',
  'resubmitting an unchanged approved version must not queue another review'
);
// Preview/list reads never count; only approved public downloads increment.
const downloadCount = async (id: string) =>
  (
    await client.execute({
      sql: 'SELECT download_count FROM design WHERE id = ?',
      args: [id],
    })
  ).rows[0].download_count;
assert.equal(await downloadCount(created.id), 0);
const listed = (await listPublicDesigns()).find(
  (item: { id: string }) => item.id === created.id
)!;
assert.equal(listed.authorName, 'Test Owner');
assert.equal(listed.authorImage, null);
assert.equal(listed.downloadCount, 0);
await Promise.all([
  recordDesignDownload(created.id),
  recordDesignDownload(created.id),
]);
assert.equal(await downloadCount(created.id), 2);
await recordDesignDownload(regularPublication.id);
assert.equal(
  (
    await client.execute({
      sql: 'SELECT count(*) n FROM design WHERE id=?',
      args: [regularPublication.id],
    })
  ).rows[0].n,
  0
);
// Aggregate likes require no account and preserve concurrent increments.
await Promise.all([
  setDesignLike(created.slug, true),
  setDesignLike(created.slug, true),
]);
const filters = {
  page: 1,
  pageSize: 5,
  search: '',
  sort: 'likes' as const,
};
let feed = await listPublicDesignPage(filters);
assert.equal(feed.items[0].id, created.id);
assert.equal(feed.items[0].likeCount, 2);
const second = await listPublicDesignPage({ ...filters, page: 2 });
assert.equal(feed.items.length, 5);
assert.equal(second.items.length, 5);
assert.ok(
  second.items.every(
    (item: { id: string }) =>
      !feed.items.some((first: { id: string }) => first.id === item.id)
  )
);
assert.equal(
  (await listPublicDesignPage({ ...filters, sort: 'downloads' })).items[0].id,
  created.id
);
const onlyY = await listPublicDesignPage({
  ...filters,
  vehicle: 'model-y-2025-premium',
});
assert.equal(onlyY.total, 1);
assert.equal(onlyY.items[0].id, anotherModel.id);
const named = await createAdminDesign({
  ...input,
  title: 'Nebula 100%_!',
  publishKey: 'search-escape',
});
const search = await listPublicDesignPage({
  ...filters,
  search: 'NEBULA 100%_!',
});
assert.equal(search.total, 1);
assert.equal(search.items[0].id, named.id);
assert.equal(
  (await listPublicDesignPage({ ...filters, search: 'missing', page: 20 }))
    .page,
  1
);
await setDesignLike(created.slug, false);
feed = await listPublicDesignPage(filters);
assert.equal(feed.items[0].likeCount, 1);
await setDesignLike(created.slug, false);
await setDesignLike(created.slug, false);
assert.equal(
  (
    await client.execute({
      sql: 'SELECT like_count FROM design WHERE id = ?',
      args: [created.id],
    })
  ).rows[0].like_count,
  0
);
const related = await listPublicDesignPage({
  ...filters,
  vehicle: 'model-3-2024-base',
  exclude: created.slug,
});
assert.ok(
  related.items.every(
    (item: { slug: string; vehicleSlug: string }) =>
      item.slug !== created.slug && item.vehicleSlug === 'model-3-2024-base'
  )
);
assert.equal(
  (
    await client.execute(
      "SELECT count(*) AS n FROM sqlite_master WHERE name = 'design_like'"
    )
  ).rows[0].n,
  0
);
await assert.rejects(setDesignLike('unpublished-wrap', true), /not found/);
await client.execute({
  sql: 'UPDATE design SET visibility = ? WHERE id = ?',
  args: ['private', created.id],
});
await recordDesignDownload(created.id);
assert.equal(await downloadCount(created.id), 2);
await assert.rejects(setDesignLike(created.slug, true), /not found/);
await client.execute({
  sql: 'UPDATE design SET visibility = ?, deleted_at = 1 WHERE id = ?',
  args: ['public', created.id],
});
await recordDesignDownload(created.id);
assert.equal(await downloadCount(created.id), 2);
await assert.rejects(setDesignLike(created.slug, true), /not found/);
// Covers must decode to the required square size, across lossy and lossless WebP.
for (const lossless of [false, true]) {
  const bytes = await sharp({
    create: { width: 800, height: 800, channels: 4, background: '#00000000' },
  })
    .webp({ lossless })
    .toBuffer();
  await readWebp(
    new File([new Uint8Array(bytes)], 'cover.webp', { type: 'image/webp' }),
    5 * 1024 * 1024,
    800
  );
}
const wrong = await sharp({
  create: { width: 1200, height: 750, channels: 3, background: '#111111' },
})
  .webp()
  .toBuffer();
await assert.rejects(
  readWebp(
    new File([new Uint8Array(wrong)], 'cover.webp', { type: 'image/webp' }),
    5 * 1024 * 1024,
    800
  ),
  /800/
);
await assert.rejects(
  readWebp(
    new File(['not an image'], 'cover.webp', { type: 'image/webp' }),
    1024,
    800
  ),
  /signature/
);
client.close();
console.log(
  'PASS: admin persistence, hero filtering, download counting, aggregate/reversible likes, moderation, search, sorting and pagination'
);
