import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import {
  approveUserWrap,
  createAdminDesign,
  getAdminDesignByKey,
  getWrapForReview,
  listDesignsForModeration,
  requireDesignOwner,
  setDesignHeroVisibility,
  updateWrapModeration,
} from '@/modules/design-gallery/service';
import { hasPermission } from '@/modules/rbac/service';
import { getStorage } from '@/modules/storage/service';
import { respData, respErr, respPage } from '@/lib/resp';
import { createStorageKey } from '@/lib/storage-key';
import { isVehicleSlug } from '@/lib/vehicle-catalog';
import { readWebp, storeWrapImage } from '@/lib/wrap-image-storage';
import { removeUnusedWrapImages } from '@/lib/wrap-storage-cleanup';

async function checkAdmin(request: Request) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw new Error('Unauthorized');
  if (!(await hasPermission(session.user.id, 'admin.*'))) {
    throw new Error('Forbidden');
  }
  return session;
}

async function GET({ request }: { request: Request }) {
  try {
    await checkAdmin(request);
    const url = new URL(request.url);
    if (url.searchParams.has('wrapId')) {
      const wrap = await getWrapForReview(
        url.searchParams.get('wrapId')!,
        Number(url.searchParams.get('version'))
      );
      const image = await readReviewTexture(wrap.textureUrl!);
      return new Response(image.body, {
        headers: {
          'Content-Type': image.contentType,
          'Cache-Control': 'private, no-store',
        },
      });
    }
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('pageSize') || 20))
    );
    const result = await listDesignsForModeration({
      page,
      pageSize,
      status: url.searchParams.get('status') || undefined,
      search: url.searchParams.get('search') || undefined,
    });
    return respPage(result.items, result.total);
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

const updateSchema = z.union([
  z
    .object({
      id: z.string().min(1),
      version: z.number().int().positive(),
      status: z.enum(['pending', 'approved', 'rejected', 'reported', 'hidden']),
      title: z.string().trim().min(1).max(120).optional(),
    })
    .strict(),
  z.object({ id: z.string().min(1), showInHero: z.boolean() }).strict(),
]);

async function PATCH({ request }: { request: Request }) {
  try {
    await checkAdmin(request);
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await request.formData();
      const input = z
        .object({
          id: z.string().min(1),
          version: z.number().int().positive(),
          title: z.string().trim().min(1).max(120),
        })
        .parse(JSON.parse(String(form.get('data'))));
      const wrap = await getWrapForReview(input.id, input.version);
      const body = await readWebp(form.get('cover'), 5 * 1024 * 1024, 800);
      const storage = await getStorage({ root: true });
      if (!storage) throw new Error('Storage is not configured');
      const keys: { key: string; url?: string }[] = [];
      try {
        const image = await readReviewTexture(wrap.textureUrl!);
        const key = createStorageKey(
          'design',
          image.contentType === 'image/png'
            ? 'png'
            : image.contentType === 'image/jpeg'
              ? 'jpg'
              : 'webp'
        );
        const texture = await storage.uploadFile({
          key,
          body: image.body,
          contentType: image.contentType,
          disposition: 'inline',
        });
        if (!texture.success || !texture.url)
          throw new Error('Texture upload failed');
        keys.push({ key: texture.key || key, url: texture.url });
        const cover = await storeWrapImage(storage, body, 'cover');
        keys.push(cover);
        const result = await approveUserWrap({
          wrapId: wrap.id,
          version: input.version,
          title: input.title,
          textureKey: texture.key || key,
          textureUrl: texture.url,
          coverKey: cover.key,
          coverUrl: cover.url,
        });
        const previous = result.previous;
        const cleanupFailures = await removeUnusedWrapImages(storage, [
          { key: previous?.textureKey, url: previous?.textureUrl },
          { key: previous?.coverKey, url: previous?.coverUrl },
        ]);
        return respData({
          ...result.saved,
          cleanupPending: cleanupFailures.length > 0,
        });
      } catch (error) {
        await removeUnusedWrapImages(storage, keys);
        throw error;
      }
    }
    const input = updateSchema.parse(await request.json());
    if ('showInHero' in input) {
      return respData(
        await setDesignHeroVisibility(input.id, input.showInHero)
      );
    }
    return respData(
      await updateWrapModeration({
        wrapId: input.id,
        version: input.version,
        status: input.status,
        title: input.title,
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

export const Route = createFileRoute('/api/admin/designs')({
  server: { handlers: { GET, PATCH, POST } },
});

const createSchema = z.object({
  ownerId: z.string().min(1).max(120),
  vehicleSlug: z.string().refine(isVehicleSlug, 'Unsupported vehicle'),
  title: z.string().trim().min(1).max(120),
  idempotencyKey: z.uuid(),
});

async function POST({ request }: { request: Request }) {
  let storage: Awaited<ReturnType<typeof getStorage>> = null;
  const uploadedKeys: string[] = [];
  const cleanUp = async () => {
    await Promise.allSettled(
      uploadedKeys.map((key) => storage!.deleteFile({ key }))
    );
  };
  try {
    const session = await checkAdmin(request);
    const form = await request.formData();
    const input = createSchema.parse(
      JSON.parse(String(form.get('data') || '{}'))
    );
    if (!isVehicleSlug(input.vehicleSlug))
      throw new Error('Unsupported vehicle');
    const publishKey = `admin:${session.user.id}:${input.idempotencyKey}`;
    const existing = await getAdminDesignByKey(publishKey);
    if (existing) return respData(existing);
    await requireDesignOwner(input.ownerId);
    const textureBody = await readWebp(form.get('texture'), 10 * 1024 * 1024);
    const coverBody = await readWebp(form.get('cover'), 5 * 1024 * 1024, 800);
    storage = await getStorage({ root: true });
    if (!storage) return respErr('Storage is not configured', { status: 503 });
    const texture = await storeWrapImage(storage, textureBody, 'design');
    uploadedKeys.push(texture.key);
    const cover = await storeWrapImage(storage, coverBody, 'cover');
    uploadedKeys.push(cover.key);
    const saved = await createAdminDesign({
      ownerId: input.ownerId,
      vehicleSlug: input.vehicleSlug,
      title: input.title,
      publishKey,
      textureKey: texture.key,
      textureUrl: texture.url,
      coverKey: cover.key,
      coverUrl: cover.url,
    });
    // A concurrent retry may have already committed a different pair of images.
    if (saved.textureKey !== texture.key) await cleanUp();
    uploadedKeys.length = 0;
    return respData(saved, { status: 201 });
  } catch (error) {
    await cleanUp();
    const message =
      error instanceof Error ? error.message : 'Failed to add design';
    return respErr(message, {
      status:
        message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400,
    });
  }
}

async function readReviewTexture(url: string) {
  const configs = await getAllConfigs();
  const source = new URL(url);
  if (
    !configs.r2_domain ||
    source.protocol !== 'https:' ||
    source.origin !== new URL(configs.r2_domain).origin ||
    source.username ||
    source.password
  )
    throw new Error('Invalid texture source');
  const response = await fetch(source, {
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  const contentType = response.headers.get('content-type')?.split(';')[0];
  if (
    !response.ok ||
    !contentType ||
    !['image/png', 'image/webp', 'image/jpeg'].includes(contentType)
  )
    throw new Error('Texture unavailable');
  return { body: new Uint8Array(await response.arrayBuffer()), contentType };
}
