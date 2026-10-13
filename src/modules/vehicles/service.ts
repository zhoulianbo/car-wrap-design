import {
  PAINT_FINISHES,
  VEHICLE_ASSET_MANIFEST,
  VEHICLE_FAMILY_NAMES,
} from '@/lib/vehicle-catalog';
import type { VehicleCatalogEntry } from '@/lib/wrap-types';

const materialNames: Record<keyof typeof PAINT_FINISHES, string> = {
  gloss: 'Gloss',
  satin: 'Satin',
  matte: 'Matte',
  metallic: 'Metallic',
  pearlescent: 'Pearlescent',
};

export async function listVehicles(): Promise<VehicleCatalogEntry[]> {
  return VEHICLE_ASSET_MANIFEST.map((entry) => ({
    id: entry.slug,
    slug: entry.slug,
    brand: entry.brand,
    family: entry.family,
    modelName: VEHICLE_FAMILY_NAMES[entry.family],
    modelYear: /^\d{4}$/.test(entry.year) ? Number(entry.year) : null,
    trimName: entry.trim,
    editorEnabled: entry.editorEnabled,
    compatibilityStatus: entry.compatibilityStatus,
  }));
}

export async function listWrapMaterials() {
  return Object.keys(PAINT_FINISHES).map((presetKey, sort) => ({
    id: presetKey,
    presetKey,
    name: materialNames[presetKey as keyof typeof PAINT_FINISHES],
    sort,
  }));
}
