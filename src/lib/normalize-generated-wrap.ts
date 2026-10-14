import { envConfigs } from '@/config';

import { optimizeWrapPng } from './compress-wrap-png';
import { generationTemplateUrl } from './generation-template-url';
import { isVehicleSlug } from './vehicle-catalog';
import { fitWrapTexture, wrapTextureMask } from './wrap-texture';

// Bound Worker memory; failed requests are never cached.
const templates = new Map<string, ReturnType<typeof wrapTextureMask>>();

export async function normalizeGeneratedWrap(
  bytes: Uint8Array,
  vehicleSlug: string,
  baseColor?: string | null
) {
  if (!isVehicleSlug(vehicleSlug)) throw new Error('Unknown wrap vehicle');
  const url = generationTemplateUrl(
    vehicleSlug,
    envConfigs.assets_url,
    envConfigs.app_url
  );
  let mask = templates.get(url);
  if (!mask) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error('Wrap template unavailable');
    mask = wrapTextureMask(new Uint8Array(await response.arrayBuffer()));
    if (templates.size >= 2) templates.delete(templates.keys().next().value!);
    templates.set(url, mask);
  }
  return optimizeWrapPng(
    fitWrapTexture(bytes, mask, {
      baseColor,
      // Cybertruck reference wraps use a visibly wider border at 1024px.
      outlineWidth: vehicleSlug === 'cybertruck' ? 10 : 1.5,
    })
  );
}
