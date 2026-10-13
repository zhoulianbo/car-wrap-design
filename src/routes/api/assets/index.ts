import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import { hasUserPaid } from '@/modules/payment/service';
import { getStorage } from '@/modules/storage/service';
import {
  deleteUserAsset,
  getUserAsset,
  listUserAssets,
  recordUserUpload,
  userAssetUsage,
} from '@/modules/user-wraps/assets';
import { md5 } from '@/lib/hash';
import { respData, respErr } from '@/lib/resp';
import { readWebp, storeWrapImage } from '@/lib/wrap-image-storage';

async function GET({ request }: { request: Request }) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return respErr('Unauthorized', { status: 401 });
  const imageId = new URL(request.url).searchParams.get('image');
  if (imageId) {
    try {
      const asset = await getUserAsset(session.user.id, imageId);
      if (!asset?.publicUrl || asset.deletedAt)
        return respErr('Asset not found', { status: 404 });
      const configs = await getAllConfigs();
      if (!configs.r2_domain)
        return respErr('Storage unavailable', { status: 503 });
      const source = new URL(asset.publicUrl);
      if (
        source.protocol !== 'https:' ||
        source.origin !== new URL(configs.r2_domain).origin ||
        source.username ||
        source.password
      )
        return respErr('Invalid image source', { status: 502 });
      const response = await fetch(source, {
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
      const type = response.headers.get('content-type')?.split(';')[0];
      if (
        !response.ok ||
        !type ||
        !['image/webp', 'image/png', 'image/jpeg'].includes(type)
      )
        return respErr('Image unavailable', { status: 502 });
      return new Response(response.body, {
        headers: {
          'Content-Type': type,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch {
      return respErr('Image unavailable', { status: 502 });
    }
  }
  const assets = await listUserAssets(session.user.id);
  const isPaid = await hasUserPaid(session.user.id);
  return respData({
    items: assets,
    usedBytes: assets.reduce(
      (sum: number, asset: { byteSize: number }) => sum + asset.byteSize,
      0
    ),
    limitBytes: (isPaid ? 50 : 5) * 1024 * 1024,
  });
}

async function POST({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const form = await request.formData();
    const kind = String(form.get('kind') || 'upload');
    if (!['upload', 'storage', 'ai-input'].includes(kind))
      return respErr('Only user uploads are accepted', { status: 400 });
    const isPaid = await hasUserPaid(session.user.id);
    const limit = (isPaid ? 50 : 5) * 1024 * 1024;
    const body = await readWebp(form.get('file'), limit);
    if ((await userAssetUsage(session.user.id)) + body.length > limit) {
      return respErr('Storage limit reached', { status: 413 });
    }
    const storage = await getStorage({ root: true });
    if (!storage) return respErr('Storage is not configured', { status: 503 });
    // References are reusable user attachments and count toward the same quota.
    const saved = await storeWrapImage(storage, body, 'storage');
    const asset = await recordUserUpload({
      ownerId: session.user.id,
      key: saved.key,
      url: saved.url,
      byteSize: body.length,
      hash: md5(body),
      limit,
    });
    return respData({ ...asset, url: saved.url }, { status: 201 });
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Upload failed', {
      status: 400,
    });
  }
}

async function DELETE({ request }: { request: Request }) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return respErr('Unauthorized', { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return respErr('Asset id required', { status: 400 });
  try {
    const asset = await getUserAsset(session.user.id, id);
    if (!asset) return respErr('Asset not found', { status: 404 });
    const storage = await getStorage({ root: true });
    if (!storage) return respErr('Storage is not configured', { status: 503 });
    await deleteUserAsset(session.user.id, id, storage);
    return respData({ id });
  } catch {
    return respErr('Failed to delete asset', { status: 500 });
  }
}

export const Route = createFileRoute('/api/assets/')({
  server: { handlers: { GET, POST, DELETE } },
});
