import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';
import {
  deleteWrap,
  getWrap,
  WrapNotFoundError,
} from '@/modules/user-wraps/service';
import { respData, respErr, respOk } from '@/lib/resp';
import { resolveWrapTextureSource } from '@/lib/wrap-document';
import { removeUnusedWrapImages } from '@/lib/wrap-storage-cleanup';

async function userId(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  return session?.user.id;
}

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  try {
    const user = await userId(request);
    if (!user) return respErr('Unauthorized', { status: 401 });
    const wrap = await getWrap(user, params.id);
    if (new URL(request.url).searchParams.get('texture') === '1') {
      const configs = await getAllConfigs();
      if (!wrap.textureUrl || !configs.r2_domain)
        return respErr('Texture unavailable', { status: 404 });
      // Pin restored layers to an immutable saved texture. Otherwise saving a
      // later edit would make the base layer reference its own new composite.
      const requestedSource = new URL(request.url).searchParams.get('source');
      const sourceUrl = resolveWrapTextureSource(wrap, requestedSource);
      if (!sourceUrl) return respErr('Texture not found', { status: 404 });
      const source = new URL(sourceUrl);
      if (
        source.protocol !== 'https:' ||
        source.origin !== new URL(configs.r2_domain).origin ||
        source.username ||
        source.password
      )
        return respErr('Invalid texture source', { status: 502 });
      const image = await fetch(source, {
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
      const type = image.headers.get('content-type')?.split(';')[0];
      if (
        !image.ok ||
        !type ||
        !['image/webp', 'image/png', 'image/jpeg'].includes(type)
      )
        return respErr('Texture unavailable', { status: 502 });
      // AI textures are normalized before storage; never re-mask or re-quantize
      // the saved image when restoring an editor layer.
      return new Response(image.body, {
        headers: {
          'Content-Type': type,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    return respData(wrap);
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to load wrap',
      { status: error instanceof WrapNotFoundError ? 404 : 500 }
    );
  }
}

async function DELETE({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  try {
    const user = await userId(request);
    if (!user) return respErr('Unauthorized', { status: 401 });
    const deleted = await deleteWrap(user, params.id);
    const storage = await getStorage({ root: true });
    if (storage)
      await removeUnusedWrapImages(storage, [
        { key: deleted.textureKey, url: deleted.textureUrl },
        ...deleted.publications.flatMap(
          (item: {
            textureKey: string | null;
            textureUrl: string | null;
            coverKey: string | null;
            coverUrl: string | null;
          }) => [
            { key: item.textureKey, url: item.textureUrl },
            { key: item.coverKey, url: item.coverUrl },
          ]
        ),
      ]);
    return respOk();
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to delete wrap',
      { status: error instanceof WrapNotFoundError ? 404 : 500 }
    );
  }
}

export const Route = createFileRoute('/api/wraps/$id')({
  server: { handlers: { GET, DELETE } },
});
