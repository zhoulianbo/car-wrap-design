export const VEHICLE_WHEEL_ANCHORS = [
  'Wheel_LF_Spatial',
  'Wheel_RF_Spatial',
  'Wheel_LR_Spatial',
  'Wheel_RR_Spatial',
] as const;

export type VehicleWheelAnchor = (typeof VEHICLE_WHEEL_ANCHORS)[number];

export const PAINT_FINISHES = {
  gloss: {
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 0,
    // Gloss vinyl is a dielectric; high metalness darkens the printed colors.
    metalness: 0.08,
    roughness: 0.22,
    sheen: 0,
  },
  satin: {
    clearcoat: 0.62,
    clearcoatRoughness: 0.2,
    iridescence: 0,
    metalness: 0.04,
    roughness: 0.4,
    sheen: 0.08,
  },
  matte: {
    clearcoat: 0.12,
    clearcoatRoughness: 0.68,
    iridescence: 0,
    metalness: 0.02,
    roughness: 0.7,
    sheen: 0.03,
  },
  metallic: {
    clearcoat: 0.92,
    clearcoatRoughness: 0.1,
    iridescence: 0.02,
    metalness: 0.58,
    roughness: 0.28,
    sheen: 0.08,
  },
  pearlescent: {
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 0.32,
    metalness: 0.08,
    roughness: 0.22,
    sheen: 0.24,
  },
} as const;

export type PaintFinishKey = keyof typeof PAINT_FINISHES;

export const VEHICLE_PAINT_COLORS = [
  '#f4f5f6',
  '#111318',
  '#e5262a',
  '#315eea',
  '#f2ca16',
  '#2fd374',
  '#8d5cff',
  '#16c7d9',
] as const;

export type VehicleSlug =
  | 'model-3-legacy'
  | 'model-3-2024-base'
  | 'model-3-2024-performance'
  | 'model-y-legacy'
  | 'model-y-2025-base'
  | 'model-y-2025-premium'
  | 'model-y-2025-performance'
  | 'model-y-l'
  | 'cybertruck'
  | 'model-s-2021'
  | 'model-s-2025-plaid'
  | 'model-x-2021';

export const VEHICLE_FAMILY_NAMES = {
  'model-3': 'Model 3',
  'model-y': 'Model Y',
  cybertruck: 'Cybertruck',
  'model-s': 'Model S',
  'model-x': 'Model X',
} as const;

export type VehicleFamily = keyof typeof VEHICLE_FAMILY_NAMES;

export function isVehicleFamily(value: string): value is VehicleFamily {
  return Object.hasOwn(VEHICLE_FAMILY_NAMES, value);
}

export interface VehicleCameraCalibration {
  /** Direction from the target to the initial camera, normalized at runtime. */
  positionDirection: readonly [number, number, number];
  targetHeightRatio: number;
  horizontalFill: number;
  verticalFill: number;
}

export interface VehicleAssetConfig {
  /** Add/remove this field to control the homepage vehicle picker. Lower order appears first. */
  hero?: { label: string; order: number; thumbnail?: string };
  slug: VehicleSlug;
  brand: 'Tesla';
  family: VehicleFamily;
  year: string;
  trim: string;
  bodyPath: string;
  wheelPath: string;
  wheelAnchors: readonly VehicleWheelAnchor[];
  camera: VehicleCameraCalibration;
  forwardAxis: 'x' | 'z';
  paintMaterialPattern: RegExp;
  paintMeshExclusionPattern: RegExp;
  uvSet: 0;
  templatePath: string;
  modelVersion: string;
  templateVersion: string;
  compatibilityStatus: 'pending' | 'verified';
  editorEnabled: boolean;
}

const DEFAULT_CAMERA: VehicleCameraCalibration = {
  positionDirection: [0.55, 0.22, -0.82],
  targetHeightRatio: 0.43,
  horizontalFill: 0.75,
  verticalFill: 0.52,
};

// These GLBs use Exterior for unpainted trim and wheel wells. Only Paint
// (including Blender's duplicated Paint.001 material) has the wrap UV layout.
const PAINT_MATERIAL_PATTERN = /^Paint(?:\.\d+)?$/i;
const NON_PAINT_MESH_PATTERN =
  /(interior|doorcard|dashboard|seat|screen|display|plate|wheel|tire|window|glass|light|carpet|fabric|rubber|trim|decor|console|steering|underhood|strut|locator|ground|floor)/i;

function vehicle(
  config: Omit<
    VehicleAssetConfig,
    | 'brand'
    | 'wheelAnchors'
    | 'camera'
    | 'paintMaterialPattern'
    | 'paintMeshExclusionPattern'
    | 'uvSet'
    | 'modelVersion'
    | 'templateVersion'
    | 'compatibilityStatus'
    | 'editorEnabled'
  >
): VehicleAssetConfig {
  return {
    ...config,
    brand: 'Tesla',
    wheelAnchors: VEHICLE_WHEEL_ANCHORS,
    camera:
      config.forwardAxis === 'z'
        ? {
            ...DEFAULT_CAMERA,
            positionDirection: [-0.78, 0.24, -0.58],
            horizontalFill: 0.98,
          }
        : DEFAULT_CAMERA,
    paintMaterialPattern: PAINT_MATERIAL_PATTERN,
    paintMeshExclusionPattern: NON_PAINT_MESH_PATTERN,
    uvSet: 0,
    modelVersion: '2026-10-04',
    templateVersion: 'tesla-custom-wraps-unverified',
    compatibilityStatus: 'pending',
    editorEnabled: false,
  };
}

export const VEHICLE_ASSET_MANIFEST = [
  vehicle({
    slug: 'model-3-legacy',
    hero: {
      label: 'Model 3',
      order: 2,
      thumbnail: '/imgs/vehicles/cards/model-3-legacy.webp',
    },
    family: 'model-3',
    year: 'Legacy',
    trim: 'Model 3',
    bodyPath: '/models/model3-high.glb',
    wheelPath: '/models/wheel-induction.glb',
    templatePath: '/imgs/templates/tesla/model-3-legacy.png',
    forwardAxis: 'x',
  }),
  vehicle({
    slug: 'model-3-2024-base',
    family: 'model-3',
    year: '2024',
    trim: 'Model 3 Base',
    bodyPath: '/models/model3-2024-base.glb',
    wheelPath: '/models/wheel-induction.glb',
    templatePath: '/imgs/templates/tesla/model-3-2024-base.png',
    forwardAxis: 'x',
  }),
  vehicle({
    slug: 'model-3-2024-performance',
    family: 'model-3',
    year: '2024',
    trim: 'Model 3 Performance',
    bodyPath: '/models/model3-2024-performance.glb',
    wheelPath: '/models/wheel-stiletto-silver.glb',
    templatePath: '/imgs/templates/tesla/model-3-2024-performance.png',
    forwardAxis: 'x',
  }),
  vehicle({
    slug: 'model-y-legacy',
    hero: {
      label: 'Model Y',
      order: 1,
      thumbnail: '/imgs/vehicles/cards/model-y-legacy.webp',
    },
    family: 'model-y',
    year: 'Legacy',
    trim: 'Model Y',
    bodyPath: '/models/modely-high.glb',
    wheelPath: '/models/wheel-induction.glb',
    templatePath: '/imgs/templates/tesla/model-y-legacy.png',
    forwardAxis: 'x',
  }),
  vehicle({
    slug: 'model-y-2025-base',
    family: 'model-y',
    year: '2025',
    trim: 'Model Y Base',
    bodyPath: '/models/modely-2025-base.glb',
    wheelPath: '/models/wheel-induction.glb',
    templatePath: '/imgs/templates/tesla/model-y-2025-base.png',
    forwardAxis: 'z',
  }),
  vehicle({
    slug: 'model-y-2025-premium',
    family: 'model-y',
    year: '2025',
    trim: 'Model Y Premium',
    bodyPath: '/models/modely-2025-premium.glb',
    wheelPath: '/models/wheel-stiletto-silver.glb',
    templatePath: '/imgs/templates/tesla/model-y-2025-premium.png',
    forwardAxis: 'z',
  }),
  vehicle({
    slug: 'model-y-2025-performance',
    family: 'model-y',
    year: '2025',
    trim: 'Model Y Performance',
    bodyPath: '/models/modely-2025-performance.glb',
    wheelPath: '/models/wheel-machina.glb',
    templatePath: '/imgs/templates/tesla/model-y-2025-performance.png',
    forwardAxis: 'z',
  }),
  vehicle({
    slug: 'model-y-l',
    family: 'model-y',
    year: '2025',
    trim: 'Model Y L',
    bodyPath: '/models/modely-l.glb',
    wheelPath: '/models/wheel-machina.glb',
    templatePath: '/imgs/templates/tesla/model-y-l.png',
    forwardAxis: 'z',
  }),
  vehicle({
    slug: 'cybertruck',
    hero: {
      label: 'Cybertruck',
      order: 3,
      thumbnail: '/imgs/vehicles/cards/cybertruck.webp',
    },
    family: 'cybertruck',
    year: '2023',
    trim: 'Cybertruck',
    bodyPath: '/models/cybertruck.glb',
    wheelPath: '/models/wheel-cybertruck.glb',
    templatePath: '/imgs/templates/tesla/cybertruck.png',
    forwardAxis: 'x',
  }),
  vehicle({
    slug: 'model-s-2021',
    family: 'model-s',
    year: '2021',
    trim: 'Model S',
    bodyPath: '/models/models-2021.glb',
    wheelPath: '/models/wheel-stiletto-silver.glb',
    templatePath: '/imgs/templates/tesla/model-s-2021.png',
    forwardAxis: 'x',
  }),
  vehicle({
    slug: 'model-s-2025-plaid',
    hero: {
      label: 'Model S',
      order: 4,
      thumbnail: '/imgs/vehicles/cards/model-s-2025-plaid.webp',
    },
    family: 'model-s',
    year: '2025',
    trim: 'Model S Plaid',
    bodyPath: '/models/models-2025-plaid.glb',
    wheelPath: '/models/wheel-stiletto-silver.glb',
    templatePath: '/imgs/templates/tesla/model-s-2025-plaid.png',
    forwardAxis: 'x',
  }),
  vehicle({
    slug: 'model-x-2021',
    hero: {
      label: 'Model X',
      order: 5,
      thumbnail: '/imgs/vehicles/cards/model-x-2021.webp',
    },
    family: 'model-x',
    year: '2021',
    trim: 'Model X',
    bodyPath: '/models/modelx-2021.glb',
    wheelPath: '/models/wheel-induction.glb',
    templatePath: '/imgs/templates/tesla/model-x-2021.png',
    forwardAxis: 'x',
  }),
] as const satisfies readonly VehicleAssetConfig[];

// AI generation and the editor share the same locally hosted UV templates.
export const VEHICLE_TEMPLATE_SOURCE = Object.fromEntries(
  VEHICLE_ASSET_MANIFEST.map((entry) => [entry.slug, entry.templatePath])
) as Record<VehicleSlug, string>;

const VEHICLES_BY_SLUG = new Map(
  VEHICLE_ASSET_MANIFEST.map((entry) => [entry.slug, entry])
);

export const HERO_VEHICLES = VEHICLE_ASSET_MANIFEST.filter(
  (entry) => entry.hero
).sort((a, b) => a.hero!.order - b.hero!.order);

export const DEFAULT_VEHICLE_SLUG: VehicleSlug = VEHICLE_ASSET_MANIFEST[0].slug;

export function getVehicleAssetConfig(slug: VehicleSlug): VehicleAssetConfig {
  return (
    VEHICLES_BY_SLUG.get(slug) ?? VEHICLES_BY_SLUG.get(DEFAULT_VEHICLE_SLUG)!
  );
}

export function isVehicleSlug(value: string): value is VehicleSlug {
  return VEHICLES_BY_SLUG.has(value as VehicleSlug);
}
