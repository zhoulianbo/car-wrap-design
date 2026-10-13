import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Images } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import type { VehicleFamily } from '@/lib/vehicle-catalog';
import type { PublicDesignSummary } from '@/lib/wrap-types';
import { m } from '@/paraglide/messages.js';
import { GalleryCard } from '@/blocks/gallery-card';
import { SectionHeading } from '@/components/marketing/section-heading';

export function GalleryPreview({
  family,
  title,
  description,
  limit = 10,
  initialDesigns,
}: {
  family?: VehicleFamily;
  title?: string;
  description?: string;
  limit?: number;
  initialDesigns?: PublicDesignSummary[] | null;
} = {}) {
  const [retryRequested, setRetryRequested] = useState(false);
  const query = useQuery({
    queryKey: ['gallery-preview', family ?? 'all', limit],
    initialData: initialDesigns ?? undefined,
    staleTime: 30_000,
    enabled: initialDesigns !== null || retryRequested,
    queryFn: () =>
      apiGet<PublicDesignSummary[]>(
        `/api/gallery?limit=${limit}${family ? `&family=${family}` : ''}`
      ),
  });
  const designs = query.data ?? [];
  const loadFailed =
    query.isError ||
    (initialDesigns === null && !query.data && !query.isFetching);
  return (
    <section
      id="gallery"
      className="border-y border-white/5 bg-[#0a0e16] py-16 sm:py-20"
    >
      <div className="page-container">
        <SectionHeading
          title={title ?? m['landing.gallery.title']()}
          description={description ?? m['landing.gallery.description']()}
        />
        {query.isPending && !loadFailed ? (
          <div
            className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5"
            aria-label={m['landing.gallery.loading']()}
            role="status"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-2xl bg-white/5"
              />
            ))}
          </div>
        ) : loadFailed ? (
          <div
            role="alert"
            className="mt-10 py-12 text-center text-sm text-slate-400"
          >
            <p>{m['landing.gallery.error']()}</p>
            <button
              onClick={() => {
                setRetryRequested(true);
                void query.refetch();
              }}
              className="mt-3 text-emerald-300 underline"
            >
              {m['landing.hero.retry']()}
            </button>
          </div>
        ) : designs.length ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {designs.slice(0, limit).map((design) => (
              <GalleryCard key={design.id} design={design} />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <Images className="size-8 text-emerald-300" />
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              {m['landing.gallery.empty']()}
            </p>
          </div>
        )}
        <div className="mt-8 text-center">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200"
          >
            {m['landing.gallery.cta']()} <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
