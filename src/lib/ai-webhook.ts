import { envConfigs } from '@/config';

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

export async function createAiWebhookToken(provider: string) {
  const secret = envConfigs.auth_secret;
  if (!secret) return '';
  return toHex(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`wrap-ai:${provider}:${secret}`)
    )
  );
}

export async function verifyAiWebhookToken(provider: string, token: string) {
  const expected = await createAiWebhookToken(provider);
  if (!expected || token.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ token.charCodeAt(index);
  }
  return difference === 0;
}
