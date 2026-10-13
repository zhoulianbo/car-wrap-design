// Typed client for the app's REST endpoints (src/routes/api/**).
// Unwraps the resp.ts envelope; errorCode is stable across locales.

import { resolveErrorCode, type ErrorCode } from './error-codes';
import { getErrorMessage } from './error-message';

export class ApiError extends Error {
  public errorCode: ErrorCode;
  constructor(
    public code: number,
    message: string,
    public data?: unknown,
    errorCode?: unknown,
    public status?: number
  ) {
    const resolved = resolveErrorCode(
      { errorCode, message },
      'REQUEST_FAILED',
      status
    );
    super(getErrorMessage(resolved));
    this.errorCode = resolved;
    this.name = 'ApiError';
  }
}

export interface PageResult<T> {
  items: T[];
  total: number;
}

export interface PageParams {
  page: number;
  pageSize: number;
  search?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  }).catch((error: unknown) => {
    if (init?.signal?.aborted) throw error;
    throw new ApiError(-1, resolveErrorCode(error, 'NETWORK_ERROR'));
  });
  const json = await res
    .json()
    .catch(() => ({ code: -1, message: res.statusText || 'Request failed' }));
  if (!res.ok || !json || json.code !== 0) {
    throw new ApiError(
      json?.code ?? -1,
      json?.message || 'Request failed',
      json?.data,
      json?.errorCode,
      res.status
    );
  }
  // respOk() omits data entirely — callers expecting void get undefined.
  return json.data as T;
}

export const apiGet = <T>(url: string, init?: RequestInit) =>
  request<T>(url, init);

/** Binary API responses, such as same-origin canvas textures. */
export async function apiGetBlob(url: string): Promise<Blob> {
  const response = await fetch(url).catch((error: unknown) => {
    throw new ApiError(-1, resolveErrorCode(error, 'NETWORK_ERROR'));
  });
  if (
    !response.ok ||
    response.headers.get('content-type')?.includes('application/json')
  ) {
    const error = await response.json().catch(() => null);
    throw new ApiError(
      error?.code ?? response.status,
      error?.message || 'Unable to load image',
      error?.data,
      resolveErrorCode(error, 'IMAGE_UNAVAILABLE', response.status),
      response.status
    );
  }
  return response.blob();
}

export const apiPost = <T = void>(url: string, body?: unknown) =>
  request<T>(url, {
    method: 'POST',
    body: body == null ? undefined : JSON.stringify(body),
  });

export const apiPut = <T = void>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = <T = void>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T = void>(url: string) =>
  request<T>(url, { method: 'DELETE' });

export function apiUpload<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
  method: 'POST' | 'PATCH' = 'POST'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => reject(new ApiError(-1, 'NETWORK_ERROR'));
    xhr.onabort = () => reject(new ApiError(-1, 'REQUEST_FAILED'));
    xhr.ontimeout = () => reject(new ApiError(-1, 'REQUEST_TIMEOUT'));
    xhr.onload = () => {
      const payload = xhr.response ?? {};
      if (xhr.status < 200 || xhr.status >= 300 || payload.code !== 0) {
        reject(
          new ApiError(
            payload.code ?? -1,
            payload.message || xhr.statusText || 'Upload failed',
            payload.data,
            resolveErrorCode(payload, 'UPLOAD_FAILED', xhr.status),
            xhr.status
          )
        );
        return;
      }
      resolve(payload.data as T);
    };
    xhr.send(formData);
  });
}

// Query-string builder for paginated list endpoints.
export function pageQuery(base: string, p: PageParams) {
  const params = new URLSearchParams({
    page: String(p.page),
    pageSize: String(p.pageSize),
  });
  if (p.search) params.set('search', p.search);
  return `${base}?${params}`;
}
