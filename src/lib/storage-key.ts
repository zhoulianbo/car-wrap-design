export type StorageAssetKind = 'design' | 'cover' | 'storage' | 'upload';

export function storageYearMonth(date = new Date()) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function createStorageKey(
  kind: StorageAssetKind,
  extension = 'webp',
  id: string = crypto.randomUUID(),
  date = new Date()
) {
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!safeExtension) throw new Error('Storage extension is required');
  const safeId = id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `${kind}/${storageYearMonth(date)}/${safeId}.${safeExtension}`;
}
