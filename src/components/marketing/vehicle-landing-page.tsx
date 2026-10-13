import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Images,
  Paintbrush,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { localizedAbsoluteUrl } from '@/lib/seo';
import { cn } from '@/lib/utils';
import type { VehicleSlug } from '@/lib/vehicle-catalog';
import type { PublicDesignSummary } from '@/lib/wrap-types';
import { Footer } from '@/blocks/footer';
import { GalleryPreview } from '@/blocks/gallery-preview';
import { Header } from '@/blocks/header';
import heroStyles from '@/blocks/hero.module.css';
import { CTABanner } from '@/components/marketing/cta-banner';
import { FAQList } from '@/components/marketing/faq-list';
import { SectionHeading } from '@/components/marketing/section-heading';
import { StructuredData } from '@/components/seo/structured-data';
import { buttonVariants } from '@/components/ui/button';
import type { VehicleViewerLabels } from '@/components/vehicle-viewer/vehicle-viewer';

const VehicleViewer = lazy(() =>
  import('@/components/vehicle-viewer').then((module) => ({
    default: module.VehicleViewer,
  }))
);

export interface VehicleLandingContent {
  eyebrow: string;
  title: string;
  introduction: string;
  viewerCaption: string;
  versionsTitle: string;
  versionsDescription: string;
  galleryTitle: string;
  faqTitle: string;
  galleryDescription: string;
  howTitle: string;
  comparisonTitle?: string;
  comparisonDescription?: string;
  comparisons?: Array<{ title: string; description: string }>;
  ctaHref?: string;
  ctaLabel?: string;
  sections: Array<{ title: string; paragraphs: string[]; bullets?: string[] }>;
  faqs: Array<{ question: string; answer: string }>;
  ctaTitle: string;
  ctaDescription: string;
}

export interface VehicleLandingLabels {
  home: string;
  openDesigner: string;
  seeIdeas: string;
  designThis: string;
  questions: string;
  start: string;
  ctaEyebrow: string;
  loading: string;
  imageError: string;
  imageLoading: string;
  viewer: VehicleViewerLabels;
}

export function VehicleLandingPage({
  path,
  locale,
  content,
  vehicleSlug,
  vehicles,
  labels,
  initialDesigns,
}: {
  path: string;
  locale: string;
  content: VehicleLandingContent;
  vehicleSlug: VehicleSlug;
  vehicles: Array<{
    slug: VehicleSlug;
    label: string;
    note?: string;
    image?: string;
  }>;
  labels: VehicleLandingLabels;
  initialDesigns?: PublicDesignSummary[] | null;
}) {
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleSlug);
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement | null>(
    null
  );
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const imageRequest = useRef(0);
  useEffect(
    () => () => {
      imageRequest.current += 1;
    },
    []
  );
  const loadImage = async (file?: File) => {
    if (!file) return;
    const request = ++imageRequest.current;
    setImageError(false);
    setImageLoading(true);
    try {
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error('Invalid image');
      const bitmap = await createImageBitmap(file);
      try {
        if (request !== imageRequest.current) return;
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        setTextureCanvas(canvas);
      } finally {
        bitmap.close();
      }
    } catch {
      if (request === imageRequest.current) setImageError(true);
    } finally {
      if (request === imageRequest.current) setImageLoading(false);
    }
  };
  const family =
    path === '/tesla-model-y-wrap'
      ? 'model-y'
      : path === '/tesla-model-3-wrap'
        ? 'model-3'
        : undefined;
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main>
        <section className="pt-28 pb-20 sm:pt-36">
          <div className="page-container grid items-center gap-12 lg:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)]">
            <div>
              <p className="text-xs font-semibold tracking-[.22em] text-emerald-300 uppercase">
                {content.eyebrow}
              </p>
              <h1 className="font-headline mt-5 text-5xl leading-[1.02] font-semibold tracking-[-.045em] text-white sm:text-6xl">
                {content.title}
              </h1>
              <p className="mt-7 text-base leading-8 text-slate-300">
                {content.introduction}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/ai-car-wrap-generator"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    heroStyles.primary
                  )}
                >
                  <Paintbrush aria-hidden="true" className="size-4" />
                  {labels.openDesigner}
                </Link>
                <a
                  href="#gallery"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    heroStyles.secondary
                  )}
                >
                  <Images aria-hidden="true" className="size-4" />
                  {labels.seeIdeas}
                </a>
              </div>
            </div>
            <div className="min-w-0">
              <input
                ref={imageInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                aria-label={labels.viewer.chooseImage}
                onChange={(event) => {
                  void loadImage(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <Suspense
                fallback={
                  <div className="flex h-[500px] items-center justify-center rounded-3xl border border-white/10 bg-[#090d14] text-sm text-slate-500">
                    {labels.loading}
                  </div>
                }
              >
                <VehicleViewer
                  vehicleSlug={selectedVehicle}
                  landingPreview
                  textureCanvas={textureCanvas}
                  vehicleOptions={vehicles.map((vehicle) => ({
                    value: vehicle.slug,
                    label: vehicle.label,
                  }))}
                  onVehicleChange={(value) =>
                    setSelectedVehicle(value as VehicleSlug)
                  }
                  onChooseImage={() => imageInput.current?.click()}
                  onRemoveImage={
                    textureCanvas || imageLoading
                      ? () => {
                          imageRequest.current += 1;
                          setTextureCanvas(null);
                          setImageLoading(false);
                          setImageError(false);
                        }
                      : undefined
                  }
                  className="h-[500px] rounded-3xl lg:h-[620px]"
                  labels={labels.viewer}
                />
              </Suspense>
              {imageLoading && (
                <p role="status" className="mt-3 text-sm text-slate-300">
                  {labels.imageLoading}
                </p>
              )}
              {imageError && (
                <p role="alert" className="mt-3 text-sm text-red-300">
                  {labels.imageError}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="min-w-0 text-xs leading-6 text-slate-400 sm:text-sm">
                  {content.viewerCaption}
                </p>
                <Link
                  href="/ai-car-wrap-generator"
                  className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold whitespace-nowrap text-emerald-300 hover:text-emerald-200"
                >
                  {labels.openDesigner}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-[#0a0e16] py-20">
          <div className="page-container">
            <SectionHeading
              title={content.versionsTitle}
              description={content.versionsDescription}
            />
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {vehicles.map((vehicle) => (
                <Link
                  key={vehicle.slug}
                  href={`/create/${vehicle.slug}`}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-emerald-300/30',
                    vehicle.image && 'min-h-28'
                  )}
                >
                  <p className="font-headline relative z-10 font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    {vehicle.label}
                  </p>
                  {vehicle.image ? (
                    <img
                      src={vehicle.image}
                      alt=""
                      width={800}
                      height={450}
                      loading="lazy"
                      className="pointer-events-none absolute top-1/2 right-3 h-auto w-36 max-w-[60%] -translate-y-1/2 object-contain"
                    />
                  ) : (
                    <>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {vehicle.note}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                        {labels.designThis}{' '}
                        <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                      </span>
                    </>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <GalleryPreview
          family={family}
          initialDesigns={initialDesigns}
          title={content.galleryTitle}
          description={content.galleryDescription}
        />
        <article className="mx-auto max-w-5xl px-4 py-24 sm:py-32">
          <SectionHeading title={content.howTitle} />
          <div className="mt-12 grid gap-12">
            {content.sections.map((section, index) => (
              <section
                key={section.title}
                className="grid gap-6 md:grid-cols-[180px_1fr]"
              >
                <div className="font-headline text-5xl font-semibold text-emerald-300/20">
                  0{index + 1}
                </div>
                <div>
                  <h3 className="font-headline text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {section.title}
                  </h3>
                  <div className="mt-6 grid gap-5">
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 42)}
                        className="text-base leading-8 text-slate-300"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  {section.bullets?.length ? (
                    <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex gap-3 rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm leading-6 text-slate-300"
                        >
                          <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-300" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </article>

        {content.comparisons && (
          <section className="border-t border-white/5 py-20">
            <div className="page-container">
              <SectionHeading
                title={content.comparisonTitle!}
                description={content.comparisonDescription}
              />
              <div className="mt-12 grid gap-4 md:grid-cols-2">
                {content.comparisons.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/[.035] p-7"
                  >
                    <h3 className="font-headline text-xl font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-slate-400">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
        <section
          id="faq"
          className="border-t border-white/5 px-4 py-16 sm:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <SectionHeading title={labels.questions} />
            <FAQList items={content.faqs} />
          </div>
        </section>

        <CTABanner
          eyebrow={labels.ctaEyebrow}
          title={content.ctaTitle}
          description={content.ctaDescription}
          href={content.ctaHref ?? '/ai-car-wrap-generator'}
          label={content.ctaLabel ?? labels.start}
          icon={
            content.ctaHref ? (
              <BookOpen aria-hidden="true" className="size-4" />
            ) : (
              <Paintbrush aria-hidden="true" className="size-4" />
            )
          }
        />
      </main>
      <Footer />
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebApplication',
              name: content.title,
              applicationCategory: 'DesignApplication',
              operatingSystem: 'Web',
              url: localizedAbsoluteUrl(path, locale),
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description:
                  'Free 3D preview and browser editor; AI generation uses credits.',
              },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: labels.home,
                  item: localizedAbsoluteUrl('/', locale),
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: content.title,
                  item: localizedAbsoluteUrl(path, locale),
                },
              ],
            },
            {
              '@type': 'ItemList',
              name: content.versionsTitle,
              itemListElement: vehicles.map((vehicle, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: vehicle.label,
                url: localizedAbsoluteUrl(`/create/${vehicle.slug}`, locale),
              })),
            },
          ],
        }}
      />
    </div>
  );
}
