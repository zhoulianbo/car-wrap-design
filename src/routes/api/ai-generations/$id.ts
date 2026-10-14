import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  getOwnedSucceededGeneration,
  getWrapGeneration,
  getWrapGenerationProviderName,
  saveGenerationCover,
} from '@/modules/ai-tasks/wrap-generations';
import { createWrapProvider } from '@/modules/ai-tasks/wrap-provider';
import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';
import { isPng } from '@/lib/png-bytes';
import { respData, respErr } from '@/lib/resp';
import { readWebp } from '@/lib/wrap-image-storage';

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const search = new URL(request.url).searchParams;
    if (search.get('download') === '1' || search.get('texture') === '1') {
      return downloadGenerationPng(
        session.user.id,
        params.id,
        search.get('download') === '1'
      );
    }
    const configs = await getAllConfigs();
    const providerName = await getWrapGenerationProviderName({
      userId: session.user.id,
      generationId: params.id,
    });
    const provider = createWrapProvider(configs, providerName)?.provider;
    return respData(
      await getWrapGeneration({
        userId: session.user.id,
        generationId: params.id,
        provider,
        storage: await getStorage({ root: true }),
      })
    );
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to load generation'
    );
  }
}

async function POST({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    await getOwnedSucceededGeneration(session.user.id, params.id);
    const form = await request.formData();
    const body = await readWebp(form.get('cover'), 5 * 1024 * 1024, 800);
    const storage = await getStorage({ root: true });
    if (!storage) return respErr('Storage unavailable', { status: 503 });
    return respData(
      await saveGenerationCover(session.user.id, params.id, body, storage)
    );
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to save cover',
      { status: 400 }
    );
  }
}

async function downloadGenerationPng(
  userId: string,
  generationId: string,
  download: boolean
) {
  const generation = await getOwnedSucceededGeneration(userId, generationId);
  const configs = await getAllConfigs();
  if (!configs.r2_domain)
    return respErr('Storage unavailable', { status: 503 });
  const source = new URL(generation.outputUrl!);
  const storage = new URL(configs.r2_domain);
  if (
    source.protocol !== 'https:' ||
    source.origin !== storage.origin ||
    source.username ||
    source.password
  ) {
    return respErr('Invalid texture source', { status: 502 });
  }
  const response = await fetch(source, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return respErr('Texture unavailable', { status: 502 });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!isPng(bytes)) return respErr('Texture is not a PNG', { status: 502 });
  // Normalize once, before storage. Reads must preserve the saved PNG bytes.
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="ai-car-wrap.png"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const Route = createFileRoute('/api/ai-generations/$id')({
  server: { handlers: { GET, POST } },
});
