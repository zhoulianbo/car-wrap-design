import assert from 'node:assert/strict';
import { createCipheriv, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  decryptModel,
  encryptedModelPath,
  encryptedModelUrl,
} from '../src/lib/model-assets';
import { VEHICLE_ASSET_MANIFEST } from '../src/lib/vehicle-catalog';

const sources = new Set(
  VEHICLE_ASSET_MANIFEST.flatMap((vehicle) => [
    vehicle.bodyPath,
    vehicle.wheelPath,
  ])
);
const ivs = new Set<string>();
for (const source of sources) {
  const original = await readFile(path.join('public', source));
  const encrypted = await readFile(
    path.join('public', encryptedModelPath(source))
  );
  assert.equal(encrypted.length, original.length + 32);
  const decoded = await decryptModel(Uint8Array.from(encrypted).buffer);
  assert.deepEqual(
    Buffer.from(decoded),
    original,
    `${source}: lossless round trip`
  );
  const iv = encrypted.subarray(0, 16).toString('hex');
  assert.ok(!ivs.has(iv), 'Every encrypted model needs a distinct IV');
  ivs.add(iv);
  for (const offset of [0, 16, 32, encrypted.length - 1]) {
    const changed = Uint8Array.from(encrypted);
    changed[offset] ^= 1;
    await assert.rejects(
      decryptModel(changed.buffer),
      `${source}: reject tampering at ${offset}`
    );
  }
  await assert.rejects(
    decryptModel(Uint8Array.from(encrypted.subarray(0, -1)).buffer)
  );
  await assert.rejects(
    decryptModel(Uint8Array.from(original).buffer),
    'Never accept plaintext as encrypted'
  );
  const gltf = JSON.parse(
    original.subarray(20, 20 + original.readUInt32LE(12)).toString('utf8')
  );
  assert.ok(
    (gltf.buffers ?? []).every(
      (buffer: { uri?: string }) =>
        !buffer.uri || buffer.uri.startsWith('data:')
    )
  );
  assert.ok(
    (gltf.images ?? []).every(
      (image: { uri?: string }) => !image.uri || image.uri.startsWith('data:')
    ),
    'Models must not fetch unencrypted external textures'
  );
}
await assert.rejects(decryptModel(new ArrayBuffer(32)));
const iv = randomBytes(16);
const cipher = createCipheriv('aes-256-gcm', randomBytes(32), iv);
const ciphertext = Buffer.concat([
  cipher.update(Buffer.alloc(32)),
  cipher.final(),
]);
await assert.rejects(
  decryptModel(
    Uint8Array.from(Buffer.concat([iv, cipher.getAuthTag(), ciphertext])).buffer
  ),
  'A different key must not decrypt'
);
assert.match(
  encryptedModelUrl('/models/cybertruck.glb'),
  /^\/models-cwm\/cybertruck\.cwm\?v=/
);
assert.equal(
  encryptedModelUrl('/models/cybertruck.glb', 'https://cdn.example.test/'),
  `https://cdn.example.test${encryptedModelUrl('/models/cybertruck.glb')}`
);
assert.equal(
  encryptedModelUrl(
    '/models/cybertruck.glb',
    'https://cdn.example.test/assets/'
  ),
  `https://cdn.example.test/assets${encryptedModelUrl('/models/cybertruck.glb')}`
);
assert.throws(() => encryptedModelPath('/models/../secret.glb'));
console.log(
  `PASS: ${sources.size} encrypted models for ${VEHICLE_ASSET_MANIFEST.length} vehicles; byte-identical decryption, unique IVs, tamper/truncation/wrong-key rejection, embedded resources, and local/CDN paths.`
);
