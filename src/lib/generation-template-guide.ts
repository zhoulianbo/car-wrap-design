import type { StorageManager } from '@/core/storage';

import { wrapGenerationGuide } from './wrap-texture';

/** Keep editor templates intact; providers receive an opaque black/white guide. */
export async function prepareGenerationTemplateGuide(
  templateUrl: string,
  storage: StorageManager
) {
  const response = await fetch(templateUrl, {
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Wrap template unavailable');
  const body = wrapGenerationGuide(
    new Uint8Array(await response.arrayBuffer())
  );
  // Content-addressed keys reuse guides and change when template geometry changes.
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new Uint8Array(body).buffer
  );
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  const key = `templates/ai-guides/${hash}.png`;
  const existingUrl = storage.getPublicUrl({ key });
  if (existingUrl && (await storage.exists({ key }))) return existingUrl;
  const saved = await storage.uploadFile({
    body,
    key,
    contentType: 'image/png',
    disposition: 'inline',
  });
  if (!saved.success || !saved.url)
    throw new Error(saved.error || 'Wrap generation guide upload failed');
  return saved.url;
}
