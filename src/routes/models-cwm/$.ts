import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { encryptedModelPath } from '@/lib/model-assets';
import { VEHICLE_ASSET_MANIFEST } from '@/lib/vehicle-catalog';

const allowedModelPaths = new Set(
  VEHICLE_ASSET_MANIFEST.flatMap((vehicle) => [
    encryptedModelPath(vehicle.bodyPath),
    encryptedModelPath(vehicle.wheelPath),
  ])
);

async function GET({ request }: { request: Request }) {
  const path = new URL(request.url).pathname;
  if (!allowedModelPaths.has(path)) {
    return new Response('Not found', { status: 404 });
  }

  const assetOrigin = envConfigs.assets_url.replace(/\/+$/, '');
  if (!assetOrigin.startsWith('https://')) {
    return new Response('Model asset origin is unavailable', { status: 503 });
  }

  const upstreamHeaders = new Headers();
  for (const header of ['if-none-match', 'if-modified-since', 'range']) {
    const value = request.headers.get(header);
    if (value) upstreamHeaders.set(header, value);
  }

  const upstream = await fetch(`${assetOrigin}${path}`, {
    headers: upstreamHeaders,
  });
  const headers = new Headers();
  for (const header of [
    'accept-ranges',
    'content-length',
    'content-range',
    'content-type',
    'etag',
    'last-modified',
  ]) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export const Route = createFileRoute('/models-cwm/$')({
  server: { handlers: { GET } },
});
