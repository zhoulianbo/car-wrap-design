import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Heart, Images, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { apiGetBlob } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-message';
import { getVehicleAssetConfig } from '@/lib/vehicle-catalog';
import type { PublicDesignSummary } from '@/lib/wrap-types';
import { m } from '@/paraglide/messages.js';
import { useDesignLike } from '@/hooks/use-design-like';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function GalleryCard({
  design,
  showLikes = false,
}: {
  design: PublicDesignSummary;
  showLikes?: boolean;
}) {
  const queryClient = useQueryClient();
  const [textureRequested, setTextureRequested] = useState(false);
  const like = useDesignLike(design.slug, design.likeCount);
  const vehicle = getVehicleAssetConfig(design.vehicleSlug);
  const download = useMutation({
    mutationFn: () =>
      apiGetBlob(`/api/gallery/${encodeURIComponent(design.slug)}?download=1`),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${design.slug}.${blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      void queryClient.invalidateQueries({ queryKey: ['gallery-preview'] });
      void queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'IMAGE_UNAVAILABLE')),
  });
  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[.025]">
      <Link
        href={`/gallery/${design.slug}`}
        onPointerEnter={() => setTextureRequested(true)}
        onFocus={() => setTextureRequested(true)}
        className="group block focus-visible:outline-2 focus-visible:outline-emerald-300"
      >
        <div className="relative aspect-square overflow-hidden bg-[#121a23]">
          {design.coverUrl ? (
            <img
              src={design.coverUrl}
              alt={design.title}
              loading="lazy"
              width={400}
              height={400}
              className="size-full translate-y-[9%] object-contain p-4"
            />
          ) : (
            <Images className="absolute top-1/2 left-1/2 size-8 -translate-1/2 text-slate-500" />
          )}
          {design.textureUrl && (!design.coverUrl || textureRequested) && (
            <img
              src={design.textureUrl}
              alt={m['landing.gallery.texture_alt']({ title: design.title })}
              loading="lazy"
              width={400}
              height={400}
              className={`absolute inset-0 size-full bg-[#121a23] object-contain p-4 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 ${design.coverUrl ? 'opacity-0' : 'opacity-100'}`}
            />
          )}
        </div>
        <div className="px-4 pt-4">
          <h3
            className="truncate text-sm font-semibold text-white"
            title={design.title}
          >
            {design.title}
          </h3>
          <p className="mt-1 truncate text-xs text-slate-400">
            {vehicle.trim} · {vehicle.year}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-4">
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400">
          <Avatar className="size-6">
            <AvatarImage src={design.authorImage ?? undefined} alt="" />
            <AvatarFallback className="bg-slate-700 text-[10px] text-slate-200">
              {design.authorName.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate" title={design.authorName}>
            {design.authorName}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showLikes && (
            <button
              type="button"
              aria-pressed={like.liked}
              aria-label={m['landing.gallery.like_label']({
                title: design.title,
                count: like.count,
              })}
              disabled={like.isPending}
              onClick={() =>
                like.toggle(() =>
                  toast.error(m['landing.gallery.like_error']())
                )
              }
              className="flex items-center gap-1 rounded-md p-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:opacity-50 aria-pressed:text-emerald-300"
            >
              <Heart
                className={`size-3.5 ${like.liked ? 'fill-current' : ''}`}
              />
              <span className="tabular-nums">{like.count}</span>
            </button>
          )}
          <button
            type="button"
            disabled={!design.textureUrl || download.isPending}
            onClick={() => download.mutate()}
            aria-label={m['landing.gallery.download_label']({
              title: design.title,
              count: design.downloadCount ?? 0,
            })}
            className="flex shrink-0 items-center gap-1.5 rounded-md p-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:opacity-50"
          >
            {download.isPending ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span className="tabular-nums">{design.downloadCount ?? 0}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
