import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import { getBalance, getFrozenBalance } from '@/modules/credits/service';
import { getStorage } from '@/modules/storage/service';
import {
  getGenerationWrap,
  getWrap,
  getWrapDashboard,
  listWraps,
  saveWrap,
  WrapConflictError,
} from '@/modules/user-wraps/service';
import { copyWrapSource } from '@/lib/copy-wrap-source';
import { respData, respErr } from '@/lib/resp';
import { isVehicleSlug } from '@/lib/vehicle-catalog';
import { validateWrapDocument } from '@/lib/wrap-document';
import { readWebp, storeWrapImage } from '@/lib/wrap-image-storage';
import { removeUnusedWrapImages } from '@/lib/wrap-storage-cleanup';

async function sessionUser(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  return session?.user;
}

async function GET({ request }: { request: Request }) {
  try {
    const user = await sessionUser(request);
    if (!user) return respErr('Unauthorized', { status: 401 });
    const search = new URL(request.url).searchParams;
    if (search.has('generation'))
      return respData(
        await getGenerationWrap(user.id, search.get('generation')!)
      );
    if (search.get('view') === 'dashboard') {
      const parsed = z
        .object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(48).default(12),
          utcOffset: z.coerce.number().int().min(-840).max(840).default(0),
        })
        .safeParse(Object.fromEntries(search));
      if (!parsed.success) return respErr('Invalid query', { status: 400 });
      const [dashboard, balance, frozen] = await Promise.all([
        getWrapDashboard({ userId: user.id, ...parsed.data }),
        getBalance(user.id),
        getFrozenBalance(user.id),
      ]);
      return respData({
        ...dashboard,
        balance: balance + frozen,
        available: balance,
        frozen,
      });
    }
    return respData(await listWraps(user.id));
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to list wraps'
    );
  }
}

const createSchema = z.object({
  vehicleSlug: z.string().min(1),
  wrapId: z.string().optional(),
  version: z.number().int().positive().optional(),
  usesAi: z.boolean().default(false),
  openToGallery: z.boolean().optional(),
  canvasJson: z.string().max(2_000_000),
  finish: z.enum(['gloss', 'satin', 'matte', 'metallic', 'pearlescent']),
  sourceDesignId: z.string().optional(),
  idempotencyKey: z.string().min(8).max(120),
});

async function POST({ request }: { request: Request }) {
  try {
    const user = await sessionUser(request);
    if (!user) return respErr('Unauthorized', { status: 401 });
    const form = await request.formData();
    const parsed = createSchema.safeParse(
      JSON.parse(String(form.get('data') || '{}'))
    );
    if (!parsed.success) return respErr('Invalid wrap data', { status: 400 });
    if (!isVehicleSlug(parsed.data.vehicleSlug)) {
      return respErr('Unsupported vehicle', { status: 400 });
    }
    validateWrapDocument(parsed.data.canvasJson);
    const existing = parsed.data.wrapId
      ? await getWrap(user.id, parsed.data.wrapId)
      : undefined;
    if (existing) {
      if (existing.version !== parsed.data.version)
        throw new WrapConflictError('Wrap changed in another tab');
    }
    // Validate the texture before writing. Commit its reference with the snapshot.
    const textureBody = await readWebp(form.get('texture'), 10 * 1024 * 1024);
    const storage = await getStorage({ root: true });
    if (!storage) return respErr('Storage is not configured', { status: 503 });
    const texture = await storeWrapImage(storage, textureBody, 'design');
    const uploaded = [{ key: texture.key, url: texture.url }];
    try {
      const newId = parsed.data.wrapId || crypto.randomUUID();
      const configs = await getAllConfigs();
      const source = await copyWrapSource({
        canvasJson: parsed.data.canvasJson,
        previousCanvasJson: existing?.canvasJson,
        sourceDesignId: existing?.sourceDesignId || parsed.data.sourceDesignId,
        wrapId: newId,
        storage,
        storageDomain: configs.r2_domain,
      });
      uploaded.push(...source.images);
      const saved = await saveWrap({
        ...parsed.data,
        newId,
        canvasJson: source.canvasJson,
        usesAi: parsed.data.usesAi || source.usesAi,
        userId: user.id,
        vehicleSlug: parsed.data.vehicleSlug,
        textureKey: texture.key,
        textureUrl: texture.url,
      });
      await removeUnusedWrapImages(storage, [
        { key: existing?.textureKey, url: existing?.textureUrl },
        ...uploaded,
      ]);
      return respData(saved, { status: 201 });
    } catch (error) {
      await removeUnusedWrapImages(storage, uploaded);
      throw error;
    }
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to save wrap',
      { status: error instanceof WrapConflictError ? 409 : 400 }
    );
  }
}

export const Route = createFileRoute('/api/wraps/')({
  server: { handlers: { GET, POST } },
});
