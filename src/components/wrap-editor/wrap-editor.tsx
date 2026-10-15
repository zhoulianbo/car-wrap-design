import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Popover } from '@base-ui/react/popover';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type Konva from 'konva';
import {
  ArrowDown,
  ArrowUp,
  Brush,
  Circle,
  Diamond,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  FolderOpen,
  Gem,
  GripVertical,
  Hand,
  Hexagon,
  ImagePlus,
  Layers3,
  Magnet,
  Minus,
  MousePointer2,
  MoveRight,
  Palette,
  PenTool,
  Plus,
  Redo2,
  RotateCw,
  Sparkles,
  Square,
  Trash2,
  Type,
  Undo2,
  WandSparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  Arrow as KonvaArrow,
  Circle as KonvaCircle,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  RegularPolygon,
  Stage,
  Text,
  Transformer,
} from 'react-konva';
import { toast } from 'sonner';

import { ApiError, apiGet, apiGetBlob } from '@/lib/api-client';
import { resolveErrorCode } from '@/lib/error-codes';
import { sanitizeImageFile } from '@/lib/image-file';
import { cn } from '@/lib/utils';
import type { VehicleSlug } from '@/lib/vehicle-catalog';
import {
  applyWrapPanelAlpha,
  editorToolCursor,
  fitCanvasView,
  MAX_CANVAS_SCALE,
  MIN_CANVAS_SCALE,
  rotateAroundCenter,
  wrapPanelMask,
  zoomCanvasView,
  type CanvasView,
} from '@/lib/wrap-editor-geometry';
import { requestWrapGeneration } from '@/lib/wrap-generation-client';
import { aiWrapName } from '@/lib/wrap-naming';
import { useGalleryPreference } from '@/hooks/use-gallery-preference';
import { StyledSelect } from '@/components/styled-select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  WrapColorPreference,
  WrapGalleryPreference,
  WrapPromptInput,
  type PromptPreset,
} from '@/components/wrap-generation-controls';

type ShapeKind =
  | 'rect'
  | 'circle'
  | 'diamond'
  | 'polygon'
  | 'line'
  | 'arrow'
  | 'path';

export type EditorNode = {
  id: string;
  kind: 'text' | 'image' | ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  points?: number[];
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  imageUrl?: string;
  name: string;
  eraser?: boolean;
  lineCap?: 'round' | 'square';
  erasures?: { points: number[]; size: number; shape: 'round' | 'square' }[];
};

export type WrapDocument = {
  version: 1;
  width: 1024;
  height: 1024;
  background: string;
  paintColor?: string;
  panelColors?: Record<string, string>;
  generatedName?: string;
  nodes: EditorNode[];
};

export type WrapEditorHandle = {
  downloadTexture: () => boolean;
  getTexture: () => HTMLCanvasElement | null;
};

export type UploadedAsset = { id: string; url: string; byteSize: number };
type GenerationResult = {
  id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  outputUrl?: string;
  errorSummary?: string | null;
  errorCode?: string | null;
};

export type WrapEditorLabels = {
  upload: string;
  addText: string;
  addShape: string;
  undo: string;
  redo: string;
  layers: string;
  opacity: string;
  flip: string;
  delete: string;
  selectHint: string;
  export: string;
  exportTitle: string;
  exportLocked: string;
  exportLockedTitle: string;
  imageFailed: string;
  defaultLayer: string;
  textLayer: string;
  shapeLayer: string;
  defaultText: string;
};

export type WrapEditorUiLabels = {
  select: string;
  move: string;
  text: string;
  brush: string;
  eraser: string;
  shape: string;
  rectangle: string;
  circle: string;
  arrow: string;
  line: string;
  diamond: string;
  polygon: string;
  pen: string;
  snap: string;
  rotate: string;
  color: string;
  material: string;
  back: string;
  forward: string;
  assets: string;
  ai: string;
  uploadLocal: string;
  uploading: string;
  freeStorage: string;
  paidStorage: string;
  storage: string;
  storageFull: string;
  addToCanvas: string;
  useReference: string;
  removeReference: string;
  flipHorizontal: string;
  flipVertical: string;
  resizePreview: string;
  canvasZoom: string;
  zoomIn: string;
  zoomOut: string;
  fitCanvas: string;
  aiReference: string;
  promptPlaceholder: string;
  ideas: string;
  customColor: string;
  referenceTypes: string;
  unlockGallery: string;
  panelColor: string;
  wrapColor: string;
  clearPanelColor: string;
  lineWidth: string;
  colorPreference: string;
  openGallery: string;
  generating: string;
  generateCost: (cost: number) => string;
  currentCredits: (credits: number) => string;
  emptyLayers: string;
  layerUp: string;
  layerDown: string;
  layerDrag: string;
  layerDragHint: string;
  rotate15: string;
  promptRequired: string;
  generationComplete: string;
  generationFailed: string;
  generationSlow: string;
  refundFailed: string;
  aiLayer: string;
  brushLayer: string;
  penLayer: string;
  eraserLayer: string;
  uploadedLayer: string;
  paywallTitle: string;
  paywallDescription: (cost: number) => string;
  paywallCta: string;
  font: string;
  fontSize: string;
  brushSize: string;
  brushOpacity: string;
  eraserSize: string;
  eraserShape: string;
  eraserRound: string;
  eraserSquare: string;
  materialGloss: string;
  materialSatin: string;
  materialMatte: string;
  materialMetallic: string;
  materialPearlescent: string;
};

const DEFAULT_LABELS: WrapEditorLabels = {
  upload: 'Upload image',
  addText: 'Add text',
  addShape: 'Add shape',
  undo: 'Undo',
  redo: 'Redo',
  layers: 'Layers',
  opacity: 'Opacity',
  flip: 'Flip',
  delete: 'Delete',
  selectHint: 'Select a layer to edit it.',
  export: 'Export texture',
  exportTitle: 'Export clean PNG texture',
  exportLocked: 'Texture export is locked',
  exportLockedTitle: 'Export unlocks after compatibility review',
  imageFailed: 'Image import failed',
  defaultLayer: 'Emerald stripe',
  textLayer: 'Headline',
  shapeLayer: 'Shape',
  defaultText: 'YOUR WRAP',
};

const DEFAULT_UI_LABELS: WrapEditorUiLabels = {
  canvasZoom: 'Canvas zoom',
  zoomIn: 'Zoom in on canvas',
  zoomOut: 'Zoom out of canvas',
  fitCanvas: 'Fit canvas to window',
  select: 'Select',
  move: 'Move',
  text: 'Text',
  brush: 'Brush',
  eraser: 'Eraser',
  shape: 'Shape',
  rectangle: 'Rectangle',
  circle: 'Circle',
  arrow: 'Arrow',
  line: 'Line',
  diamond: 'Diamond',
  polygon: 'Polygon',
  pen: 'Pen',
  snap: 'Snap',
  rotate: 'Rotate',
  color: 'Color',
  material: 'Material',
  back: 'Back',
  forward: 'Forward',
  assets: 'Assets',
  ai: 'AI',
  uploadLocal: 'Upload local asset',
  uploading: 'Uploading…',
  freeStorage: 'Free asset storage limit: 5 MB. Upgrade for 50 MB.',
  paidStorage: 'Paid asset storage limit: 50 MB.',
  storage: 'Storage',
  storageFull: 'Storage limit reached. Delete an asset or upgrade your plan.',
  addToCanvas: 'Add to canvas',
  useReference: 'Use as AI reference',
  removeReference: 'Remove reference',
  flipHorizontal: 'Flip horizontally',
  flipVertical: 'Flip vertically',
  resizePreview: 'Resize 3D preview',
  aiReference: 'Add reference image (optional)',
  promptPlaceholder: 'Describe the wrap style you want',
  ideas: 'Ideas',
  customColor: 'Custom color',
  referenceTypes: 'PNG / JPG / WebP · Max 5 MB',
  unlockGallery: 'Buy credits to keep generations private',
  panelColor: 'Panel color',
  wrapColor: 'Whole wrap color',
  clearPanelColor: 'Reset panel color',
  lineWidth: 'Line width',
  colorPreference: 'Color preference (select any or none)',
  openGallery: 'Open to gallery',
  generating: 'Generating…',
  generateCost: (cost) => `Generate · ${cost} credits`,
  currentCredits: (credits) => `Current credits: ${credits}`,
  emptyLayers: 'No elements on the canvas yet',
  layerUp: 'Move up',
  layerDown: 'Move down',
  layerDrag: 'Drag to reorder',
  layerDragHint:
    'Press Space to pick up a layer, use arrow keys to move, Space to drop, or Escape to cancel.',
  rotate15: 'Rotate 15°',
  promptRequired: 'Describe the wrap style first',
  generationComplete: 'Generation complete and added to the canvas',
  generationFailed: 'AI generation failed',
  generationSlow: 'AI generation is taking longer than expected.',
  refundFailed: 'AI generation failed. Credits will be refunded automatically.',
  aiLayer: 'AI generated wrap',
  brushLayer: 'Brush',
  penLayer: 'Pen',
  eraserLayer: 'Eraser',
  uploadedLayer: 'Uploaded asset',
  paywallTitle: 'Not enough credits',
  paywallDescription: (cost) =>
    `This AI generation needs ${cost} credits. Buy credits to continue and unlock more asset storage.`,
  paywallCta: 'View credit packs',
  font: 'Font',
  fontSize: 'Size',
  brushSize: 'Brush size',
  brushOpacity: 'Brush opacity',
  eraserSize: 'Eraser size',
  eraserShape: 'Eraser shape',
  eraserRound: 'Round',
  eraserSquare: 'Square',
  materialGloss: 'Gloss',
  materialSatin: 'Satin',
  materialMatte: 'Matte',
  materialMetallic: 'Metallic',
  materialPearlescent: 'Pearlescent',
};

export const INITIAL_DOCUMENT: WrapDocument = {
  version: 1,
  width: 1024,
  height: 1024,
  background: 'transparent',
  nodes: [],
};

const AI_COST = 10;

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function snap(value: number, enabled: boolean) {
  if (!enabled) return value;
  const templateAnchors = [0, 128, 256, 512, 768, 896, 1024];
  const closest = templateAnchors.reduce((best, anchor) =>
    Math.abs(anchor - value) < Math.abs(best - value) ? anchor : best
  );
  return Math.abs(closest - value) <= 18 ? closest : Math.round(value / 8) * 8;
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-9 shrink-0 items-center justify-center rounded-lg transition focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-30',
          active &&
            'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary'
        )}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function SortableLayer({
  id,
  name,
  selected,
  label,
  children,
}: {
  id: string;
  name: string;
  selected: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scaleX}, ${transform.scaleY})`
          : undefined,
        transition,
      }}
      className={cn(
        'relative flex items-center gap-1 rounded-lg border p-1',
        selected
          ? 'border-primary/50 bg-primary/10'
          : 'border-border bg-muted/30',
        isDragging && 'bg-popover z-10 shadow-lg'
      )}
    >
      <Tooltip>
        <TooltipTrigger
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`${label}: ${name}`}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-10 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md focus-visible:ring-2 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      {children}
    </div>
  );
}

function LoadedImage({
  node,
  sourceUrl,
  selected,
  draggable,
  snapEnabled,
  onSelect,
  onChange,
  onLoad,
  errorLabel,
}: {
  node: EditorNode;
  sourceUrl?: string;
  selected: boolean;
  draggable: boolean;
  snapEnabled: boolean;
  onSelect: () => void;
  onChange: (next: EditorNode) => void;
  onLoad: () => void;
  errorLabel: string;
}) {
  const [image, setImage] = useState<HTMLImageElement>();
  const shapeRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const renderedImage = useMemo(() => {
    if (!image || !node.erasures?.length) return image;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(node.width);
    canvas.height = Math.ceil(node.height);
    const context = canvas.getContext('2d');
    if (!context) return image;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'destination-out';
    for (const stroke of node.erasures) {
      context.lineWidth = stroke.size;
      context.lineCap = stroke.shape;
      context.lineJoin = 'round';
      context.beginPath();
      context.moveTo(stroke.points[0], stroke.points[1]);
      for (let i = 2; i < stroke.points.length; i += 2)
        context.lineTo(stroke.points[i], stroke.points[i + 1]);
      context.stroke();
    }
    return canvas;
  }, [image, node.erasures, node.width, node.height]);

  // Fetch binary API responses before decoding: the dev server treats direct
  // <img> requests as static assets and does not dispatch them to API routes.
  const imageUrl = sourceUrl ?? node.imageUrl;
  const isApiImage = Boolean(imageUrl?.startsWith('/api/'));
  const imageQuery = useQuery({
    queryKey: ['wrap-image', imageUrl],
    queryFn: () => apiGetBlob(imageUrl!),
    enabled: isApiImage,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (imageQuery.isError) toast.error(errorLabel);
  }, [imageQuery.isError, errorLabel]);

  useEffect(() => {
    if (!imageUrl || (isApiImage && !imageQuery.data)) return;
    const next = new Image();
    next.crossOrigin = 'anonymous';
    let cancelled = false;
    const blobUrl =
      isApiImage && imageQuery.data
        ? URL.createObjectURL(imageQuery.data)
        : undefined;
    next.src = blobUrl ?? imageUrl;
    void next
      .decode()
      .then(() => {
        if (!cancelled) setImage(next);
      })
      .catch(() => {
        if (!cancelled) toast.error(errorLabel);
      });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [imageUrl, errorLabel, imageQuery.data, isApiImage]);

  useEffect(() => {
    if (!image) return;
    const frame = requestAnimationFrame(onLoad);
    return () => cancelAnimationFrame(frame);
  }, [image, onLoad]);

  useEffect(() => {
    if (!selected || !shapeRef.current || !transformerRef.current) return;
    transformerRef.current.nodes([shapeRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selected]);

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={renderedImage}
        {...node}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(event) =>
          onChange({
            ...node,
            x: snap(event.target.x(), snapEnabled),
            y: snap(event.target.y(), snapEnabled),
          })
        }
        onTransformEnd={() => {
          const shape = shapeRef.current;
          if (!shape) return;
          const scaleX = shape.scaleX();
          const scaleY = shape.scaleY();
          onChange({
            ...node,
            x: snap(shape.x(), snapEnabled),
            y: snap(shape.y(), snapEnabled),
            rotation: shape.rotation(),
            scaleX,
            scaleY,
          });
        }}
      />
      {selected ? <Transformer ref={transformerRef} flipEnabled /> : null}
    </>
  );
}

function EditableNode({
  node,
  selected,
  draggable,
  snapEnabled,
  onSelect,
  onChange,
}: {
  node: EditorNode;
  selected: boolean;
  draggable: boolean;
  snapEnabled: boolean;
  onSelect: () => void;
  onChange: (next: EditorNode) => void;
}) {
  const shapeRef = useRef<Konva.Shape>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (!selected || !shapeRef.current || !transformerRef.current) return;
    transformerRef.current.nodes([shapeRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selected]);

  const shared = {
    ref: shapeRef,
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation,
    opacity: node.opacity,
    scaleX: node.scaleX,
    scaleY: node.scaleY,
    draggable,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) =>
      onChange({
        ...node,
        x: snap(event.target.x(), snapEnabled),
        y: snap(event.target.y(), snapEnabled),
      }),
    onTransformEnd: () => {
      const shape = shapeRef.current;
      if (!shape) return;
      onChange({
        ...node,
        x: snap(shape.x(), snapEnabled),
        y: snap(shape.y(), snapEnabled),
        rotation: shape.rotation(),
        scaleX: shape.scaleX(),
        scaleY: shape.scaleY(),
      });
    },
  };

  let shape: React.ReactNode;
  if (node.kind === 'text') {
    shape = (
      <Text
        {...shared}
        ref={shapeRef as RefObject<Konva.Text>}
        text={node.text}
        fill={node.fill}
        fontFamily={node.fontFamily ?? 'Space Grotesk'}
        fontStyle="bold"
        fontSize={node.fontSize ?? 72}
        align="center"
        verticalAlign="middle"
      />
    );
  } else if (node.kind === 'circle') {
    shape = (
      <KonvaCircle
        {...shared}
        ref={shapeRef as RefObject<Konva.Circle>}
        radius={Math.min(node.width, node.height) / 2}
        fill={node.fill}
      />
    );
  } else if (node.kind === 'diamond' || node.kind === 'polygon') {
    shape = (
      <RegularPolygon
        {...shared}
        ref={shapeRef as RefObject<Konva.RegularPolygon>}
        sides={node.kind === 'polygon' ? 6 : 4}
        radius={Math.min(node.width, node.height) / 2}
        fill={node.fill}
      />
    );
  } else if (node.kind === 'line' || node.kind === 'path') {
    shape = (
      <Line
        {...shared}
        ref={shapeRef as RefObject<Konva.Line>}
        points={node.points ?? [0, 0, node.width, node.height]}
        stroke={node.stroke ?? node.fill}
        strokeWidth={node.strokeWidth ?? 10}
        lineCap={node.lineCap ?? 'round'}
        lineJoin="round"
        tension={node.kind === 'path' ? 0.35 : 0}
        globalCompositeOperation={
          node.eraser ? 'destination-out' : 'source-over'
        }
      />
    );
  } else if (node.kind === 'arrow') {
    shape = (
      <KonvaArrow
        {...shared}
        ref={shapeRef as RefObject<Konva.Arrow>}
        points={node.points ?? [0, 0, node.width, node.height]}
        stroke={node.stroke ?? node.fill}
        fill={node.fill}
        strokeWidth={node.strokeWidth ?? 14}
        pointerLength={32}
        pointerWidth={28}
      />
    );
  } else {
    shape = (
      <Rect
        {...shared}
        ref={shapeRef as RefObject<Konva.Rect>}
        fill={node.fill}
        cornerRadius={8}
      />
    );
  }

  return (
    <>
      {shape}
      {selected && !node.eraser ? (
        <Transformer ref={transformerRef} flipEnabled rotateEnabled />
      ) : null}
    </>
  );
}

type WrapEditorProps = {
  document?: WrapDocument;
  onDocumentChange?: (document: WrapDocument) => void;
  onPreview?: (canvas: HTMLCanvasElement) => void;
  onMaterialChange?: (material: string) => void;
  uploadedAssets?: UploadedAsset[];
  storageLimit?: number;
  onDeleteAsset?: (id: string) => Promise<void>;
  active?: boolean;
  material?: string;
  paintColor?: string;
  onUploadAsset?: (
    file: File,
    kind: 'storage' | 'ai-input'
  ) => Promise<UploadedAsset>;
  onCreditsChange?: () => void;
  onGenerationComplete?: (id: string) => void;
  onRequireSignIn?: () => boolean;
  onInsufficientCredits: () => void;
  templatePath?: string;
  vehicleSlug: VehicleSlug;
  credits: number;
  isPaid: boolean;
  userId?: string;
  promptPresets?: PromptPreset[];
  exportEnabled?: boolean;
  labels?: WrapEditorLabels;
  uiLabels?: WrapEditorUiLabels;
  previewSlot?: React.ReactNode;
  className?: string;
};

export const WrapEditor = forwardRef<WrapEditorHandle, WrapEditorProps>(
  function WrapEditor(
    {
      document = INITIAL_DOCUMENT,
      onDocumentChange,
      onPreview,
      onMaterialChange,
      uploadedAssets,
      storageLimit,
      onDeleteAsset,
      active = true,
      material = 'gloss',
      paintColor = '#f4f5f6',
      onUploadAsset,
      onCreditsChange,
      onGenerationComplete,
      onRequireSignIn,
      onInsufficientCredits,
      templatePath,
      vehicleSlug,
      credits,
      isPaid,
      userId,
      promptPresets = [],
      exportEnabled = false,
      labels = DEFAULT_LABELS,
      uiLabels = DEFAULT_UI_LABELS,
      previewSlot,
      className,
    },
    ref
  ) {
    const stageRef = useRef<Konva.Stage>(null);
    const queryClient = useQueryClient();
    const layerSensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );
    const guideLayerRef = useRef<Konva.Layer>(null);
    const panelHighlightRef = useRef<Konva.Layer>(null);
    const [selectedPanel, setSelectedPanel] = useState<number>();
    const canvasAreaRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const aiFileRef = useRef<HTMLInputElement>(null);
    const [history, setHistory] = useState<WrapDocument[]>([document]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [selectedId, setSelectedId] = useState<string>();
    const [viewport, setViewport] = useState({ width: 640, height: 640 });
    const viewportRef = useRef(viewport);
    const [canvasView, setCanvasView] = useState(() => fitCanvasView(640, 640));
    const canvasViewRef = useRef(canvasView);
    const autoFitRef = useRef(true);
    const updateCanvasView = useCallback((next: CanvasView) => {
      canvasViewRef.current = next;
      setCanvasView(next);
    }, []);
    const zoomCanvas = useCallback(
      (factor: number, anchor?: { x: number; y: number }) => {
        autoFitRef.current = false;
        const { width, height } = viewportRef.current;
        updateCanvasView(
          zoomCanvasView(
            canvasViewRef.current,
            factor,
            anchor ?? { x: width / 2, y: height / 2 }
          )
        );
      },
      [updateCanvasView]
    );
    const resetCanvasView = () => {
      autoFitRef.current = true;
      const { width, height } = viewportRef.current;
      updateCanvasView(fitCanvasView(width, height));
    };
    const [previewSize, setPreviewSize] = useState<{
      width: number;
      height: number;
    }>();
    const previewBoxRef = useRef<HTMLDivElement>(null);
    const shapeStartRef = useRef<{ x: number; y: number } | undefined>(
      undefined
    );
    const [shapeKind, setShapeKind] = useState<
      Exclude<ShapeKind, 'path'> | 'pen'
    >('rect');
    const [draftShape, setDraftShape] = useState<EditorNode>();
    const [templateImage, setTemplateImage] = useState<HTMLImageElement>();
    const [activeTool, setActiveTool] = useState('select');
    const [activePanel, setActivePanel] = useState<
      'assets' | 'ai' | 'layers' | null
    >(null);
    const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
    const [materialMenuOpen, setMaterialMenuOpen] = useState(false);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [color, setColor] = useState('#ff3b45');
    const [materialIndex, setMaterialIndex] = useState(0);
    const [brushSize, setBrushSize] = useState(20);
    const [brushOpacity, setBrushOpacity] = useState(1);
    const [eraserSize, setEraserSize] = useState(52);
    const [eraserShape, setEraserShape] = useState<'round' | 'square'>('round');
    const [assets, setAssets] = useState<UploadedAsset[]>([]);
    useEffect(() => {
      if (uploadedAssets) setAssets(uploadedAssets);
    }, [uploadedAssets]);
    useEffect(() => {
      setMaterialIndex(
        Math.max(
          0,
          ['gloss', 'satin', 'matte', 'metallic', 'pearlescent'].indexOf(
            material
          )
        )
      );
    }, [material]);
    const [uploading, setUploading] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [aiFile, setAiFile] = useState<File>();
    const [aiAsset, setAiAsset] = useState<UploadedAsset>();
    const [deletingAsset, setDeletingAsset] = useState<string>();
    const [preferredColors, setPreferredColors] = useState<string[]>([]);
    const [generating, setGenerating] = useState(false);
    const generatingRef = useRef(false);
    const mountedRef = useRef(true);
    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);
    const [openToGallery, setOpenToGallery] = useGalleryPreference(
      userId,
      isPaid
    );
    const [draftLine, setDraftLine] = useState<EditorNode>();
    const drawingRef = useRef(false);
    const canvasDragRef = useRef<
      | {
          pointerX: number;
          pointerY: number;
          originX: number;
          originY: number;
        }
      | undefined
    >(undefined);
    const current = history[historyIndex];
    const canvasScale = canvasView.scale;
    const canvasOrigin = canvasView;
    const limitBytes = storageLimit ?? (isPaid ? 50 : 5) * 1024 * 1024;
    const usedBytes = assets.reduce((sum, asset) => sum + asset.byteSize, 0);
    const ShapeIcon = {
      rect: Square,
      circle: Circle,
      diamond: Diamond,
      polygon: Hexagon,
      line: Minus,
      arrow: MoveRight,
      pen: PenTool,
    }[shapeKind];
    const selected = useMemo(
      () => current.nodes.find((node) => node.id === selectedId),
      [current.nodes, selectedId]
    );
    const panelMap = useMemo(() => {
      if (!templateImage) return null;
      const canvas = window.document.createElement('canvas');
      canvas.width = canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(templateImage, 0, 0, 1024, 1024);
      return wrapPanelMask(ctx.getImageData(0, 0, 1024, 1024).data, 1024, 1024);
    }, [templateImage]);
    const panelCanvas = useMemo(() => {
      if (!panelMap) return undefined;
      const canvas = window.document.createElement('canvas');
      canvas.width = canvas.height = 1024;
      const ctx = canvas.getContext('2d')!;
      const image = ctx.createImageData(1024, 1024);
      for (const [index, pixels] of panelMap.panels.entries()) {
        const color = current.panelColors?.[index + 1] ?? current.paintColor;
        if (!color) continue;
        if (!/^#[0-9a-f]{6}$/i.test(color)) continue;
        const rgb = [1, 3, 5].map((offset) =>
          parseInt(color.slice(offset, offset + 2), 16)
        );
        for (const pixel of pixels) image.data.set([...rgb, 255], pixel * 4);
      }
      ctx.putImageData(image, 0, 0);
      return canvas;
    }, [panelMap, current.panelColors, current.paintColor]);
    const panelHighlight = useMemo(() => {
      if (!panelMap || !selectedPanel || activeTool !== 'select' || selectedId)
        return undefined;
      const canvas = window.document.createElement('canvas');
      canvas.width = canvas.height = 1024;
      const ctx = canvas.getContext('2d')!;
      const image = ctx.createImageData(1024, 1024);
      for (const pixel of panelMap.panels[selectedPanel - 1] ?? []) {
        const boundary = [
          pixel - 1,
          pixel + 1,
          pixel - 1024,
          pixel + 1024,
        ].some((i) => panelMap.labels[i] !== selectedPanel);
        image.data.set([50, 104, 255, boundary ? 255 : 20], pixel * 4);
      }
      ctx.putImageData(image, 0, 0);
      return canvas;
    }, [panelMap, selectedPanel, activeTool, selectedId]);
    const imageEraseStroke = (line: EditorNode, node: EditorNode) => {
      const radians = (-node.rotation * Math.PI) / 180;
      const points: number[] = [];
      for (let i = 0; i < (line.points?.length ?? 0); i += 2) {
        const dx = line.points![i] - node.x;
        const dy = line.points![i + 1] - node.y;
        points.push(
          (dx * Math.cos(radians) - dy * Math.sin(radians)) / node.scaleX,
          (dx * Math.sin(radians) + dy * Math.cos(radians)) / node.scaleY
        );
      }
      return {
        points,
        size:
          (line.strokeWidth ?? eraserSize) /
          Math.max(0.01, (Math.abs(node.scaleX) + Math.abs(node.scaleY)) / 2),
        shape: line.lineCap ?? 'round',
      };
    };

    useEffect(() => {
      if (!templatePath) return;
      const image = new Image();
      let cancelled = false;
      setTemplateImage(undefined);
      setSelectedPanel(undefined);
      image.onload = () => {
        if (!cancelled) setTemplateImage(image);
      };
      image.src = templatePath;
      return () => {
        cancelled = true;
      };
    }, [templatePath]);

    const renderCleanCanvas = useCallback(
      (forExport = false) => {
        const stage = stageRef.current;
        if (!stage || (forExport && !panelMap?.panels.length)) return null;
        const view = {
          x: stage.x(),
          y: stage.y(),
          scaleX: stage.scaleX(),
          scaleY: stage.scaleY(),
        };
        guideLayerRef.current?.hide();
        panelHighlightRef.current?.hide();
        stage.find('Transformer').forEach((node) => node.hide());
        let canvas: HTMLCanvasElement;
        try {
          // Export in document coordinates, independent of viewport zoom/pan.
          stage.position({ x: 0, y: 0 });
          stage.scale({ x: 1, y: 1 });
          canvas = stage.toCanvas({
            x: 0,
            y: 0,
            width: 1024,
            height: 1024,
            pixelRatio: 1,
          });
        } finally {
          stage.setAttrs(view);
          guideLayerRef.current?.show();
          panelHighlightRef.current?.show();
          stage.find('Transformer').forEach((node) => node.show());
          stage.draw();
        }
        // Keep paint beneath artwork for 3D; exports retain only printable panels.
        const output = window.document.createElement('canvas');
        output.width = canvas.width;
        output.height = canvas.height;
        const context = output.getContext('2d');
        if (!context) return null;
        context.fillStyle = paintColor;
        context.fillRect(0, 0, output.width, output.height);
        context.drawImage(canvas, 0, 0);
        if (forExport && panelMap) {
          const image = context.getImageData(0, 0, output.width, output.height);
          applyWrapPanelAlpha(image.data, panelMap.coverage);
          context.putImageData(image, 0, 0);
        }
        return output;
      },
      [paintColor, panelMap]
    );

    const refreshPreview = useCallback(() => {
      const stage = stageRef.current;
      if (!stage) return;
      const canvas = renderCleanCanvas();
      if (canvas) onPreview?.(canvas);
    }, [onPreview, renderCleanCanvas]);

    useEffect(() => {
      const area = canvasAreaRef.current;
      if (!area) return;
      const observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (!width || !height) return;
        const previous = viewportRef.current;
        viewportRef.current = { width, height };
        setViewport({ width, height });
        updateCanvasView(
          autoFitRef.current
            ? fitCanvasView(width, height)
            : {
                ...canvasViewRef.current,
                x: canvasViewRef.current.x + (width - previous.width) / 2,
                y: canvasViewRef.current.y + (height - previous.height) / 2,
              }
        );
      });
      observer.observe(area);
      return () => observer.disconnect();
    }, [updateCanvasView]);

    useEffect(() => {
      const area = canvasAreaRef.current;
      if (!area || !active) return;
      let gestureScale: number | undefined;
      const anchor = (event: { clientX?: number; clientY?: number }) => {
        const rect = area.getBoundingClientRect();
        return {
          x:
            event.clientX === undefined
              ? rect.width / 2
              : event.clientX - rect.left,
          y:
            event.clientY === undefined
              ? rect.height / 2
              : event.clientY - rect.top,
        };
      };
      const wheel = (event: WheelEvent) => {
        event.preventDefault();
        if (
          drawingRef.current ||
          canvasDragRef.current ||
          gestureScale !== undefined
        )
          return;
        const unit =
          event.deltaMode === 1
            ? 16
            : event.deltaMode === 2
              ? area.clientHeight
              : 1;
        if (event.ctrlKey || event.metaKey) {
          // Chromium/Firefox expose Mac trackpad pinch as Ctrl + wheel.
          zoomCanvas(Math.exp(-event.deltaY * unit * 0.01), anchor(event));
        } else {
          autoFitRef.current = false;
          const view = canvasViewRef.current;
          updateCanvasView({
            ...view,
            x:
              view.x -
              (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) *
                unit,
            y:
              view.y -
              (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * unit,
          });
        }
      };
      // Safari exposes trackpad pinch via its native gesture events.
      type PinchEvent = Event & {
        scale: number;
        clientX?: number;
        clientY?: number;
      };
      const gestureStart = (event: Event) => {
        event.preventDefault();
        gestureScale = (event as PinchEvent).scale || 1;
      };
      const gestureChange = (event: Event) => {
        event.preventDefault();
        const pinch = event as PinchEvent;
        if (
          gestureScale === undefined ||
          !Number.isFinite(pinch.scale) ||
          pinch.scale <= 0
        )
          return;
        if (!drawingRef.current && !canvasDragRef.current)
          zoomCanvas(pinch.scale / gestureScale, anchor(pinch));
        gestureScale = pinch.scale;
      };
      const gestureEnd = (event: Event) => {
        event.preventDefault();
        gestureScale = undefined;
      };
      area.addEventListener('wheel', wheel, { passive: false });
      area.addEventListener('gesturestart', gestureStart, { passive: false });
      area.addEventListener('gesturechange', gestureChange, { passive: false });
      area.addEventListener('gestureend', gestureEnd, { passive: false });
      return () => {
        area.removeEventListener('wheel', wheel);
        area.removeEventListener('gesturestart', gestureStart);
        area.removeEventListener('gesturechange', gestureChange);
        area.removeEventListener('gestureend', gestureEnd);
      };
    }, [active, updateCanvasView, zoomCanvas]);

    useEffect(() => {
      const frame = requestAnimationFrame(refreshPreview);
      return () => cancelAnimationFrame(frame);
    }, [historyIndex, refreshPreview]);

    const commit = useCallback(
      (next: WrapDocument) => {
        const nextHistory = [...history.slice(0, historyIndex + 1), next].slice(
          -60
        );
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
        onDocumentChange?.(next);
        requestAnimationFrame(refreshPreview);
      },
      [history, historyIndex, onDocumentChange, refreshPreview]
    );

    const jumpHistory = useCallback(
      (index: number) => {
        const nextIndex = Math.max(0, Math.min(history.length - 1, index));
        if (nextIndex === historyIndex) return;
        setHistoryIndex(nextIndex);
        onDocumentChange?.(history[nextIndex]);
        requestAnimationFrame(refreshPreview);
      },
      [history, historyIndex, onDocumentChange, refreshPreview]
    );

    const updateNode = (nextNode: EditorNode) =>
      commit({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === nextNode.id ? nextNode : node
        ),
      });

    const rotateSelected = () => {
      if (!selected) return;
      const shape = stageRef.current?.findOne(`#${selected.id}`);
      if (!shape) return;
      const bounds = shape.getClientRect({
        skipTransform: true,
        skipShadow: true,
      });
      updateNode(
        rotateAroundCenter(
          selected,
          { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
          15
        )
      );
    };

    const removeSelected = useCallback(() => {
      if (!selectedId) return;
      commit({
        ...current,
        nodes: current.nodes.filter((node) => node.id !== selectedId),
      });
      setSelectedId(undefined);
    }, [commit, current, selectedId]);

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (!active || event.defaultPrevented || event.isComposing) return;
        if (event.key === 'Escape') {
          setActiveTool('select');
          setSelectedId(undefined);
          setShapeMenuOpen(false);
          setMaterialMenuOpen(false);
          drawingRef.current = false;
          shapeStartRef.current = undefined;
          setDraftLine(undefined);
          setDraftShape(undefined);
        }
        const target = event.target as HTMLElement | null;
        if (
          target?.isContentEditable ||
          target?.closest(
            'input, textarea, select, [role="textbox"], [role="dialog"]'
          )
        )
          return;
        const key = event.key.toLowerCase();
        if ((event.ctrlKey || event.metaKey) && !event.altKey) {
          if (key === 'z' || key === 'y') {
            event.preventDefault();
            const redo = key === 'y' || event.shiftKey;
            jumpHistory(historyIndex + (redo ? 1 : -1));
            return;
          }
        }
        if (
          (event.key === 'Delete' || event.key === 'Backspace') &&
          selectedId
        ) {
          event.preventDefault();
          removeSelected();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [active, historyIndex, jumpHistory, removeSelected, selectedId]);

    const addShape = (kind: Exclude<ShapeKind, 'path'>) => {
      setShapeKind(kind);
      setSelectedId(undefined);
      setActiveTool('shape');
      setShapeMenuOpen(false);
    };

    const addText = (point: { x: number; y: number }) => {
      const id = makeId('text');
      commit({
        ...current,
        nodes: [
          ...current.nodes,
          {
            id,
            kind: 'text',
            name: labels.textLayer,
            text: labels.defaultText,
            fill: color,
            fontFamily: 'Space Grotesk',
            fontSize: 72,
            x: point.x,
            y: point.y,
            width: 500,
            height: 120,
            rotation: 0,
            opacity: 1,
            scaleX: 1,
            scaleY: 1,
          },
        ],
      });
      setSelectedId(id);
      setActiveTool('select');
    };

    const latestDocument = useRef(current);
    latestDocument.current = current;
    const latestCommit = useRef(commit);
    latestCommit.current = commit;
    const addImageUrl = useCallback(
      async (url: string, name: string, generatedName?: string) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        let blobUrl: string | undefined;
        try {
          if (url.startsWith('/api/')) {
            const blob = await queryClient.fetchQuery({
              queryKey: ['wrap-image', url],
              queryFn: () => apiGetBlob(url),
              staleTime: 60_000,
            });
            blobUrl = URL.createObjectURL(blob);
          }
          image.src = blobUrl ?? url;
          await image.decode();
          const ratio =
            image.width === 1024 && image.height === 1024
              ? 1
              : Math.min(1024 / image.width, 1024 / image.height, 1);
          const id = makeId('image');
          latestCommit.current({
            ...latestDocument.current,
            ...(generatedName ? { generatedName } : {}),
            nodes: [
              ...latestDocument.current.nodes,
              {
                id,
                kind: 'image',
                name,
                imageUrl: url,
                x: 512 - (image.width * ratio) / 2,
                y: 512 - (image.height * ratio) / 2,
                width: image.width * ratio,
                height: image.height * ratio,
                rotation: 0,
                opacity: 1,
                scaleX: 1,
                scaleY: 1,
              },
            ],
          });
          setSelectedId(id);
          setActiveTool('select');
        } catch {
          toast.error(labels.imageFailed);
        } finally {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
        }
      },
      [queryClient, labels.imageFailed]
    );

    const handleAssetUpload = async (file: File) => {
      if (!onUploadAsset || onRequireSignIn?.() === false) return;
      setUploading(true);
      try {
        const safe = await sanitizeImageFile(file, {
          maxBytes: (isPaid ? 50 : 5) * 1024 * 1024,
        });
        if (usedBytes + safe.size > limitBytes)
          throw new Error(uiLabels.storageFull);
        const asset = await onUploadAsset(safe, 'storage');
        setAssets((value) => [
          asset,
          ...value.filter((item) => item.id !== asset.id),
        ]);
        void addImageUrl(
          `/api/assets?image=${encodeURIComponent(asset.id)}`,
          file.name
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : labels.imageFailed
        );
      } finally {
        setUploading(false);
      }
    };

    const downloadTexture = useCallback(() => {
      if (!exportEnabled) {
        toast.error(labels.exportLocked);
        return false;
      }
      const stage = stageRef.current;
      if (!stage) return false;
      const canvas = renderCleanCanvas(true);
      if (!canvas) return false;
      const link = window.document.createElement('a');
      link.download = 'car-wrap-texture.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      return true;
    }, [exportEnabled, labels.exportLocked, renderCleanCanvas]);

    useImperativeHandle(
      ref,
      () => ({
        downloadTexture,
        getTexture: () => {
          const stage = stageRef.current;
          if (
            stage?.find('Image').some((node) => !(node as Konva.Image).image())
          )
            return null;
          return stage ? renderCleanCanvas(true) : null;
        },
      }),
      [downloadTexture, renderCleanCanvas]
    );

    const pollGeneration = async (id: string) => {
      while (mountedRef.current) {
        try {
          const next = await apiGet<GenerationResult>(
            `/api/ai-generations/${id}`
          );
          if (next.status === 'succeeded' || next.status === 'failed')
            return next;
        } catch {
          /* Keep waiting for this task after transient network errors. */
        }
        await new Promise((resolve) => window.setTimeout(resolve, 5000));
      }
      throw new Error(uiLabels.generationSlow);
    };

    const generate = async () => {
      if (generatingRef.current) return;
      if (onRequireSignIn?.() === false) return;
      if (credits < AI_COST) {
        onInsufficientCredits();
        return;
      }
      if (!prompt.trim()) {
        toast.error(uiLabels.promptRequired);
        return;
      }
      generatingRef.current = true;
      setGenerating(true);
      try {
        const inputAssetIds: string[] = aiAsset ? [aiAsset.id] : [];
        if (aiFile && onUploadAsset) {
          const safe = await sanitizeImageFile(aiFile, {
            maxBytes: 5 * 1024 * 1024,
          });
          if (usedBytes + safe.size > limitBytes)
            throw new Error(uiLabels.storageFull);
          const asset = await onUploadAsset(safe, 'ai-input');
          inputAssetIds.push(asset.id);
          setAiFile(undefined);
          setAiAsset(asset);
        }
        const created = await requestWrapGeneration({
          vehicleSlug,
          prompt,
          inputAssetIds,
          colors: preferredColors,
          openToGallery,
        });
        onCreditsChange?.();
        const result = await pollGeneration(created.id);
        if (result.status === 'failed' || !result.outputUrl) {
          throw new ApiError(
            -1,
            result.errorCode || result.errorSummary || 'AI_GENERATION_FAILED'
          );
        }
        onGenerationComplete?.(result.id);
        await addImageUrl(
          `/api/ai-generations/${result.id}?texture=1`,
          uiLabels.aiLayer,
          aiWrapName(prompt)
        );
        toast.success(uiLabels.generationComplete);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : uiLabels.generationFailed;
        if (resolveErrorCode(error) === 'INSUFFICIENT_CREDITS')
          onInsufficientCredits();
        else toast.error(message);
      } finally {
        generatingRef.current = false;
        setGenerating(false);
        onCreditsChange?.();
      }
    };

    const moveLayer = (id: string, direction: 1 | -1) => {
      const index = current.nodes.findIndex((node) => node.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.nodes.length) return;
      const nodes = [...current.nodes];
      [nodes[index], nodes[target]] = [nodes[target], nodes[index]];
      commit({ ...current, nodes });
    };

    const stagePoint = () => {
      const pointer = stageRef.current?.getPointerPosition();
      if (!pointer) return null;
      return {
        x: (pointer.x - canvasOrigin.x) / canvasScale,
        y: (pointer.y - canvasOrigin.y) / canvasScale,
      };
    };

    const startDrawing = () => {
      if (!['brush', 'pen', 'eraser'].includes(activeTool)) return;
      const point = stagePoint();
      if (!point) return;
      drawingRef.current = true;
      setDraftLine({
        id: makeId(activeTool),
        kind: 'path',
        name:
          activeTool === 'eraser'
            ? uiLabels.eraserLayer
            : activeTool === 'pen'
              ? uiLabels.penLayer
              : uiLabels.brushLayer,
        x: 0,
        y: 0,
        width: 1024,
        height: 1024,
        rotation: 0,
        opacity: activeTool === 'brush' ? brushOpacity : 1,
        scaleX: 1,
        scaleY: 1,
        stroke: activeTool === 'eraser' ? '#000000' : color,
        strokeWidth:
          activeTool === 'eraser'
            ? eraserSize
            : activeTool === 'pen'
              ? 8
              : brushSize,
        points: [point.x, point.y, point.x + 0.01, point.y + 0.01],
        eraser: activeTool === 'eraser',
        lineCap: activeTool === 'eraser' ? eraserShape : 'round',
      });
    };

    const continueDrawing = () => {
      if (!drawingRef.current) return;
      const point = stagePoint();
      if (!point) return;
      setDraftLine((line) =>
        line
          ? { ...line, points: [...(line.points ?? []), point.x, point.y] }
          : line
      );
    };

    const finishDrawing = () => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      if (draftLine && (draftLine.points?.length ?? 0) >= 4) {
        if (draftLine.eraser && selected?.kind === 'image') {
          updateNode({
            ...selected,
            erasures: [
              ...(selected.erasures ?? []),
              imageEraseStroke(draftLine, selected),
            ],
          });
        } else commit({ ...current, nodes: [...current.nodes, draftLine] });
      }
      setDraftLine(undefined);
    };

    const getClientPoint = (event: MouseEvent | TouchEvent) => {
      if ('touches' in event) {
        const touch = event.touches[0] ?? event.changedTouches[0];
        return touch ? { x: touch.clientX, y: touch.clientY } : null;
      }
      return { x: event.clientX, y: event.clientY };
    };

    const startCanvasInteraction = (
      event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
    ) => {
      if (activeTool === 'move') {
        const point = getClientPoint(event.evt);
        if (!point) return;
        canvasDragRef.current = {
          pointerX: point.x,
          pointerY: point.y,
          originX: canvasViewRef.current.x,
          originY: canvasViewRef.current.y,
        };
        setSelectedId(undefined);
        return;
      }
      if (event.target === event.target.getStage() && activeTool !== 'eraser')
        setSelectedId(undefined);
      const point = stagePoint();
      if (activeTool === 'select') {
        const panel =
          point &&
          point.x >= 0 &&
          point.y >= 0 &&
          point.x < 1024 &&
          point.y < 1024 &&
          event.target === event.target.getStage()
            ? panelMap?.labels[Math.floor(point.y) * 1024 + Math.floor(point.x)]
            : undefined;
        setSelectedPanel(panel && panel > 0 ? panel : undefined);
      }
      if (point && activeTool === 'text') {
        addText(point);
        return;
      }
      if (point && activeTool === 'shape') {
        shapeStartRef.current = point;
        return;
      }
      startDrawing();
    };

    const continueCanvasInteraction = (
      event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
    ) => {
      if (activeTool === 'move' && canvasDragRef.current) {
        const point = getClientPoint(event.evt);
        if (!point) return;
        autoFitRef.current = false;
        updateCanvasView({
          scale: canvasViewRef.current.scale,
          x:
            canvasDragRef.current.originX +
            point.x -
            canvasDragRef.current.pointerX,
          y:
            canvasDragRef.current.originY +
            point.y -
            canvasDragRef.current.pointerY,
        });
        return;
      }
      if (
        activeTool === 'shape' &&
        shapeStartRef.current &&
        shapeKind !== 'pen'
      ) {
        const point = stagePoint();
        if (!point) return;
        const start = shapeStartRef.current;
        const linear = shapeKind === 'line' || shapeKind === 'arrow';
        const centered = ['circle', 'diamond', 'polygon'].includes(shapeKind);
        const width = Math.abs(point.x - start.x);
        const height = Math.abs(point.y - start.y);
        setDraftShape({
          id: 'shape-draft',
          kind: shapeKind,
          name: labels.shapeLayer,
          x: linear
            ? start.x
            : centered
              ? (start.x + point.x) / 2
              : Math.min(start.x, point.x),
          y: linear
            ? start.y
            : centered
              ? (start.y + point.y) / 2
              : Math.min(start.y, point.y),
          width,
          height,
          points: linear
            ? [0, 0, point.x - start.x, point.y - start.y]
            : undefined,
          fill: color,
          stroke: color,
          strokeWidth: 8,
          rotation: 0,
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
        });
        return;
      }
      continueDrawing();
    };

    const finishCanvasInteraction = () => {
      canvasDragRef.current = undefined;
      if (shapeStartRef.current) {
        shapeStartRef.current = undefined;
        if (draftShape && Math.max(draftShape.width, draftShape.height) > 3) {
          const node = { ...draftShape, id: makeId(draftShape.kind) };
          commit({ ...current, nodes: [...current.nodes, node] });
          setSelectedId(node.id);
          setActiveTool('select');
        }
        setDraftShape(undefined);
      }
      finishDrawing();
    };

    const tools = [
      { id: 'select', label: uiLabels.select, icon: MousePointer2 },
      { id: 'move', label: uiLabels.move, icon: Hand },
      { id: 'text', label: uiLabels.text, icon: Type },
      { id: 'brush', label: uiLabels.brush, icon: Brush },
      { id: 'eraser', label: uiLabels.eraser, icon: Eraser },
    ];
    const materials = [
      { id: 'gloss', label: uiLabels.materialGloss },
      { id: 'satin', label: uiLabels.materialSatin },
      { id: 'matte', label: uiLabels.materialMatte },
      { id: 'metallic', label: uiLabels.materialMetallic },
      { id: 'pearlescent', label: uiLabels.materialPearlescent },
    ];

    return (
      <section
        className={cn(
          'text-foreground relative h-full min-h-0 overflow-hidden',
          className
        )}
        style={{
          backgroundColor: 'var(--studio-checker-low)',
          backgroundImage:
            'conic-gradient(var(--studio-checker-high) 25%, transparent 0 50%, var(--studio-checker-high) 0 75%, transparent 0)',
          backgroundPosition: '0 0,0 12px,12px -12px,-12px 0',
          backgroundSize: '24px 24px',
        }}
      >
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleAssetUpload(file);
            event.target.value = '';
          }}
        />
        <input
          ref={aiFileRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            setAiFile(event.target.files?.[0]);
            setAiAsset(undefined);
            event.target.value = '';
          }}
        />

        {previewSlot ? (
          <div
            ref={previewBoxRef}
            style={previewSize}
            className="border-border bg-card absolute top-4 left-4 z-20 hidden h-[min(40vh,340px)] max-h-[calc(100%-6rem)] w-[clamp(320px,30vw,460px)] max-w-[calc(100%-6rem)] overflow-hidden rounded-2xl border shadow-xl lg:block"
          >
            {previewSlot}
            {(['right', 'bottom', 'corner'] as const).map((edge) => (
              <div
                key={edge}
                role="separator"
                tabIndex={0}
                aria-label={uiLabels.resizePreview}
                aria-orientation={edge === 'bottom' ? 'horizontal' : 'vertical'}
                className={cn(
                  'focus-visible:bg-primary/30 absolute z-30 touch-none',
                  edge === 'right'
                    ? 'top-0 right-0 h-full w-2 cursor-ew-resize'
                    : edge === 'bottom'
                      ? 'bottom-0 left-0 h-2 w-full cursor-ns-resize'
                      : 'border-muted-foreground right-0 bottom-0 size-5 cursor-nwse-resize border-r-2 border-b-2'
                )}
                onPointerDown={(event) => {
                  const box = previewBoxRef.current;
                  if (!box) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  event.currentTarget.dataset.resize = JSON.stringify({
                    x: event.clientX,
                    y: event.clientY,
                    width: box.clientWidth,
                    height: box.clientHeight,
                  });
                }}
                onPointerMove={(event) => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId))
                    return;
                  const start = JSON.parse(event.currentTarget.dataset.resize!);
                  const parent = previewBoxRef.current?.parentElement;
                  setPreviewSize({
                    width: Math.max(
                      320,
                      Math.min(
                        (parent?.clientWidth ?? 1000) - 96,
                        start.width +
                          (edge === 'bottom' ? 0 : event.clientX - start.x)
                      )
                    ),
                    height: Math.max(
                      240,
                      Math.min(
                        (parent?.clientHeight ?? 700) - 96,
                        start.height +
                          (edge === 'right' ? 0 : event.clientY - start.y)
                      )
                    ),
                  });
                }}
                onPointerUp={(event) =>
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }
                onKeyDown={(event) => {
                  if (
                    ![
                      'ArrowLeft',
                      'ArrowRight',
                      'ArrowUp',
                      'ArrowDown',
                    ].includes(event.key)
                  )
                    return;
                  event.preventDefault();
                  const box = previewBoxRef.current;
                  if (box)
                    setPreviewSize({
                      width: Math.max(
                        320,
                        box.clientWidth +
                          (event.key === 'ArrowRight'
                            ? 20
                            : event.key === 'ArrowLeft'
                              ? -20
                              : 0)
                      ),
                      height: Math.max(
                        240,
                        box.clientHeight +
                          (event.key === 'ArrowDown'
                            ? 20
                            : event.key === 'ArrowUp'
                              ? -20
                              : 0)
                      ),
                    });
                }}
              />
            ))}
          </div>
        ) : null}

        <div
          ref={canvasAreaRef}
          className="absolute inset-0 min-h-0 touch-none overflow-hidden"
        >
          <div
            className={
              activeTool === 'move'
                ? 'cursor-grab active:cursor-grabbing'
                : undefined
            }
            style={{
              cursor: editorToolCursor(activeTool, shapeKind, eraserShape),
            }}
          >
            <Stage
              ref={stageRef}
              width={viewport.width}
              height={viewport.height}
              x={canvasOrigin.x}
              y={canvasOrigin.y}
              scaleX={canvasScale}
              scaleY={canvasScale}
              onMouseDown={startCanvasInteraction}
              onMouseMove={continueCanvasInteraction}
              onMouseUp={finishCanvasInteraction}
              onMouseLeave={finishCanvasInteraction}
              onTouchStart={startCanvasInteraction}
              onTouchMove={continueCanvasInteraction}
              onTouchEnd={finishCanvasInteraction}
            >
              <Layer ref={guideLayerRef} listening={false} opacity={0.58}>
                <Rect
                  x={0}
                  y={0}
                  width={1024}
                  height={1024}
                  stroke="#d0d8e4"
                  strokeWidth={1 / canvasScale}
                  dash={[6 / canvasScale, 5 / canvasScale]}
                />
                {templateImage ? (
                  <KonvaImage
                    image={templateImage}
                    width={1024}
                    height={1024}
                  />
                ) : null}
              </Layer>
              <Layer listening={false}>
                {panelCanvas && (
                  <KonvaImage image={panelCanvas} width={1024} height={1024} />
                )}
              </Layer>
              <Layer>
                {current.nodes.map((node) =>
                  node.kind === 'image' ? (
                    <LoadedImage
                      key={node.id}
                      sourceUrl={
                        assets.some((asset) => asset.url === node.imageUrl)
                          ? `/api/assets?image=${encodeURIComponent(assets.find((asset) => asset.url === node.imageUrl)!.id)}`
                          : undefined
                      }
                      node={
                        draftLine?.eraser && node.id === selectedId
                          ? {
                              ...node,
                              erasures: [
                                ...(node.erasures ?? []),
                                imageEraseStroke(draftLine, node),
                              ],
                            }
                          : node
                      }
                      selected={
                        node.id === selectedId && activeTool === 'select'
                      }
                      draggable={activeTool === 'select'}
                      snapEnabled={snapEnabled}
                      onSelect={() => {
                        if (activeTool === 'select') setSelectedId(node.id);
                      }}
                      onChange={updateNode}
                      onLoad={refreshPreview}
                      errorLabel={labels.imageFailed}
                    />
                  ) : (
                    <EditableNode
                      key={node.id}
                      node={node}
                      selected={node.id === selectedId}
                      draggable={activeTool === 'select'}
                      snapEnabled={snapEnabled}
                      onSelect={() => {
                        if (activeTool === 'select') setSelectedId(node.id);
                      }}
                      onChange={updateNode}
                    />
                  )
                )}
                {draftShape ? (
                  <EditableNode
                    node={draftShape}
                    selected={false}
                    draggable={false}
                    snapEnabled={false}
                    onSelect={() => {}}
                    onChange={() => {}}
                  />
                ) : null}
                {draftLine &&
                !(draftLine.eraser && selected?.kind === 'image') ? (
                  <Line
                    points={draftLine.points}
                    stroke={draftLine.stroke}
                    strokeWidth={draftLine.strokeWidth}
                    opacity={draftLine.opacity}
                    lineCap={draftLine.lineCap ?? 'round'}
                    lineJoin="round"
                    tension={0.35}
                    globalCompositeOperation={
                      draftLine.eraser ? 'destination-out' : 'source-over'
                    }
                  />
                ) : null}
              </Layer>
              <Layer ref={panelHighlightRef} listening={false}>
                {panelHighlight && (
                  <KonvaImage
                    image={panelHighlight}
                    width={1024}
                    height={1024}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>

        <div
          role="group"
          aria-label={uiLabels.canvasZoom}
          className="border-border bg-card/95 absolute right-2 bottom-2 z-20 flex items-center rounded-xl border p-1 shadow-xl backdrop-blur-xl lg:right-4"
        >
          <ToolButton
            label={uiLabels.zoomOut}
            disabled={canvasScale <= MIN_CANVAS_SCALE}
            onClick={() => zoomCanvas(1 / 1.2)}
          >
            <ZoomOut className="size-4" />
          </ToolButton>
          <button
            type="button"
            aria-label={uiLabels.fitCanvas}
            title={uiLabels.fitCanvas}
            onClick={resetCanvasView}
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring h-9 min-w-12 rounded-lg px-1 text-xs tabular-nums focus-visible:ring-2 focus-visible:outline-none"
          >
            {Math.round(canvasScale * 100)}%
          </button>
          <ToolButton
            label={uiLabels.zoomIn}
            disabled={canvasScale >= MAX_CANVAS_SCALE}
            onClick={() => zoomCanvas(1.2)}
          >
            <ZoomIn className="size-4" />
          </ToolButton>
        </div>

        <aside className="pointer-events-none absolute top-[76px] right-2 bottom-28 z-20 flex max-w-[calc(100%-1rem)] flex-row-reverse items-start gap-2 lg:right-4">
          <div className="border-border bg-card/95 pointer-events-auto flex shrink-0 flex-col rounded-xl border p-1 shadow-xl backdrop-blur-xl">
            {[
              ['assets', uiLabels.assets, FolderOpen],
              ['ai', uiLabels.ai, Sparkles],
              ['layers', labels.layers, Layers3],
            ].map(([id, label, Icon]) => (
              <button
                key={id as string}
                type="button"
                aria-label={label as string}
                aria-expanded={activePanel === id}
                onClick={() => {
                  if (
                    (id === 'assets' || id === 'ai') &&
                    onRequireSignIn?.() === false
                  )
                    return;
                  setActivePanel(
                    activePanel === id ? null : (id as typeof activePanel)
                  );
                }}
                className={cn(
                  'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex h-16 w-14 flex-col items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition focus-visible:ring-2 sm:w-16',
                  activePanel === id &&
                    'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary'
                )}
              >
                <Icon className="size-5" /> {label as string}
              </button>
            ))}
          </div>
          {activePanel ? (
            <div className="border-border bg-card/95 pointer-events-auto max-h-full w-[min(320px,calc(100vw-6rem))] overflow-y-auto overscroll-contain rounded-xl border p-3 shadow-2xl backdrop-blur-xl">
              {activePanel === 'assets' ? (
                <div className="space-y-3">
                  <div className="space-y-2 text-[11px]">
                    <div className="text-muted-foreground flex justify-between gap-2">
                      <span>{uiLabels.storage}</span>
                      <span className="tabular-nums">
                        {(usedBytes / 1024 / 1024).toFixed(2)} /{' '}
                        {limitBytes / 1024 / 1024} MB
                      </span>
                    </div>
                    <progress
                      aria-label={uiLabels.storage}
                      className="accent-primary h-1.5 w-full"
                      value={usedBytes}
                      max={limitBytes}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || usedBytes >= limitBytes}
                    className="border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-primary flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-xs transition"
                  >
                    <ImagePlus className="size-5" />
                    {uploading ? uiLabels.uploading : uiLabels.uploadLocal}
                  </button>
                  <p className="text-muted-foreground text-[11px] leading-4">
                    {isPaid ? uiLabels.paidStorage : uiLabels.freeStorage}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="group border-border bg-muted relative aspect-square overflow-hidden rounded-lg border"
                      >
                        <img
                          src={asset.url}
                          alt=""
                          className="size-full object-contain"
                        />
                        <span className="bg-background/85 absolute top-1 right-1 rounded px-1 text-[9px] tabular-nums">
                          {Math.ceil(asset.byteSize / 1024)} KB
                        </span>
                        <div className="bg-popover/95 absolute inset-x-0 bottom-0 flex items-center justify-center py-1 opacity-100 transition lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                          <ToolButton
                            label={uiLabels.addToCanvas}
                            onClick={() =>
                              void addImageUrl(
                                `/api/assets?image=${encodeURIComponent(asset.id)}`,
                                uiLabels.uploadedLayer
                              )
                            }
                          >
                            <Plus className="size-4" />
                          </ToolButton>
                          <ToolButton
                            label={uiLabels.useReference}
                            onClick={() => {
                              setAiAsset(asset);
                              setAiFile(undefined);
                              setActivePanel('ai');
                            }}
                          >
                            <Sparkles className="size-4" />
                          </ToolButton>
                          <ToolButton
                            label={labels.delete}
                            disabled={
                              !onDeleteAsset || deletingAsset === asset.id
                            }
                            onClick={async () => {
                              if (!onDeleteAsset) return;
                              setDeletingAsset(asset.id);
                              try {
                                await onDeleteAsset(asset.id);
                                setAssets((items) =>
                                  items.filter((item) => item.id !== asset.id)
                                );
                                if (aiAsset?.id === asset.id)
                                  setAiAsset(undefined);
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : labels.imageFailed
                                );
                              } finally {
                                setDeletingAsset(undefined);
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                          </ToolButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activePanel === 'ai' ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => aiFileRef.current?.click()}
                    className="border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground flex h-16 w-full items-center justify-center gap-2 rounded-lg border border-dashed text-xs transition"
                  >
                    <ImagePlus className="size-4" />
                    <span className="min-w-0">
                      {aiAsset ? (
                        <img
                          src={aiAsset.url}
                          alt={uiLabels.aiReference}
                          className="size-12 object-contain"
                        />
                      ) : aiFile ? (
                        aiFile.name
                      ) : (
                        uiLabels.aiReference
                      )}
                      <span className="mt-1 block text-[10px]">
                        {uiLabels.referenceTypes}
                      </span>
                    </span>
                  </button>
                  {aiFile || aiAsset ? (
                    <ToolButton
                      label={uiLabels.removeReference}
                      onClick={() => {
                        setAiFile(undefined);
                        setAiAsset(undefined);
                      }}
                    >
                      <X className="size-4" />
                    </ToolButton>
                  ) : null}
                  <WrapPromptInput
                    value={prompt}
                    onChange={setPrompt}
                    placeholder={uiLabels.promptPlaceholder}
                    ideasLabel={uiLabels.ideas}
                    presets={promptPresets}
                  />
                  <WrapColorPreference
                    colors={preferredColors}
                    onChange={setPreferredColors}
                    label={uiLabels.colorPreference}
                    customLabel={uiLabels.customColor}
                  />
                  <WrapGalleryPreference
                    checked={openToGallery}
                    isPaid={isPaid}
                    onChange={setOpenToGallery}
                    label={uiLabels.openGallery}
                    unlockLabel={uiLabels.unlockGallery}
                    onUnlock={() => {
                      if (onRequireSignIn?.() !== false)
                        onInsufficientCredits();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void generate()}
                    disabled={generating}
                    aria-busy={generating}
                    className="bg-primary text-primary-foreground hover:bg-primary/80 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-semibold transition disabled:opacity-60"
                  >
                    <WandSparkles
                      className={cn('size-4', generating && 'animate-spin')}
                    />
                    {generating
                      ? uiLabels.generating
                      : uiLabels.generateCost(AI_COST)}
                  </button>
                  <p className="text-muted-foreground text-center text-[11px]">
                    {uiLabels.currentCredits(credits)}
                  </p>
                </div>
              ) : null}

              {activePanel === 'layers' ? (
                <DndContext
                  sensors={layerSensors}
                  collisionDetection={closestCenter}
                  accessibility={{
                    screenReaderInstructions: {
                      draggable: uiLabels.layerDragHint,
                    },
                    announcements: {
                      onDragStart: () => uiLabels.layerDragHint,
                      onDragOver: () => undefined,
                      onDragEnd: () => labels.layers,
                      onDragCancel: () => labels.layers,
                    },
                  }}
                  onDragEnd={({ active: dragged, over }) => {
                    if (!over || dragged.id === over.id) return;
                    const from = current.nodes.findIndex(
                      (node) => node.id === dragged.id
                    );
                    const to = current.nodes.findIndex(
                      (node) => node.id === over.id
                    );
                    if (from >= 0 && to >= 0)
                      commit({
                        ...current,
                        nodes: arrayMove(current.nodes, from, to),
                      });
                  }}
                >
                  <SortableContext
                    items={current.nodes.map((node) => node.id).reverse()}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {[...current.nodes].reverse().map((node) => (
                        <SortableLayer
                          key={node.id}
                          id={node.id}
                          name={node.name}
                          selected={selectedId === node.id}
                          label={uiLabels.layerDrag}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedId(node.id)}
                            className="text-foreground min-w-0 flex-1 truncate px-2 py-1.5 text-left text-xs"
                          >
                            {node.name}
                          </button>
                          <ToolButton
                            label={uiLabels.layerUp}
                            disabled={current.nodes.at(-1)?.id === node.id}
                            onClick={() => moveLayer(node.id, 1)}
                          >
                            <ArrowUp className="size-3.5" />
                          </ToolButton>
                          <ToolButton
                            label={uiLabels.layerDown}
                            disabled={current.nodes[0]?.id === node.id}
                            onClick={() => moveLayer(node.id, -1)}
                          >
                            <ArrowDown className="size-3.5" />
                          </ToolButton>
                          <ToolButton
                            label={labels.delete}
                            onClick={() => {
                              commit({
                                ...current,
                                nodes: current.nodes.filter(
                                  (item) => item.id !== node.id
                                ),
                              });
                              if (selectedId === node.id)
                                setSelectedId(undefined);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </ToolButton>
                        </SortableLayer>
                      ))}
                      {!current.nodes.length ? (
                        <p className="text-muted-foreground py-8 text-center text-xs">
                          {uiLabels.emptyLayers}
                        </p>
                      ) : null}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : null}
            </div>
          ) : null}
        </aside>

        {selectedPanel && !selected && activeTool === 'select' ? (
          <div className="border-border bg-popover absolute top-14 left-1/2 z-30 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 rounded-xl border p-3 shadow-xl">
            <WrapColorPreference
              colors={
                current.panelColors?.[selectedPanel]
                  ? [current.panelColors[selectedPanel]]
                  : []
              }
              label={uiLabels.panelColor}
              customLabel={uiLabels.customColor}
              onChange={(colors) => {
                const panelColors = { ...current.panelColors };
                const next = colors.at(-1);
                if (next) panelColors[selectedPanel] = next;
                else delete panelColors[selectedPanel];
                commit({ ...current, panelColors });
              }}
            />
            <ToolButton
              label={uiLabels.clearPanelColor}
              onClick={() => {
                const panelColors = { ...current.panelColors };
                delete panelColors[selectedPanel];
                commit({ ...current, panelColors });
              }}
            >
              <X className="size-4" />
            </ToolButton>
          </div>
        ) : null}

        {selected || activeTool === 'brush' || activeTool === 'eraser' ? (
          <div className="border-border bg-popover/95 text-popover-foreground absolute top-14 left-1/2 z-30 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-xl border p-1.5 shadow-xl backdrop-blur-xl">
            {selected ? (
              <>
                {selected.kind === 'text' ? (
                  <>
                    <input
                      value={selected.text ?? ''}
                      onChange={(event) =>
                        updateNode({ ...selected, text: event.target.value })
                      }
                      className="border-input bg-background h-8 w-36 rounded-lg border px-2 text-xs outline-none"
                    />
                    <label className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      {uiLabels.font}
                      <StyledSelect
                        label={uiLabels.font}
                        value={selected.fontFamily ?? 'Space Grotesk'}
                        onValueChange={(fontFamily) =>
                          updateNode({ ...selected, fontFamily })
                        }
                        className="w-44 text-xs"
                        options={[
                          'Space Grotesk',
                          'Plus Jakarta Sans',
                          'Arial',
                          'Georgia',
                        ].map((value) => ({ value, label: value }))}
                      />
                    </label>
                    <label className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      {uiLabels.fontSize}
                      <input
                        type="number"
                        min="12"
                        max="240"
                        value={selected.fontSize ?? 72}
                        onChange={(event) =>
                          updateNode({
                            ...selected,
                            fontSize: Number(event.target.value),
                          })
                        }
                        className="border-input bg-background text-foreground h-8 w-16 rounded-lg border px-2 text-xs"
                      />
                    </label>
                  </>
                ) : null}
                {selected.kind !== 'image' && !selected.eraser ? (
                  <label
                    className="border-border hover:bg-muted relative flex size-8 cursor-pointer items-center justify-center rounded-lg border"
                    title={uiLabels.color}
                  >
                    <span
                      className="border-border size-4 rounded-full border"
                      style={{
                        backgroundColor:
                          selected.fill ?? selected.stroke ?? color,
                      }}
                    />
                    <input
                      type="color"
                      value={selected.fill ?? selected.stroke ?? color}
                      onChange={(event) => {
                        const value = event.target.value;
                        setColor(value);
                        updateNode({
                          ...selected,
                          fill: value,
                          stroke: value,
                        });
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                ) : null}
                {['line', 'arrow', 'path'].includes(selected.kind) && (
                  <label className="text-muted-foreground flex items-center gap-2 text-xs">
                    {uiLabels.lineWidth}
                    <input
                      aria-label={uiLabels.lineWidth}
                      type="range"
                      min="1"
                      max="80"
                      value={selected.strokeWidth ?? 8}
                      onChange={(e) =>
                        updateNode({
                          ...selected,
                          strokeWidth: Number(e.target.value),
                        })
                      }
                      className="accent-primary w-24"
                    />
                    <span>{selected.strokeWidth ?? 8}</span>
                  </label>
                )}
                <label className="text-muted-foreground flex items-center gap-2 px-1 text-[11px]">
                  {labels.opacity}
                  <input
                    type="range"
                    aria-label={labels.opacity}
                    title={labels.opacity}
                    min="0"
                    max="1"
                    step="0.05"
                    value={selected.opacity}
                    onChange={(event) =>
                      updateNode({
                        ...selected,
                        opacity: Number(event.target.value),
                      })
                    }
                    className="accent-primary w-20"
                  />
                </label>
                {selected.kind === 'image' ? (
                  <>
                    <ToolButton
                      label={uiLabels.eraser}
                      active={activeTool === 'eraser'}
                      onClick={() =>
                        setActiveTool(
                          activeTool === 'eraser' ? 'select' : 'eraser'
                        )
                      }
                    >
                      <Eraser className="size-4" />
                    </ToolButton>
                    <ToolButton
                      label={uiLabels.flipHorizontal}
                      onClick={() => {
                        const radians = (selected.rotation * Math.PI) / 180;
                        updateNode({
                          ...selected,
                          x:
                            selected.x +
                            selected.width *
                              selected.scaleX *
                              Math.cos(radians),
                          y:
                            selected.y +
                            selected.width *
                              selected.scaleX *
                              Math.sin(radians),
                          scaleX: -selected.scaleX,
                        });
                      }}
                    >
                      <FlipHorizontal2 className="size-4" />
                    </ToolButton>
                    <ToolButton
                      label={uiLabels.flipVertical}
                      onClick={() => {
                        const radians = (selected.rotation * Math.PI) / 180;
                        updateNode({
                          ...selected,
                          x:
                            selected.x -
                            selected.height *
                              selected.scaleY *
                              Math.sin(radians),
                          y:
                            selected.y +
                            selected.height *
                              selected.scaleY *
                              Math.cos(radians),
                          scaleY: -selected.scaleY,
                        });
                      }}
                    >
                      <FlipVertical2 className="size-4" />
                    </ToolButton>
                  </>
                ) : null}
                <ToolButton label={uiLabels.rotate15} onClick={rotateSelected}>
                  <RotateCw className="size-4" />
                </ToolButton>
                <ToolButton label={labels.delete} onClick={removeSelected}>
                  <Trash2 className="size-4" />
                </ToolButton>
              </>
            ) : null}

            {activeTool === 'brush' ? (
              <>
                <label className="text-muted-foreground flex items-center gap-2 px-1 text-[11px]">
                  {uiLabels.brushSize}
                  <input
                    type="range"
                    min="2"
                    max="120"
                    value={brushSize}
                    onChange={(event) =>
                      setBrushSize(Number(event.target.value))
                    }
                    className="accent-primary w-24"
                  />
                  <span className="text-foreground w-6 text-right">
                    {brushSize}
                  </span>
                </label>
                <label className="text-muted-foreground flex items-center gap-2 px-1 text-[11px]">
                  {uiLabels.brushOpacity}
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={brushOpacity}
                    onChange={(event) =>
                      setBrushOpacity(Number(event.target.value))
                    }
                    className="accent-primary w-20"
                  />
                </label>
                <label
                  className="border-border hover:bg-muted relative flex size-8 cursor-pointer items-center justify-center rounded-lg border"
                  title={uiLabels.color}
                >
                  <span
                    className="border-border size-4 rounded-full border"
                    style={{ backgroundColor: color }}
                  />
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </>
            ) : null}

            {activeTool === 'eraser' ? (
              <>
                <label className="text-muted-foreground flex items-center gap-2 px-1 text-[11px]">
                  {uiLabels.eraserSize}
                  <input
                    type="range"
                    min="8"
                    max="160"
                    value={eraserSize}
                    onChange={(event) =>
                      setEraserSize(Number(event.target.value))
                    }
                    className="accent-primary w-24"
                  />
                  <span className="text-foreground w-7 text-right">
                    {eraserSize}
                  </span>
                </label>
                <div className="bg-muted flex rounded-lg p-0.5">
                  {(['round', 'square'] as const).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => setEraserShape(shape)}
                      className={cn(
                        'text-muted-foreground rounded-md px-2 py-1 text-[11px]',
                        eraserShape === shape &&
                          'bg-background text-foreground shadow-sm'
                      )}
                    >
                      {shape === 'round'
                        ? uiLabels.eraserRound
                        : uiLabels.eraserSquare}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-2 bottom-1 z-40 flex h-10 items-center justify-center lg:bottom-2">
          <div className="border-border bg-popover/95 pointer-events-auto relative flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border px-1.5 py-1 shadow-2xl backdrop-blur-xl">
            {tools.map(({ id, label, icon: Icon }) => (
              <ToolButton
                key={id}
                label={label}
                active={activeTool === id}
                onClick={() => {
                  setActiveTool(activeTool === id ? 'select' : id);
                  if (id !== 'select') setSelectedId(undefined);
                  setShapeMenuOpen(false);
                  setMaterialMenuOpen(false);
                }}
              >
                <Icon className="size-4" />
              </ToolButton>
            ))}
            <Popover.Root open={shapeMenuOpen} onOpenChange={setShapeMenuOpen}>
              <Tooltip>
                <TooltipTrigger
                  render={<Popover.Trigger />}
                  aria-label={uiLabels.shape}
                  aria-pressed={activeTool === 'shape' || activeTool === 'pen'}
                  className={cn(
                    'hover:bg-muted focus-visible:ring-ring flex size-9 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2',
                    (activeTool === 'shape' || activeTool === 'pen') &&
                      'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary'
                  )}
                >
                  <ShapeIcon className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{uiLabels.shape}</TooltipContent>
              </Tooltip>
              <Popover.Portal>
                <Popover.Positioner side="top" sideOffset={12} className="z-50">
                  <Popover.Popup className="border-border bg-popover text-popover-foreground min-w-40 rounded-xl border p-1.5 shadow-xl">
                    {(
                      [
                        ['rect', uiLabels.rectangle, Square],
                        ['circle', uiLabels.circle, Circle],
                        ['line', uiLabels.line, Minus],
                        ['arrow', uiLabels.arrow, MoveRight],
                        ['diamond', uiLabels.diamond, Diamond],
                        ['polygon', uiLabels.polygon, Hexagon],
                      ] as const
                    ).map(([kind, label, Icon]) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => addShape(kind)}
                        className="hover:bg-muted flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-xs"
                      >
                        <Icon className="size-4" />
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setShapeKind('pen');
                        setActiveTool('pen');
                        setSelectedId(undefined);
                        setShapeMenuOpen(false);
                      }}
                      className="hover:bg-muted flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-xs"
                    >
                      <PenTool className="size-4" />
                      {uiLabels.pen}
                    </button>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <ToolButton
              label={uiLabels.snap}
              active={snapEnabled}
              onClick={() => setSnapEnabled((value) => !value)}
            >
              <Magnet className="size-4" />
            </ToolButton>
            <ToolButton
              label={uiLabels.rotate}
              disabled={!selected}
              onClick={rotateSelected}
            >
              <RotateCw className="size-4" />
            </ToolButton>
            <label
              className="text-muted-foreground hover:bg-muted hover:text-foreground relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg"
              title={uiLabels.wrapColor}
            >
              <Palette className="size-4" />
              <input
                type="color"
                aria-label={uiLabels.wrapColor}
                value={paintColor}
                onInput={(event) =>
                  commit({ ...current, paintColor: event.currentTarget.value })
                }
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <Popover.Root
              open={materialMenuOpen}
              onOpenChange={setMaterialMenuOpen}
            >
              <Tooltip>
                <TooltipTrigger
                  render={<Popover.Trigger />}
                  aria-label={uiLabels.material}
                  className={cn(
                    'hover:bg-muted focus-visible:ring-ring flex size-9 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2',
                    materialMenuOpen && 'text-primary'
                  )}
                >
                  <Gem className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{`${uiLabels.material}: ${materials[materialIndex].label}`}</TooltipContent>
              </Tooltip>
              <Popover.Portal>
                <Popover.Positioner side="top" sideOffset={12} className="z-50">
                  <Popover.Popup className="border-border bg-popover text-popover-foreground min-w-36 rounded-xl border p-1.5 shadow-xl">
                    {materials.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={index === materialIndex}
                        onClick={() => {
                          setMaterialIndex(index);
                          onMaterialChange?.(item.id);
                          setMaterialMenuOpen(false);
                        }}
                        className={cn(
                          'hover:bg-muted flex h-10 w-full items-center rounded-lg px-2.5 text-xs',
                          index === materialIndex && 'text-primary'
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <ToolButton
              label={uiLabels.back}
              disabled={historyIndex === 0}
              onClick={() => jumpHistory(historyIndex - 1)}
            >
              <Undo2 className="size-4" />
            </ToolButton>
            <ToolButton
              label={uiLabels.forward}
              disabled={historyIndex >= history.length - 1}
              onClick={() => jumpHistory(historyIndex + 1)}
            >
              <Redo2 className="size-4" />
            </ToolButton>
          </div>
        </div>
      </section>
    );
  }
);
