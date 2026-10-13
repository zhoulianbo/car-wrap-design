import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { isVehicleFamily, isVehicleSlug } from '@/lib/vehicle-catalog';
import type { PublicDesignSummary } from '@/lib/wrap-types';

export type PublicGalleryPage = {
  items: PublicDesignSummary[];
  total: number;
  page: number;
  pageSize: number;
};

// These public loaders deliberately never read a session or personalize results.
// null distinguishes a failed request from a genuinely empty gallery.
export const getPublicGalleryPage = createServerFn()
  .inputValidator(
    z.object({
      page: z.number().int().min(1).max(100000),
      search: z.string().trim().max(120),
      vehicle: z.string().refine(isVehicleSlug).optional(),
      sort: z.enum(['latest', 'downloads', 'likes']),
    })
  )
  .handler(async ({ data }): Promise<PublicGalleryPage | null> => {
    try {
      const { listPublicDesignPage } =
        await import('@/modules/design-gallery/service');
      return (await listPublicDesignPage({
        ...data,
        pageSize: 20,
      })) as PublicGalleryPage;
    } catch {
      return null;
    }
  });

export const getPublicGalleryPreview = createServerFn()
  .inputValidator(
    z.object({
      limit: z.number().int().min(1).max(60),
      family: z.string().refine(isVehicleFamily).optional(),
    })
  )
  .handler(async ({ data }): Promise<PublicDesignSummary[] | null> => {
    try {
      const { listPublicDesigns } =
        await import('@/modules/design-gallery/service');
      return (await listPublicDesigns(
        data.limit,
        data.family
      )) as PublicDesignSummary[];
    } catch {
      return null;
    }
  });
