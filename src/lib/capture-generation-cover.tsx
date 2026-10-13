import { createRoot } from 'react-dom/client';

import { apiGet, apiGetBlob, apiUpload } from '@/lib/api-client';
import type { PaintFinishKey, VehicleSlug } from '@/lib/vehicle-catalog';

const inFlight = new Map<string, Promise<string>>();

/** Reuse the manual-add renderer, then persist its cover without another AI request. */
export function ensureGenerationCover(
  id: string,
  vehicleSlug: VehicleSlug,
  errorMessage: string
) {
  const existing = inFlight.get(id);
  if (existing) return existing;
  const operation = (async () => {
    const current = await apiGet<{ coverUrl?: string }>(
      `/api/ai-generations/${encodeURIComponent(id)}`
    );
    if (current.coverUrl) return current.coverUrl;
    // Same-origin authenticated image endpoint avoids depending on R2 CORS for capture.
    const texture = await apiGetBlob(
      `/api/ai-generations/${encodeURIComponent(id)}?download=1`
    );
    const textureUrl = URL.createObjectURL(texture);
    try {
      const cover = await renderVehicleCover({
        vehicleSlug,
        textureUrl,
        errorMessage,
      });
      const form = new FormData();
      form.set(
        'cover',
        new File([cover], 'cover.webp', { type: 'image/webp' })
      );
      return (
        await apiUpload<{ coverUrl: string }>(
          `/api/ai-generations/${encodeURIComponent(id)}`,
          form
        )
      ).coverUrl;
    } finally {
      URL.revokeObjectURL(textureUrl);
    }
  })();
  inFlight.set(id, operation);
  void operation.finally(() => inFlight.delete(id)).catch(() => {});
  return operation;
}

/** Shared 800px transparent cover renderer for reviewed publications and admin uploads. */
export async function renderVehicleCover(input: {
  vehicleSlug: VehicleSlug;
  canvas?: HTMLCanvasElement;
  textureUrl?: string;
  finish?: PaintFinishKey;
  errorMessage: string;
}): Promise<Blob> {
  const { GenerationCoverCapture } =
    await import('@/components/vehicle-viewer/generation-cover-capture');
  const host = document.createElement('div');
  document.body.appendChild(host);
  let fail: (error: Error) => void = () => {};
  const root = createRoot(host, {
    onUncaughtError: () => fail(new Error(input.errorMessage)),
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<Blob>((resolve, reject) => {
      fail = reject;
      timer = setTimeout(() => reject(new Error(input.errorMessage)), 45_000);
      root.render(
        <GenerationCoverCapture
          generationId={crypto.randomUUID()}
          vehicleSlug={input.vehicleSlug}
          canvas={input.canvas}
          textureUrl={input.textureUrl}
          finish={input.finish}
          onCapture={resolve}
        />
      );
    });
  } finally {
    clearTimeout(timer);
    root.unmount();
    host.remove();
  }
}
