export const WRAP_COVER_SIZE = 800;
export const WRAP_COVER_PADDING = 20;

/** Fit the visible car without distortion; retain alpha and at least 20px per side. */
export function composeVehicleCover(source: HTMLCanvasElement) {
  const readback = document.createElement('canvas');
  readback.width = source.width;
  readback.height = source.height;
  const context = readback.getContext('2d');
  if (!context) return null;
  context.drawImage(source, 0, 0);
  const pixels = context.getImageData(0, 0, source.width, source.height).data;
  let left = source.width,
    right = -1,
    top = source.height,
    bottom = -1;
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      if (pixels[(y * source.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return null;
  const output = document.createElement('canvas');
  output.width = output.height = WRAP_COVER_SIZE;
  const target = output.getContext('2d');
  if (!target) return null;
  const width = right - left + 1,
    height = bottom - top + 1;
  const scale =
    (WRAP_COVER_SIZE - 2 * WRAP_COVER_PADDING) / Math.max(width, height);
  target.drawImage(
    readback,
    left,
    top,
    width,
    height,
    (WRAP_COVER_SIZE - width * scale) / 2,
    (WRAP_COVER_SIZE - height * scale) / 2,
    width * scale,
    height * scale
  );
  return output;
}
