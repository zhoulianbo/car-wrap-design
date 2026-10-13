import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import {
  assertPromptAllowed,
  PromptBlockedError,
} from '@/core/ai/prompt-safety';
import { getAuth } from '@/core/auth';
import {
  createWrapGeneration,
  listUserGenerations,
} from '@/modules/ai-tasks/wrap-generations';
import { createWrapProvider } from '@/modules/ai-tasks/wrap-provider';
import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';
import { createAiWebhookToken } from '@/lib/ai-webhook';
import { generationTemplateUrl } from '@/lib/generation-template-url';
import { respData, respErr } from '@/lib/resp';
import { isVehicleSlug } from '@/lib/vehicle-catalog';
import { getLocale, locales } from '@/paraglide/runtime.js';

const schema = z.object({
  vehicleSlug: z.string().min(1),
  mode: z.enum(['text-to-image', 'image-to-image']),
  prompt: z.string().trim().min(1).max(2000),
  locale: z.enum(locales).optional(),
  style: z.string().trim().max(120).optional(),
  baseColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  openToGallery: z.boolean().default(true),
  preferredColors: z
    .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
    .max(16)
    .optional(),
  inputAssetIds: z.array(z.string()).max(4).optional(),
  idempotencyKey: z.string().min(8).max(120),
});

async function GET({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    return respData(await listUserGenerations(session.user.id));
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to list generated images'
    );
  }
}

async function POST({ request }: { request: Request }) {
  let locale = getLocale();
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success || !isVehicleSlug(parsed.data.vehicleSlug)) {
      return respErr('Invalid generation request', { status: 400 });
    }
    locale = parsed.data.locale ?? locale;
    const configs = await getAllConfigs();
    const resolved = createWrapProvider(configs);
    if (!resolved)
      return respErr('The selected AI provider is not configured', {
        status: 503,
      });
    const storage = await getStorage({ root: true });
    if (!storage)
      return respErr('R2 storage is not configured', { status: 503 });
    const appUrl = configs.app_url || new URL(request.url).origin;
    const guideImageUrl = generationTemplateUrl(
      parsed.data.vehicleSlug,
      configs.assets_url,
      appUrl
    );
    const token = await createAiWebhookToken(resolved.provider.name);
    const callbackUrl =
      token && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')
        ? `${appUrl.replace(/\/$/, '')}/api/ai-generations/notify/${resolved.provider.name}?token=${token}`
        : undefined;
    // Both the standalone generator and editor use this endpoint. Check all
    // user-supplied text before creating a task or reserving any credits.
    await assertPromptAllowed({
      prompt: parsed.data.prompt,
      style: parsed.data.style,
      locale,
      merchantId: configs.waffo_merchant_id,
      privateKey: configs.waffo_private_key,
    });
    return respData(
      await createWrapGeneration({
        userId: session.user.id,
        vehicleSlug: parsed.data.vehicleSlug,
        mode: parsed.data.mode,
        prompt: parsed.data.prompt,
        style: parsed.data.style,
        baseColor: parsed.data.baseColor,
        preferredColors: parsed.data.preferredColors,
        openToGallery: parsed.data.openToGallery,
        inputAssetIds: parsed.data.inputAssetIds,
        guideImageUrl,
        storage,
        idempotencyKey: parsed.data.idempotencyKey,
        provider: resolved.provider,
        providerModel: resolved.model,
        callbackUrl,
      }),
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof PromptBlockedError) {
      return respErr('AI_CONTENT_BLOCKED', {
        status: 422,
      });
    }
    return respErr(
      error instanceof Error ? error.message : 'Failed to create generation'
    );
  }
}

export const Route = createFileRoute('/api/ai-generations/')({
  server: { handlers: { GET, POST } },
});
