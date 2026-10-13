import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import {
  CalendarDays,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Heart,
  LoaderCircle,
  Paintbrush,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { apiGet, apiGetBlob, type PageResult } from '@/lib/api-client';
import { localizedAbsoluteUrl, marketingHead } from '@/lib/seo';
import { cn } from '@/lib/utils';
import {
  getVehicleAssetConfig,
  VEHICLE_FAMILY_NAMES,
} from '@/lib/vehicle-catalog';
import type { PublicDesignSummary } from '@/lib/wrap-types';
import { m } from '@/paraglide/messages.js';
import { getLocale, type Locale } from '@/paraglide/runtime.js';
import { useDesignLike } from '@/hooks/use-design-like';
import { Footer } from '@/blocks/footer';
import { GalleryCard } from '@/blocks/gallery-card';
import { Header } from '@/blocks/header';
import { TeslaWrapInstructions } from '@/blocks/tesla-wrap-instructions';
import { WrapImagePreview } from '@/blocks/wrap-image-preview';
import { StructuredData } from '@/components/seo/structured-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { formatPostDate } from '@/content/posts';

type PublicDesignDetail = PublicDesignSummary & {
  publicPrompt: boolean;
  prompt?: string | null;
};

const getDesign = createServerFn()
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }): Promise<PublicDesignDetail | null> => {
    const { getPublicDesign } =
      await import('@/modules/design-gallery/service');
    return (await getPublicDesign(
      data.slug,
      false
    )) as PublicDesignDetail | null;
  });

function describeDesign(design: PublicDesignDetail, locale: Locale) {
  const vehicle = getVehicleAssetConfig(design.vehicleSlug);
  return m['detail.description'](
    {
      title: design.title,
      model: `${vehicle.brand} ${vehicle.trim}`,
      year: vehicle.year,
      author: design.authorName,
      date: formatPostDate(String(design.publishedAt), locale),
    },
    { locale }
  );
}

export const Route = createFileRoute('/gallery/$designSlug')({
  loader: async ({ params }) => {
    const design = await getDesign({ data: { slug: params.designSlug } });
    if (!design) throw notFound();
    return { locale: getLocale(), design };
  },
  head: ({ loaderData, params }) => {
    const item = loaderData?.design;
    return marketingHead({
      path: `/gallery/${params.designSlug}`,
      locale: loaderData?.locale ?? 'en',
      title: item
        ? `${item.title} | ${envConfigs.app_name}`
        : envConfigs.app_name,
      description: item
        ? [item.description, describeDesign(item, loaderData!.locale)]
            .filter(Boolean)
            .join(' ')
        : '',
      image: item?.coverUrl || '/og-image.png?v=20261007-3',
      robots:
        item?.moderationStatus === 'approved'
          ? 'index,follow,max-image-preview:large'
          : 'noindex,follow',
    });
  },
  component: DesignDetailPage,
});

function DesignDetailPage() {
  const data = Route.useLoaderData();
  return (
    <DesignContent
      key={data.design.slug}
      initialDesign={data.design}
      locale={data.locale}
    />
  );
}

function DesignContent({
  initialDesign,
  locale,
}: {
  initialDesign: PublicDesignDetail;
  locale: Locale;
}) {
  const client = useQueryClient();
  const [tab, setTab] = useState<'image' | '3d'>('image');
  const [imageError, setImageError] = useState(false);
  const [previewMounted, setPreviewMounted] = useState(false);
  const selectTab = (next: 'image' | '3d') => {
    if (next === '3d') setPreviewMounted(true);
    setTab(next);
  };
  const queryKey = ['gallery-design', initialDesign.slug];
  const query = useQuery({
    queryKey,
    queryFn: () =>
      apiGet<PublicDesignDetail>(
        `/api/gallery/${encodeURIComponent(initialDesign.slug)}`
      ),
    initialData: initialDesign,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const design = query.data;
  const vehicle = getVehicleAssetConfig(design.vehicleSlug);
  const like = useDesignLike(design.slug, design.likeCount);
  const more = useQuery({
    queryKey: ['gallery', 'related', design.vehicleSlug, design.slug],
    queryFn: () =>
      apiGet<PageResult<PublicDesignSummary>>(
        `/api/gallery?page=1&pageSize=5&sort=latest&vehicle=${design.vehicleSlug}&exclude=${encodeURIComponent(design.slug)}`
      ),
  });
  const download = useMutation({
    mutationFn: () =>
      apiGetBlob(`/api/gallery/${encodeURIComponent(design.slug)}?download=1`),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${design.slug}.${blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      client.setQueryData<PublicDesignDetail>(queryKey, (current) =>
        current
          ? { ...current, downloadCount: current.downloadCount + 1 }
          : current
      );
      void client.invalidateQueries({ queryKey: ['gallery'] });
    },
    onError: () => toast.error(m['landing.gallery.download_error']()),
  });
  const date = formatPostDate(String(design.publishedAt), locale);
  const imageUrl = design.textureUrl || design.coverUrl;
  const textureQuery = useQuery({
    queryKey: ['gallery-texture', design.slug],
    enabled: previewMounted && Boolean(design.textureUrl),
    queryFn: () =>
      apiGetBlob(`/api/gallery/${encodeURIComponent(design.slug)}?texture=1`),
    staleTime: Infinity,
  });
  const [texture, setTexture] = useState<string>();
  useEffect(() => {
    if (!textureQuery.data) return;
    const url = URL.createObjectURL(textureQuery.data);
    setTexture(url);
    return () => URL.revokeObjectURL(url);
  }, [textureQuery.data]);
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main className="page-container pt-28 pb-24">
        <nav
          aria-label={m['detail.breadcrumb']()}
          className="mb-7 text-xs text-slate-400"
        >
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-white">
                {m['detail.home']()}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3" />
            </li>
            <li>
              <Link href="/gallery" className="hover:text-white">
                {m['detail.gallery']()}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3" />
            </li>
            <li aria-current="page" className="text-slate-200">
              {design.title}
            </li>
          </ol>
        </nav>
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="relative min-w-0">
            <div
              className="absolute top-3 left-3 z-30 inline-flex rounded-full border border-white/10 bg-[#121a23]/90 p-1 shadow-sm backdrop-blur-md"
              role="tablist"
              aria-label={m['detail.preview']()}
            >
              {(['image', '3d'] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  id={`wrap-tab-${value}`}
                  role="tab"
                  aria-selected={tab === value}
                  aria-controls="wrap-panel"
                  tabIndex={tab === value ? 0 : -1}
                  onKeyDown={(event) => {
                    if (
                      ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                        event.key
                      )
                    ) {
                      event.preventDefault();
                      const next =
                        event.key === 'Home'
                          ? 'image'
                          : event.key === 'End'
                            ? '3d'
                            : tab === 'image'
                              ? '3d'
                              : 'image';
                      selectTab(next);
                      document.getElementById(`wrap-tab-${next}`)?.focus();
                    }
                  }}
                  onClick={() => selectTab(value)}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition ${tab === value ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {value === 'image'
                    ? m['detail.image']()
                    : m['detail.preview']()}
                </button>
              ))}
            </div>
            <div
              id="wrap-panel"
              role="tabpanel"
              aria-labelledby={`wrap-tab-${tab}`}
              className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-[#121a23]"
            >
              {!imageUrl ||
              (tab === 'image' ? imageError : textureQuery.isError) ? (
                <div
                  role="alert"
                  className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center text-sm text-slate-400"
                >
                  <p>{m['detail.image_error']()}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setImageError(false);
                      if (tab === '3d') void textureQuery.refetch();
                    }}
                    className="text-emerald-300 underline"
                  >
                    {m['landing.hero.retry']()}
                  </button>
                </div>
              ) : (
                <img
                  src={imageUrl}
                  alt={`${design.title} — ${vehicle.trim} ${vehicle.year}`}
                  width={1024}
                  height={1024}
                  fetchPriority="high"
                  onError={() => setImageError(true)}
                  aria-hidden={tab === '3d'}
                  className="size-full object-contain p-4 sm:p-6"
                />
              )}
              {tab === '3d' &&
                design.textureUrl &&
                !texture &&
                !textureQuery.isError && (
                  <div
                    role="status"
                    className="absolute inset-0 flex items-center justify-center bg-[#121a23] text-sm text-slate-400"
                  >
                    {m['detail.loading']()}
                  </div>
                )}
              {previewMounted &&
                !textureQuery.isError &&
                (!design.textureUrl || texture) && (
                  <div
                    className={cn(
                      'absolute inset-0',
                      tab !== '3d' && 'pointer-events-none invisible'
                    )}
                    aria-hidden={tab !== '3d'}
                    inert={tab !== '3d'}
                  >
                    <WrapImagePreview
                      vehicleSlug={design.vehicleSlug}
                      imageUrl={design.textureUrl ? texture : undefined}
                      finish={design.finish}
                      motion={tab === '3d'}
                      className="size-full rounded-none border-0"
                    />
                  </div>
                )}
            </div>
          </div>
          <div className="min-w-0 lg:pt-2">
            <Link
              href={`/gallery?vehicle=${design.vehicleSlug}`}
              className="text-xs font-semibold tracking-wide text-emerald-300"
            >
              {vehicle.brand} {vehicle.trim} · {vehicle.year}
            </Link>
            <h1 className="font-headline mt-4 text-3xl font-semibold tracking-tight break-words text-white sm:text-4xl">
              {design.title} {vehicle.brand}{' '}
              {VEHICLE_FAMILY_NAMES[vehicle.family]} Wrap PNG
            </h1>
            {design.description && (
              <p className="mt-4 text-base leading-7 break-words text-slate-300">
                {design.description}
              </p>
            )}
            <p className="mt-4 text-sm leading-7 text-slate-400">
              {describeDesign(design, locale)}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Eye className="size-4" />
                {m['detail.views']({ count: design.viewCount })}
              </span>
              <button
                type="button"
                onClick={() =>
                  like.toggle(() =>
                    toast.error(m['landing.gallery.like_error']())
                  )
                }
                disabled={
                  like.isPending || design.moderationStatus !== 'approved'
                }
                aria-pressed={like.liked}
                aria-label={
                  like.liked ? m['detail.unlike']() : m['detail.like']()
                }
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 hover:bg-white/5 disabled:opacity-50 aria-pressed:text-emerald-300"
              >
                <Heart
                  className={`size-4 ${like.liked ? 'fill-current' : ''}`}
                />
                {like.count}
              </button>
              <time
                dateTime={new Date(design.publishedAt).toISOString()}
                aria-label={m['detail.published']()}
                className="inline-flex items-center gap-1.5"
              >
                <CalendarDays className="size-4" />
                {date}
              </time>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4">
              <Avatar className="size-11">
                <AvatarImage src={design.authorImage ?? undefined} alt="" />
                <AvatarFallback className="bg-emerald-300/10 text-emerald-300">
                  {design.authorName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  {m['detail.created_by']()}
                </p>
                <p className="mt-1 text-sm font-medium break-words">
                  {design.authorName}
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => download.mutate()}
                disabled={
                  download.isPending ||
                  !design.textureUrl ||
                  design.moderationStatus !== 'approved'
                }
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-12 w-full min-w-0 gap-1 rounded-xl px-1 text-xs leading-tight whitespace-normal sm:gap-2 sm:px-3 xl:text-sm'
                )}
              >
                {download.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {m['detail.download']()}
                <span className="tabular-nums">({design.downloadCount})</span>
              </button>
              <div className="contents">
                <Link
                  href={`/ai-car-wrap-generator?reference=${encodeURIComponent(design.slug)}`}
                  className={cn(
                    buttonVariants({ variant: 'secondary', size: 'lg' }),
                    'h-12 w-full min-w-0 gap-1 rounded-xl px-1 text-xs leading-tight whitespace-normal sm:gap-2 sm:px-3 xl:text-sm'
                  )}
                >
                  <Sparkles className="size-4" />
                  {m['detail.reference']()}
                </Link>
                <Link
                  href={`/create/${design.vehicleSlug}?design=${encodeURIComponent(design.slug)}`}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'h-12 w-full min-w-0 gap-1 rounded-xl border-white/15 bg-white/[.03] px-1 text-xs leading-tight whitespace-normal sm:gap-2 sm:px-3 xl:text-sm'
                  )}
                >
                  <Paintbrush className="size-4" />
                  {m['detail.edit']()}
                </Link>
              </div>
            </div>
            {design.usesAi && design.publicPrompt && design.prompt && (
              <section
                aria-labelledby="design-prompt-heading"
                className="mt-5 rounded-xl border border-white/10 bg-white/[.025] p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id="design-prompt-heading"
                    className="text-xs font-semibold tracking-wide text-slate-400 uppercase"
                  >
                    {m['detail.prompt']()}
                  </h2>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(design.prompt!);
                        toast.success(m['detail.prompt_copied']());
                      } catch {
                        toast.error(m['detail.prompt_copy_failed']());
                      }
                    }}
                    className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <Copy className="size-4" aria-hidden="true" />
                    {m['detail.copy_prompt']()}
                  </button>
                </div>
                <p className="mt-3 text-base leading-7 [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-slate-200 italic select-text">
                  {design.prompt}
                </p>
              </section>
            )}
          </div>
        </div>
        {vehicle.brand === 'Tesla' && <TeslaWrapInstructions />}
        <section className="mt-16">
          <h2 className="font-headline text-2xl font-semibold">
            {m['detail.more']({ model: vehicle.trim })}
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            {m['detail.more_description']()}
          </p>
          {more.isPending ? (
            <p role="status" className="py-10 text-sm text-slate-400">
              {m['landing.gallery.loading']()}
            </p>
          ) : more.isError ? (
            <div role="alert" className="py-10 text-sm text-slate-400">
              {m['landing.gallery.error']()}{' '}
              <button
                onClick={() => void more.refetch()}
                className="text-emerald-300 underline"
              >
                {m['landing.hero.retry']()}
              </button>
            </div>
          ) : more.data?.items.length ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {more.data.items.map((item) => (
                <GalleryCard key={item.id} design={item} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-sm text-slate-400">
              {m['landing.gallery.empty']()}
            </p>
          )}
        </section>
      </main>
      <Footer />
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@type': 'ImageObject',
          name: design.title,
          description: describeDesign(design, locale),
          contentUrl: design.textureUrl || design.coverUrl,
          url: localizedAbsoluteUrl(`/gallery/${design.slug}`, locale),
          author: { '@type': 'Person', name: design.authorName },
          datePublished: new Date(design.publishedAt).toISOString(),
        }}
      />
    </div>
  );
}
