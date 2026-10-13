/** Local pixel and storage fixtures only; no AI calls or external uploads. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decode } from 'fast-png';
import sharp from 'sharp';

import { StorageManager } from '../src/core/storage';
import { prepareGenerationTemplateGuide } from '../src/lib/generation-template-guide';
import { VEHICLE_ASSET_MANIFEST } from '../src/lib/vehicle-catalog';
import { wrapGenerationGuide, wrapTextureMask } from '../src/lib/wrap-texture';

for (const vehicle of VEHICLE_ASSET_MANIFEST) {
  const original = readFileSync(`public${vehicle.templatePath}`);
  const mask = wrapTextureMask(original);
  const guide = wrapGenerationGuide(original);
  const image = decode(guide);
  assert.deepEqual(
    [image.width, image.height, image.channels],
    [1024, 1024, 1]
  );
  for (let i = 0; i < mask.labels.length; i++)
    assert.equal(
      image.data[i],
      mask.labels[i] > 0 ? 255 : 0,
      `${vehicle.slug}: guide matches editor geometry at pixel ${i}`
    );
  assert.deepEqual(
    wrapTextureMask(guide).panels.map((panel) => panel.length),
    mask.panels.map((panel) => panel.length),
    'Panel connectivity and sizes survive provider alpha removal'
  );
  if (vehicle.slug === 'cybertruck') {
    const flattened = await sharp(original)
      .flatten({ background: '#fff' })
      .raw()
      .toBuffer();
    assert.ok(flattened.every((value) => value === 255));
    assert.equal(mask.panels.length, 5);
    assert.equal(image.data[100 * 1024 + 500], 255, 'Upper side panel');
    assert.equal(image.data[950 * 1024 + 500], 255, 'Lower side panel');
    assert.equal(image.data[500 * 1024 + 500], 0, 'Large central opening');
    assert.equal(image.data[500 * 1024 + 40], 255, 'Small interior panel');
  }
  console.log(
    `${vehicle.slug}: opaque guide preserves ${mask.panels.length} panels`
  );
}

const originalFetch = globalThis.fetch;
let source = readFileSync('public/imgs/templates/tesla/cybertruck.png');
let available = true;
let uploadFails = false;
let uploads = 0;
const stored = new Set<string>();
const storage = new StorageManager();
storage.addProvider({
  name: 'fixture',
  configs: {},
  exists: async ({ key }) => stored.has(key),
  getPublicUrl: ({ key }) => `https://fixture.invalid/${key}`,
  uploadFile: async ({ key, body, contentType }) => {
    if (uploadFails)
      return {
        success: false,
        error: 'Fixture upload failure',
        provider: 'fixture',
      };
    assert.equal(contentType, 'image/png');
    assert.equal((await sharp(body).metadata()).hasAlpha, false);
    uploads++;
    stored.add(key);
    return {
      success: true,
      key,
      url: `https://fixture.invalid/${key}`,
      provider: 'fixture',
    };
  },
  downloadAndUpload: async () => {
    throw new Error('Unexpected download');
  },
});
globalThis.fetch = async () =>
  new Response(source, { status: available ? 200 : 404 });
try {
  const url = await prepareGenerationTemplateGuide(
    'https://fixture.invalid/template.png',
    storage
  );
  assert.match(url, /\/templates\/ai-guides\/[a-f0-9]{64}\.png$/);
  assert.equal(
    await prepareGenerationTemplateGuide(
      'https://fixture.invalid/template.png',
      storage
    ),
    url
  );
  assert.equal(uploads, 1, 'Unchanged guides are uploaded once');
  source = readFileSync('public/imgs/templates/tesla/model-3-legacy.png');
  assert.notEqual(
    await prepareGenerationTemplateGuide(
      'https://fixture.invalid/template.png',
      storage
    ),
    url
  );
  assert.equal(uploads, 2, 'New geometry has a new object key');
  available = false;
  await assert.rejects(
    () =>
      prepareGenerationTemplateGuide(
        'https://fixture.invalid/template.png',
        storage
      ),
    /template unavailable/
  );
  available = true;
  source = readFileSync('public/imgs/templates/tesla/model-3-2024-base.png');
  uploadFails = true;
  await assert.rejects(
    () =>
      prepareGenerationTemplateGuide(
        'https://fixture.invalid/template.png',
        storage
      ),
    /Fixture upload failure/
  );
} finally {
  globalThis.fetch = originalFetch;
}
console.log(
  'PASS: all template geometry, alpha-independent guide, reuse, versioning, and preparation failures. No external requests.'
);
