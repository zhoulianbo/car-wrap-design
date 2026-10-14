import type { StorageManager } from '@/core/storage';

import type { VehicleSlug } from './vehicle-catalog';

export function generationTemplateGuideKey(slug: VehicleSlug) {
  return `templates/ai-guides/${slug}.png`;
}

/** Guides are generated offline; fail before charging if the public file is missing. */
export async function prepareGenerationTemplateGuide(
  vehicleSlug: VehicleSlug,
  storage: StorageManager,
  onStage?: (stage: string) => void
) {
  onStage?.('guide_public_url');
  const guideUrl = storage.getPublicUrl({
    key: generationTemplateGuideKey(vehicleSlug),
  });
  if (!guideUrl) throw new Error('Storage unavailable');
  const url = new URL(guideUrl);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Invalid image URL');
  }
  onStage?.('guide_availability');
  const response = await fetch(url.href, {
    method: 'HEAD',
    // Workers does not support "error"; reject 3xx via response.ok below.
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error('Image unavailable', {
      cause: new Error(`AI guide for ${vehicleSlug}: HTTP ${response.status}`),
    });
  if (
    !response.headers.get('content-type')?.toLowerCase().startsWith('image/png')
  ) {
    throw new Error('Invalid image source', {
      cause: new Error(
        `AI guide for ${vehicleSlug} is not served as image/png`
      ),
    });
  }
  return url.href;
}
