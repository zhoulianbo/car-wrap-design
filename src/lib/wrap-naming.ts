import {
  getVehicleAssetConfig,
  VEHICLE_FAMILY_NAMES,
  type VehicleSlug,
} from './vehicle-catalog';

export function vehicleWrapName(slug: VehicleSlug) {
  const vehicle = getVehicleAssetConfig(slug);
  return `${VEHICLE_FAMILY_NAMES[vehicle.family]} Wrap`;
}

/** Latin prompts use two words; other scripts use 16 units (ASCII 1, others 2). */
export function aiWrapName(prompt: string) {
  const text = prompt.trim().normalize('NFC');
  if (!text) return 'AI Car Wrap';
  const letters = text.match(/\p{L}/gu) ?? [];
  if (
    letters.length &&
    letters.every((letter) => /\p{Script=Latin}/u.test(letter))
  )
    return Array.from(text.split(/\s+/u).slice(0, 2).join(' '))
      .slice(0, 120)
      .join('');
  let name = '';
  let length = 0;
  for (const { segment } of new Intl.Segmenter(undefined, {
    granularity: 'grapheme',
  }).segment(text)) {
    const weight = /^[\x00-\x7f]$/.test(segment) ? 1 : 2;
    if (length + weight > 16) break;
    name += segment;
    length += weight;
  }
  return name.trimEnd();
}
