import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  ne,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { atomicOperation } from '@/core/db/atomic';
import {
  aiGeneration,
  aiTask,
  design,
  designRemix,
  designReport,
  user,
  userWrap,
} from '@/config/db/schema';
import { readGenerationCover } from '@/lib/generation-cover';
import {
  getVehicleAssetConfig,
  VEHICLE_ASSET_MANIFEST,
  type VehicleFamily,
  type VehicleSlug,
} from '@/lib/vehicle-catalog';
import { imageWrapDocument } from '@/lib/wrap-document';
import { aiWrapName, vehicleWrapName } from '@/lib/wrap-naming';

export async function getAdminDesignByKey(publishKey: string) {
  const [existing] = await db()
    .select()
    .from(design)
    .where(eq(design.publishKey, publishKey))
    .limit(1);
  return existing;
}

export async function requireDesignOwner(ownerId: string) {
  const [owner] = await db()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, ownerId))
    .limit(1);
  if (!owner) throw new Error('User not found');
}

/** Admin uploads use the same editable wrap and immutable gallery snapshot as the studio. */
export async function createAdminDesign(params: {
  ownerId: string;
  vehicleSlug: VehicleSlug;
  title: string;
  publishKey: string;
  textureKey: string;
  textureUrl: string;
  coverKey: string;
  coverUrl: string;
}) {
  const existing = await getAdminDesignByKey(params.publishKey);
  if (existing) return existing;
  await requireDesignOwner(params.ownerId);
  const id = crypto.randomUUID();
  const wrapId = crypto.randomUUID();
  const snapshot = {
    vehicleSlug: params.vehicleSlug,
    templateVersion: getVehicleAssetConfig(params.vehicleSlug).templateVersion,
    textureKey: params.textureKey,
    textureUrl: params.textureUrl,
    coverKey: params.coverKey,
    coverUrl: params.coverUrl,
    finish: 'gloss',
  };
  const wrap = {
    name: params.title.trim(),
    vehicleSlug: snapshot.vehicleSlug,
    templateVersion: snapshot.templateVersion,
    textureKey: snapshot.textureKey,
    textureUrl: snapshot.textureUrl,
    finish: snapshot.finish,
    moderationStatus: 'approved',
    usesAi: false,
    openToGallery: true,
    id: wrapId,
    userId: params.ownerId,
    canvasJson: JSON.stringify(
      imageWrapDocument(
        `/api/wraps/${wrapId}?texture=1&source=${encodeURIComponent(params.textureUrl)}`,
        params.title
      )
    ),
    idempotencyKey: params.publishKey,
    status: 'saved',
  };
  const publication = {
    ...snapshot,
    id,
    ownerId: params.ownerId,
    sourceWrapId: wrapId,
    slug: `${slugify(params.title)}-${id.slice(0, 8)}`,
    title: params.title,
    snapshotJson: JSON.stringify(
      imageWrapDocument(params.textureUrl, params.title)
    ),
    visibility: 'public',
    moderationStatus: 'approved',
    usesAi: false,
    publicPrompt: false,
    publishKey: params.publishKey,
  };
  const database = db();
  try {
    // D1 supports atomic batches, but not interactive transactions.
    if (typeof database.batch === 'function') {
      await database.batch([
        database.insert(userWrap).values(wrap),
        database.insert(design).values(publication),
      ]);
    } else {
      await database.transaction(async (tx: ReturnType<typeof db>) => {
        await tx.insert(userWrap).values(wrap);
        await tx.insert(design).values(publication);
      });
    }
  } catch (error) {
    const duplicate = await getAdminDesignByKey(params.publishKey);
    if (duplicate) return duplicate;
    throw error;
  }
  return publication;
}

function publicDesignSelection() {
  return {
    id: design.id,
    authorName: user.name,
    authorImage: user.image,
    slug: design.slug,
    title: design.title,
    description: design.description,
    coverUrl: design.coverUrl,
    textureUrl: design.textureUrl,
    vehicleSlug: design.vehicleSlug,
    finish: design.finish,
    templateVersion: design.templateVersion,
    usesAi: design.usesAi,
    publicPrompt: design.publicPrompt,
    prompt: sql<
      string | null
    >`case when ${design.publicPrompt} then ${design.prompt} else null end`,
    moderationStatus: design.moderationStatus,
    viewCount: design.viewCount,
    downloadCount: design.downloadCount,
    likeCount: design.likeCount,
    remixCount: design.remixCount,
    shareCount: design.shareCount,
    publishedAt: design.publishedAt,
  };
}

export async function listPublicDesigns(limit = 24, family?: VehicleFamily) {
  const rows = await db()
    .select(publicDesignSelection())
    .from(design)
    .innerJoin(user, eq(design.ownerId, user.id))
    .where(
      and(
        eq(design.visibility, 'public'),
        eq(design.moderationStatus, 'approved'),
        isNull(design.deletedAt),
        inArray(
          design.vehicleSlug,
          VEHICLE_ASSET_MANIFEST.filter(
            (vehicle) => !family || vehicle.family === family
          ).map((vehicle) => vehicle.slug)
        )
      )
    )
    .orderBy(desc(design.publishedAt))
    .limit(Math.min(Math.max(limit, 1), 60));
  return rows;
}

export async function listPublicDesignPage(params: {
  page: number;
  pageSize: number;
  search: string;
  vehicle?: VehicleSlug;
  sort: 'latest' | 'downloads' | 'likes';
  exclude?: string;
}) {
  const where = and(
    eq(design.visibility, 'public'),
    eq(design.moderationStatus, 'approved'),
    isNull(design.deletedAt),
    params.vehicle ? eq(design.vehicleSlug, params.vehicle) : undefined,
    params.exclude ? sql`${design.slug} <> ${params.exclude}` : undefined,
    // Treat wildcard characters in design names as literal text.
    params.search
      ? sql`lower(${design.title}) like ${`%${params.search.toLowerCase().replace(/[!%_]/g, '!$&')}%`} escape '!'`
      : undefined
  );
  const [count] = await db()
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(design)
    .where(where);
  const total = count.total as number;
  const page = Math.min(
    params.page,
    Math.max(1, Math.ceil(total / params.pageSize))
  );
  const order =
    params.sort === 'downloads'
      ? desc(design.downloadCount)
      : params.sort === 'likes'
        ? desc(design.likeCount)
        : desc(design.publishedAt);
  const items = await db()
    .select(publicDesignSelection())
    .from(design)
    .innerJoin(user, eq(design.ownerId, user.id))
    .where(where)
    .orderBy(order, desc(design.publishedAt), desc(design.id))
    .limit(params.pageSize)
    .offset((page - 1) * params.pageSize);
  return { items, total, page, pageSize: params.pageSize };
}

/** Anonymous, aggregate-only likes. The browser owns this visit's toggle state. */
export async function setDesignLike(slug: string, liked: boolean) {
  const [item] = await db()
    .update(design)
    .set({
      likeCount: liked
        ? sql`${design.likeCount} + 1`
        : sql`case when ${design.likeCount} > 0 then ${design.likeCount} - 1 else 0 end`,
    })
    .where(
      and(
        eq(design.slug, slug),
        eq(design.visibility, 'public'),
        eq(design.moderationStatus, 'approved'),
        isNull(design.deletedAt)
      )
    )
    .returning({ likeCount: design.likeCount });
  if (!item) throw new Error('Design not found');
  return { likeCount: item.likeCount };
}

/** Count only successfully served downloads of approved public designs. */
export async function recordDesignDownload(id: string) {
  await db()
    .update(design)
    .set({ downloadCount: sql`${design.downloadCount} + 1` })
    .where(
      and(
        eq(design.id, id),
        eq(design.visibility, 'public'),
        eq(design.moderationStatus, 'approved'),
        isNull(design.deletedAt)
      )
    );
}

/** Curated, approved designs only; a model never receives another model's UV texture. */
export async function listHeroDesigns(vehicleSlug: VehicleSlug) {
  return db()
    .select({
      id: design.id,
      slug: design.slug,
      title: design.title,
      vehicleSlug: design.vehicleSlug,
      coverUrl: design.coverUrl,
      finish: design.finish,
    })
    .from(design)
    .where(
      and(
        eq(design.vehicleSlug, vehicleSlug),
        eq(design.showInHero, true),
        eq(design.visibility, 'public'),
        eq(design.moderationStatus, 'approved'),
        isNull(design.deletedAt),
        isNotNull(design.textureUrl),
        isNotNull(design.coverUrl)
      )
    )
    .orderBy(desc(design.publishedAt), desc(design.id))
    .limit(8);
}

export async function setDesignHeroVisibility(
  designId: string,
  showInHero: boolean
) {
  const [updated] = await db()
    .update(design)
    .set({ showInHero })
    .where(and(eq(design.id, designId), isNull(design.deletedAt)))
    .returning();
  if (!updated) throw new Error('Design not found');
  return updated;
}

export async function listApprovedDesignSitemapEntries() {
  return db()
    .select({ slug: design.slug, publishedAt: design.publishedAt })
    .from(design)
    .where(
      and(
        eq(design.visibility, 'public'),
        eq(design.moderationStatus, 'approved'),
        isNull(design.deletedAt)
      )
    )
    .orderBy(desc(design.publishedAt));
}

export async function getPublicDesign(slug: string, recordView = true) {
  const [row] = await db()
    .select(publicDesignSelection())
    .from(design)
    .innerJoin(user, eq(design.ownerId, user.id))
    .where(
      and(
        eq(design.slug, slug),
        eq(design.visibility, 'public'),
        eq(design.moderationStatus, 'approved'),
        isNull(design.deletedAt)
      )
    )
    .limit(1);
  if (!row) return null;
  // Older AI publications predate prompt snapshots. Resolve only the owning
  // wrap's successful generation; never expose another user's task prompt.
  if (row.usesAi && !row.prompt) {
    const [source] = await db()
      .select({ prompt: aiGeneration.prompt })
      .from(design)
      .innerJoin(
        userWrap,
        and(
          eq(userWrap.id, design.sourceWrapId),
          eq(userWrap.userId, design.ownerId)
        )
      )
      .innerJoin(
        aiGeneration,
        and(
          eq(aiGeneration.id, userWrap.generationId),
          eq(aiGeneration.userId, userWrap.userId)
        )
      )
      .where(
        and(
          eq(design.id, row.id),
          eq(aiGeneration.status, 'succeeded'),
          isNull(userWrap.deletedAt)
        )
      )
      .limit(1);
    if (source?.prompt?.trim()) {
      row.prompt = source.prompt;
      row.publicPrompt = true;
    }
  }
  if (recordView) {
    await db()
      .update(design)
      .set({ viewCount: sql`${design.viewCount} + 1` })
      .where(eq(design.id, row.id));
  }
  return { ...row, viewCount: row.viewCount + (recordView ? 1 : 0) };
}

/** Server-only object identity for migrating a public texture's storage domain. */
export async function getPublicDesignTextureKey(id: string) {
  const [row] = await db()
    .select({ textureKey: design.textureKey })
    .from(design)
    .where(
      and(
        eq(design.id, id),
        eq(design.visibility, 'public'),
        eq(design.moderationStatus, 'approved'),
        isNull(design.deletedAt)
      )
    )
    .limit(1);
  return row?.textureKey;
}

export async function getPublicDesignMetadata(slug: string) {
  const [row] = await db()
    .select({
      slug: design.slug,
      title: design.title,
      description: design.description,
      coverUrl: design.coverUrl,
      authorName: user.name,
      moderationStatus: design.moderationStatus,
    })
    .from(design)
    .innerJoin(user, eq(design.ownerId, user.id))
    .where(
      and(
        eq(design.slug, slug),
        eq(design.visibility, 'public'),
        eq(design.moderationStatus, 'approved'),
        isNull(design.deletedAt)
      )
    )
    .limit(1);
  if (!row) return null;
  return row;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 56) || 'wrap-design'
  );
}

export async function publishDesign(params: {
  userId: string;
  wrapId?: string;
  generationId?: string;
  title: string;
  description?: string;
  visibility: 'public' | 'unlisted';
  usesAi?: boolean;
  publicPrompt?: boolean;
  prompt?: string;
  publishKey: string;
}) {
  if (Boolean(params.wrapId) === Boolean(params.generationId))
    throw new Error('Select one saved wrap or generated image');
  const [wrap] = await db()
    .select()
    .from(userWrap)
    .where(
      and(
        eq(userWrap.userId, params.userId),
        isNull(userWrap.deletedAt),
        params.wrapId
          ? eq(userWrap.id, params.wrapId)
          : eq(userWrap.generationId, params.generationId!)
      )
    )
    .limit(1);
  if (!wrap?.textureKey || !wrap.textureUrl)
    throw new Error('Save the wrap before submitting');
  if (
    wrap.openToGallery &&
    ['pending', 'approved'].includes(wrap.moderationStatus)
  )
    return { id: wrap.id, status: wrap.moderationStatus };
  await db()
    .update(userWrap)
    .set({
      openToGallery: true,
      moderationStatus: 'pending',
      updatedAt: wrap.updatedAt,
    })
    .where(
      and(
        eq(userWrap.id, wrap.id),
        eq(userWrap.version, wrap.version),
        isNull(userWrap.deletedAt)
      )
    );
  return { id: wrap.id, status: 'pending' };
}

export async function remixDesign(params: {
  userId: string;
  designId: string;
  idempotencyKey: string;
}) {
  const [source] = await db()
    .select()
    .from(design)
    .where(
      and(
        eq(design.id, params.designId),
        eq(design.visibility, 'public'),
        eq(design.moderationStatus, 'approved'),
        isNull(design.deletedAt)
      )
    )
    .limit(1);
  if (!source?.textureUrl) throw new Error('Design texture is unavailable');
  await atomicOperation(async (tx, read, commit) => {
    const [existing] = await read(
      tx
        .select()
        .from(designRemix)
        .where(eq(designRemix.idempotencyKey, params.idempotencyKey))
        .limit(1)
    );
    if (existing) {
      if (
        existing.userId !== params.userId ||
        existing.sourceDesignId !== source.id
      )
        throw new Error('Remix key is unavailable');
      return;
    }
    await commit([
      tx.insert(designRemix).values({
        id: crypto.randomUUID(),
        sourceDesignId: source.id,
        userId: params.userId,
        idempotencyKey: params.idempotencyKey,
      }),
      tx
        .update(design)
        .set({ remixCount: sql`${design.remixCount} + 1` })
        .where(eq(design.id, source.id)),
    ]);
  });
  // Opening a remix is a local draft. Only the editor Save action creates a user_wrap.
  return { vehicleSlug: source.vehicleSlug, designSlug: source.slug };
}

export async function reportDesign(params: {
  userId: string;
  designId: string;
  reason: string;
  details?: string;
  idempotencyKey: string;
}) {
  const [existing] = await db()
    .select()
    .from(designReport)
    .where(eq(designReport.idempotencyKey, params.idempotencyKey))
    .limit(1);
  if (existing) return existing;
  const [target] = await db()
    .select({ id: design.id })
    .from(design)
    .where(and(eq(design.id, params.designId), isNull(design.deletedAt)))
    .limit(1);
  if (!target) throw new Error('Design not found');
  const [created] = await db()
    .insert(designReport)
    .values({
      id: crypto.randomUUID(),
      designId: target.id,
      reporterId: params.userId,
      reason: params.reason,
      details: params.details,
      status: 'open',
      idempotencyKey: params.idempotencyKey,
    })
    .returning();
  await db()
    .update(design)
    .set({ moderationStatus: 'reported' })
    .where(eq(design.id, target.id));
  return created;
}

export async function listDesignsForModeration(params: {
  page: number;
  pageSize: number;
  status?: string;
  search?: string;
}) {
  const state = sql<string>`case when ${userWrap.openToGallery} = false then 'private' when ${userWrap.moderationStatus} in ('pending','rejected') then ${userWrap.moderationStatus} else coalesce(${design.moderationStatus}, ${userWrap.moderationStatus}) end`;
  const conditions = [isNull(userWrap.deletedAt)];
  if (params.status && params.status !== 'all')
    conditions.push(sql`${state} = ${params.status}`);
  if (params.search?.trim())
    conditions.push(
      or(
        like(design.title, `%${params.search.trim()}%`),
        like(userWrap.name, `%${params.search.trim()}%`),
        like(userWrap.vehicleSlug, `%${params.search.trim()}%`)
      )!
    );
  const join = and(
    eq(design.sourceWrapId, userWrap.id),
    isNull(design.deletedAt)
  );
  const [{ total }] = await db()
    .select({ total: sql<number>`count(*)` })
    .from(userWrap)
    .leftJoin(design, join)
    .where(and(...conditions));
  const rows = await db()
    .select({
      id: userWrap.id,
      wrapId: userWrap.id,
      name: userWrap.name,
      version: userWrap.version,
      designId: design.id,
      slug: design.slug,
      title: design.title,
      visibility: sql<string>`case when ${userWrap.openToGallery} = true then 'public' else 'private' end`,
      showInHero: design.showInHero,
      moderationStatus: state,
      usesAi: userWrap.usesAi,
      finish: userWrap.finish,
      ownerId: userWrap.userId,
      vehicleSlug: userWrap.vehicleSlug,
      textureUrl: userWrap.textureUrl,
      coverUrl: design.coverUrl,
      viewCount: design.viewCount,
      remixCount: design.remixCount,
      publishedAt: design.publishedAt,
      updatedAt: userWrap.updatedAt,
    })
    .from(userWrap)
    .leftJoin(design, join)
    .where(and(...conditions))
    .orderBy(desc(userWrap.updatedAt), desc(userWrap.id))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);
  return {
    items: rows.map((row: any) => ({
      ...row,
      title: row.name || row.title || vehicleWrapName(row.vehicleSlug),
      viewCount: row.viewCount || 0,
      remixCount: row.remixCount || 0,
      showInHero: Boolean(row.showInHero),
    })),
    total: Number(total),
  };
}

export async function getWrapForReview(wrapId: string, version: number) {
  const [wrap] = await db()
    .select()
    .from(userWrap)
    .where(
      and(
        eq(userWrap.id, wrapId),
        eq(userWrap.version, version),
        isNull(userWrap.deletedAt)
      )
    )
    .limit(1);
  if (!wrap) throw new Error('Wrap changed; refresh the review list');
  if (!wrap.openToGallery) throw new Error('Private wraps cannot be published');
  if (!wrap.textureKey || !wrap.textureUrl)
    throw new Error('Wrap texture is unavailable');
  return wrap;
}

/** Review the exact saved version used to render the cover. Preserve community identity and counters. */
export async function approveUserWrap(params: {
  wrapId: string;
  version: number;
  title: string;
  textureKey: string;
  textureUrl: string;
  coverKey: string;
  coverUrl: string;
}) {
  return atomicOperation(async (tx, read, commit) => {
    const [wrap] = await read(
      tx
        .select()
        .from(userWrap)
        .where(
          and(
            eq(userWrap.id, params.wrapId),
            eq(userWrap.version, params.version),
            eq(userWrap.openToGallery, true),
            isNull(userWrap.deletedAt)
          )
        )
        .limit(1)
        .for('update')
    );
    if (!wrap) throw new Error('Wrap changed; refresh the review list');
    const [existing] = await read(
      tx
        .select()
        .from(design)
        .where(and(eq(design.sourceWrapId, wrap.id), isNull(design.deletedAt)))
        .limit(1)
    );
    const [generation] =
      wrap.usesAi && wrap.generationId
        ? await read(
            tx
              .select({ prompt: aiGeneration.prompt })
              .from(aiGeneration)
              .where(
                and(
                  eq(aiGeneration.id, wrap.generationId),
                  eq(aiGeneration.userId, wrap.userId),
                  eq(aiGeneration.status, 'succeeded')
                )
              )
              .limit(1)
          )
        : [];
    const prompt =
      generation?.prompt || (existing?.publicPrompt ? existing.prompt : null);
    const snapshot = {
      ownerId: wrap.userId,
      sourceWrapId: wrap.id,
      sourceVersion: wrap.version,
      vehicleSlug: wrap.vehicleSlug,
      templateVersion: wrap.templateVersion,
      title: params.title.trim(),
      textureKey: params.textureKey,
      textureUrl: params.textureUrl,
      coverKey: params.coverKey,
      coverUrl: params.coverUrl,
      snapshotJson: JSON.stringify(imageWrapDocument(params.textureUrl)),
      finish: wrap.finish,
      usesAi: wrap.usesAi,
      prompt,
      publicPrompt: Boolean(wrap.usesAi && prompt?.trim()),
      visibility: 'public',
      moderationStatus: 'approved',
      updatedAt: new Date(),
    };
    const queries = [
      tx
        .update(userWrap)
        .set({
          moderationStatus: 'approved',
          name: params.title.trim(),
          updatedAt: sql`${userWrap.updatedAt}`,
        })
        .where(eq(userWrap.id, wrap.id)),
    ];
    if (existing)
      queries.push(
        tx
          .update(design)
          .set(snapshot)
          .where(eq(design.id, existing.id))
          .returning()
      );
    else {
      const id = crypto.randomUUID();
      queries.push(
        tx
          .insert(design)
          .values({
            ...snapshot,
            id,
            slug: `${slugify(params.title)}-${id.slice(0, 8)}`,
            publishKey: `wrap:${wrap.id}`,
            publishedAt: new Date(),
          })
          .returning()
      );
    }
    const results = await commit(queries);
    return { saved: results.at(-1)[0], previous: existing };
  });
}

export async function updateWrapModeration(params: {
  wrapId: string;
  version: number;
  status: string;
  title?: string;
}) {
  return atomicOperation(async (tx, read, commit) => {
    const [wrap] = await read(
      tx
        .select()
        .from(userWrap)
        .where(
          and(
            eq(userWrap.id, params.wrapId),
            eq(userWrap.version, params.version),
            isNull(userWrap.deletedAt)
          )
        )
        .limit(1)
        .for('update')
    );
    if (!wrap || !wrap.openToGallery)
      throw new Error('Wrap changed or is private');
    const [publication] = await read(
      tx
        .select()
        .from(design)
        .where(and(eq(design.sourceWrapId, wrap.id), isNull(design.deletedAt)))
        .limit(1)
    );
    const queries = [];
    if (params.status === 'rejected') {
      queries.push(
        tx
          .update(userWrap)
          .set({ moderationStatus: 'rejected', updatedAt: wrap.updatedAt })
          .where(
            and(eq(userWrap.id, wrap.id), eq(userWrap.version, params.version))
          )
      );
    } else {
      if (!publication || publication.sourceVersion !== wrap.version)
        throw new Error(
          'Approve the latest version before changing publication'
        );
      queries.push(
        tx
          .update(design)
          .set({
            moderationStatus: params.status,
          })
          .where(eq(design.id, publication.id))
      );
    }
    if (params.title !== undefined) {
      queries.push(
        tx
          .update(userWrap)
          .set({ name: params.title.trim(), updatedAt: wrap.updatedAt })
          .where(
            and(eq(userWrap.id, wrap.id), eq(userWrap.version, params.version))
          )
      );
      if (publication)
        queries.push(
          tx
            .update(design)
            .set({ title: params.title.trim() })
            .where(eq(design.id, publication.id))
        );
    }
    await commit(queries);
    return { id: wrap.id };
  });
}

const moderationStatuses = new Set([
  'pending',
  'approved',
  'rejected',
  'reported',
  'hidden',
]);

export async function moderateDesign(params: {
  designId: string;
  status: string;
  title?: string;
}) {
  if (!moderationStatuses.has(params.status)) {
    throw new Error('Invalid moderation status');
  }
  return atomicOperation(async (tx, read, commit) => {
    const [existing] = await read(
      tx
        .select()
        .from(design)
        .where(
          and(
            eq(design.id, params.designId),
            isNull(design.deletedAt),
            ne(design.visibility, 'private')
          )
        )
        .limit(1)
        .for('update')
    );
    if (!existing) throw new Error('Design not found');
    const queries = [
      tx
        .update(design)
        .set({
          moderationStatus: params.status,
          ...(params.title !== undefined ? { title: params.title.trim() } : {}),
        })
        .where(
          and(
            eq(design.id, params.designId),
            isNull(design.deletedAt),
            ne(design.visibility, 'private')
          )
        )
        .returning(),
    ];
    if (params.title !== undefined && existing.sourceWrapId) {
      queries.push(
        tx
          .update(userWrap)
          .set({
            name: params.title.trim(),
            updatedAt: sql`${userWrap.updatedAt}`,
          })
          .where(
            and(
              eq(userWrap.id, existing.sourceWrapId),
              isNull(userWrap.deletedAt)
            )
          )
      );
    }
    const [rows] = await commit(queries);
    return rows[0];
  });
}

export async function listDesignReports(params: {
  page: number;
  pageSize: number;
  status?: string;
}) {
  const conditions = [];
  if (params.status && params.status !== 'all') {
    conditions.push(eq(designReport.status, params.status));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [{ total }] = await db()
    .select({ total: sql<number>`count(*)` })
    .from(designReport)
    .where(where);
  const items = await db()
    .select({
      id: designReport.id,
      designId: designReport.designId,
      designSlug: design.slug,
      designTitle: design.title,
      textureUrl: design.textureUrl,
      coverUrl: design.coverUrl,
      reporterId: designReport.reporterId,
      reason: designReport.reason,
      details: designReport.details,
      status: designReport.status,
      resolutionNote: designReport.resolutionNote,
      createdAt: designReport.createdAt,
      resolvedAt: designReport.resolvedAt,
    })
    .from(designReport)
    .innerJoin(design, eq(designReport.designId, design.id))
    .where(where)
    .orderBy(desc(designReport.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);
  return { items, total: Number(total ?? 0) };
}

export async function resolveDesignReport(params: {
  reportId: string;
  adminUserId: string;
  status: 'resolved' | 'dismissed';
  resolutionNote?: string;
  designStatus?: string;
}) {
  if (params.designStatus && !moderationStatuses.has(params.designStatus)) {
    throw new Error('Invalid design moderation status');
  }
  const [target] = await db()
    .select({ designId: designReport.designId })
    .from(designReport)
    .where(eq(designReport.id, params.reportId))
    .limit(1);
  if (!target) throw new Error('Report not found');

  const [updated] = await db()
    .update(designReport)
    .set({
      status: params.status,
      resolutionNote: params.resolutionNote?.trim() || null,
      resolvedBy: params.adminUserId,
      resolvedAt: new Date(),
    })
    .where(eq(designReport.id, params.reportId))
    .returning();
  if (params.designStatus) {
    await moderateDesign({
      designId: target.designId,
      status: params.designStatus,
    });
  }
  return updated;
}
