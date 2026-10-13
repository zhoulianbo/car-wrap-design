import {
  AIMediaType,
  AITaskStatus,
  type AIConfigs,
  type AIGenerateParams,
  type AIImage,
  type AIProvider,
  type AITaskResult,
} from './types';

export interface GrsaiConfigs extends AIConfigs {
  apiKey: string;
  baseUrl?: string;
}

type GrsaiResult = {
  id?: string;
  progress?: number;
  results?: Array<{ url?: string }>;
  status?: string;
  failure_reason?: string;
  error?: string;
};

/** Grsai image provider using the callback-capable draw API. */
export class GrsaiProvider implements AIProvider {
  readonly name = 'grsai';
  configs: GrsaiConfigs;

  constructor(configs: GrsaiConfigs) {
    this.configs = configs;
  }

  private get baseUrl() {
    return (this.configs.baseUrl || 'https://grsaiapi.com').replace(/\/$/, '');
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };
  }

  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    if (params.mediaType !== AIMediaType.IMAGE) {
      throw new Error(`Grsai does not support ${params.mediaType} generation`);
    }
    if (!params.model) throw new Error('model is required');
    if (!params.prompt) throw new Error('prompt is required');

    const options = params.options || {};
    const urls = Array.isArray(options.image_input)
      ? options.image_input
      : Array.isArray(options.input_images)
        ? options.input_images
        : [];
    const callbackUrl =
      params.callbackUrl &&
      !params.callbackUrl.includes('localhost') &&
      !params.callbackUrl.includes('127.0.0.1')
        ? params.callbackUrl
        : '-1';
    const payload = {
      model: params.model,
      prompt: params.prompt,
      aspectRatio: options.aspect_ratio || '1024x1024',
      urls,
      quality: options.quality,
      background: options.background,
      mask: options.mask,
      webHook: callbackUrl,
      shutProgress: Boolean(options.shut_progress),
    };
    const response = await fetch(`${this.baseUrl}/v1/draw/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Grsai request failed with status ${response.status}`);
    }
    const body = (await response.json()) as {
      code?: number;
      message?: string;
      msg?: string;
      data?: GrsaiResult;
    };
    if (body.code !== undefined && body.code !== 0) {
      throw new Error(body.message || body.msg || 'Grsai generation failed');
    }
    const taskId = body.data?.id;
    if (!taskId) throw new Error('Grsai generation returned no task id');
    return {
      taskId,
      taskStatus: AITaskStatus.PENDING,
      taskInfo: {},
      taskResult: body.data,
    };
  }

  async query({ taskId }: { taskId: string }): Promise<AITaskResult> {
    const response = await fetch(`${this.baseUrl}/v1/draw/result`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ id: taskId }),
    });
    if (!response.ok) {
      throw new Error(`Grsai query failed with status ${response.status}`);
    }
    const body = (await response.json()) as {
      code?: number;
      message?: string;
      msg?: string;
      data?: GrsaiResult;
    };
    if (body.code !== undefined && body.code !== 0) {
      throw new Error(body.message || body.msg || 'Grsai query failed');
    }
    const data = body.data || {};
    const images: AIImage[] = (data.results || [])
      .filter((item) => Boolean(item.url))
      .map((item) => ({ imageUrl: item.url }));
    return {
      taskId,
      taskStatus: mapGrsaiStatus(data.status),
      taskInfo: {
        images,
        status: data.status,
        errorMessage: data.failure_reason || data.error,
      },
      taskResult: data,
    };
  }
}

export function mapGrsaiStatus(status?: string): AITaskStatus {
  switch (status) {
    case 'succeeded':
    case 'success':
      return AITaskStatus.SUCCESS;
    case 'failed':
    case 'failure':
      return AITaskStatus.FAILED;
    case 'canceled':
      return AITaskStatus.CANCELED;
    case 'running':
    case 'processing':
      return AITaskStatus.PROCESSING;
    default:
      return AITaskStatus.PENDING;
  }
}
