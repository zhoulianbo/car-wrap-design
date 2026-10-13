import { useEffect, useState } from 'react';

import type { PaintFinishKey, VehicleSlug } from '@/lib/vehicle-catalog';

import { VehicleViewer } from './vehicle-viewer';

export function GenerationCoverCapture({
  generationId,
  textureUrl,
  vehicleSlug,
  onCapture,
  canvas,
  finish,
}: {
  generationId: string;
  textureUrl?: string;
  canvas?: HTMLCanvasElement;
  finish?: PaintFinishKey;

  vehicleSlug: VehicleSlug;
  onCapture: (blob: Blob) => void;
}) {
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement>();

  useEffect(() => {
    if (canvas || !textureUrl) return;
    let active = true;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!active) return;
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || 1024;
      canvas.height = image.naturalHeight || 1024;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.fillStyle = '#f4f5f6';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setTextureCanvas(canvas);
    };
    image.src = textureUrl;
    return () => {
      active = false;
    };
  }, [textureUrl, canvas]);

  if (!canvas && !textureCanvas) return null;
  return (
    <div
      className="pointer-events-none fixed top-0 -left-[10000px] overflow-hidden"
      style={{
        width: 800,
        height: 800,
      }}
      aria-hidden="true"
    >
      <VehicleViewer
        vehicleSlug={vehicleSlug}
        textureCanvas={canvas ?? textureCanvas}
        finish={finish}
        controls={false}
        motion={false}
        coverCaptureKey={generationId}
        onCoverCapture={onCapture}
        className="size-full rounded-none border-0"
      />
    </div>
  );
}
