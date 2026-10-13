import { lazy, Suspense, useEffect, useState } from 'react';

import type { PaintFinishKey, VehicleSlug } from '@/lib/vehicle-catalog';
import { m } from '@/paraglide/messages.js';
import type { VehicleViewerLabels } from '@/components/vehicle-viewer/vehicle-viewer';

const VehicleViewer = lazy(() =>
  import('@/components/vehicle-viewer').then((module) => ({
    default: module.VehicleViewer,
  }))
);

export function WrapImagePreview({
  vehicleSlug,
  imageUrl,
  className = 'h-105 sm:h-130',
  finish,
  textureCanvas,
  color,
  motion = true,
  initialAutoRotate = true,
}: {
  vehicleSlug: VehicleSlug;
  imageUrl?: string;
  className?: string;
  finish?: PaintFinishKey;
  textureCanvas?: HTMLCanvasElement | null;
  color?: string;
  motion?: boolean;
  initialAutoRotate?: boolean;
}) {
  const labels: VehicleViewerLabels = {
    loadingDescription: m['viewer.description'](),
    loadingModel: m['viewer.loading_model'](),
    vehicleDescription: (model, year) =>
      m['viewer.vehicle_description']({ model, year }),
    pause: m['viewer.pause'](),
    play: m['viewer.play'](),
    reset: m['viewer.reset'](),
    fullscreen: m['viewer.fullscreen'](),
    exitFullscreen: m['landing.vehicle.exit_fullscreen'](),
    fullscreenError: m['landing.vehicle.fullscreen_error'](),
    screenshot: m['viewer.screenshot'](),
    front: m['viewer.front'](),
    rear: m['viewer.rear'](),
    side: m['viewer.side'](),
    zoomIn: m['viewer.zoom_in'](),
    zoomOut: m['viewer.zoom_out'](),
    viewControls: m['viewer.view_controls'](),
    color: (color) => m['viewer.color']({ color }),
    finishes: {
      gloss: m['viewer.finish.gloss'](),
      satin: m['viewer.finish.satin'](),
      matte: m['viewer.finish.matte'](),
      metallic: m['viewer.finish.metallic'](),
      pearlescent: m['viewer.finish.pearlescent'](),
    } satisfies Record<PaintFinishKey, string>,
  };
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setCanvas(null);
    setImageState(imageUrl ? 'loading' : 'ready');
    if (!imageUrl) {
      setCanvas(null);
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (cancelled) return;
      const next = document.createElement('canvas');
      next.width = image.naturalWidth || 1024;
      next.height = image.naturalHeight || 1024;
      next.getContext('2d')?.drawImage(image, 0, 0);
      setCanvas(next);
      setImageState('ready');
    };
    image.onerror = () => {
      if (!cancelled) {
        setCanvas(null);
        setImageState('error');
      }
    };
    image.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, attempt]);

  if (imageUrl && imageState !== 'ready')
    return (
      <div
        className={`${className} flex items-center justify-center bg-[color:var(--studio-preview)] p-6 text-center text-sm text-slate-400`}
        role={imageState === 'error' ? 'alert' : 'status'}
      >
        <div>
          {imageState === 'error'
            ? m['detail.image_error']()
            : m['detail.loading']()}
          {imageState === 'error' && (
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="mt-3 block w-full text-emerald-300 underline"
            >
              {m['landing.hero.retry']()}
            </button>
          )}
        </div>
      </div>
    );
  return (
    <Suspense
      fallback={
        <div className={className} role="status">
          {labels.loadingModel}
        </div>
      }
    >
      <VehicleViewer
        vehicleSlug={vehicleSlug}
        textureCanvas={textureCanvas ?? canvas}
        color={color}
        motion={motion}
        initialAutoRotate={initialAutoRotate}
        previewMode
        previewFullscreen
        labels={labels}
        className={className}
        finish={finish}
      />
    </Suspense>
  );
}
