import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { getPublicGalleryPage } from '@/features/gallery/queries';
import { ChevronLeft, ChevronRight, Images, Search } from 'lucide-react';
import { z } from 'zod';

import { Link } from '@/core/i18n/navigation';
import { apiGet, type PageResult } from '@/lib/api-client';
import { marketingHead } from '@/lib/seo';
import { isVehicleSlug, VEHICLE_ASSET_MANIFEST } from '@/lib/vehicle-catalog';
import type { PublicDesignSummary } from '@/lib/wrap-types';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { GalleryCard } from '@/blocks/gallery-card';
import { Header } from '@/blocks/header';
import { StyledSelect } from '@/components/styled-select';

const gallerySearch = z.object({
  search: z.string().trim().max(120).optional().catch(undefined),
  vehicle: z
    .string()
    .refine((value) => !value || isVehicleSlug(value))
    .optional()
    .catch(undefined),
  sort: z.enum(['latest', 'downloads', 'likes']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(100000).optional().catch(undefined),
});

function galleryFilters(search: z.infer<typeof gallerySearch>) {
  return {
    search: search.search ?? '',
    vehicle: search.vehicle ?? '',
    sort: search.sort ?? 'latest',
    page: search.page ?? 1,
  };
}

export const Route = createFileRoute('/gallery/')({
  validateSearch: (search) => gallerySearch.parse(search),
  search: {
    middlewares: [
      stripSearchParams<z.infer<typeof gallerySearch>>({
        search: '',
        vehicle: '',
        sort: 'latest',
        page: 1,
      }),
    ],
  },
  loaderDeps: ({ search }) => ({ filters: galleryFilters(search) }),
  loader: async ({ deps: { filters } }) => ({
    locale: getLocale(),
    filtered: Boolean(
      filters.search ||
      filters.vehicle ||
      filters.sort !== 'latest' ||
      filters.page !== 1
    ),
    initialPage: await getPublicGalleryPage({
      data: { ...filters, vehicle: filters.vehicle || undefined },
    }),
  }),
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    return marketingHead({
      path: '/gallery',
      locale,
      title: m['landing.gallery.meta_title']({}, { locale }),
      description: m['landing.gallery.meta_description']({}, { locale }),
      robots: loaderData?.filtered
        ? 'noindex,follow'
        : 'index,follow,max-image-preview:large',
    });
  },
  component: GalleryPage,
});

function GalleryPage() {
  const { initialPage } = Route.useLoaderData();
  const [retryRequested, setRetryRequested] = useState(false);
  const filters = galleryFilters(Route.useSearch());
  const navigate = Route.useNavigate();
  const [draft, setDraft] = useState(filters.search);
  useEffect(() => setDraft(filters.search), [filters.search]);
  const update = (next: Partial<typeof filters>) =>
    void navigate({ search: { ...filters, page: 1, ...next } });
  const query = useQuery({
    queryKey: ['gallery', filters],
    initialData: initialPage ?? undefined,
    staleTime: 30_000,
    enabled: initialPage !== null || retryRequested,
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filters.page),
        pageSize: '20',
        search: filters.search,
        sort: filters.sort,
      });
      if (filters.vehicle) params.set('vehicle', filters.vehicle);
      return apiGet<PageResult<PublicDesignSummary> & { page: number }>(
        `/api/gallery?${params}`
      );
    },
    placeholderData: keepPreviousData,
  });
  useEffect(() => {
    if (
      query.data &&
      !query.isPlaceholderData &&
      query.data.page !== filters.page
    )
      void navigate({
        search: { ...filters, page: query.data.page },
        replace: true,
      });
  }, [query.data, query.isPlaceholderData, filters, navigate]);
  const loadFailed =
    query.isError ||
    (initialPage === null &&
      (!query.data || query.isPlaceholderData) &&
      !query.isFetching);
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.vehicle) params.set('vehicle', filters.vehicle);
    if (filters.sort !== 'latest') params.set('sort', filters.sort);
    if (page > 1) params.set('page', String(page));
    return `/gallery${params.size ? `?${params}` : ''}`;
  };
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 20));
  const firstPage = Math.max(1, Math.min(filters.page - 2, pages - 4));
  const control =
    'h-11 rounded-lg border border-white/15 bg-[#151d27] px-3 text-sm text-slate-200 focus-visible:outline-2 focus-visible:outline-emerald-300';

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main className="page-container pt-32 pb-24">
        <header className="mx-auto max-w-5xl text-center">
          <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-300">
            {m['landing.gallery.eyebrow']()}
          </span>
          <h1 className="font-headline mt-5 text-4xl font-semibold tracking-tight text-balance text-white sm:text-6xl">
            {m['landing.gallery.page_title']()}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-400">
            {m['landing.gallery.page_description']()}
          </p>
        </header>

        <section
          className="mt-12"
          aria-label={m['landing.gallery.public_title']()}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <form
              className="flex min-w-0 flex-1 gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                update({ search: draft.trim() });
              }}
            >
              <label className="flex min-w-0 flex-1 flex-col gap-2 text-xs text-slate-400">
                {m['landing.gallery.search_label']()}
                <input
                  type="search"
                  value={draft}
                  maxLength={120}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={m['landing.gallery.search_placeholder']()}
                  className={control}
                />
              </label>
              <button
                type="submit"
                aria-label={m['landing.gallery.search_button']()}
                className={`${control} mt-auto hover:border-emerald-300/50`}
              >
                <Search className="size-4" />
              </button>
            </form>
            <label className="flex flex-col gap-2 text-xs text-slate-400 lg:w-64">
              {m['landing.gallery.vehicle_label']()}
              <StyledSelect
                label={m['landing.gallery.vehicle_label']()}
                value={filters.vehicle}
                onValueChange={(vehicle) => update({ vehicle })}
                options={[
                  { value: '', label: m['landing.gallery.all_vehicles']() },
                  ...VEHICLE_ASSET_MANIFEST.map((vehicle) => ({
                    value: vehicle.slug,
                    label: `${vehicle.trim} · ${vehicle.year}`,
                  })),
                ]}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs text-slate-400 lg:w-48">
              {m['landing.gallery.sort_label']()}
              <StyledSelect
                label={m['landing.gallery.sort_label']()}
                value={filters.sort}
                onValueChange={(sort) =>
                  update({ sort: sort as typeof filters.sort })
                }
                options={(['latest', 'downloads', 'likes'] as const).map(
                  (value) => ({
                    value,
                    label:
                      value === 'latest'
                        ? m['landing.gallery.sort_latest']()
                        : value === 'downloads'
                          ? m['landing.gallery.sort_downloads']()
                          : m['landing.gallery.sort_likes'](),
                  })
                )}
              />
            </label>
          </div>
          <p className="mt-5 text-xs text-slate-500" role="status">
            {query.isPending && !loadFailed
              ? m['landing.gallery.loading']()
              : m['landing.gallery.result_count']({
                  count: query.data?.total ?? 0,
                })}
          </p>
          <div aria-busy={query.isFetching}>
            {query.isPending && !loadFailed ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-square animate-pulse rounded-xl bg-white/5"
                  />
                ))}
              </div>
            ) : loadFailed ? (
              <div
                role="alert"
                className="py-20 text-center text-sm text-slate-400"
              >
                <p>{m['landing.gallery.error']()}</p>
                <button
                  onClick={() => {
                    setRetryRequested(true);
                    void query.refetch();
                  }}
                  className="mt-4 text-emerald-300 underline"
                >
                  {m['landing.hero.retry']()}
                </button>
              </div>
            ) : query.data?.items.length ? (
              <div
                className={`mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 ${query.isPlaceholderData ? 'opacity-60' : ''}`}
              >
                {query.data.items.map((design) => (
                  <GalleryCard key={design.id} design={design} showLikes />
                ))}
              </div>
            ) : (
              <div className="my-5 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 text-center">
                <Images className="size-8 text-emerald-300" />
                <p className="mt-4 text-sm text-slate-400">
                  {m['landing.gallery.no_results']()}
                </p>
                <button
                  onClick={() => {
                    setDraft('');
                    update({ search: '', vehicle: '', sort: 'latest' });
                  }}
                  className="mt-4 text-sm text-emerald-300 underline"
                >
                  {m['landing.gallery.reset_filters']()}
                </button>
              </div>
            )}
          </div>
          {!loadFailed && (query.data?.total ?? 0) > 0 && (
            <nav
              aria-label={m['landing.gallery.pagination']()}
              className="mt-9 flex flex-wrap items-center justify-center gap-2"
            >
              {filters.page > 1 ? (
                <Link
                  href={pageHref(filters.page - 1)}
                  aria-label={m['landing.gallery.previous']()}
                  className={`${control} inline-flex items-center`}
                >
                  <ChevronLeft className="size-4" />
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  aria-label={m['landing.gallery.previous']()}
                  className={`${control} inline-flex items-center opacity-30`}
                >
                  <ChevronLeft className="size-4" />
                </span>
              )}
              {Array.from(
                { length: Math.min(5, pages) },
                (_, i) => firstPage + i
              ).map((page) => (
                <Link
                  key={page}
                  href={pageHref(page)}
                  aria-current={page === filters.page ? 'page' : undefined}
                  aria-label={m['landing.gallery.page_label']({ page })}
                  className={`${control} inline-flex min-w-11 items-center justify-center aria-[current=page]:border-emerald-300 aria-[current=page]:text-emerald-300`}
                >
                  {page}
                </Link>
              ))}
              {filters.page < pages ? (
                <Link
                  href={pageHref(filters.page + 1)}
                  aria-label={m['landing.gallery.next']()}
                  className={`${control} inline-flex items-center`}
                >
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  aria-label={m['landing.gallery.next']()}
                  className={`${control} inline-flex items-center opacity-30`}
                >
                  <ChevronRight className="size-4" />
                </span>
              )}
              <span className="px-2 text-xs text-slate-400">
                {m['landing.gallery.page_summary']({
                  page: query.data?.page ?? filters.page,
                  pages,
                })}
              </span>
            </nav>
          )}
        </section>

        <section
          className="mt-16 grid gap-8 border-t border-white/10 pt-10 md:grid-cols-3"
          aria-label={m['landing.gallery.about_label']()}
        >
          {[
            [
              m['landing.gallery.about_browse_title'](),
              m['landing.gallery.about_browse_description'](),
            ],
            [
              m['landing.gallery.about_edit_title'](),
              m['landing.gallery.about_edit_description'](),
            ],
            [
              m['landing.gallery.about_rights_title'](),
              m['landing.gallery.about_rights_description'](),
            ],
          ].map(([title, description]) => (
            <div key={title}>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {description}
              </p>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
