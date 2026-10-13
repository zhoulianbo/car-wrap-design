import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  VEHICLE_ASSET_MANIFEST,
  VEHICLE_WHEEL_ANCHORS,
} from '../src/lib/vehicle-catalog';

const root = process.cwd();
const errors: string[] = [];

async function exists(publicPath: string) {
  try {
    await access(path.join(root, 'public', publicPath.replace(/^\//, '')));
    return true;
  } catch {
    return false;
  }
}

const configuredAssets = new Set(
  VEHICLE_ASSET_MANIFEST.flatMap((vehicle) => [
    vehicle.bodyPath,
    vehicle.wheelPath,
  ])
);
for (const file of await readdir(path.join(root, 'public/models'))) {
  if (file.endsWith('.glb') && !configuredAssets.has(`/models/${file}`)) {
    errors.push(`Unconfigured model: ${file}`);
  }
}
if (
  new Set(VEHICLE_ASSET_MANIFEST.map((vehicle) => vehicle.slug)).size !==
  VEHICLE_ASSET_MANIFEST.length
) {
  errors.push('Vehicle slugs must be unique');
}
if (VEHICLE_WHEEL_ANCHORS.length !== 4) {
  errors.push(
    `Expected 4 canonical wheel anchors, found ${VEHICLE_WHEEL_ANCHORS.length}`
  );
}

for (const vehicle of VEHICLE_ASSET_MANIFEST) {
  for (const asset of [
    vehicle.bodyPath,
    vehicle.wheelPath,
    vehicle.templatePath,
    `/imgs/vehicles/cards/${vehicle.slug}.webp`,
    ...(vehicle.hero?.thumbnail ? [vehicle.hero.thumbnail] : []),
  ]) {
    if (!(await exists(asset))) {
      errors.push(`${vehicle.slug}: missing ${asset}`);
    }
  }
  if (vehicle.uvSet !== 0) {
    errors.push(`${vehicle.slug}: only TEXCOORD_0 is supported for launch`);
  }
  if (!vehicle.paintMaterialPattern.test('Paint')) {
    errors.push(`${vehicle.slug}: paint material matcher is not usable`);
  }
  if (vehicle.wheelAnchors.length !== 4) {
    errors.push(`${vehicle.slug}: manifest must expose four wheel anchors`);
  }

  const bodyFile = path.join(
    root,
    'public',
    vehicle.bodyPath.replace(/^\//, '')
  );
  if (await exists(vehicle.bodyPath)) {
    const bytes = await readFile(bodyFile);
    const body = bytes.toString('latin1');
    const gltf = JSON.parse(
      bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8')
    ) as {
      materials: { name: string }[];
      meshes: {
        primitives: { material: number; attributes: Record<string, number> }[];
      }[];
    };
    let paintedPrimitives = 0;
    for (const mesh of gltf.meshes) {
      for (const primitive of mesh.primitives) {
        const name = gltf.materials[primitive.material]?.name || '';
        const painted = vehicle.paintMaterialPattern.test(name);
        if (/^Paint(?:\.\d+)?$/i.test(name) && !painted) {
          errors.push(`${vehicle.slug}: missing paint material ${name}`);
        }
        if (painted) {
          paintedPrimitives++;
          if (!/^Paint(?:\.\d+)?$/i.test(name)) {
            errors.push(`${vehicle.slug}: wrap leaks onto ${name}`);
          }
          if (primitive.attributes.TEXCOORD_0 === undefined) {
            errors.push(`${vehicle.slug}: painted primitive has no wrap UVs`);
          }
        }
      }
    }
    if (!paintedPrimitives) errors.push(`${vehicle.slug}: no painted surfaces`);
    const anchorGroups = [
      ['Wheel_LF_Spatial'],
      ['Wheel_RF_Spatial'],
      ['Wheel_LR_Spatial', 'Wheel_RL_Spatial'],
      ['Wheel_RR_Spatial'],
    ];
    for (const aliases of anchorGroups) {
      if (!aliases.some((anchor) => body.includes(anchor))) {
        errors.push(
          `${vehicle.slug}: GLB is missing wheel anchor ${aliases.join(' or ')}`
        );
      }
    }
  }
}

if (errors.length) {
  console.error(`Wrap asset validation failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${VEHICLE_ASSET_MANIFEST.length} vehicle configurations, ${VEHICLE_WHEEL_ANCHORS.length} wheel anchors per vehicle, and all body/wheel/template files.`
  );
}
