import { asc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { footerLink, type FooterLink } from '@/config/db/schema';
import {
  FOOTER_LINK_KV_KEY,
  getFooterLinkKv,
  readFooterLinksFromKv,
} from '@/lib/footer-link-cache';
import {
  footerLinkInputSchema,
  normalizeFooterLinkRel,
  type FooterLinkItem,
} from '@/lib/footer-links';
import { getUuid } from '@/lib/hash';

function publicItem(row: FooterLink): FooterLinkItem {
  return {
    id: row.id,
    ...footerLinkInputSchema.parse({
      ...row,
      imageUrl: row.imageUrl ?? '',
      altText: row.altText ?? '',
      rel: normalizeFooterLinkRel(row.rel),
    }),
  };
}

export async function listFooterLinks(): Promise<FooterLinkItem[]> {
  const rows: FooterLink[] = await db()
    .select()
    .from(footerLink)
    .orderBy(
      asc(footerLink.group),
      asc(footerLink.sort),
      asc(footerLink.title),
      asc(footerLink.id)
    );
  return rows.map(publicItem);
}

export async function getPublicFooterLinks(): Promise<FooterLinkItem[]> {
  try {
    const kv = getFooterLinkKv();
    return kv ? await readFooterLinksFromKv(kv) : await listFooterLinks();
  } catch {
    // Footer availability must not take down unrelated pages. Do not use stale
    // isolate caches or query D1 when the production KV read fails.
    console.warn('[footer-links] Unable to load the public snapshot.');
    return [];
  }
}

export async function syncFooterLinksToKv(): Promise<{ synced: boolean }> {
  try {
    const kv = getFooterLinkKv();
    if (kv)
      await kv.put(FOOTER_LINK_KV_KEY, JSON.stringify(await listFooterLinks()));
    return { synced: true };
  } catch {
    console.warn('[footer-links] Database saved, but KV publication failed.');
    return { synced: false };
  }
}

export async function saveFooterLink(input: unknown, id?: string) {
  const value = footerLinkInputSchema.parse(input);
  getFooterLinkKv();
  const values = {
    ...value,
    rel: normalizeFooterLinkRel(value.rel),
    imageUrl: value.group === 'badge' ? value.imageUrl : null,
    altText: value.altText || null,
  };
  if (id) {
    const existing = await db()
      .select({ id: footerLink.id })
      .from(footerLink)
      .where(eq(footerLink.id, id))
      .limit(1);
    if (!existing.length) throw new Error('Not found');
    await db().update(footerLink).set(values).where(eq(footerLink.id, id));
  } else {
    await db()
      .insert(footerLink)
      .values({ id: getUuid(), ...values });
  }
  return syncFooterLinksToKv();
}

export async function deleteFooterLink(id: string) {
  getFooterLinkKv();
  await db().delete(footerLink).where(eq(footerLink.id, id));
  // Also publish for an already-deleted ID so retries repair the snapshot.
  return syncFooterLinksToKv();
}
