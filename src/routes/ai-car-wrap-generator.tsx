import { Suspense, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  ImagePlus,
  LoaderCircle,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { ApiError, apiGet, apiGetBlob } from '@/lib/api-client';
import { resolveErrorCode } from '@/lib/error-codes';
import { getErrorMessage } from '@/lib/error-message';
import { localizedAbsoluteUrl, marketingHead } from '@/lib/seo';
import { cn } from '@/lib/utils';
import {
  DEFAULT_VEHICLE_SLUG,
  getVehicleAssetConfig,
  VEHICLE_ASSET_MANIFEST,
  type VehicleSlug,
} from '@/lib/vehicle-catalog';
import { requestWrapGeneration } from '@/lib/wrap-generation-client';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { useGalleryPreference } from '@/hooks/use-gallery-preference';
import { CreditPaywall } from '@/blocks/credit-paywall';
import { Footer } from '@/blocks/footer';
import { FreeWrapLinks } from '@/blocks/free-wrap-links';
import { Header } from '@/blocks/header';
import { WrapImagePreview } from '@/blocks/wrap-image-preview';
import { wrapPromptPresets } from '@/blocks/wrap-prompt-presets';
import { SignInDialog } from '@/components/auth/sign-in-dialog';
import { StructuredData } from '@/components/seo/structured-data';
import { StyledSelect } from '@/components/styled-select';
import {
  WrapColorPreference,
  WrapGalleryPreference,
  WrapPromptInput,
} from '@/components/wrap-generation-controls';

const GENERATION_COST = 10;
const PROMPT_LIMIT = 300;

type Generation = {
  id: string;
  wrapId?: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  outputUrl?: string;
  vehicleSlug: VehicleSlug;
  errorSummary?: string | null;
  errorCode?: string | null;
};

export const Route = createFileRoute('/ai-car-wrap-generator')({
  validateSearch: (
    search: Record<string, unknown>
  ): { reference?: string } => ({
    reference:
      typeof search.reference === 'string' ? search.reference : undefined,
  }),
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['generator.meta_title']({}, { locale }),
      description: m['generator.meta_description']({}, { locale }),
    };
  },
  head: ({ loaderData }) =>
    marketingHead({
      path: '/ai-car-wrap-generator',
      locale: loaderData?.locale ?? 'en',
      title:
        loaderData?.title ??
        'AI Car Wrap Generator Online | Create & Preview Wraps',
      description: loaderData?.description ?? '',
    }),
  component: AiCarWrapGeneratorPage,
});

function AiCarWrapGeneratorPage() {
  const locale = Route.useLoaderData().locale;
  const { reference } = Route.useSearch();
  const pageUrl = localizedAbsoluteUrl('/ai-car-wrap-generator', locale);
  const { data: currentSession } = useSession();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const session = hydrated ? currentSession : undefined;
  const queryClient = useQueryClient();
  const [signInOpen, setSignInOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [vehicleSlug, setVehicleSlug] =
    useState<VehicleSlug>(DEFAULT_VEHICLE_SLUG);
  const [prompt, setPrompt] = useState('');
  const [preferredColors, setPreferredColors] = useState<string[]>([]);
  const userInfo = useQuery({
    queryKey: ['user-info', session?.user.id],
    queryFn: () => apiGet<{ isPaid: boolean }>('/api/user/info'),
    enabled: Boolean(session?.user),
    staleTime: 0,
  });
  const isPaid = userInfo.data?.isPaid === true;
  const [openToGallery, setOpenToGallery] = useGalleryPreference(
    session?.user.id,
    isPaid
  );
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [active, setActive] = useState<Generation>();
  const submissionRef = useRef(false);
  const [resultTab, setResultTab] = useState<'image' | '3d'>('image');
  const [hasOpened3d, setHasOpened3d] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vehicle = getVehicleAssetConfig(vehicleSlug);

  const referenceQuery = useQuery({
    queryKey: ['generator-reference', reference],
    staleTime: Infinity,
    enabled: Boolean(reference),
    retry: false,
    queryFn: async () => {
      const design = await apiGet<{
        title: string;
        vehicleSlug: VehicleSlug;
        textureUrl?: string;
      }>(`/api/gallery/${encodeURIComponent(reference!)}?view=0`);
      if (!design.textureUrl) throw new Error(m['detail.reference_error']());
      const blob = await apiGetBlob(
        `/api/gallery/${encodeURIComponent(reference!)}?texture=1`
      );
      return { design, blob };
    },
  });
  useEffect(() => {
    if (!referenceQuery.data) return;
    const { design, blob } = referenceQuery.data;
    setVehicleSlug(design.vehicleSlug);
    const extension =
      blob.type === 'image/png'
        ? 'png'
        : blob.type === 'image/jpeg'
          ? 'jpg'
          : 'webp';
    setFile(
      new File([blob], `${design.title}.${extension}`, { type: blob.type })
    );
    setPreviewUrl(URL.createObjectURL(blob));
  }, [referenceQuery.data]);

  const credits = useQuery({
    queryKey: ['generator-credits', session?.user.id],
    queryFn: () => apiGet<{ balance: number }>('/api/credits'),
    enabled: Boolean(session?.user),
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const generate = useMutation({
    mutationFn: async (input: {
      vehicleSlug: VehicleSlug;
      prompt: string;
      file?: File;
    }) => {
      const item = await requestWrapGeneration({
        ...input,
        colors: preferredColors,
        openToGallery,
      });
      return { item, vehicleSlug: input.vehicleSlug };
    },
    onSuccess: ({ item, vehicleSlug: slug }) => {
      submissionRef.current =
        item.status === 'queued' || item.status === 'processing';
      setActive({ ...item, vehicleSlug: slug });
      void queryClient.invalidateQueries({ queryKey: ['generator-credits'] });
      void queryClient.invalidateQueries({
        queryKey: ['header-credit-balance'],
      });
    },
    onError: (error: Error) => {
      submissionRef.current = false;
      if (resolveErrorCode(error) === 'INSUFFICIENT_CREDITS') {
        setActive(undefined);
        setPaywallOpen(true);
        void credits.refetch();
        return;
      }
      setActive((current) => ({
        id: 'local-failure',
        status: 'failed',
        vehicleSlug: current?.vehicleSlug ?? vehicleSlug,
        errorCode: resolveErrorCode(error, 'AI_GENERATION_FAILED'),
      }));
      toast.error(getErrorMessage(error, 'AI_GENERATION_FAILED'));
    },
  });

  useEffect(() => {
    if (
      !active ||
      active.id === 'local-failure' ||
      active.id === 'pending' ||
      (active.status !== 'queued' && active.status !== 'processing')
    ) {
      return;
    }
    const generationId = active.id;
    const slug = active.vehicleSlug;
    let polling = false;
    let disposed = false;
    const timer = window.setInterval(async () => {
      if (polling) return;
      polling = true;
      try {
        const next = await apiGet<Omit<Generation, 'vehicleSlug'>>(
          `/api/ai-generations/${generationId}`
        );
        if (disposed) return;
        if (next.status === 'succeeded' || next.status === 'failed') {
          submissionRef.current = false;
          void credits.refetch();
          void queryClient.invalidateQueries({
            queryKey: ['header-credit-balance'],
          });
        }
        setActive({ ...next, vehicleSlug: slug });
      } catch {
        // Keep the task locked and retry status synchronization, never resubmit.
      } finally {
        polling = false;
      }
    }, 5_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [active]);

  const download = useMutation({
    mutationFn: (generationId: string) =>
      apiGetBlob(`/api/ai-generations/${generationId}?download=1`),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ai-car-wrap.png';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onError: (error: Error) =>
      toast.error(getErrorMessage(error, 'AI_GENERATION_FAILED')),
  });

  function startGenerate() {
    if (submissionRef.current || loading) return;
    if (!session?.user) {
      setSignInOpen(true);
      return;
    }
    if (prompt.trim().length < 1) {
      toast.error(m['editor.prompt_required']());
      return;
    }
    if ((credits.data?.balance ?? GENERATION_COST) < GENERATION_COST) {
      setPaywallOpen(true);
      return;
    }
    submissionRef.current = true;
    setResultTab('image');
    setActive({
      id: 'pending',
      status: 'processing',
      vehicleSlug,
    });
    generate.mutate({
      vehicleSlug,
      prompt: prompt.trim(),
      file,
    });
  }

  const loading =
    generate.isPending ||
    active?.status === 'queued' ||
    active?.status === 'processing' ||
    active?.id === 'pending';
  const ready = active?.status === 'succeeded' && Boolean(active.outputUrl);
  // Fetch API images as binary data. Vite treats direct <img> requests as
  // static assets, so they never reach the authenticated server route in dev.
  const textureQuery = useQuery({
    queryKey: [
      'generator-texture',
      session?.user.id,
      ready ? active?.id : undefined,
    ],
    queryFn: () =>
      apiGetBlob(
        `/api/ai-generations/${encodeURIComponent(active!.id)}?texture=1`
      ),
    enabled: ready && Boolean(session?.user),
    staleTime: Infinity,
    retry: (count, error) =>
      count < 2 &&
      !(
        error instanceof ApiError && [401, 403, 404].includes(error.status ?? 0)
      ),
  });
  const [texture, setTexture] = useState<{ blob: Blob; url: string }>();
  const [failedTextureUrl, setFailedTextureUrl] = useState<string>();
  useEffect(() => {
    if (!textureQuery.data) return;
    const url = URL.createObjectURL(textureQuery.data);
    setTexture({ blob: textureQuery.data, url });
    return () => URL.revokeObjectURL(url);
  }, [textureQuery.data]);
  // Do not display the previous generation while the next image is loading.
  const textureUrl =
    ready && texture?.blob === textureQuery.data ? texture?.url : undefined;
  const textureError =
    textureQuery.isError ||
    Boolean(textureUrl && failedTextureUrl === textureUrl);
  const sections = [
    [
      'generator.how_title',
      'generator.how_p1',
      'generator.how_p2',
      'generator.how_p3',
    ],
    ['generator.returns_title', 'generator.returns_p1', 'generator.returns_p2'],
    [
      'generator.scope_title',
      'generator.scope_p1',
      'generator.scope_p2',
      'generator.scope_p3',
    ],
    [
      'generator.production_title',
      'generator.production_p1',
      'generator.production_p2',
      'generator.production_p3',
    ],
    ['generator.next_title', 'generator.next_p1', 'generator.next_p2'],
  ] as const;
  const faqs = [
    ['generator.faq_1_q', 'generator.faq_1_a'],
    ['generator.faq_2_q', 'generator.faq_2_a'],
    ['generator.faq_3_q', 'generator.faq_3_a'],
    ['generator.faq_4_q', 'generator.faq_4_a'],
    ['generator.faq_5_q', 'generator.faq_5_a'],
    ['generator.faq_6_q', 'generator.faq_6_a'],
    ['generator.faq_7_q', 'generator.faq_7_a'],
    ['generator.faq_8_q', 'generator.faq_8_a'],
  ] as const;
  const related = [
    ['/gallery', m['generator.link_gallery']()],
    ['/create', m['generator.link_editor']()],
    ['/pricing', m['generator.link_pricing']()],
  ] as const;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main className="page-container pt-28 pb-24">
        <section className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[.22em] text-emerald-300 uppercase">
            {m['generator.eyebrow']()}
          </p>
          <h1 className="font-headline mt-5 text-5xl font-semibold tracking-tight break-words hyphens-auto text-white sm:text-6xl">
            {m['generator.title']()}
          </h1>
          <p className="mt-6 text-base leading-7 text-slate-300">
            {m['generator.lead']()}
          </p>
        </section>

        <section
          aria-label={m['generator.your_image']()}
          className="mt-12 grid items-start gap-4 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]"
        >
          <div className="grid gap-3">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/3 px-4">
              <span className="shrink-0 text-sm text-slate-400">
                {m['generator.vehicle']()}
              </span>
              <StyledSelect
                className="border-0 bg-transparent shadow-none"
                label={m['generator.vehicle']()}
                value={vehicleSlug}
                onValueChange={(value) => setVehicleSlug(value as VehicleSlug)}
                options={VEHICLE_ASSET_MANIFEST.map((item) => ({
                  value: item.slug,
                  label: `${item.trim} · ${item.year}`,
                }))}
              />
            </label>

            <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">
                  {m['generator.describe']()}
                </h2>
              </div>
              <div className="mt-3">
                <WrapPromptInput
                  value={prompt}
                  onChange={setPrompt}
                  placeholder={m['generator.prompt_placeholder']()}
                  ideasLabel={m['generator.ideas']()}
                  presets={wrapPromptPresets()}
                  maxLength={PROMPT_LIMIT}
                />
              </div>
              <p className="mt-1 text-right text-[11px] text-slate-500">
                {prompt.length} / {PROMPT_LIMIT}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
              <h2 className="text-sm font-semibold text-white">
                {m['generator.reference_title']()}{' '}
                <span className="text-xs font-medium text-slate-500">
                  {m['generator.optional']()}
                </span>
              </h2>
              {referenceQuery.isFetching && (
                <p role="status" className="mt-2 text-xs text-slate-400">
                  {m['detail.reference_loading']()}
                </p>
              )}
              {referenceQuery.isError && (
                <div role="alert" className="mt-2 text-xs text-red-300">
                  {m['detail.reference_error']()}{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void referenceQuery.refetch()}
                  >
                    {m['landing.hero.retry']()}
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 flex h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 text-sm text-slate-300 transition hover:border-emerald-300/40 hover:text-white"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt=""
                    className="size-12 rounded-md object-cover"
                  />
                ) : (
                  <ImagePlus className="size-4 text-emerald-200" />
                )}
                <span className="min-w-0">
                  <span className="block truncate">
                    {file ? file.name : m['generator.reference_action']()}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-500">
                    {m['generator.reference_types']()}
                  </span>
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  setFile(next);
                  setPreviewUrl((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return next ? URL.createObjectURL(next) : undefined;
                  });
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                {file ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFile(undefined);
                      setPreviewUrl((current) => {
                        if (current) URL.revokeObjectURL(current);
                        return undefined;
                      });
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                  >
                    <X className="size-3" />
                    {m['generator.remove_reference']()}
                  </button>
                ) : null}
              </div>
            </div>

            <WrapColorPreference
              colors={preferredColors}
              onChange={setPreferredColors}
              label={m['editor.color_preference']()}
              customLabel={m['generator.custom_color']()}
            />
            <WrapGalleryPreference
              checked={openToGallery}
              isPaid={isPaid}
              onChange={setOpenToGallery}
              label={m['editor.open_gallery']()}
              unlockLabel={m['generator.unlock_gallery']()}
              onUnlock={() =>
                session?.user ? setPaywallOpen(true) : setSignInOpen(true)
              }
            />

            <button
              type="button"
              onClick={startGenerate}
              aria-busy={loading}
              disabled={
                loading ||
                referenceQuery.isFetching ||
                referenceQuery.isError ||
                (Boolean(session?.user) &&
                  (loading || prompt.trim().length < 1))
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 text-sm font-semibold text-[#04110b] transition hover:bg-emerald-200 disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <WandSparkles className="size-4" />
              )}
              {loading
                ? m['editor.generating']()
                : m['generator.generate']({ cost: GENERATION_COST })}
            </button>
            <FreeWrapLinks vehicleSlug={vehicleSlug} showPrompt />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">
                {m['generator.your_image']()}
              </h2>
              <p className="text-xs text-slate-500">
                {m['generator.format_label']({ vehicle: vehicle.trim })}
              </p>
            </div>
            <div
              role="tablist"
              aria-label={m['generator.your_image']()}
              className="mt-4 inline-flex rounded-xl bg-black/30 p-1"
            >
              {(
                [
                  ['image', m['generator.tab_image']()],
                  ['3d', m['generator.tab_3d']()],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={resultTab === value}
                  onClick={() => {
                    if (value === '3d') setHasOpened3d(true);
                    setResultTab(value);
                  }}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                    resultTab === value
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#080c13]">
              {ready && textureError ? (
                <div
                  role="alert"
                  className="flex h-105 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-300 sm:h-130"
                >
                  <p>{m['detail.image_error']()}</p>
                  <button
                    type="button"
                    disabled={textureQuery.isFetching}
                    onClick={() => {
                      setFailedTextureUrl(undefined);
                      void textureQuery.refetch();
                    }}
                    className="text-emerald-300 underline disabled:opacity-50"
                  >
                    {m['landing.hero.retry']()}
                  </button>
                </div>
              ) : ready && !textureUrl ? (
                <div
                  role="status"
                  className="flex h-105 items-center justify-center gap-3 text-sm text-slate-300 sm:h-130"
                >
                  <LoaderCircle className="size-7 animate-spin text-emerald-300" />
                  {m['detail.loading']()}
                </div>
              ) : (
                <>
                  {/* Keep the viewer mounted after its first use so tab switches
                  preserve the loaded model and WebGL context. */}
                  <div hidden={resultTab !== '3d'}>
                    {hasOpened3d && (
                      <Suspense
                        fallback={
                          <div className="flex h-105 items-center justify-center text-sm text-slate-400 sm:h-130">
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                            {m['viewer.loading_model']()}
                          </div>
                        }
                      >
                        <WrapImagePreview
                          vehicleSlug={active?.vehicleSlug ?? vehicleSlug}
                          imageUrl={textureUrl}
                          motion={resultTab === '3d'}
                        />
                      </Suspense>
                    )}
                  </div>
                  {resultTab === 'image' && (
                    <div className="flex h-105 items-center justify-center sm:h-130">
                      {ready && active?.outputUrl ? (
                        <img
                          src={textureUrl}
                          onError={() => setFailedTextureUrl(textureUrl)}
                          alt={m['generator.image_alt']()}
                          width={1024}
                          height={1024}
                          className="h-full w-full object-contain"
                        />
                      ) : active?.status === 'failed' ? (
                        <p className="max-w-sm px-6 text-center text-sm leading-6 text-red-300">
                          {getErrorMessage(
                            active.errorCode || active.errorSummary,
                            'AI_GENERATION_FAILED'
                          )}
                        </p>
                      ) : loading ? (
                        <div className="flex flex-col items-center gap-3 text-sm text-slate-300">
                          <LoaderCircle className="size-7 animate-spin text-emerald-300" />
                          {m['generator.result_loading']()}
                        </div>
                      ) : (
                        <div className="max-w-xs px-6 text-center">
                          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200">
                            <Sparkles className="size-6" />
                          </div>
                          <p className="mt-5 text-base font-semibold text-white">
                            {m['generator.empty_title']()}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {m['generator.empty_text']()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              {m['generator.notice']()}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => active && download.mutate(active.id)}
                disabled={!ready || download.isPending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-medium text-white transition hover:bg-white/5 disabled:opacity-40"
              >
                <Download className="size-4" />
                {m['generator.download']()}
              </button>
              {ready && active ? (
                <Link
                  href={
                    active.wrapId
                      ? `/wraps/${active.wrapId}/edit`
                      : `/create/${active.vehicleSlug}?generation=${active.id}`
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-medium text-white transition hover:bg-white/5"
                >
                  {m['generator.open_editor']()}
                  <ArrowUpRight className="size-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-medium text-white opacity-40"
                >
                  {m['generator.open_editor']()}
                  <ArrowUpRight className="size-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="mt-20 space-y-12">
          <section aria-labelledby="wrap-styles-heading">
            <h2
              id="wrap-styles-heading"
              className="font-headline text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              {m['generator.styles_title']()}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              {m['generator.styles_description']()}
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {[
                [
                  m['generator.styles.finishes.title'](),
                  m['generator.styles.finishes.description'](),
                ],
                [
                  m['generator.styles.patterns.title'](),
                  m['generator.styles.patterns.description'](),
                ],
                [
                  m['generator.styles.custom.title'](),
                  m['generator.styles.custom.description'](),
                ],
              ].map(([title, description]) => (
                <article key={title} className="border-t border-white/10 pt-6">
                  <h3 className="text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </section>
          {sections.map(([titleKey, ...paragraphKeys]) => (
            <section key={titleKey}>
              <h2 className="font-headline text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {m[titleKey]()}
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300 sm:text-base">
                {paragraphKeys.map((key) => (
                  <p key={key}>{m[key]()}</p>
                ))}
              </div>
            </section>
          ))}
          <section>
            <h2 className="font-headline text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {m['generator.related_title']()}
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {related.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mx-auto mt-30 max-w-5xl">
          <h2 className="font-headline text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {m['generator.faq_title']()}
          </h2>
          <div className="mt-6 grid gap-3">
            {faqs.map(([question, answer], index) => (
              <details
                key={question}
                open={index === 0}
                className="group rounded-2xl border border-white/10 bg-white/3 px-5 py-4 open:border-emerald-300/25"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-white marker:hidden sm:text-base [&::-webkit-details-marker]:hidden">
                  {m[question]()}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {m[answer]()}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <CreditPaywall
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        cost={GENERATION_COST}
        vehicleSlug={vehicleSlug}
      />
      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        returnTo="/ai-car-wrap-generator"
      />
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebApplication',
              name: m['generator.title'](),
              applicationCategory: 'DesignApplication',
              operatingSystem: 'Web',
              url: pageUrl,
              description: m['generator.meta_description'](),
            },
          ],
        }}
      />
    </div>
  );
}
