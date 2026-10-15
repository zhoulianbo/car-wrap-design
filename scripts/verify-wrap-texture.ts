/** Pixel-level regression checks; no network, providers, storage, or user data. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decode, encode } from 'fast-png';
import sharp from 'sharp';

import {
  compressWrapPng,
  optimizeWrapPng,
  WRAP_PNG_TARGET_BYTES,
} from '../src/lib/compress-wrap-png';
import { VEHICLE_ASSET_MANIFEST } from '../src/lib/vehicle-catalog';
import { applyWrapPanelAlpha } from '../src/lib/wrap-editor-geometry';
import { fitWrapTexture, wrapTextureMask } from '../src/lib/wrap-texture';

const size = 1024;
const pngOf = (data: Uint8Array) =>
  encode({ width: size, height: size, channels: 4, data });
const solid = (color: number[]) => {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) data.set(color, i * 4);
  return data;
};
const white = pngOf(solid([255, 255, 255, 255]));
for (const vehicle of VEHICLE_ASSET_MANIFEST) {
  const mask = wrapTextureMask(readFileSync(`public${vehicle.templatePath}`));
  // Saving the opaque 3D preview must not bake its paint color into UV gaps.
  const editorExport = new Uint8ClampedArray(solid([244, 245, 246, 255]));
  applyWrapPanelAlpha(editorExport, mask.coverage);
  const savedWebp = await sharp(editorExport, {
    raw: { width: size, height: size, channels: 4 },
  })
    .webp({ lossless: true })
    .toBuffer();
  const savedPixels = await sharp(savedWebp).ensureAlpha().raw().toBuffer();
  for (let i = 0; i < mask.coverage.length; i++) {
    assert.equal(
      savedPixels[i * 4 + 3],
      mask.coverage[i],
      'WebP saves keep template alpha'
    );
    if (mask.coverage[i] === 255) {
      assert.deepEqual(
        Array.from(savedPixels.subarray(i * 4, i * 4 + 4)),
        [244, 245, 246, 255],
        'Light artwork inside panels must stay opaque'
      );
    }
  }
  const outlineWidth = vehicle.slug === 'cybertruck' ? 10 : 1.5;
  const reference = decode(fitWrapTexture(white, mask, { outlineWidth }));
  if (vehicle.slug === 'cybertruck') {
    const thin = decode(fitWrapTexture(white, mask, { outlineWidth: 3 }));
    let darkerPixels = 0;
    for (let i = 0; i < size * size; i++) {
      assert.equal(reference.data[i * 4 + 3], thin.data[i * 4 + 3]);
      if (reference.data[i * 4] < thin.data[i * 4]) darkerPixels++;
    }
    assert.ok(darkerPixels > 0, 'Cybertruck has a wider inward border');
    assert.deepEqual(
      decode(fitWrapTexture(white, mask, { outlineWidth })).data,
      reference.data,
      'cached masks cannot reuse the wrong outline width'
    );
  }
  const pixels = solid([220, 50, 90, 255]);
  // The AI paints all unused space and leaves most of one panel transparent.
  for (const i of mask.panels[0].slice(Math.floor(mask.panels[0].length * 0.4)))
    pixels[i * 4 + 3] = 0;
  const result = decode(
    fitWrapTexture(pngOf(pixels), mask, { baseColor: '#dc325a', outlineWidth })
  );
  let smoothEdges = 0,
    blackEdges = 0,
    interior = 0;
  for (let i = 0; i < size * size; i++) {
    const a = result.data[i * 4 + 3];
    assert.equal(
      a,
      reference.data[i * 4 + 3],
      'AI geometry cannot change final alpha'
    );
    if (!a) {
      assert.equal(result.data[i * 4], 0, 'outside artwork is removed');
      continue;
    }
    if (a > 0 && a < 255) smoothEdges++;
    if (a === 255 && result.data[i * 4] === 0) blackEdges++;
    if (reference.data[i * 4] === 255) {
      assert.deepEqual(
        Array.from(result.data.slice(i * 4, i * 4 + 4)),
        [220, 50, 90, 255]
      );
      interior++;
    }
  }
  assert.ok(smoothEdges > 0, 'curved/diagonal contours have subpixel alpha');
  assert.ok(blackEdges > 0, 'panels receive a black inward stroke');
  assert.ok(interior > 0, 'stroke preserves colored panel interiors');
  for (const panel of mask.panels)
    assert.ok(
      panel.some((i) => result.data[i * 4] > 0),
      'no panel is entirely consumed by the stroke'
    );
  console.log(
    `${vehicle.slug}: fixed alpha, filled gaps, ${smoothEdges} antialiased edge pixels`
  );
}
// Independent geometry: a rectangle with a hole, one-pixel and diagonal strips,
// and an island that touches the edge of the atlas.
const template = new Uint8Array(size * size * 4);
for (let y = 100; y < 300; y++)
  for (let x = 100; x < 300; x++) {
    if (x >= 180 && x < 220 && y >= 180 && y < 220) continue;
    template.set([255, 255, 255, 255], (y * size + x) * 4);
  }
for (let y = 100; y < 200; y++) {
  template.set([255, 255, 255, 255], (y * size + 400) * 4);
  for (let x = y + 400; x < y + 402; x++)
    template.set([255, 255, 255, 255], (y * size + x) * 4);
}
for (let y = 400; y < 440; y++)
  for (let x = 0; x < 40; x++)
    template.set([255, 255, 255, 255], (y * size + x) * 4);
const mask = wrapTextureMask(pngOf(template));
const at = (data: ArrayLike<number>, x: number, y: number) =>
  Array.from({ length: 4 }, (_, c) => data[(y * size + x) * 4 + c]);
const fitted = decode(fitWrapTexture(white, mask)).data;
assert.deepEqual(at(fitted, 150, 150), [255, 255, 255, 255]);
assert.deepEqual(at(fitted, 100, 150), [0, 0, 0, 255], 'inward black border');
assert.equal(at(fitted, 99, 150)[3], 0, 'no visible outward bleed');
assert.equal(at(fitted, 200, 200)[3], 0, 'internal cutouts stay empty');
assert.deepEqual(
  at(fitted, 179, 200),
  [0, 0, 0, 255],
  'cutout boundary is outlined'
);
assert.ok(
  at(fitted, 400, 150)[0] >= 100,
  'one-pixel strip retains a colored center'
);
assert.ok(at(fitted, 550, 150)[0] > 0, 'diagonal thin strip is not all black');
assert.deepEqual(
  at(fitted, 0, 420),
  [255, 255, 255, 255],
  'canvas edge does not create a false seam'
);
// Native alpha may have an extra island, soft dark outlines, or missing panels.
const wider = decode(fitWrapTexture(white, mask, { outlineWidth: 10 })).data;
assert.deepEqual(at(wider, 109, 150), [0, 0, 0, 255], '10px inward stroke');
assert.deepEqual(
  at(wider, 111, 150),
  [255, 255, 255, 255],
  'wide stroke keeps the interior'
);
assert.ok(
  at(wider, 400, 150)[0] >= 100,
  'wide stroke still protects thin strips'
);
const native = solid([220, 40, 80, 0]);
for (const panel of mask.panels)
  for (const i of panel) native.set([40, 180, 120, 128], i * 4);
for (let y = 450; y < 490; y++)
  for (let x = 450; x < 490; x++)
    native.set([0, 255, 0, 255], (y * size + x) * 4);
native[(150 * size + 150) * 4 + 3] = 0;
const normalized = decode(
  fitWrapTexture(pngOf(native), mask, {
    baseColor: '#204060',
    preserveTransparency: true,
  })
).data;
assert.deepEqual(
  at(normalized, 150, 150),
  [32, 64, 96, 255],
  'transparent hole uses selected base'
);
assert.deepEqual(
  at(normalized, 151, 150),
  [36, 122, 108, 255],
  'partial alpha composites over base'
);
assert.equal(
  at(normalized, 470, 470)[3],
  0,
  'extra native-alpha island is removed'
);
for (let i = 0; i < size * size; i++)
  assert.equal(
    normalized[i * 4 + 3],
    fitted[i * 4 + 3],
    'opaque and native-alpha paths share exactly one contour'
  );
const sampled = template.slice();
for (let i = 0; i < size * size; i++)
  if (sampled[i * 4 + 3]) sampled.set([30, 80, 200, 255], i * 4);
for (const i of mask.panels[0]) sampled[i * 4 + 3] = 0;
assert.deepEqual(
  at(decode(fitWrapTexture(pngOf(sampled), mask)).data, 150, 150),
  [30, 80, 200, 255],
  'fully missing panel uses dominant artwork color'
);
const resized = await sharp(pngOf(native)).resize(1254, 1254).png().toBuffer();
const resizedResult = decode(fitWrapTexture(resized, mask));
for (let i = 0; i < size * size; i++)
  assert.equal(
    resizedResult.data[i * 4 + 3],
    fitted[i * 4 + 3],
    'provider resolution cannot change the template'
  );
assert.throws(
  () => fitWrapTexture(pngOf(new Uint8Array(native.length)), mask),
  /empty/
);
assert.throws(
  () =>
    fitWrapTexture(
      encode({ width: 8, height: 4, channels: 3, data: new Uint8Array(96) }),
      mask
    ),
  /invalid/
);
// Fake transparency baked into panel RGB remains an error; an intentional
// checkered design with a real transparent background remains valid.
const checkerboard = solid([255, 255, 255, 255]);
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const value = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 ? 220 : 255;
    checkerboard.set([value, value, value, 255], (y * size + x) * 4);
  }
assert.throws(
  () => fitWrapTexture(pngOf(checkerboard), mask),
  /painted transparency/
);
for (let i = 0; i < size * size; i++)
  if (mask.labels[i] <= 0) checkerboard[i * 4 + 3] = 0;
assert.doesNotThrow(() => fitWrapTexture(pngOf(checkerboard), mask));
// Independently decode with libvips: compression preserves every RGB and alpha
// value, including partial alpha and hidden colors, with no color quantization.
const gradient = new Uint8Array(size * size * 4);
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++)
    gradient.set(
      [
        x % 256,
        y % 256,
        (x + y) % 256,
        x % 3 === 0 ? 0 : x % 3 === 1 ? 127 : 255,
      ],
      (y * size + x) * 4
    );
const uncompressed = encode({
  width: size,
  height: size,
  channels: 4,
  data: gradient,
});
const compressed = await compressWrapPng(uncompressed);
assert.ok(
  compressed.length < uncompressed.length,
  'smooth artwork benefits from lossless compression'
);
decode(compressed, { checkCrc: true });
const { data: compressedPixels, info } = await sharp(compressed)
  .raw()
  .toBuffer({ resolveWithObject: true });
assert.deepEqual([info.width, info.height, info.channels], [size, size, 4]);
assert.deepEqual(
  compressedPixels,
  Buffer.from(gradient),
  'compression is pixel-exact'
);
assert.deepEqual(
  await compressWrapPng(compressed),
  compressed,
  'repeated compression stays stable'
);
console.log(
  `Lossless PNG: ${uncompressed.length} -> ${compressed.length} bytes; all RGBA pixels identical`
);
assert.deepEqual(
  await optimizeWrapPng(uncompressed),
  compressed,
  'small PNG stays lossless'
);
// High-frequency colors compress poorly as RGBA but fit a compact palette.
let seed = 12345;
const randomByte = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) & 255;
};
const noisy = new Uint8Array(size * size * 4);
for (let i = 0; i < noisy.length; i += 4) {
  if (i % 8 === 0) continue;
  const color = (randomByte() % 32) * 4;
  noisy.set([color, color, color, 252], i);
}
const noisyPng = encode({
  width: size,
  height: size,
  channels: 4,
  data: noisy,
});
assert.ok((await compressWrapPng(noisyPng)).length > WRAP_PNG_TARGET_BYTES);
const optimized = await optimizeWrapPng(noisyPng);
assert.ok(optimized.length < WRAP_PNG_TARGET_BYTES);
decode(optimized, { checkCrc: true });
const optimizedPixels = await sharp(optimized).ensureAlpha().raw().toBuffer();
for (let i = 0; i < noisy.length; i++)
  assert.ok(
    Math.abs(optimizedPixels[i] - noisy[i]) <= (i % 4 === 3 ? 0 : 1),
    'palette preserves alpha and limits premultiplied color rounding to one level'
  );
// Dense artwork with many fractional alpha values must retain every edge
// sample even when a palette would fit within the size target.
for (let i = 0; i < noisy.length; i += 4)
  if (noisy[i + 3]) noisy[i + 3] = 32 + (randomByte() % 32) * 7;
const softEdges = pngOf(noisy);
assert.ok((await compressWrapPng(softEdges)).length > WRAP_PNG_TARGET_BYTES);
const softResult = await sharp(await optimizeWrapPng(softEdges))
  .ensureAlpha()
  .raw()
  .toBuffer();
for (let i = 3; i < noisy.length; i += 4)
  assert.equal(
    softResult[i],
    noisy[i],
    'compression preserves exact template alpha'
  );
// A complex full-color image must fall back instead of trading major color
// errors for a hard byte limit.
for (let i = 0; i < noisy.length; i += 4)
  noisy.set([randomByte(), randomByte(), randomByte(), 255], i);
const detailed = encode({
  width: size,
  height: size,
  channels: 4,
  data: noisy,
});
const detailedResult = await optimizeWrapPng(detailed);
assert.deepEqual(
  await sharp(detailedResult).ensureAlpha().raw().toBuffer(),
  Buffer.from(noisy),
  'poor palette quality falls back to lossless'
);
console.log('Wrap texture regression checks passed');
