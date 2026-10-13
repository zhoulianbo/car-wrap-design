import { ApiError } from './api-client';

const MAX_EDGE = 4096;

export async function sanitizeImageFile(
  file: File,
  options: { maxBytes?: number } = {}
): Promise<File> {
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new ApiError(-1, 'UNSUPPORTED_IMAGE');
  }
  if (file.size > maxBytes) throw new ApiError(-1, 'FILE_TOO_LARGE');
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new ApiError(-1, 'INVALID_IMAGE');
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new ApiError(-1, 'IMAGE_PROCESSING_FAILED');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const outputType = 'image/webp';
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new ApiError(-1, 'IMAGE_PROCESSING_FAILED')),
      outputType,
      0.9
    )
  );
  if (blob.size > maxBytes) throw new ApiError(-1, 'FILE_TOO_LARGE');
  return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
    type: outputType,
    lastModified: Date.now(),
  });
}
