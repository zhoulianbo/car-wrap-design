import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas } from '@react-three/fiber';
import {
  Camera,
  Expand,
  ImagePlus,
  Minimize,
  Palette,
  Pause,
  Play,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ACESFilmicToneMapping, CanvasTexture } from 'three';

import { cn } from '@/lib/utils';
import {
  DEFAULT_VEHICLE_SLUG,
  getVehicleAssetConfig,
  PAINT_FINISHES,
  VEHICLE_PAINT_COLORS,
  type PaintFinishKey,
  type VehicleSlug,
} from '@/lib/vehicle-catalog';
import { composeVehicleCover } from '@/lib/wrap-cover';
import { StyledSelect } from '@/components/styled-select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  VehicleScene,
  type CameraView,
  type CameraViewRequest,
  type CameraZoomRequest,
} from './vehicle-scene';

const COVER_PADDING_PX = 20;

export type VehicleViewerLabels = {
  loadingDescription: string;
  loadingModel: string;
  vehicleDescription: (model: string, year: string) => string;
  pause: string;
  play: string;
  reset: string;
  fullscreen: string;
  screenshot: string;
  exitFullscreen?: string;
  fullscreenError?: string;
  customColor?: string;
  selectVehicle?: string;
  chooseImage?: string;
  removeImage?: string;
  front?: string;
  rear?: string;
  side?: string;
  zoomIn?: string;
  zoomOut?: string;
  viewControls?: string;
  color: (color: string) => string;
  finishes: Record<PaintFinishKey, string>;
};

const DEFAULT_LABELS: VehicleViewerLabels = {
  loadingDescription:
    'Interactive 3D car wrap preview. Drag to rotate and scroll or pinch to zoom.',
  loadingModel: 'Loading the 3D car model…',
  vehicleDescription: (model, year) =>
    `${model} ${year} interactive 3D car wrap preview`,
  pause: 'Pause rotation',
  play: 'Start rotation',
  reset: 'Reset camera',
  fullscreen: 'Open fullscreen',
  screenshot: 'Download preview screenshot',
  front: 'Front',
  rear: 'Rear',
  side: 'Side',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  viewControls: 'Preview angles and zoom',
  color: (color) => `Use paint color ${color}`,
  finishes: {
    gloss: 'Gloss',
    satin: 'Satin',
    matte: 'Matte',
    metallic: 'Metallic',
    pearlescent: 'Pearlescent',
  },
};

export function VehicleViewer({
  vehicleSlug = DEFAULT_VEHICLE_SLUG,
  textureCanvas,
  className,
  controls = true,
  minimal = false,
  previewMode = false,
  previewFullscreen = false,
  editorPreview = false,
  heroMode = false,
  enableZoom = true,
  motion = true,
  initialAutoRotate = true,
  finish: controlledFinish,
  onFinishChange,
  color: controlledColor,
  onColorChange,
  coverCaptureKey,
  onCoverCapture,
  labels = DEFAULT_LABELS,
  landingPreview = false,
  vehicleOptions,
  onVehicleChange,
  onChooseImage,
  onRemoveImage,
}: {
  vehicleSlug?: VehicleSlug;
  textureCanvas?: HTMLCanvasElement | null;
  className?: string;
  controls?: boolean;
  minimal?: boolean;
  previewMode?: boolean;
  previewFullscreen?: boolean;
  editorPreview?: boolean;
  heroMode?: boolean;
  enableZoom?: boolean;
  motion?: boolean;
  initialAutoRotate?: boolean;
  finish?: PaintFinishKey;
  onFinishChange?: (finish: PaintFinishKey) => void;
  color?: string;
  onColorChange?: (color: string) => void;
  coverCaptureKey?: string;
  onCoverCapture?: (blob: Blob) => void;
  labels?: VehicleViewerLabels;
  landingPreview?: boolean;
  vehicleOptions?: Array<{ value: string; label: string }>;
  onVehicleChange?: (value: string) => void;
  onChooseImage?: () => void;
  onRemoveImage?: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  useEffect(() => {
    let frame = 0;
    const syncFullscreen = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
      // Measure after the fullscreen layout has settled, including Escape exits.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        window.dispatchEvent(new Event('resize'))
      );
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        document.fullscreenElement === shellRef.current
      ) {
        void document.exitFullscreen().catch(() => setFullscreenError(true));
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);
  const toggleFullscreen = async () => {
    setFullscreenError(false);
    try {
      if (document.fullscreenElement === shellRef.current)
        await document.exitFullscreen();
      else if (shellRef.current?.requestFullscreen)
        await shellRef.current.requestFullscreen();
      else setFullscreenError(true);
    } catch {
      setFullscreenError(true);
    }
  };
  const renderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalFinish, setInternalFinish] = useState<PaintFinishKey>('gloss');
  const finish = controlledFinish ?? internalFinish;
  const setFinish = (next: PaintFinishKey) => {
    setInternalFinish(next);
    onFinishChange?.(next);
  };
  const [internalColor, setInternalColor] = useState<string>(
    VEHICLE_PAINT_COLORS[0]
  );
  const color = controlledColor ?? internalColor;
  const setColor = (value: string) => {
    setInternalColor(value);
    onColorChange?.(value);
  };
  const [autoRotate, setAutoRotate] = useState(false);
  useEffect(() => {
    setAutoRotate(
      initialAutoRotate &&
        !editorPreview &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }, [editorPreview, initialAutoRotate]);
  const [pageVisible, setPageVisible] = useState(() =>
    typeof document === 'undefined' ? true : !document.hidden
  );
  const [inViewport, setInViewport] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [viewRequest, setViewRequest] = useState<CameraViewRequest>();
  const [zoomRequest, setZoomRequest] = useState<CameraZoomRequest>();
  const [selectedView, setSelectedView] = useState<CameraView>();
  const [readyVehicleSlug, setReadyVehicleSlug] = useState<VehicleSlug>();
  const sceneReady = readyVehicleSlug === vehicleSlug;
  const capturedCoverRef = useRef<string | undefined>(undefined);
  const coverCaptureMode = Boolean(coverCaptureKey && onCoverCapture);
  const vehicle = getVehicleAssetConfig(vehicleSlug);
  const texture = useMemo(
    () => (textureCanvas ? new CanvasTexture(textureCanvas) : null),
    [textureCanvas]
  );
  const renderActive = motion && autoRotate && pageVisible && inViewport;
  const handleSceneReady = useCallback(
    () => setReadyVehicleSlug(vehicleSlug),
    [vehicleSlug]
  );
  const handleOrbitStart = useCallback(() => {
    if (!previewMode) return;
    setSelectedView(undefined);
    setAutoRotate(false);
  }, [previewMode]);
  const chooseView = (view: CameraView) => {
    setAutoRotate(false);
    setSelectedView(view);
    setViewRequest((previous) => ({
      view,
      sequence: (previous?.sequence ?? 0) + 1,
    }));
  };
  const zoom = (direction: 'in' | 'out') => {
    setZoomRequest((previous) => ({
      direction,
      sequence: (previous?.sequence ?? 0) + 1,
    }));
  };
  const previewButtonClass =
    'text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40 @[480px]/viewer:px-4';

  useEffect(() => {
    return () => texture?.dispose();
  }, [texture]);

  useEffect(() => {
    if (
      !sceneReady ||
      !texture ||
      !coverCaptureKey ||
      !onCoverCapture ||
      capturedCoverRef.current === coverCaptureKey
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        const source = renderCanvasRef.current;
        if (!source) return;
        const output = composeVehicleCover(source);
        if (!output) return;
        output.toBlob(
          (blob) => {
            if (!blob) return;
            capturedCoverRef.current = coverCaptureKey;
            onCoverCapture(blob);
          },
          'image/webp',
          0.96
        );
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [coverCaptureKey, onCoverCapture, sceneReady, texture, editorPreview]);

  useEffect(() => {
    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(entry.isIntersecting),
      { threshold: 0.01 }
    );
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  const capture = (ratio: '16:9' | '1:1' | '9:16') => {
    const source = renderCanvasRef.current;
    if (!source) return;
    const dimensions =
      ratio === '16:9'
        ? [1600, 900]
        : ratio === '9:16'
          ? [900, 1600]
          : [1200, 1200];
    const output = document.createElement('canvas');
    output.width = dimensions[0];
    output.height = dimensions[1];
    const context = output.getContext('2d');
    if (!context) return;
    context.fillStyle = '#080b10';
    context.fillRect(0, 0, output.width, output.height);
    const scale = Math.min(
      output.width / source.width,
      output.height / source.height
    );
    const width = source.width * scale;
    const height = source.height * scale;
    context.drawImage(
      source,
      (output.width - width) / 2,
      (output.height - height) / 2,
      width,
      height
    );
    context.font = '600 22px Space Grotesk, sans-serif';
    context.fillStyle = 'rgba(255,255,255,.62)';
    context.textAlign = 'right';
    context.fillText('CAR WRAP DESIGN', output.width - 30, output.height - 28);
    const link = document.createElement('a');
    link.download = `wrap-preview-${ratio.replace(':', 'x')}.png`;
    link.href = output.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      ref={shellRef}
      data-hero-ready={heroMode ? sceneReady : undefined}
      className={cn(
        'border-border/70 @container/viewer relative overflow-hidden rounded-2xl border bg-[color:var(--studio-canvas)]',
        (previewMode || editorPreview || landingPreview) &&
          !heroMode &&
          'bg-[color:var(--studio-preview)]',
        heroMode && 'bg-transparent',
        className,
        'fullscreen:h-[100dvh] fullscreen:w-[100vw] fullscreen:rounded-none w-full min-w-0'
      )}
    >
      {!heroMode && (
        <div
          className={cn(
            'absolute inset-0',
            previewMode || editorPreview || landingPreview
              ? 'bg-[radial-gradient(ellipse_at_50%_30%,rgba(226,230,240,0.12),transparent_75%)]'
              : 'bg-[radial-gradient(ellipse_at_50%_72%,rgba(0,245,155,0.08),transparent_58%)]'
          )}
          aria-hidden="true"
        />
      )}
      <div
        data-vehicle-render={heroMode ? '' : undefined}
        className="absolute inset-0"
      >
        <Canvas
          className="relative z-10"
          dpr={[1, 1.5]}
          resize={{ debounce: 0 }}
          frameloop={renderActive ? 'always' : 'demand'}
          camera={{ fov: 31, near: 0.03, far: 120 }}
          shadows
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            renderCanvasRef.current = gl.domElement;
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.15;
            if (heroMode) gl.setClearColor('#000000', 0);
            if (coverCaptureMode) gl.setClearColor('#000000', 0);
          }}
          fallback={
            <div
              role="img"
              aria-label={labels.vehicleDescription(vehicle.trim, vehicle.year)}
              className="text-muted-foreground flex h-full items-center justify-center p-8 text-center text-sm"
            >
              {labels.loadingDescription}
            </div>
          }
        >
          <Suspense fallback={null}>
            <VehicleScene
              vehicle={vehicle}
              finish={finish}
              color={color}
              texture={texture}
              autoRotate={renderActive}
              enableZoom={enableZoom}
              resetSignal={resetSignal}
              coverMode={coverCaptureMode}
              coverPadding={coverCaptureMode ? COVER_PADDING_PX : undefined}
              previewMode={
                previewMode || editorPreview || heroMode || landingPreview
              }
              heroMode={heroMode}
              viewRequest={viewRequest}
              zoomRequest={zoomRequest}
              onOrbitStart={handleOrbitStart}
              onReady={handleSceneReady}
            />
          </Suspense>
        </Canvas>
      </div>

      {!sceneReady ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-[15] flex items-center justify-center',
            heroMode
              ? 'text-slate-200'
              : 'bg-background/82 text-foreground backdrop-blur-sm'
          )}
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm',
              !heroMode && 'border-border/70 bg-background/90 border shadow-2xl'
            )}
          >
            <span className="bg-primary size-2 animate-pulse rounded-full" />
            {labels.loadingModel}
          </div>
        </div>
      ) : null}

      {controls && previewMode && previewFullscreen ? (
        <div className="absolute top-3 right-3 z-20">
          <Tooltip>
            <TooltipTrigger
              aria-label={
                isFullscreen
                  ? (labels.exitFullscreen ?? 'Exit fullscreen')
                  : labels.fullscreen
              }
              aria-pressed={isFullscreen}
              onClick={() => void toggleFullscreen()}
              className="border-border bg-popover/90 text-foreground hover:bg-muted focus-visible:ring-ring flex size-11 items-center justify-center rounded-lg border focus-visible:ring-2"
            >
              {isFullscreen ? (
                <Minimize className="size-4" />
              ) : (
                <Expand className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen
                ? (labels.exitFullscreen ?? 'Exit fullscreen')
                : labels.fullscreen}
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      {editorPreview ? (
        <div className="absolute top-3 right-3 z-20">
          <Tooltip>
            <TooltipTrigger
              aria-label={labels.reset}
              disabled={!sceneReady}
              onClick={() => {
                setAutoRotate(false);
                setResetSignal((value) => value + 1);
              }}
              className="border-border bg-popover/90 text-foreground hover:bg-muted focus-visible:ring-ring flex size-9 items-center justify-center rounded-lg border focus-visible:ring-2"
            >
              <RotateCcw className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{labels.reset}</TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      {!minimal && !previewMode ? (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-3">
          {vehicleOptions && onVehicleChange ? (
            <div className="pointer-events-auto min-w-0 flex-1 sm:max-w-64">
              <StyledSelect
                value={vehicleSlug}
                onValueChange={onVehicleChange}
                options={vehicleOptions}
                label={labels.selectVehicle ?? 'Vehicle'}
              />
            </div>
          ) : (
            <div className="border-border/70 bg-background/80 pointer-events-auto rounded-lg border px-3 py-2 backdrop-blur-xl">
              <p className="font-headline text-foreground text-xs font-semibold">
                {vehicle.trim}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {vehicle.year}
              </p>
            </div>
          )}
          {controls ? (
            <div className="border-border/70 bg-background/80 pointer-events-auto flex items-center gap-1 rounded-xl border p-1.5 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setAutoRotate((value) => !value)}
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition"
                aria-label={autoRotate ? labels.pause : labels.play}
              >
                {autoRotate ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setResetSignal((value) => value + 1)}
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition"
                aria-label={labels.reset}
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition"
                aria-label={
                  isFullscreen
                    ? (labels.exitFullscreen ?? 'Exit fullscreen')
                    : labels.fullscreen
                }
                aria-pressed={isFullscreen}
              >
                <>
                  {isFullscreen ? (
                    <Minimize className="size-4" />
                  ) : (
                    <Expand className="size-4" />
                  )}
                </>
              </button>
              {onChooseImage ? (
                <>
                  <button
                    type="button"
                    onClick={onChooseImage}
                    aria-label={labels.chooseImage}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition"
                  >
                    <ImagePlus className="size-4" />
                  </button>
                  {onRemoveImage && (
                    <button
                      type="button"
                      onClick={onRemoveImage}
                      aria-label={labels.removeImage}
                      className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </>
              ) : (
                <div className="group relative">
                  <button
                    type="button"
                    className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition"
                    aria-label={labels.screenshot}
                  >
                    <Camera className="size-4" />
                  </button>
                  <div className="border-border/70 bg-background/95 invisible absolute top-full right-0 mt-2 flex gap-1 rounded-lg border p-1 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    {(['16:9', '1:1', '9:16'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => capture(ratio)}
                        className="text-muted-foreground hover:bg-accent hover:text-foreground rounded px-2 py-1 text-[10px]"
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {controls && previewMode ? (
        <div
          role="group"
          aria-label={labels.viewControls ?? DEFAULT_LABELS.viewControls}
          className="border-border bg-popover/95 font-headline absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-20 flex w-max max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-0.5 rounded-2xl border p-1.5 shadow-xl backdrop-blur-xl @[480px]/viewer:bottom-7 @[480px]/viewer:gap-1 @[480px]/viewer:p-2"
        >
          {(['front', 'rear', 'side'] as const).map((view) => (
            <button
              key={view}
              type="button"
              disabled={!sceneReady}
              aria-pressed={selectedView === view}
              onClick={() => chooseView(view)}
              className={cn(
                previewButtonClass,
                selectedView === view && 'bg-primary/10 text-primary'
              )}
            >
              {labels[view] ?? DEFAULT_LABELS[view]}
            </button>
          ))}
          <span
            className="bg-border mx-0.5 h-6 w-px shrink-0 @[480px]/viewer:mx-2"
            aria-hidden="true"
          />
          <button
            type="button"
            disabled={!sceneReady}
            aria-label={autoRotate ? labels.pause : labels.play}
            aria-pressed={autoRotate}
            onClick={() => {
              setSelectedView(undefined);
              setAutoRotate((value) => !value);
            }}
            className={previewButtonClass}
          >
            {autoRotate ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5" />
            )}
          </button>
          <span
            className="bg-border mx-0.5 h-6 w-px shrink-0 @[480px]/viewer:mx-2"
            aria-hidden="true"
          />
          <button
            type="button"
            disabled={!sceneReady}
            aria-label={labels.zoomOut ?? DEFAULT_LABELS.zoomOut}
            onClick={() => zoom('out')}
            className={previewButtonClass}
          >
            <ZoomOut className="size-5" />
          </button>
          <button
            type="button"
            disabled={!sceneReady}
            aria-label={labels.zoomIn ?? DEFAULT_LABELS.zoomIn}
            onClick={() => zoom('in')}
            className={previewButtonClass}
          >
            <ZoomIn className="size-5" />
          </button>
        </div>
      ) : null}

      {fullscreenError && (
        <p
          role="alert"
          className="bg-background/95 absolute inset-x-4 top-20 z-20 rounded-lg p-3 text-sm"
        >
          {labels.fullscreenError ??
            'Fullscreen is unavailable in this browser.'}
        </p>
      )}
      {controls && !minimal && !previewMode ? (
        <div
          className={cn(
            'border-border/70 bg-background/88 absolute inset-x-3 bottom-3 z-20 flex flex-col gap-2 rounded-xl border p-3 backdrop-blur-xl lg:inset-x-5',
            landingPreview
              ? '@[680px]/viewer:flex-row @[680px]/viewer:items-center @[680px]/viewer:justify-between'
              : '2xl:flex-row 2xl:items-center 2xl:justify-between'
          )}
        >
          <div
            className={cn(
              'flex gap-1 overflow-x-auto',
              landingPreview && 'shrink-0'
            )}
          >
            {(Object.keys(PAINT_FINISHES) as PaintFinishKey[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={finish === key}
                onClick={() => setFinish(key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap capitalize transition',
                  landingPreview && 'px-2',
                  finish === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                {labels.finishes[key]}
              </button>
            ))}
          </div>
          <div
            className={cn(
              'flex flex-wrap items-center gap-2',
              landingPreview && 'shrink-0 gap-1.5'
            )}
          >
            {VEHICLE_PAINT_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={labels.color(swatch)}
                aria-pressed={color === swatch}
                onClick={() => setColor(swatch)}
                className={cn(
                  'size-6 shrink-0 rounded-full border border-white/20 transition hover:scale-110',
                  color === swatch &&
                    'ring-primary ring-offset-background ring-2 ring-offset-2'
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
            {landingPreview && (
              <label
                className="border-border bg-secondary relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border"
                title={labels.customColor}
              >
                <Palette className="size-4" />
                <input
                  type="color"
                  value={color}
                  aria-label={labels.customColor}
                  onInput={(event) => setColor(event.currentTarget.value)}
                  onChange={(event) => setColor(event.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
