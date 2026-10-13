import { ScanSemanticMode, WaffoPancake } from '@waffo/pancake-ts';

import { normalizeWaffoPrivateKey } from '@/core/payment/waffo';
import type { Locale } from '@/paraglide/runtime.js';

export class PromptBlockedError extends Error {
  constructor() {
    super('Prompt blocked by content safety check');
    this.name = 'PromptBlockedError';
  }
}

/** Server-only. Only an explicit block prevents generation; all other outcomes proceed. */
export async function assertPromptAllowed(input: {
  prompt: string;
  style?: string;
  locale: Locale;
  merchantId?: string;
  privateKey?: string;
}) {
  if (!input.merchantId?.trim() || !input.privateKey?.trim()) {
    return;
  }

  try {
    const client = new WaffoPancake({
      merchantId: input.merchantId.trim(),
      privateKey: normalizeWaffoPrivateKey(input.privateKey),
      baseUrl: 'https://api.waffo.ai',
      fetch: async (url, init) => {
        const response = await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(15_000),
        });
        // The SDK unwraps data but does not reject every non-2xx envelope.
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error('Prompt safety service is unavailable');
        }
        return response;
      },
    });
    const verdict = await client.contentSafety.scanPrompt({
      prompt: [input.prompt.trim(), input.style?.trim()]
        .filter(Boolean)
        .join('\n'),
      // The provider locale enum is narrower than the app's UI locales.
      // Keep the original prompt; use its supported English response locale.
      locale: input.locale === 'zh' ? 'zh' : 'en',
      semantic: ScanSemanticMode.Enforce,
    });
    if (verdict.action === 'block') throw new PromptBlockedError();
  } catch (error) {
    if (error instanceof PromptBlockedError) throw error;
    // Unavailable, degraded, or malformed responses must not stop generation.
    // Do not log upstream errors: they may include the prompt or credentials.
  }
}
