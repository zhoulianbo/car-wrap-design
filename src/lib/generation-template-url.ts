import { VEHICLE_TEMPLATE_SOURCE, type VehicleSlug } from './vehicle-catalog';

/** Provider references must be reachable outside the user's browser. */
export function generationTemplateUrl(
  slug: VehicleSlug,
  assetsUrl: string,
  appUrl: string
) {
  const path = VEHICLE_TEMPLATE_SOURCE[slug];
  const url = new URL(
    assetsUrl ? path.replace(/^\/imgs\//, '/') : path,
    assetsUrl || appUrl
  );
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(
      url.hostname
    ) ||
    url.hostname.endsWith('.localhost') ||
    !url.hostname.includes('.')
  )
    throw new Error(
      'Configure VITE_ASSETS_URL with a public HTTPS template domain before generating images'
    );
  return url.href;
}
