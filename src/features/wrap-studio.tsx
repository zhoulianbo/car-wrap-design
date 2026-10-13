import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import { ArrowLeft, Check, Download, Save, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { apiDelete, apiGet, apiUpload } from '@/lib/api-client';
import { resolveErrorCode } from '@/lib/error-codes';
import { cn } from '@/lib/utils';
import {
  getVehicleAssetConfig,
  isVehicleSlug,
  VEHICLE_ASSET_MANIFEST,
  type PaintFinishKey,
  type VehicleSlug,
} from '@/lib/vehicle-catalog';
import { imageWrapDocument } from '@/lib/wrap-document';
import { vehicleWrapName } from '@/lib/wrap-naming';
import type { UserWrapSummary } from '@/lib/wrap-types';
import { m } from '@/paraglide/messages.js';
import { CreditPaywall } from '@/blocks/credit-paywall';
import { WrapImagePreview } from '@/blocks/wrap-image-preview';
import { wrapPromptPresets } from '@/blocks/wrap-prompt-presets';
import { WrapShareDialog } from '@/blocks/wrap-share-dialog';
import { SignInDialog } from '@/components/auth/sign-in-dialog';
import { LocaleSelector } from '@/components/locale-selector';
import { StyledSelect } from '@/components/styled-select';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  INITIAL_DOCUMENT,
  WrapEditor,
  type UploadedAsset,
  type WrapDocument,
  type WrapEditorHandle,
} from '@/components/wrap-editor';

type UserInfo = {
  isPaid: boolean;
};

// Older documents omit paintColor; compare their effective color consistently.
function documentSnapshot(document: WrapDocument) {
  return JSON.stringify({
    ...document,
    paintColor:
      document.paintColor ||
      (document.background !== 'transparent' ? document.background : '#f4f5f6'),
  });
}

export function WrapStudio({
  vehicleSlug,
  wrap,
  draftDocument,
  initialFinish,
  sourceDesignId,
  initialUsesAi = false,
}: {
  vehicleSlug: string;
  wrap?: UserWrapSummary;
  draftDocument?: WrapDocument;
  initialFinish?: PaintFinishKey;
  sourceDesignId?: string;
  initialUsesAi?: boolean;
}) {
  const slug: VehicleSlug = isVehicleSlug(vehicleSlug)
    ? vehicleSlug
    : 'model-3-2024-base';
  const vehicle = getVehicleAssetConfig(slug);
  const initialDocument = useMemo(() => {
    if (wrap?.sourceAssetsDeleted && wrap.textureUrl) {
      return imageWrapDocument(
        `/api/wraps/${encodeURIComponent(wrap.id)}?texture=1&source=${encodeURIComponent(wrap.textureUrl)}`,
        wrap.name
      ) as WrapDocument;
    }
    if (!wrap?.canvasJson || wrap.canvasJson === '{}')
      return draftDocument ?? INITIAL_DOCUMENT;
    try {
      const parsed = JSON.parse(wrap.canvasJson) as WrapDocument;
      return parsed.version === 1 && Array.isArray(parsed.nodes)
        ? parsed
        : INITIAL_DOCUMENT;
    } catch {
      return INITIAL_DOCUMENT;
    }
  }, [
    wrap?.canvasJson,
    wrap?.sourceAssetsDeleted,
    wrap?.textureUrl,
    wrap?.id,
    wrap?.name,
    draftDocument,
  ]);
  useEffect(() => {
    if (wrap?.sourceAssetsDeleted && wrap.textureUrl)
      toast.info(m['studio.restored_texture']());
  }, [wrap?.id, wrap?.sourceAssetsDeleted, wrap?.textureUrl]);
  const usesAiRef = useRef(Boolean(wrap?.usesAi || initialUsesAi));
  const [signInOpen, setSignInOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [preview, setPreview] = useState<HTMLCanvasElement | null>(null);
  const [document, setDocument] = useState<WrapDocument>(initialDocument);
  const [activeWrap, setActiveWrap] = useState<UserWrapSummary | undefined>(
    wrap
  );
  const [version, setVersion] = useState(wrap?.version ?? 1);
  const [saveState, setSaveState] = useState<
    'local' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'error'
  >(wrap ? 'saved' : 'local');
  const [finish, setFinish] = useState<PaintFinishKey>(
    wrap?.finish ?? initialFinish ?? 'gloss'
  );
  const finishRef = useRef(finish);
  const documentRef = useRef(document);
  const savedSnapshotRef = useRef({
    document: documentSnapshot(initialDocument),
    finish,
  });
  const [paintColor, setPaintColor] = useState(
    initialDocument.paintColor ||
      (initialDocument.background !== 'transparent'
        ? initialDocument.background
        : '#f4f5f6')
  );
  const savingRef = useRef(false);
  const createKey = useRef(crypto.randomUUID());
  const updateSaveState = (
    nextDocument: WrapDocument,
    nextFinish: PaintFinishKey
  ) => {
    if (savingRef.current) return;
    const unchanged =
      documentSnapshot(nextDocument) === savedSnapshotRef.current.document &&
      nextFinish === savedSnapshotRef.current.finish;
    setSaveState(unchanged ? (wrapRef.current ? 'saved' : 'local') : 'dirty');
  };
  const changeFinish = (value: PaintFinishKey) => {
    setFinish(value);
    finishRef.current = value;
    updateSaveState(documentRef.current, value);
  };
  const wrapRef = useRef(activeWrap);
  const versionRef = useRef(version);
  const editorRef = useRef<WrapEditorHandle>(null);
  const [returnTo, setReturnTo] = useState(`/create/${slug}`);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    wrapRef.current = activeWrap;
  }, [activeWrap]);
  useEffect(() => {
    versionRef.current = version;
  }, [version]);
  useEffect(() => {
    const target = new URL(window.location.href);
    target.searchParams.delete('tab');
    setReturnTo(`${target.pathname}${target.search}`);
  }, [slug]);

  const hasUnsavedChanges = ['dirty', 'saving', 'conflict', 'error'].includes(
    saveState
  );
  const canSave = hasUnsavedChanges && saveState !== 'saving';
  const blocker = useBlocker({
    shouldBlockFn: () => hasUnsavedChanges,
    enableBeforeUnload: hasUnsavedChanges,
    withResolver: true,
  });

  const userInfoQuery = useQuery({
    queryKey: ['user-info', session?.user.id],
    queryFn: () => apiGet<UserInfo>('/api/user/info'),
    enabled: Boolean(session?.user),
    staleTime: 60_000,
  });
  const creditsQuery = useQuery({
    queryKey: ['user-credits', 'studio', session?.user.id],
    queryFn: () => apiGet<{ balance: number }>('/api/credits'),
    enabled: Boolean(session?.user),
  });

  const editorLabels = {
    upload: m['editor.upload'](),
    addText: m['editor.add_text'](),
    addShape: m['editor.add_shape'](),
    undo: m['editor.undo'](),
    redo: m['editor.redo'](),
    layers: m['editor.layers'](),
    opacity: m['editor.opacity'](),
    flip: m['editor.flip'](),
    delete: m['editor.delete'](),
    selectHint: m['editor.select_hint'](),
    export: m['editor.export'](),
    exportTitle: m['editor.export_title'](),
    exportLocked: m['editor.export_locked'](),
    exportLockedTitle: m['editor.export_locked_title'](),
    imageFailed: m['editor.image_failed'](),
    defaultLayer: m['editor.default_layer'](),
    textLayer: m['editor.text_layer'](),
    shapeLayer: m['editor.shape_layer'](),
    defaultText: m['editor.default_text'](),
  };
  const editorUiLabels = {
    select: m['editor.tool_select'](),
    move: m['editor.tool_move'](),
    text: m['editor.tool_text'](),
    brush: m['editor.tool_brush'](),
    eraser: m['editor.tool_eraser'](),
    shape: m['editor.tool_shape'](),
    rectangle: m['editor.tool_rectangle'](),
    circle: m['editor.tool_circle'](),
    arrow: m['editor.tool_arrow'](),
    line: m['editor.tool_line'](),
    diamond: m['editor.tool_diamond'](),
    polygon: m['editor.tool_polygon'](),
    pen: m['editor.tool_pen'](),
    snap: m['editor.tool_snap'](),
    rotate: m['editor.tool_rotate'](),
    color: m['editor.tool_color'](),
    material: m['editor.tool_material'](),
    back: m['editor.tool_back'](),
    forward: m['editor.tool_forward'](),
    assets: m['editor.assets_tab'](),
    ai: m['editor.ai_tab'](),
    uploadLocal: m['editor.upload_local'](),
    uploading: m['editor.uploading'](),
    freeStorage: m['editor.free_storage'](),
    paidStorage: m['editor.paid_storage'](),
    storage: m['editor.storage'](),
    storageFull: m['editor.storage_full'](),
    addToCanvas: m['editor.add_to_canvas'](),
    useReference: m['editor.use_reference'](),
    removeReference: m['editor.remove_reference'](),
    flipHorizontal: m['editor.flip_horizontal'](),
    flipVertical: m['editor.flip_vertical'](),
    resizePreview: m['editor.resize_preview'](),
    canvasZoom: m['editor.canvas_zoom'](),
    zoomIn: m['editor.zoom_in'](),
    zoomOut: m['editor.zoom_out'](),
    fitCanvas: m['editor.fit_canvas'](),
    aiReference: m['editor.ai_reference'](),
    promptPlaceholder: m['editor.ai_prompt_placeholder'](),
    ideas: m['generator.ideas'](),
    customColor: m['generator.custom_color'](),
    referenceTypes: m['generator.reference_types'](),
    unlockGallery: m['generator.unlock_gallery'](),
    panelColor: m['editor.panel_color'](),
    wrapColor: m['editor.wrap_color'](),
    clearPanelColor: m['editor.clear_panel_color'](),
    lineWidth: m['editor.line_width'](),
    colorPreference: m['editor.color_preference'](),
    openGallery: m['editor.open_gallery'](),
    generating: m['editor.generating'](),
    generateCost: (cost: number) => m['editor.generate_cost']({ cost }),
    currentCredits: (credits: number) =>
      m['editor.current_credits']({ credits }),
    emptyLayers: m['editor.empty_layers'](),
    layerUp: m['editor.layer_up'](),
    layerDown: m['editor.layer_down'](),
    layerDrag: m['editor.layer_drag'](),
    layerDragHint: m['editor.layer_drag_hint'](),
    rotate15: m['editor.rotate_15'](),
    promptRequired: m['editor.prompt_required'](),
    generationComplete: m['editor.generation_complete'](),
    generationFailed: m['editor.generation_failed'](),
    generationSlow: m['editor.generation_slow'](),
    refundFailed: m['editor.refund_failed'](),
    aiLayer: m['editor.ai_layer'](),
    brushLayer: m['editor.brush_layer'](),
    penLayer: m['editor.pen_layer'](),
    eraserLayer: m['editor.eraser_layer'](),
    uploadedLayer: m['editor.uploaded_layer'](),
    paywallTitle: m['editor.paywall_title'](),
    paywallDescription: (cost: number) =>
      m['editor.paywall_description']({ cost }),
    paywallCta: m['editor.paywall_cta'](),
    font: m['editor.font'](),
    fontSize: m['editor.font_size'](),
    brushSize: m['editor.brush_size'](),
    brushOpacity: m['editor.brush_opacity'](),
    eraserSize: m['editor.eraser_size'](),
    eraserShape: m['editor.eraser_shape'](),
    eraserRound: m['editor.eraser_round'](),
    eraserSquare: m['editor.eraser_square'](),
    materialGloss: m['viewer.finish.gloss'](),
    materialSatin: m['viewer.finish.satin'](),
    materialMatte: m['viewer.finish.matte'](),
    materialMetallic: m['viewer.finish.metallic'](),
    materialPearlescent: m['viewer.finish.pearlescent'](),
  };
  const assetsQuery = useQuery({
    queryKey: ['user-assets', session?.user.id],
    queryFn: () =>
      apiGet<{ items: UploadedAsset[]; usedBytes: number; limitBytes: number }>(
        '/api/assets'
      ),
    enabled: Boolean(session?.user),
  });

  const save = async (forSharing = false) => {
    if (!session?.user) {
      setSignInOpen(true);
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveState('saving');
    const snapshot = documentRef.current;
    const savedFinish = finishRef.current;
    try {
      const texture = editorRef.current?.getTexture();
      if (!texture) throw new Error(m['studio.edit_first']());
      const textureBlob = await new Promise<Blob>((resolve, reject) =>
        texture.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error(m['studio.save_failed']())),
          'image/webp',
          1
        )
      );
      const form = new FormData();
      form.set(
        'data',
        JSON.stringify({
          wrapId: wrapRef.current?.id,
          ...(forSharing && !wrapRef.current ? { openToGallery: false } : {}),
          version: versionRef.current,
          vehicleSlug: slug,
          usesAi: usesAiRef.current,
          canvasJson: JSON.stringify(snapshot),
          finish: savedFinish,
          sourceDesignId: wrap?.sourceDesignId || sourceDesignId,
          idempotencyKey: createKey.current,
        })
      );
      form.set(
        'texture',
        new File([textureBlob], 'texture.webp', { type: 'image/webp' })
      );
      const saved = await apiUpload<UserWrapSummary>('/api/wraps', form);
      wrapRef.current = saved;
      versionRef.current = saved.version;
      setActiveWrap(saved);
      setVersion(saved.version);
      savedSnapshotRef.current = {
        document: documentSnapshot(snapshot),
        finish: saved.finish,
      };
      // Edits made while the images were uploading remain explicitly unsaved.
      const matches =
        documentSnapshot(documentRef.current) ===
          savedSnapshotRef.current.document &&
        finishRef.current === savedSnapshotRef.current.finish;
      setSaveState(matches ? 'saved' : 'dirty');
      if (matches) toast.success(m['studio.saved_success']());
      else toast.info(m['studio.unsaved']());
      return matches;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : m['studio.save_failed']();
      setSaveState(
        resolveErrorCode(error) === 'CONFLICT' ? 'conflict' : 'error'
      );
      toast.error(message);
    } finally {
      savingRef.current = false;
    }
  };

  const handleDocumentChange = (nextDocument: WrapDocument) => {
    const nextPaintColor =
      nextDocument.paintColor ||
      (nextDocument.background !== 'transparent'
        ? nextDocument.background
        : '#f4f5f6');
    setPaintColor(nextPaintColor);
    documentRef.current = {
      ...nextDocument,
      paintColor: nextPaintColor,
    };
    setDocument(documentRef.current);
    updateSaveState(documentRef.current, finishRef.current);
  };

  const uploadAsset = async (
    file: File,
    kind: 'storage' | 'ai-input'
  ): Promise<UploadedAsset> => {
    const form = new FormData();
    form.set('file', file);
    form.set('kind', kind);
    const asset = await apiUpload<UploadedAsset>('/api/assets', form);
    void assetsQuery.refetch();
    return asset;
  };

  const statusLabel =
    saveState === 'local'
      ? m['studio.local']()
      : saveState === 'dirty'
        ? m['studio.unsaved']()
        : saveState === 'saving'
          ? m['studio.saving']()
          : saveState === 'saved'
            ? m['studio.saved_success']()
            : saveState === 'conflict'
              ? m['studio.conflict']()
              : m['studio.failed']();

  const requireSignIn = () => {
    if (session?.user) return true;
    setSignInOpen(true);
    return false;
  };

  const compactViewer = (
    <WrapImagePreview
      vehicleSlug={slug}
      textureCanvas={preview}
      initialAutoRotate={false}
      finish={finish}
      color={paintColor}
      className="size-full rounded-none border-0"
    />
  );

  return (
    <main className="bg-background text-foreground flex h-dvh min-h-0 flex-col overflow-hidden">
      <Dialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open && !savingRef.current) blocker.reset?.();
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{m['studio.leave_title']()}</DialogTitle>
            <DialogDescription>
              {m['studio.leave_description']({
                vehicle: vehicleWrapName(slug),
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={savingRef.current}
              onClick={() => blocker.reset?.()}
            >
              {m['studio.leave_cancel']()}
            </Button>
            <Button
              variant="destructive"
              disabled={savingRef.current}
              onClick={() => blocker.proceed?.()}
            >
              {m['studio.leave_discard']()}
            </Button>
            <Button
              disabled={saveState === 'saving'}
              onClick={async () => {
                if (await save()) blocker.proceed?.();
              }}
            >
              {saveState === 'saving'
                ? m['studio.saving']()
                : m['studio.leave_save']()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <header className="border-border bg-background/95 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-3 backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            onClick={() => router.back()}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              'text-muted-foreground'
            )}
            aria-label={m['studio.back']()}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {wrap?.name || vehicleWrapName(slug)}
            </p>
            <p
              className={`truncate text-[10px] ${saveState === 'error' || saveState === 'conflict' ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {statusLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            onClick={() => setShareOpen(true)}
            variant="secondary"
            aria-label={m['studio.share']()}
            className="h-11 min-w-11 gap-2 px-3 text-sm sm:px-4"
          >
            <Share2 className="size-4" />{' '}
            <span className="hidden sm:inline">{m['studio.share']()}</span>
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!editorRef.current?.downloadTexture()) {
                toast.info(m['studio.edit_to_export']());
              }
            }}
            variant="secondary"
            className="hidden h-11 gap-2 px-4 text-sm sm:flex"
          >
            <Download className="size-4" /> {m['studio.download']()}
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={!canSave}
            variant={canSave ? 'default' : 'secondary'}
            aria-label={m['studio.save']()}
            className="h-11 min-w-11 gap-2 px-3 text-sm sm:px-4"
          >
            {saveState === 'saved' ? (
              <Check className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            <span className="hidden sm:inline">{m['studio.save']()}</span>
          </Button>
          <LocaleSelector className="text-muted-foreground hover:bg-muted hover:text-foreground" />
          <div className="border-border bg-secondary text-secondary-foreground flex size-8 items-center justify-center rounded-full border text-xs font-semibold">
            {session?.user?.name?.charAt(0).toUpperCase() ??
              m['studio.guest_initial']()}
          </div>
        </div>
      </header>

      <section className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute top-4 right-4 z-30 hidden sm:block">
          <StyledSelect
            label={m['studio.select_vehicle']()}
            value={slug}
            onValueChange={(value) => {
              if (value !== slug) router.push(`/create/${value}`);
            }}
            className="w-56"
            options={VEHICLE_ASSET_MANIFEST.map((item) => ({
              value: item.slug,
              label: `${item.trim} · ${item.year}`,
            }))}
          />
        </div>
        <div className="absolute inset-0">
          <WrapEditor
            ref={editorRef}
            document={initialDocument}
            onDocumentChange={handleDocumentChange}
            onPreview={setPreview}
            onMaterialChange={(value) => changeFinish(value as PaintFinishKey)}
            uploadedAssets={assetsQuery.data?.items}
            storageLimit={assetsQuery.data?.limitBytes}
            onDeleteAsset={async (id) => {
              await apiDelete(`/api/assets?id=${encodeURIComponent(id)}`);
              await assetsQuery.refetch();
            }}
            material={finish}
            paintColor={paintColor}
            onRequireSignIn={requireSignIn}
            onInsufficientCredits={() => setPaywallOpen(true)}
            onUploadAsset={uploadAsset}
            onGenerationComplete={() => {
              usesAiRef.current = true;
            }}
            onCreditsChange={() => void creditsQuery.refetch()}
            templatePath={vehicle.templatePath}
            vehicleSlug={slug}
            credits={creditsQuery.data?.balance ?? 0}
            isPaid={userInfoQuery.data?.isPaid === true}
            userId={session?.user.id}
            promptPresets={wrapPromptPresets()}
            exportEnabled
            labels={editorLabels}
            uiLabels={editorUiLabels}
            previewSlot={compactViewer}
          />
        </div>
      </section>
      <WrapShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        vehicleSlug={slug}
        textureCanvas={preview}
        finish={finish}
        color={paintColor}
        wrap={activeWrap}
        userId={session?.user.id}
        hasUnsavedChanges={hasUnsavedChanges}
        onRequireSignIn={requireSignIn}
        onSave={async () => {
          if (savingRef.current) return;
          if (!wrapRef.current || saveState !== 'saved') {
            if (!(await save(true))) return;
          }
          const saved = wrapRef.current;
          return saved ? { id: saved.id, version: saved.version } : undefined;
        }}
      />
      <CreditPaywall
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        cost={10}
        vehicleSlug={slug}
      />
      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        returnTo={returnTo}
      />
    </main>
  );
}
