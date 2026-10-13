import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { userWrap } from '@/config/db/schema';
import type { PaintFinishKey, VehicleSlug } from '@/lib/vehicle-catalog';
import type { WrapShareLink } from '@/lib/wrap-types';

export class ShareNotFoundError extends Error {}
export class ShareConflictError extends Error {}

export async function getWrapShare(
  userId: string,
  wrapId: string
): Promise<WrapShareLink> {
  const [wrap] = await db()
    .select({ token: userWrap.shareToken, active: userWrap.shareEnabled })
    .from(userWrap)
    .where(
      and(
        eq(userWrap.id, wrapId),
        eq(userWrap.userId, userId),
        isNull(userWrap.deletedAt)
      )
    )
    .limit(1);
  if (!wrap) throw new ShareNotFoundError('Wrap not found');
  return wrap;
}

export async function updateWrapShare(params: {
  userId: string;
  wrapId: string;
  version: number;
  action: 'generate' | 'regenerate' | 'enable' | 'disable';
  token?: string;
}): Promise<WrapShareLink> {
  const owner = and(
    eq(userWrap.id, params.wrapId),
    eq(userWrap.userId, params.userId),
    isNull(userWrap.deletedAt)
  );
  const [wrap] = await db().select().from(userWrap).where(owner).limit(1);
  if (!wrap?.textureKey || !wrap.textureUrl)
    throw new ShareNotFoundError('Saved wrap not found');
  if (wrap.version !== params.version)
    throw new ShareConflictError('Wrap changed; reload before sharing');
  if (params.action === 'generate' && wrap.shareToken)
    return { token: wrap.shareToken, active: wrap.shareEnabled };
  if (
    params.action !== 'generate' &&
    (!params.token || params.token !== wrap.shareToken)
  )
    throw new ShareConflictError('Share link changed; reopen the dialog');
  const token =
    params.action === 'generate' || params.action === 'regenerate'
      ? crypto.randomUUID().replaceAll('-', '')
      : wrap.shareToken;
  await db()
    .update(userWrap)
    .set({
      shareToken: token,
      shareEnabled: params.action !== 'disable',
      // Sharing does not edit or publish the saved design.
      updatedAt: sql`${userWrap.updatedAt}`,
    })
    .where(
      and(
        owner,
        eq(userWrap.version, params.version),
        wrap.shareToken
          ? eq(userWrap.shareToken, wrap.shareToken)
          : isNull(userWrap.shareToken)
      )
    );
  const current = await getWrapShare(params.userId, params.wrapId);
  if (
    params.action !== 'generate' &&
    (current.token !== token ||
      current.active !== (params.action !== 'disable'))
  )
    throw new ShareConflictError('Share link changed; reopen the dialog');
  if (!current.token)
    throw new ShareConflictError('Wrap changed; save again before sharing');
  return current;
}

/** Only the composite preview is public. Never expose the editable document, user or asset IDs. */
export async function getSharedWrap(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const [wrap] = await db()
    .select({
      vehicleSlug: userWrap.vehicleSlug,
      finish: userWrap.finish,
      textureUrl: userWrap.textureUrl,
      version: userWrap.version,
      canvasJson: userWrap.canvasJson,
    })
    .from(userWrap)
    .where(
      and(
        eq(userWrap.shareToken, token),
        eq(userWrap.shareEnabled, true),
        isNull(userWrap.deletedAt)
      )
    )
    .limit(1);
  if (!wrap?.textureUrl) return null;
  let color = '#f4f5f6';
  try {
    const document = JSON.parse(wrap.canvasJson);
    const candidate = document.paintColor || document.background;
    if (typeof candidate === 'string' && /^#[a-f0-9]{6}$/i.test(candidate))
      color = candidate;
  } catch {
    /* Older saved wraps can lack a canvas document. */
  }
  return {
    vehicleSlug: wrap.vehicleSlug as VehicleSlug,
    finish: wrap.finish as PaintFinishKey,
    textureUrl: wrap.textureUrl as string,
    version: wrap.version as number,
    color,
  };
}
