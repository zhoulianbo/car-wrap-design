import { useState } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { GenerationCoverCapture } from '@/components/vehicle-viewer';

export const Route = createFileRoute('/cover-preview')({
  loader: async () => {
    if (!import.meta.env.DEV) throw notFound();
    const { default: textureUrl } =
      await import('../../tmp/custom-wraps-master/model3/example/Acid_Drip.png?url');
    return { textureUrl };
  },
  component: CoverPreviewPage,
});

function CoverPreviewPage() {
  const { textureUrl } = Route.useLoaderData();
  const [coverUrl, setCoverUrl] = useState<string>();

  const saveCover = async (blob: Blob) => {
    await fetch('/api/cover-preview', { method: 'POST', body: blob });
    setCoverUrl(URL.createObjectURL(blob));
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#262628]">
      <GenerationCoverCapture
        generationId="acid-drip-preview-v5"
        textureUrl={textureUrl}
        vehicleSlug="model-3-legacy"
        onCapture={(blob) => void saveCover(blob)}
      />
      {coverUrl ? (
        <img
          src={coverUrl}
          alt="Acid Drip polished high-resolution cover"
          className="w-[1200px] max-w-full object-contain"
        />
      ) : (
        <p className="text-white">Rendering…</p>
      )}
    </main>
  );
}
