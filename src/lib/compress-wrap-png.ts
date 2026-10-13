import { convertIndexedToRgb, decode } from 'fast-png';
import UPNG from 'upng-js';

// A quality target, not a hard cap: detailed artwork must not be degraded
// indefinitely merely to fit a byte budget.
export const WRAP_PNG_TARGET_BYTES = 500_000;

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  let crc = n;
  for (let bit = 0; bit < 8; bit++)
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function paeth(left: number, up: number, corner: number) {
  const p = left + up - corner;
  const a = Math.abs(p - left),
    b = Math.abs(p - up),
    c = Math.abs(p - corner);
  return a <= b && a <= c ? left : b <= c ? up : corner;
}

/** Lossless PNG row filtering + platform DEFLATE. No native addon: works in
 * Workers and Node. Input is the bounded, metadata-free RGBA PNG from fitWrapTexture.
 */
export async function compressWrapPng(
  png: Uint8Array
): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof CompressionStream === 'undefined') return new Uint8Array(png);
  const { width, height, channels, depth, data } = decode(png);
  if (width !== 1024 || height !== 1024 || channels !== 4 || depth !== 8)
    throw new Error('Expected a normalized 1024x1024 RGBA texture');
  const stride = width * 4;
  const filtered = new Uint8Array((stride + 1) * height);
  const candidates = Array.from({ length: 4 }, () => new Uint8Array(stride));
  // None, Sub, Up and Paeth cover flat artwork and smooth gradients without
  // changing any pixel values. Pick the lowest signed-byte magnitude per row.
  const filterTypes = [0, 1, 2, 4];
  for (let y = 0; y < height; y++) {
    const scores = [0, 0, 0, 0];
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x;
      const value = data[i];
      const left = x >= 4 ? data[i - 4] : 0;
      const up = y > 0 ? data[i - stride] : 0;
      const corner = y > 0 && x >= 4 ? data[i - stride - 4] : 0;
      const predictors = [0, left, up, paeth(left, up, corner)];
      for (let f = 0; f < 4; f++) {
        const residual = (value - predictors[f]) & 255;
        candidates[f][x] = residual;
        scores[f] += Math.min(residual, 256 - residual);
      }
    }
    let best = 0;
    for (let f = 1; f < 4; f++) if (scores[f] < scores[best]) best = f;
    const row = y * (stride + 1);
    filtered[row] = filterTypes[best];
    filtered.set(candidates[best], row + 1);
  }
  const stream = new Blob([filtered])
    .stream()
    .pipeThrough(new CompressionStream('deflate'));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  // Keep signature + IHDR; replace IDAT and retain IEND. fitWrapTexture emits
  // only these chunks, so no ancillary/profile chunks need to be carried over.
  const result = new Uint8Array(33 + 12 + compressed.length + 12);
  result.set(png.subarray(0, 33));
  const view = new DataView(result.buffer);
  view.setUint32(33, compressed.length);
  result.set([73, 68, 65, 84], 37); // IDAT
  result.set(compressed, 41);
  let crc = 0xffffffff;
  for (let i = 37; i < 41 + compressed.length; i++)
    crc = crcTable[(crc ^ result[i]) & 255] ^ (crc >>> 8);
  view.setUint32(41 + compressed.length, (crc ^ 0xffffffff) >>> 0);
  result.set(png.subarray(png.length - 12), result.length - 12);
  return result.length < png.length ? result : new Uint8Array(png);
}

/** Check visible error against both black and white, so alpha errors cannot
 * hide against one preview background. Ignore truly invisible pixels when
 * averaging; the large empty UV canvas must not inflate the quality score.
 */
function acceptablePalette(
  source: ArrayLike<number>,
  result: ArrayLike<number>
) {
  let pixels = 0;
  let squaredError = 0;
  let edgePixels = 0;
  let edgeSquaredError = 0;
  let largeErrors = 0;
  for (let i = 0; i < source.length; i += 4) {
    const alpha = source[i + 3];
    const outputAlpha = result[i + 3];
    // The template owns every edge sample. Palette compression must not change
    // its contour, including fractional alpha, even if RGB error is acceptable.
    if (alpha !== outputAlpha) return false;
    if (!alpha && !outputAlpha) continue;
    pixels++;
    let error = 0;
    let maxError = 0;
    for (let c = 0; c < 3; c++) {
      const black = (source[i + c] * alpha - result[i + c] * outputAlpha) / 255;
      const white = black + outputAlpha - alpha;
      error += black * black + white * white;
      maxError = Math.max(maxError, Math.abs(black), Math.abs(white));
    }
    squaredError += error;
    if (maxError > 24) largeErrors++;
    if (alpha > 8 && alpha < 240) {
      edgePixels++;
      edgeSquaredError += error;
    }
  }
  // Conservative visual-error limits, in 8-bit channel values. These are not
  // a claim of mathematical losslessness; retain lossless PNG if they fail.
  return (
    pixels > 0 &&
    squaredError / (pixels * 6) <= 4 * 4 &&
    (!edgePixels || edgeSquaredError / (edgePixels * 6) <= 8 * 8) &&
    largeErrors / pixels <= 0.003
  );
}

/** Storage-only optimization. Keep resolution and smooth alpha; try one
 * 256-color palette only when lossless exceeds the target. Pure JS for Workers.
 * Never call this on reads: repeated quantization can accumulate color error.
 */
export async function optimizeWrapPng(png: Uint8Array) {
  const lossless = await compressWrapPng(png);
  if (lossless.length <= WRAP_PNG_TARGET_BYTES) return lossless;
  const source = decode(lossless);
  const pixels = new Uint8Array(source.data);
  const palette = new Uint8Array(
    UPNG.encode([pixels.buffer], source.width, source.height, 256)
  );
  if (palette.length >= lossless.length) return lossless;
  const decoded = decode(palette);
  const output = decoded.palette ? convertIndexedToRgb(decoded) : decoded.data;
  if (!acceptablePalette(source.data, output)) return lossless;
  return palette;
}
