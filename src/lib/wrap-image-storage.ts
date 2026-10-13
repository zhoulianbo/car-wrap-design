import type { StorageManager } from '@/core/storage';
import { createStorageKey, type StorageAssetKind } from '@/lib/storage-key';

export async function readWebp(
  file: FormDataEntryValue | null,
  maxBytes: number,
  squareSize?: number
) {
  if (
    !(file instanceof File) ||
    file.type !== 'image/webp' ||
    file.size <= 0 ||
    file.size > maxBytes
  ) {
    throw new Error('A WebP image within the size limit is required');
  }
  const body = new Uint8Array(await file.arrayBuffer());
  if (
    String.fromCharCode(...body.slice(0, 4)) !== 'RIFF' ||
    String.fromCharCode(...body.slice(8, 12)) !== 'WEBP'
  ) {
    throw new Error('Image signature does not match WebP');
  }
  if (squareSize) {
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
    let width = 0;
    let height = 0;
    for (let offset = 12; offset + 8 <= body.length; ) {
      const kind = String.fromCharCode(...body.slice(offset, offset + 4));
      const length = view.getUint32(offset + 4, true);
      const start = offset + 8;
      if (start + length > body.length) break;
      if (kind === 'VP8X' && length >= 10) {
        width =
          1 +
          body[start + 4] +
          (body[start + 5] << 8) +
          (body[start + 6] << 16);
        height =
          1 +
          body[start + 7] +
          (body[start + 8] << 8) +
          (body[start + 9] << 16);
        break;
      }
      if (kind === 'VP8 ' && length >= 10) {
        width = view.getUint16(start + 6, true) & 0x3fff;
        height = view.getUint16(start + 8, true) & 0x3fff;
        break;
      }
      if (kind === 'VP8L' && length >= 5 && body[start] === 0x2f) {
        const bits = view.getUint32(start + 1, true);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
        break;
      }
      offset = start + length + (length % 2);
    }
    if (width !== squareSize || height !== squareSize) {
      throw new Error(`Cover must be ${squareSize} × ${squareSize}`);
    }
  }
  return body;
}

export async function storeWrapImage(
  storage: StorageManager,
  body: Uint8Array,
  kind: StorageAssetKind
) {
  const key = createStorageKey(kind, 'webp');
  const saved = await storage.uploadFile({
    body,
    key,
    contentType: 'image/webp',
    disposition: 'inline',
  });
  if (!saved.success || !saved.url)
    throw new Error(saved.error || 'Image upload failed');
  return { key: saved.key || key, url: saved.url };
}
