import {
  GrsaiProvider,
  KieProvider,
  ReplicateProvider,
  type AIProvider,
} from '@/core/ai';

import { WRAP_GENERATION_MODEL } from './wrap-generations';

export type WrapProviderConfig = Record<string, string>;

export function createWrapProvider(
  configs: WrapProviderConfig,
  requestedProvider?: string
): { provider: AIProvider; model: string } | null {
  const name =
    requestedProvider || configs.wrap_generation_provider || 'replicate';
  if (name === 'kie') {
    if (!configs.kie_api_key || !configs.kie_image_model) return null;
    return {
      provider: new KieProvider({ apiKey: configs.kie_api_key }),
      model: configs.kie_image_model,
    };
  }
  if (name === 'grsai') {
    if (!configs.grsai_api_key) return null;
    return {
      provider: new GrsaiProvider({
        apiKey: configs.grsai_api_key,
        baseUrl: configs.grsai_base_url || undefined,
      }),
      model: configs.grsai_image_model || 'gpt-image-2.5',
    };
  }
  if (!configs.replicate_api_token) return null;
  return {
    provider: new ReplicateProvider({ apiToken: configs.replicate_api_token }),
    model: WRAP_GENERATION_MODEL,
  };
}
