const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(bytes: Uint8Array) {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/** Keep PNG bytes as-is. Convert any other raster the provider returned. */
export async function ensurePng(bytes: Uint8Array) {
  if (isPng(bytes)) return bytes;
  const { default: sharp } = await import('sharp');
  return new Uint8Array(await sharp(Buffer.from(bytes)).png().toBuffer());
}
