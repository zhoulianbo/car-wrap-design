import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAllConfigs } from '@/modules/config/service';
import {
  getPublicDesign,
  getPublicDesignTextureKey,
  recordDesignDownload,
  setDesignLike,
} from '@/modules/design-gallery/service';
import { respData, respErr } from '@/lib/resp';
import { storageObjectUrl } from '@/lib/storage-object-url';

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { designSlug: string };
}) {
  try {
    const search = new URL(request.url).searchParams;
    const download = search.get('download') === '1';
    const texture = download || search.get('texture') === '1';
    const result = await getPublicDesign(
      params.designSlug,
      !texture && search.get('view') !== '0'
    );
    if (download && result?.moderationStatus !== 'approved')
      return respErr('Design not found', { status: 404 });
    if (
      texture &&
      search.has('source') &&
      search.get('source') !== result?.textureUrl
    )
      return respErr('Source design changed; reopen it from the gallery', {
        status: 409,
      });
    if (texture && result?.textureUrl) {
      // Canvas/WebGL requires CORS. Serve only this public design's image from
      // the configured storage origin; never accept a caller-supplied URL.
      const configs = await getAllConfigs();
      if (!configs.r2_domain)
        return respErr('Storage unavailable', { status: 503 });
      let source: URL;
      try {
        source = storageObjectUrl(
          result.textureUrl,
          configs.r2_domain,
          await getPublicDesignTextureKey(result.id)
        );
      } catch {
        return respErr('Invalid texture source', { status: 502 });
      }
      const response = await fetch(source, {
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      });
      const contentType = response.headers.get('content-type')?.split(';')[0];
      if (
        !response.ok ||
        !contentType ||
        !['image/webp', 'image/png', 'image/jpeg'].includes(contentType)
      ) {
        return respErr('Texture unavailable', { status: 502 });
      }
      const body = download ? await response.arrayBuffer() : response.body;
      if (download) {
        if (request.signal.aborted) return new Response(null, { status: 499 });
        await recordDesignDownload(result.id);
      }
      return new Response(body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    if (texture) return respErr('Texture not found', { status: 404 });
    return result
      ? respData(result)
      : respErr('Design not found', { status: 404 });
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to load design'
    );
  }
}

async function POST({
  request,
  params,
}: {
  request: Request;
  params: { designSlug: string };
}) {
  try {
    // Counter mutations accept only same-origin browser requests.
    if (request.headers.get('origin') !== new URL(request.url).origin)
      return respErr('Invalid origin', { status: 403 });
    const parsed = z
      .object({ liked: z.boolean() })
      .safeParse(await request.json());
    if (!parsed.success) return respErr('Invalid like', { status: 400 });
    return respData(await setDesignLike(params.designSlug, parsed.data.liked));
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Unable to update like'
    );
  }
}

export const Route = createFileRoute('/api/gallery/$designSlug')({
  server: { handlers: { GET, POST } },
});
