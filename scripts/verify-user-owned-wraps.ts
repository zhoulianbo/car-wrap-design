/** Isolated SQLite integration checks. No real users, providers or storage requests.
 * node --import tsx scripts/verify-user-owned-wraps.ts
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';

import type { AIProvider } from '../src/core/ai/types';
import { VEHICLE_ASSET_MANIFEST } from '../src/lib/vehicle-catalog';

const directory = mkdtempSync(join(tmpdir(), 'user-wrap-check-'));
process.env.DATABASE_URL = `file:${join(directory, 'test.db')}`;
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DB_SINGLETON_ENABLED = 'true';
const client = createClient({ url: process.env.DATABASE_URL });
// Concurrent read/write checks use WAL, so read snapshots don't hold a writer lock.
await client.execute('PRAGMA journal_mode = WAL');
const ddl = execFileSync(
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
);
await client.executeMultiple(ddl);
const { db } = await import('../src/core/db');
const { user, userAsset, userWrap, aiGeneration, design } =
  await import('../src/config/db/schema');
const {
  saveWrap,
  getWrap,
  listWraps,
  deleteWrap,
  WrapConflictError,
  WrapNotFoundError,
} = await import('../src/modules/user-wraps/service');
const {
  recordUserUpload,
  userAssetUsage,
  deleteUserAsset,
  getUserAsset,
  listUserAssets,
} = await import('../src/modules/user-wraps/assets');
const {
  publishDesign,
  approveUserWrap,
  getWrapForReview,
  updateWrapModeration,
  listDesignsForModeration,
  remixDesign,
  getPublicDesign,
} = await import('../src/modules/design-gallery/service');
const {
  createWrapGeneration,
  completeWrapGeneration,
  getWrapGeneration,
  listUserGenerations,
} = await import('../src/modules/ai-tasks/wrap-generations');
const { grant, getBalance } = await import('../src/modules/credits/service');
const { AITaskStatus } = await import('../src/core/ai/types');
const { StorageManager } = await import('../src/core/storage');
const { imageWrapDocument, resolveWrapTextureSource } =
  await import('../src/lib/wrap-document');
const count = async (table: string) =>
  Number(
    (await client.execute(`SELECT count(*) AS n FROM ${table}`)).rows[0].n
  );

try {
  await db()
    .insert(user)
    .values([
      { id: 'owner-a', name: 'A', email: 'a@fixture.invalid' },
      { id: 'owner-b', name: 'B', email: 'b@fixture.invalid' },
    ]);
  await db().insert(userAsset).values({
    id: 'upload-a',
    ownerId: 'owner-a',
    kind: 'upload',
    source: 'upload',
    storageKey: 'storage/a.webp',
    publicUrl: 'https://fixture.invalid/a.webp',
    byteSize: 1234,
    contentHash: 'fixture',
    mimeType: 'image/webp',
  });
  assert.equal(await count('user_wrap'), 0, 'Uploading must not create a wrap');
  const input = {
    userId: 'owner-a',
    vehicleSlug: 'model-3-2024-base' as const,
    name: 'First wrap',
    canvasJson: JSON.stringify(
      imageWrapDocument('https://fixture.invalid/a.webp')
    ),
    finish: 'matte' as const,
    idempotencyKey: 'save-once-key',
    textureKey: 'design/first.webp',
    textureUrl: 'https://fixture.invalid/first.webp',
    coverKey: 'cover/first.webp',
    coverUrl: 'https://fixture.invalid/cover.webp',
  };
  const wrap = await saveWrap(input);
  assert.equal(
    (await saveWrap(input)).id,
    wrap.id,
    'Save retry must not duplicate wraps'
  );
  assert.equal((await getWrap('owner-a', wrap.id)).finish, 'matte');
  assert.equal((await listWraps('owner-b')).length, 0);
  await assert.rejects(getWrap('owner-b', wrap.id), WrapNotFoundError);
  await assert.rejects(
    saveWrap({ ...input, userId: 'owner-b' }),
    /key is unavailable/
  );
  await assert.rejects(deleteWrap('owner-b', wrap.id), WrapNotFoundError);
  await assert.rejects(
    saveWrap({ ...input, wrapId: wrap.id, version: 99 }),
    WrapConflictError
  );

  const submission = await publishDesign({
    userId: 'owner-a',
    wrapId: wrap.id,
    title: 'Snapshot',
    visibility: 'public',
    publishKey: 'publish-key',
  });
  assert.equal(submission.status, 'pending');
  assert.equal(await count('design'), 0);
  await assert.rejects(
    publishDesign({
      userId: 'owner-b',
      wrapId: wrap.id,
      title: 'Other',
      visibility: 'public',
      publishKey: 'other-key',
    }),
    /Save the wrap/
  );
  const { saved: published } = await approveUserWrap({
    wrapId: wrap.id,
    version: 1,
    title: 'Snapshot',
    textureKey: input.textureKey,
    textureUrl: input.textureUrl,
    coverKey: input.coverKey,
    coverUrl: input.coverUrl,
  });
  const edited = await saveWrap({
    ...input,
    wrapId: wrap.id,
    version: wrap.version,
    textureKey: 'design/second.webp',
    textureUrl: 'https://fixture.invalid/second.webp',
    finish: 'gloss',
  });
  assert.equal(edited.version, wrap.version + 1);
  assert.equal(
    edited.name,
    'Snapshot',
    'canvas save preserves the reviewed name'
  );
  assert.equal((await getWrap('owner-a', wrap.id)).name, 'Snapshot');
  assert.equal((await listWraps('owner-a'))[0].name, 'Snapshot');
  const publicSnapshot = await getPublicDesign(published.slug);
  assert.equal(publicSnapshot.prompt, null, 'manual designs have no AI prompt');
  assert.equal(
    publicSnapshot.textureUrl,
    input.textureUrl,
    'Editing must not mutate published images'
  );
  assert.equal(
    publicSnapshot.finish,
    'matte',
    'Editing must not mutate published material'
  );
  assert.equal(
    'snapshotJson' in publicSnapshot,
    false,
    'Public API must not expose private editable layers'
  );
  await remixDesign({
    userId: 'owner-b',
    designId: published.id,
    idempotencyKey: 'remix-once',
  });
  await remixDesign({
    userId: 'owner-b',
    designId: published.id,
    idempotencyKey: 'remix-once',
  });
  assert.equal(
    await count('user_wrap'),
    1,
    'Remix opens a draft without saving it'
  );
  assert.equal(
    await count('design_remix'),
    1,
    'Remix retry must not duplicate history'
  );
  const { removeUnusedWrapImages } =
    await import('../src/lib/wrap-storage-cleanup');
  const { copyWrapSource } = await import('../src/lib/copy-wrap-source');
  const draft = imageWrapDocument(
    `/api/gallery/${published.slug}?texture=1&source=${encodeURIComponent(published.textureUrl)}`
  );
  const sourceLayer = draft.nodes[0];
  const previousCanvasJson = JSON.stringify({
    ...draft,
    nodes: [
      {
        ...sourceLayer,
        imageUrl:
          '/api/wraps/remix-owned?texture=1&source=https%3A%2F%2Ffixture.invalid%2Fowned-base.webp',
      },
    ],
  });
  const secondSave = await copyWrapSource({
    canvasJson: JSON.stringify(draft),
    previousCanvasJson,
    // Simulates the source being removed after the first successful save.
    sourceDesignId: 'deleted-source',
    wrapId: 'remix-owned',
    storage: new StorageManager(),
    storageDomain: 'https://fixture.invalid',
  });
  assert.equal(
    secondSave.canvasJson,
    previousCanvasJson,
    'subsequent saves retain the owned base even if the gallery source is gone'
  );
  assert.equal(
    secondSave.images.length,
    0,
    'subsequent saves do not copy the same base again'
  );
  const cleanupStorage = new StorageManager();
  const removed: string[] = [];
  cleanupStorage.addProvider({
    name: 'cleanup',
    configs: {},
    uploadFile: async () => {
      throw new Error('Unexpected upload');
    },
    downloadAndUpload: async () => {
      throw new Error('Unexpected download');
    },
    deleteFile: async ({ key }) => {
      removed.push(key);
    },
  });
  await assert.rejects(() => getWrapForReview(wrap.id, 1), /changed/);
  await assert.rejects(
    () =>
      approveUserWrap({
        wrapId: wrap.id,
        version: 1,
        title: 'Stale',
        textureKey: 'stale',
        textureUrl: 'stale',
        coverKey: 'stale',
        coverUrl: 'stale',
      }),
    /changed/
  );
  await updateWrapModeration({
    wrapId: wrap.id,
    version: 2,
    status: 'rejected',
  });
  assert.equal(
    (await getPublicDesign(published.slug)).textureUrl,
    input.textureUrl,
    'rejecting V2 preserves V1'
  );
  await client.execute({
    sql: 'UPDATE design SET like_count=7,view_count=11 WHERE id=?',
    args: [published.id],
  });
  const { saved: v2, previous } = await approveUserWrap({
    wrapId: wrap.id,
    version: 2,
    title: 'Reviewed V2',
    textureKey: 'published/v2.webp',
    textureUrl: 'https://fixture.invalid/v2.webp',
    coverKey: 'cover/v2.webp',
    coverUrl: 'https://fixture.invalid/v2-cover.webp',
  });
  assert.equal(v2.id, published.id);
  assert.equal(v2.slug, published.slug);
  assert.equal(v2.likeCount, 7);
  assert.equal(v2.viewCount, 11);
  assert.equal(v2.sourceVersion, 2);
  await updateWrapModeration({
    wrapId: wrap.id,
    version: 2,
    status: 'hidden',
    title: 'Renamed while hidden',
  });
  assert.equal(
    (await getWrap('owner-a', wrap.id)).name,
    'Renamed while hidden'
  );
  const renamed = await listDesignsForModeration({
    page: 1,
    pageSize: 10,
    search: 'Renamed while hidden',
  });
  assert.equal(renamed.items[0].title, 'Renamed while hidden');
  await updateWrapModeration({
    wrapId: wrap.id,
    version: 2,
    status: 'rejected',
    title: 'Renamed on rejection',
  });
  assert.equal(
    (await getWrap('owner-a', wrap.id)).name,
    'Renamed on rejection'
  );
  assert.equal(
    await count('design'),
    1,
    'replacement keeps one community record'
  );
  await removeUnusedWrapImages(cleanupStorage, [
    { key: previous.textureKey, url: previous.textureUrl },
    { key: previous.coverKey, url: previous.coverUrl },
  ]);
  assert.deepEqual(removed.sort(), [input.textureKey, input.coverKey].sort());
  const before = removed.length;
  await removeUnusedWrapImages(cleanupStorage, [
    { key: edited.textureKey, url: edited.textureUrl },
  ]);
  assert.equal(removed.length, before, 'current private texture must remain');
  const deletedWrap = await deleteWrap('owner-a', wrap.id);
  await removeUnusedWrapImages(
    cleanupStorage,
    deletedWrap.publications.flatMap((item: any) => [
      { key: item.textureKey, url: item.textureUrl },
      { key: item.coverKey, url: item.coverUrl },
    ])
  );
  assert.ok(removed.includes(v2.coverKey));
  assert.ok(removed.includes(v2.textureKey));
  assert.equal(
    await count('user_asset'),
    1,
    'Deleting wraps must preserve uploads'
  );
  assert.equal(
    await getPublicDesign(published.slug),
    null,
    'deleting the source removes its gallery publication'
  );

  await grant({ userId: 'owner-a', credits: 100 });
  await grant({ userId: 'owner-b', credits: 100 });
  let calls = 0;
  const provider: AIProvider = {
    name: 'fixture',
    configs: {},
    generate: async () => {
      calls += 1;
      return {
        taskId: `provider-${calls}`,
        taskStatus: AITaskStatus.PROCESSING,
      };
    },
  };
  let uploads = 0;
  const deletedKeys: string[] = [];
  let failDeletion = false;
  const storage = new StorageManager();
  storage.addProvider({
    name: 'fixture',
    configs: {},
    getPublicUrl: ({ key }) => `https://fixture.invalid/${key}`,
    deleteFile: async ({ key }) => {
      if (failDeletion) throw new Error('Storage deletion failed');
      deletedKeys.push(key);
    },
    uploadFile: async ({ key }) => {
      if (!key.startsWith('templates/ai-guides/')) uploads++;
      return {
        success: true,
        key,
        url: key.startsWith('templates/ai-guides/')
          ? `https://fixture.invalid/${key}`
          : 'https://fixture.invalid/output.webp',
        provider: 'fixture',
      };
    },
    downloadAndUpload: async ({ key }) => {
      uploads += 1;
      return {
        success: true,
        key,
        url: 'https://fixture.invalid/output.webp',
        provider: 'fixture',
      };
    },
  });
  const originalFetch = globalThis.fetch;
  const fixturePng = await sharp({
    create: { width: 8, height: 8, channels: 4, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  globalThis.fetch = async (url) => {
    const template = VEHICLE_ASSET_MANIFEST.find((vehicle) =>
      String(url).endsWith(vehicle.templatePath.replace('/imgs', ''))
    );
    return new Response(
      template ? readFileSync(`public${template.templatePath}`) : fixturePng,
      { headers: { 'content-type': 'image/png' } }
    );
  };
  const generationInput = {
    userId: 'owner-a',
    vehicleSlug: 'model-3-2024-base' as const,
    mode: 'image-to-image' as const,
    prompt: 'Mint geometric wrap',
    inputAssetIds: ['upload-a'],
    storage,
    idempotencyKey: 'generation-once',
    provider,
    providerModel: 'fixture',
  };
  await assert.rejects(
    createWrapGeneration({
      ...generationInput,
      userId: 'owner-b',
      idempotencyKey: 'foreign-input',
    }),
    /unavailable/
  );
  assert.equal(
    calls,
    0,
    'Foreign uploads must be rejected before provider calls'
  );
  const generation = await createWrapGeneration(generationInput);
  assert.equal((await createWrapGeneration(generationInput)).id, generation.id);
  assert.equal(calls, 1, 'Generation retries must not repeat paid requests');
  assert.equal(await getBalance('owner-a'), 90);
  const success = {
    taskId: 'provider-1',
    taskStatus: AITaskStatus.SUCCESS,
    taskInfo: {
      images: [{ imageUrl: 'https://fixture.invalid/provider.webp' }],
    },
  };
  await completeWrapGeneration({
    generationId: generation.id,
    result: success,
    storage,
  });
  await completeWrapGeneration({
    generationId: generation.id,
    result: success,
    storage,
  });
  assert.equal(uploads, 1, 'Repeated completion must reuse stored output');
  assert.equal(
    await count('user_wrap'),
    2,
    'AI completion creates a user wrap'
  );
  assert.equal(
    await count('user_asset'),
    1,
    'AI output must not become a charged attachment'
  );
  assert.equal(
    (
      await getWrapGeneration({
        userId: 'owner-a',
        generationId: generation.id,
      })
    ).outputUrl,
    'https://fixture.invalid/output.webp'
  );
  await assert.rejects(
    getWrapGeneration({ userId: 'owner-b', generationId: generation.id }),
    /not found/
  );
  assert.equal((await listUserGenerations('owner-b')).length, 0);
  const aiDesign = await publishDesign({
    userId: 'owner-a',
    generationId: generation.id,
    title: 'AI snapshot',
    visibility: 'public',
    publishKey: 'publish-ai-key',
  });
  assert.equal(aiDesign.status, 'pending');
  assert.ok(aiDesign.id);
  const failed = await createWrapGeneration({
    ...generationInput,
    idempotencyKey: 'generation-failure',
  });
  const failure = {
    taskId: 'provider-2',
    taskStatus: AITaskStatus.FAILED,
    taskInfo: { errorMessage: 'Fixture failed' },
  };
  await completeWrapGeneration({
    generationId: failed.id,
    result: failure,
    storage,
  });
  await completeWrapGeneration({
    generationId: failed.id,
    result: failure,
    storage,
  });
  assert.equal(
    await getBalance('owner-a'),
    90,
    'Failure must refund exactly once'
  );
  // A physical source deletion must preserve published data too.
  await db().delete(userWrap).where(eq(userWrap.id, wrap.id));
  assert.equal(
    (await db().select().from(design).where(eq(design.id, published.id)))[0]
      .sourceWrapId,
    null
  );
  assert.equal(await count('ai_generation'), 2);
  const uploadInput = {
    ownerId: 'owner-b',
    key: 'storage/quota.webp',
    url: 'https://fixture.invalid/quota.webp',
    byteSize: 80,
    hash: 'quota-fixture',
    limit: 100,
  };
  const competing = await Promise.allSettled([
    recordUserUpload(uploadInput),
    recordUserUpload(uploadInput),
  ]);
  assert.equal(
    competing.filter((result) => result.status === 'fulfilled').length,
    1,
    'Concurrent uploads cannot exceed the user quota'
  );
  assert.equal(await userAssetUsage('owner-b'), 80);
  assert.equal(
    await userAssetUsage('owner-a'),
    1234,
    'Textures, covers and generated outputs do not count toward attachment quota'
  );
  await assert.rejects(recordUserUpload(uploadInput), /Storage limit/);
  const [quotaAsset] = await listUserAssets('owner-b');
  const wrapWithAsset = await saveWrap({
    ...input,
    userId: 'owner-b',
    idempotencyKey: 'delete-asset-wrap-fixture',
    canvasJson: JSON.stringify(
      imageWrapDocument(`/api/assets?image=${quotaAsset.id}`)
    ),
  });
  assert.equal(
    (await getWrap('owner-b', wrapWithAsset.id)).sourceAssetsDeleted,
    false
  );
  assert.equal(await getUserAsset('owner-a', quotaAsset.id), undefined);
  await deleteUserAsset('owner-a', quotaAsset.id, storage);
  assert.deepEqual(
    deletedKeys,
    [],
    'Unauthorized deletion never contacts storage'
  );
  assert.equal(
    await userAssetUsage('owner-b'),
    80,
    'Another user cannot delete an attachment'
  );
  failDeletion = true;
  await assert.rejects(
    deleteUserAsset('owner-b', quotaAsset.id, storage),
    /Storage deletion failed/
  );
  assert.equal(
    await userAssetUsage('owner-b'),
    80,
    'Storage failure preserves quota and the retryable record'
  );
  assert.equal((await getUserAsset('owner-b', quotaAsset.id))?.deletedAt, null);
  failDeletion = false;
  await deleteUserAsset('owner-b', quotaAsset.id, storage);
  assert.deepEqual(deletedKeys, [uploadInput.key]);
  const restoredWrap = await getWrap('owner-b', wrapWithAsset.id);
  assert.equal(
    restoredWrap.sourceAssetsDeleted,
    true,
    'Opening a wrap with a deleted source can restore the saved composite'
  );
  assert.equal(
    restoredWrap.textureUrl,
    wrapWithAsset.textureUrl,
    'Deleting an upload leaves the saved texture unchanged'
  );
  assert.equal(
    restoredWrap.canvasJson,
    wrapWithAsset.canvasJson,
    'Deletion does not silently rewrite the saved snapshot'
  );
  const restoredImageReference = `/api/wraps/${restoredWrap.id}?texture=1&source=${encodeURIComponent(restoredWrap.textureUrl!)}`;
  const laterSave = {
    ...restoredWrap,
    textureUrl: 'https://fixture.invalid/new-texture.webp',
    canvasJson: JSON.stringify(imageWrapDocument(restoredImageReference)),
  };
  assert.equal(
    resolveWrapTextureSource(laterSave, restoredWrap.textureUrl),
    restoredWrap.textureUrl,
    'Restored base stays pinned to its original texture after subsequent saves'
  );
  assert.equal(
    resolveWrapTextureSource(
      laterSave,
      'https://fixture.invalid/unrelated.webp'
    ),
    null,
    'Only the owned wrap or its saved image references can be proxied'
  );
  assert.equal(
    await userAssetUsage('owner-b'),
    0,
    'Deleting an attachment frees library quota'
  );
  assert.equal((await listUserAssets('owner-b')).length, 0);
  assert.equal(
    (await getUserAsset('owner-b', quotaAsset.id))?.publicUrl,
    uploadInput.url,
    'Deletion retains audit metadata, not the original stored object'
  );
  await recordUserUpload(uploadInput);
  assert.equal(
    await userAssetUsage('owner-b'),
    80,
    'Freed quota can be used again'
  );
  assert.deepEqual((await client.execute('PRAGMA foreign_key_check')).rows, []);
  console.log(
    'PASS: user ownership, independent uploads/AI, manual saves, optimistic locking, immutable publishing, remix drafts, idempotency and refunds.'
  );
} finally {
  client.close();
}
