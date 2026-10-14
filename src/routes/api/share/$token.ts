import { createFileRoute } from '@tanstack/react-router';

import { getAllConfigs } from '@/modules/config/service';
import { getSharedWrap } from '@/modules/user-wraps/sharing';
import { respData, respErr } from '@/lib/resp';

const headers = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
};
async function GET({
  request,
  params,
}: {
  request: Request;
  params: { token: string };
}) {
  try {
    const wrap = await getSharedWrap(params.token);
    if (!wrap)
      return respErr('Share link unavailable', { status: 404, headers });
    if (new URL(request.url).searchParams.get('texture') !== '1') {
      return respData(
        {
          vehicleSlug: wrap.vehicleSlug,
          finish: wrap.finish,
          color: wrap.color,
          version: wrap.version,
        },
        { headers }
      );
    }
    const configs = await getAllConfigs();
    const source = new URL(wrap.textureUrl);
    if (
      !configs.r2_domain ||
      source.protocol !== 'https:' ||
      source.origin !== new URL(configs.r2_domain).origin ||
      source.username ||
      source.password
    )
      return respErr('Preview unavailable', { status: 502, headers });
    const image = await fetch(source, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    const type = image.headers.get('content-type')?.split(';')[0];
    if (
      !image.ok ||
      !type ||
      !['image/png', 'image/webp', 'image/jpeg'].includes(type)
    )
      return respErr('Preview unavailable', { status: 502, headers });
    return new Response(image.body, {
      headers: {
        ...headers,
        'Content-Type': type,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return respErr('Preview unavailable', { status: 500, headers });
  }
}
export const Route = createFileRoute('/api/share/$token')({
  server: { handlers: { GET } },
});
