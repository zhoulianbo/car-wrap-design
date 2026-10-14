import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import type { StorageManager } from '@/core/storage';
import { design } from '@/config/db/schema';

import { createStorageKey } from './storage-key';

/** Saved remixes own an immutable base image, so later gallery replacement cannot alter their layers. */
export async function copyWrapSource(input: {
  canvasJson: string;
  previousCanvasJson?: string;
  sourceDesignId?: string;
  wrapId: string;
  storage: StorageManager;
  storageDomain: string;
}) {
  const document = JSON.parse(input.canvasJson);
  // The editor may still hold the original gallery URL after its first save.
  // Reuse the owned base by stable layer ID before looking up the publication.
  const previousNodes = JSON.parse(
    input.previousCanvasJson || '{"nodes":[]}'
  ).nodes;
  for (const node of document.nodes) {
    if (node.kind !== 'image' || !node.imageUrl?.startsWith('/api/gallery/'))
      continue;
    const previous = previousNodes.find(
      (item: any) => item.id === node.id && item.kind === 'image'
    );
    if (
      previous?.imageUrl?.startsWith(
        `/api/wraps/${input.wrapId}?texture=1&source=`
      )
    )
      node.imageUrl = previous.imageUrl;
  }
  const canvasJson = JSON.stringify(document);
  if (!input.sourceDesignId)
    return {
      canvasJson,
      usesAi: false,
      images: [] as { key: string; url: string }[],
    };
  const [source] = await db()
    .select()
    .from(design)
    .where(
      and(
        eq(design.id, input.sourceDesignId),
        eq(design.visibility, 'public'),
        eq(design.moderationStatus, 'approved'),
        isNull(design.deletedAt)
      )
    )
    .limit(1);
  const references = document.nodes.filter(
    (node: any) =>
      node.kind === 'image' &&
      typeof node.imageUrl === 'string' &&
      (node.imageUrl.startsWith('/api/gallery/') ||
        node.imageUrl === source?.textureUrl)
  );
  // Already-saved editable layers use owned sources, independent of the publication.
  if (!references.length)
    return {
      canvasJson,
      usesAi: Boolean(source?.usesAi),
      images: [],
    };
  if (!source?.textureUrl) throw new Error('Source design is unavailable');
  const url = new URL(source.textureUrl);
  if (
    !input.storageDomain ||
    url.protocol !== 'https:' ||
    url.origin !== new URL(input.storageDomain).origin ||
    url.username ||
    url.password
  )
    throw new Error('Invalid texture source');
  for (const node of references) {
    if (
      node.imageUrl.startsWith('/api/gallery/') &&
      new URL(node.imageUrl, 'https://local.invalid').pathname !==
        `/api/gallery/${encodeURIComponent(source.slug)}`
    )
      throw new Error('Invalid gallery layer');
    if (node.imageUrl.startsWith('/api/gallery/')) {
      const pinned = new URL(
        node.imageUrl,
        'https://local.invalid'
      ).searchParams.get('source');
      if (pinned && pinned !== source.textureUrl)
        throw new Error('Source design changed; reopen it from the gallery');
    }
  }
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
  const contentType = response.headers.get('content-type')?.split(';')[0];
  if (
    !response.ok ||
    !contentType ||
    !['image/png', 'image/webp', 'image/jpeg'].includes(contentType)
  )
    throw new Error('Source texture unavailable');
  const key = createStorageKey(
    'design',
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/jpeg'
        ? 'jpg'
        : 'webp'
  );
  const saved = await input.storage.uploadFile({
    key,
    body: new Uint8Array(await response.arrayBuffer()),
    contentType,
    disposition: 'inline',
  });
  if (!saved.success || !saved.url)
    throw new Error('Failed to preserve source layer');
  for (const node of references)
    node.imageUrl = `/api/wraps/${input.wrapId}?texture=1&source=${encodeURIComponent(saved.url)}`;
  return {
    canvasJson: JSON.stringify(document),
    usesAi: source.usesAi,
    images: [{ key: saved.key || key, url: saved.url }],
  };
}
