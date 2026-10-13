import {
  and,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  sql,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { atomicOperation } from '@/core/db/atomic';
import {
  aiGeneration,
  credit,
  design,
  userAsset,
  userWrap,
} from '@/config/db/schema';
import {
  getVehicleAssetConfig,
  type PaintFinishKey,
  type VehicleSlug,
} from '@/lib/vehicle-catalog';
import { validateWrapDocument } from '@/lib/wrap-document';
import { vehicleWrapName } from '@/lib/wrap-naming';

export class WrapConflictError extends Error {}
export class WrapNotFoundError extends Error {}

export async function listWraps(userId: string) {
  const rows = await db()
    .select({
      id: userWrap.id,
      name: userWrap.name,
      vehicleSlug: userWrap.vehicleSlug,
      textureUrl: userWrap.textureUrl,
      finish: userWrap.finish,
      createdAt: userWrap.createdAt,
      updatedAt: userWrap.updatedAt,
    })
    .from(userWrap)
    .where(and(eq(userWrap.userId, userId), isNull(userWrap.deletedAt)))
    .orderBy(desc(userWrap.updatedAt));
  return rows.map((row: { name: string; vehicleSlug: VehicleSlug }) => ({
    ...row,
    name: row.name || vehicleWrapName(row.vehicleSlug),
  }));
}

export async function getWrapDashboard(params: {
  userId: string;
  page: number;
  pageSize: number;
  utcOffset: number;
  now?: Date;
}) {
  const { userId, page, pageSize, utcOffset } = params;
  const offset = utcOffset * 60_000;
  const dayStart = new Date(
    Math.floor(((params.now ?? new Date()).getTime() + offset) / 86_400_000) *
      86_400_000 -
      offset
  );
  const ownWraps = and(eq(userWrap.userId, userId), isNull(userWrap.deletedAt));
  const [wrapCounts, generationCounts, consumption, items] = await Promise.all([
    db().select({ total: count() }).from(userWrap).where(ownWraps),
    db()
      .select({ total: count() })
      .from(aiGeneration)
      .where(
        and(
          eq(aiGeneration.userId, userId),
          eq(aiGeneration.status, 'succeeded')
        )
      ),
    db()
      .select({ total: sql<number>`coalesce(sum(-${credit.credits}), 0)` })
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, 'consume'),
          eq(credit.status, 'active'),
          isNull(credit.deletedAt),
          gte(credit.createdAt, dayStart),
          lt(credit.createdAt, new Date(dayStart.getTime() + 86_400_000))
        )
      ),
    db()
      .select({
        id: userWrap.id,
        name: userWrap.name,
        vehicleSlug: userWrap.vehicleSlug,
        textureUrl: userWrap.textureUrl,
        updatedAt: userWrap.updatedAt,
      })
      .from(userWrap)
      .where(ownWraps)
      .orderBy(desc(userWrap.updatedAt), desc(userWrap.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);
  return {
    wrapCount: Number(wrapCounts[0]?.total ?? 0),
    generationCount: Number(generationCounts[0]?.total ?? 0),
    todayConsumed: Number(consumption[0]?.total ?? 0),
    items: items.map((item: { name: string; vehicleSlug: VehicleSlug }) => ({
      ...item,
      name: item.name || vehicleWrapName(item.vehicleSlug),
    })),
  };
}

export async function getWrap(userId: string, wrapId: string) {
  const [row] = await db()
    .select()
    .from(userWrap)
    .where(
      and(
        eq(userWrap.id, wrapId),
        eq(userWrap.userId, userId),
        isNull(userWrap.deletedAt)
      )
    )
    .limit(1);
  if (!row) throw new WrapNotFoundError('Wrap not found');
  const deletedAssets = await db()
    .select({ id: userAsset.id, url: userAsset.publicUrl })
    .from(userAsset)
    .where(and(eq(userAsset.ownerId, userId), isNotNull(userAsset.deletedAt)));
  const imageUrls: string[] = (JSON.parse(row.canvasJson || '{}').nodes ?? [])
    .filter(
      (node: { kind: string; imageUrl?: string }) =>
        node.kind === 'image' && node.imageUrl
    )
    .map((node: { imageUrl: string }) => node.imageUrl);
  const sourceAssetsDeleted = deletedAssets.some(
    (asset: { id: string; url: string | null }) =>
      imageUrls.some(
        (url) =>
          url === asset.url ||
          url === `/api/assets?image=${encodeURIComponent(asset.id)}`
      )
  );
  return {
    ...row,
    name: row.name || vehicleWrapName(row.vehicleSlug as VehicleSlug),
    sourceAssetsDeleted,
  };
}

export async function saveWrap(params: {
  userId: string;
  wrapId?: string;
  newId?: string;
  version?: number;
  vehicleSlug: VehicleSlug;
  canvasJson: string;
  finish: PaintFinishKey;
  idempotencyKey: string;
  textureKey: string;
  textureUrl: string;
  usesAi?: boolean;
  openToGallery?: boolean;
  sourceDesignId?: string;
}) {
  validateWrapDocument(params.canvasJson);
  const data = {
    canvasJson: params.canvasJson,
    finish: params.finish,
    textureKey: params.textureKey,
    textureUrl: params.textureUrl,
    updatedAt: new Date(),
  };
  if (params.wrapId) {
    const existing = await getWrap(params.userId, params.wrapId);
    if (existing.vehicleSlug !== params.vehicleSlug)
      throw new Error('Vehicle cannot change');
    const [saved] = await db()
      .update(userWrap)
      .set({
        ...data,
        usesAi: existing.usesAi || Boolean(params.usesAi),
        moderationStatus: existing.openToGallery ? 'pending' : 'private',
        version: (params.version ?? 0) + 1,
      })
      .where(
        and(
          eq(userWrap.id, params.wrapId),
          eq(userWrap.userId, params.userId),
          eq(userWrap.version, params.version ?? 0),
          isNull(userWrap.deletedAt)
        )
      )
      .returning();
    if (!saved) throw new WrapConflictError('Wrap changed in another tab');
    return {
      ...saved,
      name: saved.name || vehicleWrapName(params.vehicleSlug),
    };
  }
  const [duplicate] = await db()
    .select()
    .from(userWrap)
    .where(eq(userWrap.idempotencyKey, params.idempotencyKey))
    .limit(1);
  if (duplicate) {
    if (duplicate.userId !== params.userId || duplicate.deletedAt)
      throw new Error('Save key is unavailable');
    return {
      ...duplicate,
      name: duplicate.name || vehicleWrapName(params.vehicleSlug),
    };
  }
  const [saved] = await db()
    .insert(userWrap)
    .values({
      ...data,
      id: params.newId || crypto.randomUUID(),
      name: vehicleWrapName(params.vehicleSlug),
      userId: params.userId,
      vehicleSlug: params.vehicleSlug,
      templateVersion: getVehicleAssetConfig(params.vehicleSlug)
        .templateVersion,
      idempotencyKey: params.idempotencyKey,
      sourceDesignId: params.sourceDesignId,
      usesAi: Boolean(params.usesAi),
      openToGallery: params.openToGallery !== false,
      moderationStatus: params.openToGallery === false ? 'private' : 'pending',
      version: 1,
      status: 'saved',
    })
    .returning();
  return { ...saved, name: saved.name || vehicleWrapName(params.vehicleSlug) };
}

export async function deleteWrap(userId: string, wrapId: string) {
  return atomicOperation(async (tx, read, commit) => {
    const [existing] = await read(
      tx
        .select()
        .from(userWrap)
        .where(
          and(
            eq(userWrap.id, wrapId),
            eq(userWrap.userId, userId),
            isNull(userWrap.deletedAt)
          )
        )
        .limit(1)
    );
    if (!existing) throw new WrapNotFoundError('Wrap not found');
    const [deletedRows, publications] = await commit([
      tx
        .update(userWrap)
        .set({
          deletedAt: new Date(),
          status: 'deleted',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userWrap.id, wrapId),
            eq(userWrap.userId, userId),
            isNull(userWrap.deletedAt)
          )
        )
        .returning({
          id: userWrap.id,
          textureKey: userWrap.textureKey,
          textureUrl: userWrap.textureUrl,
        }),
      tx
        .update(design)
        .set({ deletedAt: new Date(), showInHero: false })
        .where(
          and(
            eq(design.sourceWrapId, wrapId),
            eq(design.ownerId, userId),
            isNull(design.deletedAt)
          )
        )
        .returning({
          textureKey: design.textureKey,
          textureUrl: design.textureUrl,
          coverKey: design.coverKey,
          coverUrl: design.coverUrl,
        }),
    ]);
    if (!deletedRows[0]) throw new WrapNotFoundError('Wrap not found');
    return { ...deletedRows[0], publications };
  });
}

export async function getGenerationWrap(userId: string, generationId: string) {
  const [wrap] = await db()
    .select({ id: userWrap.id })
    .from(userWrap)
    .where(
      and(
        eq(userWrap.userId, userId),
        eq(userWrap.generationId, generationId),
        isNull(userWrap.deletedAt)
      )
    )
    .limit(1);
  if (!wrap) throw new WrapNotFoundError('Generated wrap not found');
  return getWrap(userId, wrap.id);
}
