import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CarFront,
  Images,
  MousePointer2,
  Paintbrush,
  Palette,
  Sparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { apiGet, apiGetBlob } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  HERO_VEHICLES,
  VEHICLE_ASSET_MANIFEST,
  type PaintFinishKey,
  type VehicleAssetConfig,
  type VehicleSlug,
} from '@/lib/vehicle-catalog';
import { m } from '@/paraglide/messages.js';
import { buttonVariants } from '@/components/ui/button';

import styles from './hero.module.css';

const VehicleViewer = lazy(() =>
  import('@/components/vehicle-viewer/vehicle-viewer').then((module) => ({
    default: module.VehicleViewer,
  }))
);
interface HeroDesign {
  id: string;
  slug: string;
  title: string;
  vehicleSlug: VehicleSlug;
  coverUrl: string;
  finish: PaintFinishKey;
}

class ViewerBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Hero() {
  const [vehicleSlug, setVehicleSlug] = useState(HERO_VEHICLES[0]?.slug);
  const vehicle =
    HERO_VEHICLES.find((item) => item.slug === vehicleSlug) ?? HERO_VEHICLES[0];
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      {vehicle ? (
        <HeroContent
          key={vehicle.slug}
          vehicle={vehicle}
          onVehicleChange={setVehicleSlug}
        />
      ) : (
        <div className="page-container py-16">
          <HeroCopy />
        </div>
      )}
    </section>
  );
}

function HeroCopy() {
  return (
    <div className={styles.copy}>
      <p className={styles.eyebrow}>{m['landing.hero.badge']()}</p>
      <h1 id="hero-title" className={styles.headline}>
        {m['landing.hero.headline']()}
      </h1>
      <p className={styles.description}>{m['landing.hero.subheadline']()}</p>
      <div className={styles.actions}>
        <Link
          href="/create"
          className={cn(buttonVariants({ size: 'lg' }), styles.primary)}
        >
          <Paintbrush className="size-4" />
          {m['landing.hero.cta']()}
        </Link>
        <Link
          href="/ai-car-wrap-generator"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            styles.secondary
          )}
        >
          <Sparkles className="size-4" />
          {m['landing.hero.secondary']()}
        </Link>
      </div>
      <div className={styles.highlights}>
        {[
          {
            icon: Images,
            text: m['landing.hero.highlight_gallery'](),
            value: m['landing.hero.highlight_gallery_value'](),
          },
          {
            icon: CarFront,
            text: m['landing.hero.highlight_models'](),
            value: String(VEHICLE_ASSET_MANIFEST.length),
          },
          {
            icon: Palette,
            text: m['landing.hero.highlight_preview'](),
            value: '3D',
          },
        ].map(({ icon: FeatureIcon, text, value }) => {
          return (
            <div key={text}>
              <span className={styles.highlightLabel}>
                <FeatureIcon className="size-4" />
                {text}
              </span>
              <strong>{value}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroContent({
  vehicle,
  onVehicleChange,
}: {
  vehicle: VehicleAssetConfig;
  onVehicleChange: (slug: VehicleSlug) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const [viewerAttempt, setViewerAttempt] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  useEffect(() => {
    if (!stageRef.current) return;
    if (!('IntersectionObserver' in window)) {
      setViewerVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setViewerVisible(true);
        observer.disconnect();
      },
      { threshold: 0 }
    );
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);
  const designsQuery = useQuery({
    queryKey: ['hero-designs', vehicle.slug],
    queryFn: () =>
      apiGet<HeroDesign[]>(
        `/api/gallery?hero=1&vehicle=${encodeURIComponent(vehicle.slug)}`
      ),
    staleTime: 30_000,
  });
  const designs = (designsQuery.data ?? []).slice(0, 8);
  const selected =
    designs.find((design) => design.id === selectedId) ?? designs[0];
  const textureQuery = useQuery({
    queryKey: ['hero-texture', selected?.slug],
    queryFn: async () => {
      const blob = await apiGetBlob(
        `/api/gallery/${encodeURIComponent(selected!.slug)}?texture=1`
      );
      const bitmap = await createImageBitmap(blob);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.fillStyle = '#f4f5f6';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0);
        return canvas;
      } finally {
        bitmap.close();
      }
    },
    enabled: viewerVisible && Boolean(selected),
    staleTime: Infinity,
    gcTime: 60_000,
    retry: 1,
  });
  const viewerLabels = {
    loadingDescription: m['viewer.description'](),
    loadingModel: m['viewer.loading_model'](),
    vehicleDescription: (model: string, year: string) =>
      m['viewer.vehicle_description']({ model, year }),
    pause: m['viewer.pause'](),
    play: m['viewer.play'](),
    reset: m['viewer.reset'](),
    fullscreen: m['viewer.fullscreen'](),
    screenshot: m['viewer.screenshot'](),
    color: (color: string) => m['viewer.color']({ color }),
    finishes: {
      gloss: m['viewer.finish.gloss'](),
      satin: m['viewer.finish.satin'](),
      matte: m['viewer.finish.matte'](),
      metallic: m['viewer.finish.metallic'](),
      pearlescent: m['viewer.finish.pearlescent'](),
    },
  };
  const retryViewer = (
    <div role="alert" className={styles.viewerMessage}>
      <p>{m['landing.hero.viewer_error']()}</p>
      <button
        type="button"
        onClick={() => setViewerAttempt((value) => value + 1)}
      >
        {m['landing.hero.retry']()}
      </button>
    </div>
  );
  return (
    <>
      <div className={styles.upperShell} data-hero-upper>
        <div className={cn('page-container', styles.upper)}>
          <HeroCopy />
          <nav
            className={styles.vehicles}
            aria-label={m['landing.hero.chassis']()}
          >
            <p className={styles.vehicleHeading}>
              {m['landing.hero.chassis']()}
            </p>
            <div className={styles.vehicleList}>
              {HERO_VEHICLES.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  aria-pressed={vehicle.slug === item.slug}
                  onClick={() => onVehicleChange(item.slug)}
                  className={cn(
                    styles.vehicle,
                    vehicle.slug === item.slug && styles.selectedVehicle
                  )}
                >
                  {item.hero?.thumbnail ? (
                    <img
                      src={item.hero.thumbnail}
                      alt=""
                      width={96}
                      height={64}
                    />
                  ) : (
                    <CarFront className="size-10" />
                  )}
                  <span>{item.hero?.label ?? item.trim}</span>
                </button>
              ))}
            </div>
          </nav>
          <div ref={stageRef} className={styles.stage} data-hero-viewer>
            {viewerVisible ? (
              <ViewerBoundary key={viewerAttempt} fallback={retryViewer}>
                <Suspense
                  fallback={
                    <p role="status" className={styles.viewerMessage}>
                      {m['viewer.loading_model']()}
                    </p>
                  }
                >
                  <VehicleViewer
                    vehicleSlug={vehicle.slug}
                    textureCanvas={textureQuery.data ?? null}
                    finish={selected?.finish ?? 'gloss'}
                    minimal
                    controls={false}
                    heroMode
                    motion={false}
                    enableZoom={false}
                    labels={viewerLabels}
                    className="size-full rounded-none border-0"
                  />
                </Suspense>
              </ViewerBoundary>
            ) : vehicle.hero?.thumbnail ? (
              <img
                src={vehicle.hero.thumbnail}
                alt={`${vehicle.brand} ${vehicle.trim} ${vehicle.year}`}
                width={800}
                height={533}
                className="size-full object-contain"
                decoding="async"
              />
            ) : null}
            {viewerVisible && selected && textureQuery.isPending && (
              <p role="status" className={styles.textureStatus}>
                {m['landing.hero.texture_loading']()}
              </p>
            )}
            {textureQuery.isError && (
              <div role="alert" className={styles.textureStatus}>
                {m['landing.hero.texture_error']()}{' '}
                <button
                  type="button"
                  onClick={() => void textureQuery.refetch()}
                >
                  {m['landing.hero.retry']()}
                </button>
              </div>
            )}
            <p className={styles.orbitHint}>
              <MousePointer2 className="size-3.5" />
              {m['landing.hero.rotate_hint']()}
            </p>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <div className={cn('page-container', styles.stripContainer)}>
          <div className={styles.stripHeading}>
            <span>{m['landing.hero.wraps_title']()}</span>
            <Link href="/gallery">
              <Images className="size-4" />
              {m['landing.hero.explore_wraps']()}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div
            className={styles.strip}
            aria-label={m['landing.hero.wraps_title']()}
            tabIndex={0}
          >
            {designsQuery.isPending ? (
              Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className={cn(styles.wrapCard, styles.skeleton)}
                  aria-hidden="true"
                />
              ))
            ) : designsQuery.isError ? (
              <p role="alert" className={styles.empty}>
                {m['landing.hero.wraps_error']()}{' '}
                <button
                  type="button"
                  onClick={() => void designsQuery.refetch()}
                >
                  {m['landing.hero.retry']()}
                </button>
              </p>
            ) : designs.length ? (
              designs.map((design) => (
                <button
                  key={design.id}
                  type="button"
                  aria-label={design.title}
                  onClick={() => setSelectedId(design.id)}
                  aria-pressed={selected?.id === design.id}
                  className={cn(
                    styles.wrapCard,
                    selected?.id === design.id && styles.selectedWrap
                  )}
                >
                  <img
                    src={design.coverUrl}
                    alt={design.title}
                    width={160}
                    height={100}
                  />
                  <span>{design.title}</span>
                </button>
              ))
            ) : (
              <p className={styles.empty}>{m['landing.hero.wraps_empty']()}</p>
            )}
          </div>
          {designsQuery.isPending && (
            <span role="status" className="sr-only">
              {m['landing.hero.texture_loading']()}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
