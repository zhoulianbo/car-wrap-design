/** Resolve stored object metadata against the current trusted storage domain. */
export function storageObjectUrl(
  storedUrl: string,
  storageDomain: string,
  objectKey?: string | null
) {
  const domain = new URL(storageDomain);
  if (domain.protocol !== 'https:' || domain.username || domain.password)
    throw new Error('Invalid storage domain');
  const source = new URL(storedUrl);
  if (source.protocol !== 'https:' || source.username || source.password)
    throw new Error('Invalid texture source');
  if (source.origin === domain.origin) return source;
  // A domain change must never turn this into an arbitrary URL proxy. Only a
  // verified database object key can be moved onto the configured origin.
  if (
    !objectKey ||
    !/^[a-zA-Z0-9_/-]+\.(?:webp|png|jpe?g)$/.test(objectKey) ||
    objectKey.startsWith('/') ||
    objectKey.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('Invalid texture source');
  return new URL(
    `${domain.pathname.replace(/\/$/, '')}/${objectKey}`,
    domain.origin
  );
}
