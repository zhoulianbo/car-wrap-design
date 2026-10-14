/** Local pixel and storage fixtures only; no AI calls or external uploads. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decode } from 'fast-png';
import sharp from 'sharp';

import { StorageManager } from '../src/core/storage';
import {
  generationTemplateGuideKey,
  prepareGenerationTemplateGuide,
} from '../src/lib/generation-template-guide';
import { VEHICLE_ASSET_MANIFEST } from '../src/lib/vehicle-catalog';
import { wrapGenerationGuide, wrapTextureMask } from '../src/lib/wrap-texture';

for (const vehicle of VEHICLE_ASSET_MANIFEST) {
  const original = readFileSync(`public${vehicle.templatePath}`);
  const mask = wrapTextureMask(original);
  const guide = wrapGenerationGuide(original);
  assert.deepEqual(
    readFileSync(`public/imgs/${generationTemplateGuideKey(vehicle.slug)}`),
    Buffer.from(guide),
    `${vehicle.slug}: published file must match current template geometry`
  );
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
let responseStatus = 200;
let contentType = 'image/png';
let stage = '';
const onStage = (value: string) => {
  stage = value;
};
const storage = new StorageManager();
storage.addProvider({
  name: 'fixture',
  configs: {},
  getPublicUrl: ({ key }) => `https://fixture.invalid/${key}`,
  uploadFile: async () => {
    throw new Error('Generation requests must never upload guides');
  },
  downloadAndUpload: async () => {
    throw new Error('Unexpected download');
  },
});
globalThis.fetch = async (url, init) => {
  assert.equal(init?.method, 'HEAD');
  assert.equal(init?.redirect, 'manual');
  assert.match(String(url), /\/templates\/ai-guides\/[a-z0-9-]+\.png$/);
  return new Response(null, {
    status: responseStatus,
    headers: { 'content-type': contentType },
  });
};
try {
  for (const vehicle of VEHICLE_ASSET_MANIFEST) {
    assert.equal(
      await prepareGenerationTemplateGuide(vehicle.slug, storage),
      `https://fixture.invalid/templates/ai-guides/${vehicle.slug}.png`
    );
  }
  for (const status of [301, 302, 303, 307, 308, 404, 403, 500]) {
    responseStatus = status;
    await assert.rejects(
      () => prepareGenerationTemplateGuide('model-3-legacy', storage, onStage),
      (error: unknown) => {
        assert(error instanceof Error);
        assert.equal(error.message, 'Image unavailable');
        assert(error.cause instanceof Error);
        assert.match(error.cause.message, new RegExp(`HTTP ${status}`));
        return true;
      }
    );
    assert.equal(stage, 'guide_availability');
  }
  responseStatus = 200;
  contentType = 'text/html';
  await assert.rejects(
    () => prepareGenerationTemplateGuide('model-3-legacy', storage, onStage),
    /Invalid image source/
  );
  assert.equal(stage, 'guide_availability');
  globalThis.fetch = async () => {
    throw new Error('fetch failed');
  };
  await assert.rejects(() =>
    prepareGenerationTemplateGuide('model-3-legacy', storage, onStage)
  );
  assert.equal(stage, 'guide_availability');
} finally {
  globalThis.fetch = originalFetch;
}
console.log(
  'PASS: all named guide files match template geometry; missing/invalid/unreachable guides fail without uploads. No external requests.'
);
