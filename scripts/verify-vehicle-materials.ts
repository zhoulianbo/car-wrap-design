import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Texture,
} from 'three';

import {
  attachWheels,
  prepareScene,
  updatePaint,
} from '../src/components/vehicle-viewer/vehicle-scene';
import { VEHICLE_ASSET_MANIFEST } from '../src/lib/vehicle-catalog';

// Exercise the runtime assignment using each shipped GLB's actual primitive
// material names. Geometry decoding/render quality is checked in the browser.
for (const vehicle of VEHICLE_ASSET_MANIFEST) {
  const bytes = await readFile(`public${vehicle.bodyPath}`);
  const gltf = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8')
  ) as {
    materials: { name: string }[];
    nodes: { name: string; mesh?: number }[];
    meshes: { primitives: { material: number }[] }[];
  };
  const root = new Group();
  const geometry = new BoxGeometry();
  for (const node of gltf.nodes) {
    if (node.mesh === undefined) continue;
    const materials = gltf.meshes[node.mesh].primitives.map((primitive) => {
      const material = new MeshStandardMaterial();
      material.name = gltf.materials[primitive.material].name;
      return material;
    });
    const mesh = new Mesh(geometry, materials);
    mesh.name = node.name;
    root.add(mesh);
  }
  const otherViewer = root.clone(true);
  prepareScene(root, vehicle);
  for (const node of gltf.nodes) {
    if (
      node.mesh !== undefined &&
      /^(floor|groundplane|ground_shadow\d*)$/i.test(node.name)
    ) {
      assert.equal(
        root.getObjectByName(node.name)?.visible,
        false,
        `${vehicle.slug}: authored ground must be hidden`
      );
    }
  }
  const wrap = new Texture();
  updatePaint(root, 'gloss', '#f4f5f6', wrap);
  let painted = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    for (const material of object.material as MeshStandardMaterial[]) {
      if (
        /^Paint(?:\.\d+)?$/i.test(material.name) &&
        !vehicle.paintMeshExclusionPattern.test(object.name)
      ) {
        assert.equal(material.map, wrap, `${vehicle.slug}: ${object.name}`);
        assert.ok(material instanceof MeshPhysicalMaterial);
        assert.ok('PHYSICAL' in (material.defines || {}));
        painted++;
      } else {
        assert.notEqual(
          material.map,
          wrap,
          `${vehicle.slug}: leaked onto ${material.name}`
        );
      }
      if (
        /^Glass(?:[_.]|$)/i.test(material.name) &&
        !/interior|lights/i.test(material.name)
      ) {
        assert.ok(material instanceof MeshPhysicalMaterial);
        assert.ok('PHYSICAL' in (material.defines || {}));
        assert.equal(material.opacity, 1);
        assert.ok(material.transmission > 0);
      }
    }
  });
  assert.ok(painted > 0, `${vehicle.slug}: no painted primitives`);
  otherViewer.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    for (const material of object.material as MeshStandardMaterial[]) {
      assert.equal(material.map, null, 'Cached GLTF material was mutated');
      assert.equal(material.userData.wrapPaint, undefined);
    }
  });
  updatePaint(root, 'matte', '#111318', null);
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    for (const material of object.material as MeshStandardMaterial[]) {
      if (!material.userData.wrapPaint) continue;
      assert.equal(material.map, null);
      assert.equal(material.color.getHexString(), '111318');
      assert.ok(material.roughness > 0.5);
    }
  });
}

const vehicle = VEHICLE_ASSET_MANIFEST[0];
const original = new MeshStandardMaterial({
  side: DoubleSide,
  normalMap: new Texture(),
  aoMap: new Texture(),
});
original.name = 'Paint.001';
const paint = new Mesh(new BoxGeometry(), original);
prepareScene(paint, vehicle);
assert.equal(paint.material.side, DoubleSide);
assert.equal(paint.material.normalMap, original.normalMap);
assert.equal(paint.material.aoMap, original.aoMap);
assert.notEqual(paint.material, original);

const anchor = new Group();
anchor.name = 'Wheel_LF_Spatial';
const wheelSource = new Group();
const alloy = new MeshStandardMaterial({
  color: '#808080',
  metalness: 0.9,
  roughness: 0.4,
});
alloy.name = 'Wheels';
const tire = new MeshStandardMaterial({ color: '#000000' });
tire.name = 'Tires';
wheelSource.add(new Mesh(new BoxGeometry(), [alloy, tire]));
attachWheels(anchor, wheelSource);
prepareScene(anchor, vehicle);
updatePaint(anchor, 'gloss', '#ff0000', new Texture());
const wheel = anchor.children[0].children[0] as Mesh;
const [nextAlloy, nextTire] = wheel.material as MeshStandardMaterial[];
assert.ok(
  nextAlloy.color.equals(alloy.color),
  'Authored alloy color must survive'
);
assert.equal(nextAlloy.metalness, alloy.metalness);
assert.equal(nextAlloy.map, null);
assert.ok(
  nextTire.color.r > tire.color.r,
  'Tire should retain visible shading'
);
assert.equal(
  tire.color.getHexString(),
  '000000',
  'Cached wheel must stay unchanged'
);
console.log(
  `Vehicle material regression checks passed for all ${VEHICLE_ASSET_MANIFEST.length} models, glass, wheels, finish changes and independent viewer instances.`
);
