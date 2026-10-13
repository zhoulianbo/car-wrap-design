import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { atomicBatch, atomicOperation } from '@/core/db/atomic';
import type { StorageManager } from '@/core/storage';
import { user, userAsset } from '@/config/db/schema';

export async function listUserAssets(ownerId: string) {
  return db()
    .select({
      id: userAsset.id,
      url: userAsset.publicUrl,
      byteSize: userAsset.byteSize,
    })
    .from(userAsset)
    .where(and(eq(userAsset.ownerId, ownerId), isNull(userAsset.deletedAt)))
    .orderBy(desc(userAsset.createdAt));
}

export async function userAssetUsage(ownerId: string) {
  const [usage] = await db()
    .select({ total: sql<number>`coalesce(sum(${userAsset.byteSize}), 0)` })
    .from(userAsset)
    .where(and(eq(userAsset.ownerId, ownerId), isNull(userAsset.deletedAt)));
  return Number(usage.total);
}

export async function getUserAsset(ownerId: string, id: string) {
  const [asset] = await db()
    .select()
    .from(userAsset)
    .where(and(eq(userAsset.ownerId, ownerId), eq(userAsset.id, id)))
    .limit(1);
  return asset;
}

export async function deleteUserAsset(
  ownerId: string,
  id: string,
  storage: StorageManager
) {
  const asset = await getUserAsset(ownerId, id);
  if (!asset) return false;
  // Never release quota or report success while the original object remains.
  // Use only the owned record's exact key, not a key supplied by the request.
  await storage.deleteFile({ key: asset.storageKey });
  await atomicBatch((tx) => [
    tx.update(user).set({ updatedAt: new Date() }).where(eq(user.id, ownerId)),
    tx
      .update(userAsset)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(userAsset.ownerId, ownerId),
          eq(userAsset.id, id),
          isNull(userAsset.deletedAt)
        )
      ),
  ]);
  return true;
}

export async function recordUserUpload(params: {
  ownerId: string;
  key: string;
  url: string;
  byteSize: number;
  hash: string;
  limit: number;
}) {
  if (
    !Number.isSafeInteger(params.byteSize) ||
    params.byteSize <= 0 ||
    params.byteSize > params.limit
  )
    throw new Error('Storage limit reached');
  const id = crypto.randomUUID();
  // Serialize per-user writes and evaluate quota in the INSERT inside the batch.
  return atomicOperation(async (tx, _read, commit) => {
    const results = await commit([
      tx
        .update(user)
        .set({ updatedAt: new Date() })
        .where(eq(user.id, params.ownerId)),
      tx.insert(userAsset).select(
        sql`select
      ${id}, ${params.ownerId}, 'upload', 'upload', ${params.key}, ${params.url},
      'image/webp', ${params.byteSize}, null, null, ${params.hash}, 'private',
      ${sql.param(new Date(), userAsset.createdAt)}, null
      where (select coalesce(sum(${userAsset.byteSize}), 0) from ${userAsset}
        where ${userAsset.ownerId} = ${params.ownerId} and ${userAsset.deletedAt} is null)
        + ${params.byteSize} <= ${params.limit}`
      ),
      tx.select().from(userAsset).where(eq(userAsset.id, id)).limit(1),
    ]);
    const [created] = results[2];
    if (!created) throw new Error('Storage limit reached');
    return created;
  });
}
