import { convertIndexedToRgb, decode, encode } from 'fast-png';

import { isPng } from './png-bytes';
import { segmentWrapPanels } from './wrap-editor-geometry';

export class WrapTextureFitError extends Error {}

const SIZE = 1024;
const EDGE_SAMPLES = 4;
const OUTLINE_WIDTH = 1.5;

/** Decode bounded PNGs without native dependencies (also runs in Workers). */
function rgba(bytes: Uint8Array) {
  if (!isPng(bytes) || bytes.length < 33 || bytes.length > 25 * 1024 * 1024)
    throw new Error('Invalid wrap PNG');
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = header.getUint32(16);
  const height = header.getUint32(20);
  if (!width || !height || width * height > 4096 * 4096)
    throw new Error('Wrap PNG dimensions are too large');
  const decoded = decode(bytes);
  const indexed = Boolean(decoded.palette);
  const data = indexed ? convertIndexedToRgb(decoded) : decoded.data;
  const channels = indexed ? decoded.palette![0].length : decoded.channels;
  const depth = indexed ? 8 : decoded.depth;
  const max = 2 ** depth - 1;
  const result = new Uint8ClampedArray(width * height * 4);
  const sample = (pixel: number, channel: number) => {
    if (depth >= 8) return data[pixel * channels + channel];
    const rowBytes = Math.ceil((width * channels * depth) / 8);
    const bit = ((pixel % width) * channels + channel) * depth;
    return (
      (data[Math.floor(pixel / width) * rowBytes + (bit >> 3)] >>
        (8 - depth - (bit % 8))) &
      max
    );
  };
  for (let i = 0; i < width * height; i++) {
    for (let c = 0; c < 3; c++)
      result[i * 4 + c] = (sample(i, channels < 3 ? 0 : c) * 255) / max;
    const transparent =
      !indexed &&
      decoded.transparency?.every(
        (value, channel) => sample(i, channel) === value
      );
    result[i * 4 + 3] = transparent
      ? 0
      : channels === 2 || channels === 4
        ? (sample(i, channels - 1) * 255) / max
        : 255;
  }
  return { width, height, data: result };
}

/** Resample alpha-weighted colors, so transparent black never pollutes edges. */
function resample(bytes: Uint8Array) {
  const source = rgba(bytes);
  if (source.width !== source.height)
    throw new Error('Wrap texture must have a square canvas');
  if (source.width === SIZE && source.height === SIZE) return source.data;
  const result = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    const sy = Math.max(
      0,
      Math.min(source.height - 1, ((y + 0.5) * source.height) / SIZE - 0.5)
    );
    const y0 = Math.floor(sy),
      dy = sy - y0;
    for (let x = 0; x < SIZE; x++) {
      const sx = Math.max(
        0,
        Math.min(source.width - 1, ((x + 0.5) * source.width) / SIZE - 0.5)
      );
      const x0 = Math.floor(sx),
        dx = sx - x0;
      const out = (y * SIZE + x) * 4;
      let alpha = 0,
        red = 0,
        green = 0,
        blue = 0;
      for (let v = 0; v < 2; v++)
        for (let u = 0; u < 2; u++) {
          const offset =
            (Math.min(source.height - 1, y0 + v) * source.width +
              Math.min(source.width - 1, x0 + u)) *
            4;
          const weight =
            (u ? dx : 1 - dx) * (v ? dy : 1 - dy) * source.data[offset + 3];
          alpha += weight;
          red += source.data[offset] * weight;
          green += source.data[offset + 1] * weight;
          blue += source.data[offset + 2] * weight;
        }
      if (alpha) {
        result[out] = red / alpha;
        result[out + 1] = green / alpha;
        result[out + 2] = blue / alpha;
        result[out + 3] = alpha;
      }
    }
  }
  return result;
}

export function wrapTextureMask(template: Uint8Array) {
  const pixels = resample(template);
  const mask = segmentWrapPanels(pixels, SIZE, SIZE);
  const coverage = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < coverage.length; i++) {
    // Recover the template's soft edge without bringing back its outer frame.
    let printable = mask.labels[i] > 0;
    if (!printable && mask.labels[i] === 0) {
      const x = i % SIZE;
      const y = Math.floor(i / SIZE);
      for (let dy = -2; dy <= 2 && !printable; dy++)
        for (let dx = -2; dx <= 2 && !printable; dx++)
          if (x + dx >= 0 && x + dx < SIZE && y + dy >= 0 && y + dy < SIZE)
            printable = mask.labels[(y + dy) * SIZE + x + dx] > 0;
    }
    if (printable)
      coverage[i] = Math.round(
        (Math.min(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]) *
          pixels[i * 4 + 3]) /
          255
      );
  }
  return { ...mask, coverage };
}

/** Make the UV layout visible even when a provider discards input alpha. */
export function wrapGenerationGuide(template: Uint8Array) {
  const mask = wrapTextureMask(template);
  if (!mask.panels.length)
    throw new Error('Wrap template has no printable panels');
  const data = new Uint8Array(SIZE * SIZE);
  for (const panel of mask.panels) for (const i of panel) data[i] = 255;
  return encode({ width: SIZE, height: SIZE, channels: 1, data });
}

type Mask = ReturnType<typeof wrapTextureMask>;

/** Some providers paint a transparency preview into RGB instead of returning
 * alpha. Masking that image would preserve checkerboard pixels on the body.
 * A patterned background outside the islands is removable. When the same
 * neutral tones extend into the islands, do not guess which white artwork to erase.
 */
function hasBakedTransparencyOnPanels(source: Uint8ClampedArray, mask: Mask) {
  let outside = 0,
    opaque = 0,
    light = 0,
    gray = 0;
  for (let i = 0; i < mask.labels.length; i++) {
    if (mask.labels[i] > 0) continue;
    outside++;
    if (source[i * 4 + 3] < 250) continue;
    opaque++;
    const r = source[i * 4],
      g = source[i * 4 + 1],
      b = source[i * 4 + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 8) continue;
    if (Math.min(r, g, b) >= 245) light++;
    else if (Math.min(r, g, b) >= 180 && Math.max(r, g, b) <= 235) gray++;
  }
  if (
    !outside ||
    opaque / outside <= 0.95 ||
    light / outside <= 0.2 ||
    gray / outside <= 0.2
  )
    return false;
  // A grid confined to non-printable space can simply be masked away. Reject
  // only when its two tones also contaminate a meaningful part of the panels.
  let panelPixels = 0,
    panelLight = 0,
    panelGray = 0;
  for (const panel of mask.panels)
    for (const i of panel) {
      panelPixels++;
      if (source[i * 4 + 3] < 250) continue;
      const r = source[i * 4],
        g = source[i * 4 + 1],
        b = source[i * 4 + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 8) continue;
      if (Math.min(r, g, b) >= 245) panelLight++;
      else if (Math.min(r, g, b) >= 180 && Math.max(r, g, b) <= 235)
        panelGray++;
    }
  return panelLight / panelPixels > 0.02 && panelGray / panelPixels > 0.02;
}

// Cache only the final 1024px masks, not the temporary supersampling buffer.
const finishedMasks = new WeakMap<
  Mask,
  { alpha: Uint8Array; artwork: Uint8Array; outlineWidth: number }
>();

/** Supersample the template contour, then measure inward distance with a
 * bounded 3/4 chamfer transform. Only a single 16 MiB high-resolution buffer
 * is needed; this runs in Workers without canvas or native image libraries.
 */
function outlinedMask(mask: Mask, outlineWidth: number) {
  const cached = finishedMasks.get(mask);
  if (cached?.outlineWidth === outlineWidth) return cached;
  const { coverage } = mask;
  const highSize = SIZE * EDGE_SAMPLES;
  // Saturate beyond the selected stroke, including Cybertruck's wider border.
  const limit = Math.ceil(outlineWidth * EDGE_SAMPLES * 3 + 3);
  const distance = new Uint8Array(highSize * highSize);
  const sample = (x: number, y: number) =>
    coverage[
      Math.max(0, Math.min(SIZE - 1, y)) * SIZE +
        Math.max(0, Math.min(SIZE - 1, x))
    ];
  for (let y = 0; y < highSize; y++) {
    const sy = (y + 0.5) / EDGE_SAMPLES - 0.5;
    const y0 = Math.floor(sy),
      fy = sy - y0;
    for (let x = 0; x < highSize; x++) {
      const sx = (x + 0.5) / EDGE_SAMPLES - 0.5;
      const x0 = Math.floor(sx),
        fx = sx - x0;
      const value =
        sample(x0, y0) * (1 - fx) * (1 - fy) +
        sample(x0 + 1, y0) * fx * (1 - fy) +
        sample(x0, y0 + 1) * (1 - fx) * fy +
        sample(x0 + 1, y0 + 1) * fx * fy;
      if (value >= 127.5) distance[y * highSize + x] = limit;
    }
  }
  // Outside the canvas is not a seam: real islands can touch the canvas edge.
  for (let y = 0; y < highSize; y++)
    for (let x = 0; x < highSize; x++) {
      const i = y * highSize + x;
      if (!distance[i]) continue;
      distance[i] = Math.min(
        distance[i],
        x ? distance[i - 1] + 3 : limit,
        y ? distance[i - highSize] + 3 : limit,
        x && y ? distance[i - highSize - 1] + 4 : limit,
        x + 1 < highSize && y ? distance[i - highSize + 1] + 4 : limit
      );
    }
  for (let y = highSize - 1; y >= 0; y--)
    for (let x = highSize - 1; x >= 0; x--) {
      const i = y * highSize + x;
      if (!distance[i]) continue;
      distance[i] = Math.min(
        distance[i],
        x + 1 < highSize ? distance[i + 1] + 3 : limit,
        y + 1 < highSize ? distance[i + highSize] + 3 : limit,
        x + 1 < highSize && y + 1 < highSize
          ? distance[i + highSize + 1] + 4
          : limit,
        x && y + 1 < highSize ? distance[i + highSize - 1] + 4 : limit
      );
    }
  // Limit the stroke to a quarter of the local horizontal/vertical span.
  // This leaves a colored center in narrow strips, including diagonal ones.
  const span = new Uint8Array(SIZE * SIZE).fill(255);
  for (let axis = 0; axis < 2; axis++)
    for (let line = 0; line < SIZE; line++) {
      const at = (pos: number) =>
        axis ? pos * SIZE + line : line * SIZE + pos;
      let pos = 0;
      while (pos < SIZE) {
        if (coverage[at(pos)] < 128) {
          pos++;
          continue;
        }
        const start = pos;
        while (pos < SIZE && coverage[at(pos)] >= 128) pos++;
        for (let n = start; n < pos; n++)
          span[at(n)] = Math.min(span[at(n)], pos - start, 255);
      }
    }
  const alpha = new Uint8Array(SIZE * SIZE);
  const artwork = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const width = Math.min(outlineWidth, span[i] / 4);
      const threshold = width * EDGE_SAMPLES * 3 + 1.5;
      let covered = 0,
        interior = 0;
      for (let v = 0; v < EDGE_SAMPLES; v++)
        for (let u = 0; u < EDGE_SAMPLES; u++) {
          const d =
            distance[(y * EDGE_SAMPLES + v) * highSize + x * EDGE_SAMPLES + u];
          if (d) covered++;
          if (d > threshold) interior++;
        }
      alpha[i] = Math.round((255 * covered) / (EDGE_SAMPLES * EDGE_SAMPLES));
      artwork[i] = covered ? Math.round((255 * interior) / covered) : 0;
    }
  const result = { alpha, artwork, outlineWidth };
  finishedMasks.set(mask, result);
  return result;
}

/** Use the selected base color, or an opaque dominant color from the panels.
 * Transparent RGB and unused atlas space must not influence the fallback.
 */
function wrapBaseColor(
  source: Uint8ClampedArray,
  mask: Mask,
  baseColor?: string | null
) {
  if (baseColor && /^#[0-9a-f]{6}$/i.test(baseColor))
    return [1, 3, 5].map((start) =>
      parseInt(baseColor.slice(start, start + 2), 16)
    );
  const counts = new Uint32Array(32768);
  const bucket = (i: number) =>
    ((source[i * 4] >> 3) << 10) |
    ((source[i * 4 + 1] >> 3) << 5) |
    (source[i * 4 + 2] >> 3);
  let best = 0;
  for (let i = 0; i < mask.labels.length; i++)
    if (mask.labels[i] > 0 && source[i * 4 + 3] >= 128) {
      const key = bucket(i);
      counts[key]++;
      if (counts[key] > counts[best]) best = key;
    }
  if (!counts[best]) return [255, 255, 255];
  const color = [0, 0, 0];
  for (let i = 0; i < mask.labels.length; i++)
    if (mask.labels[i] > 0 && source[i * 4 + 3] >= 128 && bucket(i) === best)
      for (let c = 0; c < 3; c++) color[c] += source[i * 4 + c];
  return color.map((value) => Math.round(value / counts[best]));
}

/** Normalize once, before storage: fill alpha holes, clip to the authoritative
 * template and add its inward black stroke. AI alpha never controls geometry.
 * This does not repair misplaced subjects or invent missing artwork.
 */
export function fitWrapTexture(
  bytes: Uint8Array,
  mask: Mask,
  {
    baseColor,
    outlineWidth = OUTLINE_WIDTH,
  }: {
    baseColor?: string | null;
    /** Width in final 1024px atlas pixels; narrow strips are reduced locally. */
    outlineWidth?: 1.5 | 3 | 10;
    /** @deprecated Accepted for older callers; the template always owns alpha. */
    preserveTransparency?: boolean;
  } = {}
) {
  if (!mask.panels.length)
    throw new Error('Wrap template has no printable panels');
  let source: Uint8ClampedArray;
  try {
    source = resample(bytes);
  } catch {
    throw new WrapTextureFitError(
      'Generated wrap PNG is invalid; please generate again'
    );
  }
  if (!source.some((value, index) => index % 4 === 3 && value > 0))
    throw new WrapTextureFitError(
      'Generated wrap is empty; please generate again'
    );
  if (hasBakedTransparencyOnPanels(source, mask))
    throw new WrapTextureFitError(
      'Generated wrap contains a painted transparency background; please generate again'
    );
  const base = wrapBaseColor(source, mask, baseColor);
  const { alpha, artwork } = outlinedMask(mask, outlineWidth);
  const output = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < alpha.length; i++) {
    if (!alpha[i]) continue;
    const opacity = source[i * 4 + 3] / 255;
    const colorWeight = artwork[i] / 255;
    for (let c = 0; c < 3; c++)
      output[i * 4 + c] = Math.round(
        (source[i * 4 + c] * opacity + base[c] * (1 - opacity)) * colorWeight
      );
    output[i * 4 + 3] = alpha[i];
  }
  return new Uint8Array(
    encode({ width: SIZE, height: SIZE, channels: 4, data: output })
  );
}
