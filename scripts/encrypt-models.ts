import { createCipheriv, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { MODEL_ASSET_KEY_HEX } from '../src/config/model-assets';
import { decryptModel, encryptedModelPath } from '../src/lib/model-assets';
import { VEHICLE_ASSET_MANIFEST } from '../src/lib/vehicle-catalog';

const sources = new Set(
  VEHICLE_ASSET_MANIFEST.flatMap((vehicle) => [
    vehicle.bodyPath,
    vehicle.wheelPath,
  ])
);
const key = Buffer.from(MODEL_ASSET_KEY_HEX, 'hex');
const force = process.argv.includes('--force');
if (key.length !== 32) throw new Error('Expected a 256-bit model asset key');
let updated = 0;
for (const source of sources) {
  const original = await readFile(path.join('public', source));
  if (
    original.length < 12 ||
    original.toString('ascii', 0, 4) !== 'glTF' ||
    original.readUInt32LE(4) !== 2 ||
    original.readUInt32LE(8) !== original.length
  ) {
    throw new Error(`Invalid source GLB: ${source}`);
  }
  const destination = path.join('public', encryptedModelPath(source));
  if (!force) {
    try {
      const previous = await readFile(destination);
      const decoded = await decryptModel(Uint8Array.from(previous).buffer);
      if (original.equals(Buffer.from(decoded))) continue;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  // A fresh random IV for every newly encrypted file; unchanged files stay stable.
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(original), cipher.final()]);
  const packed = Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
  const decoded = await decryptModel(Uint8Array.from(packed).buffer);
  if (!original.equals(Buffer.from(decoded)))
    throw new Error(`Encryption check failed: ${source}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, packed);
  updated++;
  console.log(`${source} -> ${destination} (${packed.length} bytes)`);
}
console.log(
  `Verified ${sources.size} encrypted models; wrote ${updated}, kept ${sources.size - updated} unchanged.`
);
