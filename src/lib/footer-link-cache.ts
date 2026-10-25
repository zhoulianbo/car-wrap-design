import { envConfigs } from '@/config';
import { CONFIG_KV_PREFIX } from '@/config/kv';
import {
  footerLinkSnapshotSchema,
  type FooterLinkItem,
} from '@/lib/footer-links';

export const FOOTER_LINK_KV_KEY = `${CONFIG_KV_PREFIX}footer-links:v1`;

type FooterLinkKv = {
  get(
    key: string,
    options: { type: 'text'; cacheTtl: number }
  ): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export function getFooterLinkKv(): FooterLinkKv | undefined {
  const globals = globalThis as typeof globalThis & {
    __CF_ENV__?: { CONFIG_KV?: FooterLinkKv };
    __env__?: { CONFIG_KV?: FooterLinkKv };
  };
  const kv = (globals.__CF_ENV__ ?? globals.__env__)?.CONFIG_KV;
  if (!kv && envConfigs.database_provider === 'd1') {
    throw new Error('Config KV binding "CONFIG_KV" not found.');
  }
  return kv;
}

export async function readFooterLinksFromKv(
  kv: FooterLinkKv
): Promise<FooterLinkItem[]> {
  const raw = await kv.get(FOOTER_LINK_KV_KEY, { type: 'text', cacheTtl: 60 });
  // A new installation has no links yet. Never fall back to D1 on Workers.
  if (raw === null) return [];
  return footerLinkSnapshotSchema.parse(JSON.parse(raw));
}
