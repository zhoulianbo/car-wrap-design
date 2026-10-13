import {
  MODEL_ASSET_DIRECTORY,
  MODEL_ASSET_EXTENSION,
  MODEL_ASSET_KEY_HEX,
  MODEL_ASSET_VERSION,
} from '@/config/model-assets';

/** Manifest paths name local source GLBs; the browser only requests encrypted assets. */
export function encryptedModelPath(sourcePath: string) {
  if (!/^\/models\/[\w-]+\.glb$/.test(sourcePath)) {
    throw new Error('Invalid model source path');
  }
  return `${MODEL_ASSET_DIRECTORY}${sourcePath.slice('/models/'.length, -4)}${MODEL_ASSET_EXTENSION}`;
}

export function encryptedModelUrl(sourcePath: string, baseUrl = '') {
  const path = encryptedModelPath(sourcePath);
  return `${baseUrl.replace(/\/+$/, '')}${path}?v=${MODEL_ASSET_VERSION}`;
}

let modelKey: Promise<CryptoKey> | undefined;

/** File layout: 16-byte IV, 16-byte authentication tag, then ciphertext. */
export async function decryptModel(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  if (bytes.byteLength < 44) throw new Error('Encrypted model is incomplete');
  if (!globalThis.crypto?.subtle) {
    throw new Error('Model decryption requires HTTPS or localhost');
  }
  modelKey ??= crypto.subtle.importKey(
    'raw',
    Uint8Array.from(MODEL_ASSET_KEY_HEX.match(/.{2}/g) ?? [], (hex) =>
      parseInt(hex, 16)
    ),
    'AES-GCM',
    false,
    ['decrypt']
  );
  // Web Crypto expects ciphertext followed by the authentication tag.
  const payload = new Uint8Array(bytes.byteLength - 16);
  payload.set(new Uint8Array(bytes, 32));
  payload.set(new Uint8Array(bytes, 16, 16), bytes.byteLength - 32);
  const decoded = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(bytes, 0, 16), tagLength: 128 },
    await modelKey,
    payload
  );
  const header = new DataView(decoded);
  if (
    decoded.byteLength < 12 ||
    header.getUint32(0, true) !== 0x46546c67 ||
    header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) !== decoded.byteLength
  ) {
    throw new Error('Decrypted model is not a valid GLB');
  }
  return decoded;
}
