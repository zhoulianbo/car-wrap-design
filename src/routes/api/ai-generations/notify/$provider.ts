import { createFileRoute } from '@tanstack/react-router';

import { AITaskStatus, type AITaskResult } from '@/core/ai';
import { handleWrapGenerationWebhook } from '@/modules/ai-tasks/wrap-generations';
import { getStorage } from '@/modules/storage/service';
import { verifyAiWebhookToken } from '@/lib/ai-webhook';
import { respErr, respOk } from '@/lib/resp';

function parseJson(value: unknown) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function statusFrom(value: unknown): AITaskStatus {
  const status = String(value || '').toLowerCase();
  if (['success', 'succeeded', 'completed'].includes(status))
    return AITaskStatus.SUCCESS;
  if (['fail', 'failed', 'failure', 'error'].includes(status))
    return AITaskStatus.FAILED;
  if (['cancel', 'canceled', 'cancelled'].includes(status))
    return AITaskStatus.CANCELED;
  if (['processing', 'running', 'generating'].includes(status))
    return AITaskStatus.PROCESSING;
  return AITaskStatus.PENDING;
}

function parseCallback(provider: string, body: any): AITaskResult {
  if (provider === 'kie') {
    const data = body?.data || body;
    const result = parseJson(data?.resultJson) as any;
    const urls = result?.resultUrls || data?.resultUrls || [];
    return {
      taskId: String(data?.taskId || data?.id || ''),
      taskStatus: statusFrom(data?.state || data?.status),
      taskInfo: {
        images: Array.isArray(urls)
          ? urls.map((url: string) => ({ imageUrl: url }))
          : [],
        status: data?.state || data?.status,
        errorMessage: data?.failMsg || data?.errorMessage || body?.msg,
      },
      taskResult: body,
    };
  }
  if (provider === 'grsai') {
    const data = body?.data || body;
    return {
      taskId: String(data?.id || ''),
      taskStatus: statusFrom(data?.status),
      taskInfo: {
        images: Array.isArray(data?.results)
          ? data.results
              .filter((item: any) => item?.url)
              .map((item: any) => ({ imageUrl: item.url }))
          : [],
        status: data?.status,
        errorMessage: data?.failure_reason || data?.error,
      },
      taskResult: body,
    };
  }
  if (provider === 'replicate') {
    const output = Array.isArray(body?.output) ? body.output : [body?.output];
    return {
      taskId: String(body?.id || ''),
      taskStatus: statusFrom(body?.status),
      taskInfo: {
        images: output
          .filter(Boolean)
          .map((url: string) => ({ imageUrl: url })),
        status: body?.status,
        errorMessage: body?.error ? String(body.error) : undefined,
      },
      taskResult: body,
    };
  }
  throw new Error('Unsupported AI webhook provider');
}

async function POST({
  request,
  params,
}: {
  request: Request;
  params: { provider: string };
}) {
  try {
    const provider = params.provider;
    if (!['kie', 'grsai', 'replicate'].includes(provider)) {
      return respErr('Unsupported AI webhook provider', { status: 404 });
    }
    const token = new URL(request.url).searchParams.get('token') || '';
    if (!(await verifyAiWebhookToken(provider, token))) {
      return respErr('Invalid webhook token', { status: 401 });
    }
    const result = parseCallback(provider, await request.json());
    if (!result.taskId)
      return respErr('Callback task id is missing', { status: 400 });
    await handleWrapGenerationWebhook({
      provider,
      providerPredictionId: result.taskId,
      result,
      storage: await getStorage({ root: true }),
    });
    return respOk();
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'AI webhook failed',
      {
        status: 500,
      }
    );
  }
}

export const Route = createFileRoute('/api/ai-generations/notify/$provider')({
  server: { handlers: { POST } },
});
