import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ensureGenerationCover } from '@/lib/capture-generation-cover';
import type { VehicleSlug } from '@/lib/vehicle-catalog';
import { m } from '@/paraglide/messages.js';

export function GenerationCoverStatus({
  id,
  vehicleSlug,
}: {
  id: string;
  vehicleSlug: VehicleSlug;
}) {
  const queryClient = useQueryClient();
  const cover = useMutation({
    mutationFn: () =>
      ensureGenerationCover(id, vehicleSlug, m['studio.cover_save_failed']()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-designs'] });
      void queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
  });
  const { mutate } = cover;
  useEffect(() => {
    mutate();
  }, [id, vehicleSlug, mutate]);
  if (cover.isPending)
    return (
      <p role="status" className="text-muted-foreground px-4 py-2 text-xs">
        {m['generator.cover_rendering']()}
      </p>
    );
  if (!cover.isError) return null;
  return (
    <div role="alert" className="px-4 py-2 text-xs text-red-500">
      {m['studio.cover_save_failed']()}{' '}
      <button
        type="button"
        className="underline"
        onClick={() => cover.mutate()}
      >
        {m['generator.cover_retry']()}
      </button>
    </div>
  );
}
