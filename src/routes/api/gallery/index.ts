import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import {
  listHeroDesigns,
  listPublicDesignPage,
  listPublicDesigns,
} from '@/modules/design-gallery/service';
import { respData, respErr } from '@/lib/resp';
import { isVehicleFamily, isVehicleSlug } from '@/lib/vehicle-catalog';

async function GET({ request }: { request: Request }) {
  try {
    const params = new URL(request.url).searchParams;
    if (params.get('hero') === '1') {
      const vehicleSlug = params.get('vehicle');
      if (!vehicleSlug || !isVehicleSlug(vehicleSlug))
        return respErr('Unsupported vehicle', { status: 400 });
      return respData(await listHeroDesigns(vehicleSlug));
    }
    if (params.has('page')) {
      const parsed = z
        .object({
          page: z.coerce.number().int().min(1).max(100000).default(1),
          pageSize: z.coerce.number().int().min(1).max(50).default(20),
          search: z.string().trim().max(120).default(''),
          exclude: z.string().max(160).optional(),
          vehicle: z.string().refine(isVehicleSlug).optional(),
          sort: z.enum(['latest', 'downloads', 'likes']).default('latest'),
        })
        .safeParse(Object.fromEntries(params));
      if (!parsed.success)
        return respErr('Invalid gallery filters', { status: 400 });
      return respData(
        await listPublicDesignPage({
          ...parsed.data,
        }),
        {
          headers: { 'Cache-Control': 'private, no-store' },
        }
      );
    }
    const limit = Number(params.get('limit') || 24);
    if (!Number.isInteger(limit) || limit < 1 || limit > 60)
      return respErr('Invalid limit', { status: 400 });
    const family = params.get('family');
    if (family !== null && !isVehicleFamily(family))
      return respErr('Invalid vehicle family', { status: 400 });
    return respData(await listPublicDesigns(limit, family ?? undefined));
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to load gallery'
    );
  }
}

export const Route = createFileRoute('/api/gallery/')({
  server: { handlers: { GET } },
});
