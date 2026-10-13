import { apiPost, apiUpload } from '@/lib/api-client';
import { sanitizeImageFile } from '@/lib/image-file';
import type { VehicleSlug } from '@/lib/vehicle-catalog';
import { getLocale } from '@/paraglide/runtime.js';

export type WrapGenerationResult = {
  id: string;
  wrapId?: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  outputUrl?: string;
  errorSummary?: string | null;
  errorCode?: string | null;
};

export async function requestWrapGeneration(input: {
  vehicleSlug: VehicleSlug;
  prompt: string;
  file?: File;
  inputAssetIds?: string[];
  colors: string[];
  openToGallery: boolean;
}) {
  const inputAssetIds = [...(input.inputAssetIds ?? [])];
  if (input.file) {
    const form = new FormData();
    form.set(
      'file',
      await sanitizeImageFile(input.file, { maxBytes: 5 * 1024 * 1024 })
    );
    form.set('kind', 'ai-input');
    inputAssetIds.push(
      (await apiUpload<{ id: string }>('/api/assets', form)).id
    );
  }
  return apiPost<WrapGenerationResult>('/api/ai-generations', {
    vehicleSlug: input.vehicleSlug,
    prompt: input.prompt.trim(),
    locale: getLocale(),
    mode: inputAssetIds.length ? 'image-to-image' : 'text-to-image',
    inputAssetIds,
    preferredColors: input.colors,
    baseColor: input.colors[0],
    openToGallery: input.openToGallery,
    idempotencyKey: crypto.randomUUID(),
  });
}
