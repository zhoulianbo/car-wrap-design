/** Isolated sharing integration checks; no real users, storage or providers. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';

const directory = mkdtempSync(join(tmpdir(), 'wrap-share-check-'));
process.env.DATABASE_URL = `file:${join(directory, 'test.db')}`;
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DB_SINGLETON_ENABLED = 'true';
const client = createClient({ url: process.env.DATABASE_URL });
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
const { user } = await import('../src/config/db/schema');
const { saveWrap, getWrap, deleteWrap } =
  await import('../src/modules/user-wraps/service');
const {
  getWrapShare,
  updateWrapShare,
  getSharedWrap,
  ShareNotFoundError,
  ShareConflictError,
} = await import('../src/modules/user-wraps/sharing');
try {
  await db()
    .insert(user)
    .values([
      {
        id: 'share-owner',
        name: 'Owner',
        email: 'share-owner@fixture.invalid',
      },
      {
        id: 'other-owner',
        name: 'Other',
        email: 'other-owner@fixture.invalid',
      },
    ]);
  const input = {
    userId: 'share-owner',
    vehicleSlug: 'model-3-2024-base' as const,
    canvasJson: JSON.stringify({
      version: 1,
      width: 1024,
      height: 1024,
      background: 'transparent',
      paintColor: '#cc3344',
      nodes: [],
    }),
    finish: 'satin' as const,
    textureKey: 'fixture/one.webp',
    textureUrl: 'https://fixture.invalid/one.webp',
    idempotencyKey: 'share-fixture-wrap',
    openToGallery: false,
  };
  const wrap = await saveWrap(input);
  const command = {
    userId: 'share-owner',
    wrapId: wrap.id,
    version: wrap.version,
    action: 'generate' as const,
  };
  assert.deepEqual(await getWrapShare('share-owner', wrap.id), {
    token: null,
    active: false,
  });
  await assert.rejects(
    getWrapShare('other-owner', wrap.id),
    ShareNotFoundError
  );
  await assert.rejects(
    updateWrapShare({ ...command, userId: 'other-owner' }),
    ShareNotFoundError
  );
  await assert.rejects(
    updateWrapShare({ ...command, version: 99 }),
    ShareConflictError
  );
  assert.equal(await getSharedWrap('invalid'), null);
  const link = await updateWrapShare(command);
  assert.match(link.token!, /^[a-f0-9]{32}$/);
  assert.equal(link.active, true);
  assert.deepEqual(
    await updateWrapShare(command),
    link,
    'Repeated generate reuses the link'
  );
  const shared = await getSharedWrap(link.token!);
  assert.equal(shared?.color, '#cc3344');
  assert.equal(shared?.finish, 'satin');
  assert.equal(shared?.textureUrl, input.textureUrl);
  assert.equal('canvasJson' in shared!, false);
  assert.equal('userId' in shared!, false);
  const saved = await getWrap('share-owner', wrap.id);
  assert.equal(
    saved.openToGallery,
    false,
    'Sharing does not opt into the gallery'
  );
  assert.equal(saved.moderationStatus, 'private');
  assert.equal(saved.version, 1, 'Sharing does not edit the project');
  const edited = await saveWrap({
    ...input,
    wrapId: wrap.id,
    version: 1,
    textureUrl: 'https://fixture.invalid/two.webp',
    textureKey: 'fixture/two.webp',
    finish: 'matte',
  });
  assert.equal(
    (await getSharedWrap(link.token!))?.textureUrl,
    'https://fixture.invalid/two.webp',
    'Share shows latest saved design'
  );
  await assert.rejects(
    updateWrapShare({ ...command, action: 'disable', token: link.token! }),
    ShareConflictError
  );
  const toggle = { ...command, version: edited.version, token: link.token! };
  await updateWrapShare({ ...toggle, action: 'disable' });
  assert.equal(
    await getSharedWrap(link.token!),
    null,
    'Disabled link cannot be read'
  );
  assert.equal(
    (await updateWrapShare({ ...toggle, action: 'generate' })).active,
    false,
    'Generate retry never silently re-enables'
  );
  await updateWrapShare({ ...toggle, action: 'enable' });
  assert.ok(await getSharedWrap(link.token!));
  const renewed = await updateWrapShare({ ...toggle, action: 'regenerate' });
  assert.notEqual(renewed.token, link.token);
  assert.equal(
    await getSharedWrap(link.token!),
    null,
    'Regeneration revokes old address'
  );
  await assert.rejects(
    updateWrapShare({ ...toggle, action: 'enable' }),
    ShareConflictError,
    'Stale controls cannot restore a replaced token'
  );
  assert.ok(await getSharedWrap(renewed.token!));
  assert.equal(
    Number(
      (await client.execute('select count(*) as n from design')).rows[0].n
    ),
    0,
    'No gallery publication'
  );
  await deleteWrap('share-owner', wrap.id);
  assert.equal(
    await getSharedWrap(renewed.token!),
    null,
    'Deleted design cannot be shared'
  );
  await assert.rejects(
    getWrapShare('share-owner', wrap.id),
    ShareNotFoundError
  );
  assert.deepEqual((await client.execute('PRAGMA foreign_key_check')).rows, []);
  console.log(
    'PASS: owner-only management, latest saved preview, private gallery state, token reuse/rotation, disable/enable, stale-version rejection, deletion, and no editable-data exposure.'
  );
} finally {
  client.close();
}
