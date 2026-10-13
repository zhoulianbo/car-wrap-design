import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  apiGet,
  apiUpload,
  pageQuery,
  type PageResult,
} from '@/lib/api-client';
import { renderVehicleCover } from '@/lib/capture-generation-cover';
import { sanitizeImageFile } from '@/lib/image-file';
import {
  DEFAULT_VEHICLE_SLUG,
  isVehicleSlug,
  VEHICLE_ASSET_MANIFEST,
  type VehicleSlug,
} from '@/lib/vehicle-catalog';
import { m } from '@/paraglide/messages.js';
import { TextField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const VehicleViewer = lazy(() =>
  import('@/components/vehicle-viewer/vehicle-viewer').then((module) => ({
    default: module.VehicleViewer,
  }))
);

class PreviewBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface Owner {
  id: string;
  name: string;
  email: string;
}
const schema = z.object({
  title: z.string().trim().min(1).max(120),
  ownerId: z.string().min(1),
  vehicleSlug: z.custom<VehicleSlug>(
    (value) => typeof value === 'string' && isVehicleSlug(value)
  ),
});
const selectClass =
  'border-input bg-background h-10 w-full rounded-md border px-3 text-sm';

export function AdminAddDesign({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {m['admin.designs.add']()}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        {open && (
          <AddDesignForm
            onClose={() => setOpen(false)}
            onCreated={onCreated}
            onBusyChange={setBusy}
          />
        )}
      </Dialog>
    </>
  );
}

function AddDesignForm({
  onClose,
  onCreated,
  onBusyChange,
}: {
  onClose: () => void;
  onCreated: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
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
    front: m['viewer.front'](),
    rear: m['viewer.rear'](),
    side: m['viewer.side'](),
    zoomIn: m['viewer.zoom_in'](),
    zoomOut: m['viewer.zoom_out'](),
    viewControls: m['viewer.view_controls'](),
    color: (color: string) => m['viewer.color']({ color }),
    finishes: {
      gloss: m['viewer.finish.gloss'](),
      satin: m['viewer.finish.satin'](),
      matte: m['viewer.finish.matte'](),
      metallic: m['viewer.finish.metallic'](),
      pearlescent: m['viewer.finish.pearlescent'](),
    },
  };
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [owner, setOwner] = useState<Owner>();
  const [image, setImage] = useState<{
    file: File;
    canvas: HTMLCanvasElement;
    key: string;
  }>();
  const [processing, setProcessing] = useState(false);
  const [imageError, setImageError] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const imageSequence = useRef(0);
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(
    () => () => {
      imageSequence.current++;
    },
    []
  );

  const users = useQuery({
    queryKey: ['admin-design-owners', page, debouncedSearch],
    queryFn: () =>
      apiGet<PageResult<Owner>>(
        pageQuery('/api/admin/users', {
          page,
          pageSize: 20,
          search: debouncedSearch,
        })
      ),
  });
  const owners = users.data?.items ?? [];
  const choices =
    owner && !owners.some((item) => item.id === owner.id)
      ? [owner, ...owners]
      : owners;

  const save = useMutation({
    mutationFn: async (value: z.infer<typeof schema>) => {
      if (!image || processing || previewFailed)
        throw new Error(m['admin.designs.image_required']());
      const cover = await renderVehicleCover({
        canvas: image.canvas,
        vehicleSlug: value.vehicleSlug,
        errorMessage: m['admin.designs.preview_failed'](),
      });
      const data = new FormData();
      data.set(
        'data',
        JSON.stringify({ ...value, idempotencyKey: idempotencyKey.current })
      );
      data.set('texture', image.file);
      data.set(
        'cover',
        new File([cover], 'cover.webp', { type: 'image/webp' })
      );
      return apiUpload('/api/admin/designs', data);
    },
    onSuccess: () => {
      toast.success(m['admin.designs.created']());
      queryClient.invalidateQueries({ queryKey: ['admin-designs'] });
      queryClient.invalidateQueries({ queryKey: ['user-wraps'] });
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      onCreated();
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const form = useForm({
    defaultValues: {
      title: '',
      ownerId: '',
      vehicleSlug: DEFAULT_VEHICLE_SLUG,
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      await save.mutateAsync(value).catch(() => {});
    },
  });
  useEffect(() => {
    onBusyChange(save.isPending);
    return () => onBusyChange(false);
  }, [save.isPending, onBusyChange]);

  async function loadImage(file?: File) {
    const sequence = ++imageSequence.current;
    setImage(undefined);
    setImageError('');
    setPreviewFailed(false);
    setProcessing(false);
    if (!file) return;
    setProcessing(true);
    try {
      const sanitized = await sanitizeImageFile(file, {
        maxBytes: 10 * 1024 * 1024,
      });
      const bitmap = await createImageBitmap(sanitized);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) {
        bitmap.close();
        throw new Error(m['admin.designs.image_failed']());
      }
      context.fillStyle = '#f4f5f6';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      if (sequence !== imageSequence.current) return;
      setImage({ file: sanitized, canvas, key: crypto.randomUUID() });
      if (!form.getFieldValue('title'))
        form.setFieldValue(
          'title',
          file.name.replace(/\.[^.]+$/, '').slice(0, 120)
        );
    } catch {
      if (sequence === imageSequence.current)
        setImageError(m['admin.designs.image_failed']());
    } finally {
      if (sequence === imageSequence.current) setProcessing(false);
    }
  }

  return (
    <DialogContent
      className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl"
      showCloseButton={!save.isPending}
    >
      <DialogHeader>
        <DialogTitle>{m['admin.designs.add']()}</DialogTitle>
        <DialogDescription>
          {m['admin.designs.add_description']()}
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <fieldset
          disabled={save.isPending}
          className="grid min-w-0 gap-6 md:grid-cols-2"
        >
          <div className="min-w-0 space-y-4">
            <form.Field name="title">
              {(field) => (
                <TextField field={field} label={m['admin.designs.name']()} />
              )}
            </form.Field>
            <div className="space-y-2">
              <label htmlFor="design-owner" className="text-sm font-medium">
                {m['admin.designs.owner']()}
              </label>
              <Input
                id="design-owner-search"
                aria-label={m['admin.designs.search_owner']()}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={m['admin.designs.search_owner']()}
              />
              <form.Field name="ownerId">
                {(field) => (
                  <select
                    id="design-owner"
                    className={selectClass}
                    required
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      setOwner(
                        choices.find((item) => item.id === event.target.value)
                      );
                    }}
                  >
                    <option value="">
                      {m['admin.designs.select_owner']()}
                    </option>
                    {choices.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {item.email}
                      </option>
                    ))}
                  </select>
                )}
              </form.Field>
              {users.isPending ? (
                <p role="status" className="text-muted-foreground text-xs">
                  {m['admin.designs.loading_users']()}
                </p>
              ) : users.isError ? (
                <p role="alert" className="text-destructive text-xs">
                  {m['admin.designs.users_failed']()}{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void users.refetch()}
                  >
                    {m['admin.designs.retry']()}
                  </button>
                </p>
              ) : !owners.length ? (
                <p className="text-muted-foreground text-xs">
                  {m['admin.designs.no_users']()}
                </p>
              ) : null}
              {(page > 1 || (users.data?.total ?? 0) > 20) && (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page === 1 || users.isFetching}
                    onClick={() => setPage(page - 1)}
                  >
                    {m['admin.designs.previous']()}
                  </Button>
                  <span className="text-muted-foreground text-xs">{page}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      page * 20 >= (users.data?.total ?? 0) || users.isFetching
                    }
                    onClick={() => setPage(page + 1)}
                  >
                    {m['admin.designs.next']()}
                  </Button>
                </div>
              )}
            </div>
            <form.Field name="vehicleSlug">
              {(field) => (
                <div className="space-y-2">
                  <label
                    htmlFor="design-vehicle"
                    className="text-sm font-medium"
                  >
                    {m['admin.designs.vehicle']()}
                  </label>
                  <select
                    id="design-vehicle"
                    className={selectClass}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value as VehicleSlug);
                      setPreviewFailed(false);
                    }}
                  >
                    {VEHICLE_ASSET_MANIFEST.map((vehicle) => (
                      <option key={vehicle.slug} value={vehicle.slug}>
                        {vehicle.trim} ({vehicle.year})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </form.Field>
            <div className="space-y-2">
              <label htmlFor="design-texture" className="text-sm font-medium">
                {m['admin.designs.texture']()}
              </label>
              <Input
                id="design-texture"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void loadImage(event.target.files?.[0])}
              />
              <p className="text-muted-foreground text-xs">
                {m['admin.designs.texture_hint']()}
              </p>
              {imageError && (
                <p role="alert" className="text-destructive text-xs">
                  {imageError}
                </p>
              )}
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium">
              {m['admin.designs.preview']()}
            </p>
            <form.Subscribe selector={(state) => state.values.vehicleSlug}>
              {(vehicleSlug) => (
                <div className="aspect-square overflow-hidden rounded-xl border">
                  {image ? (
                    <PreviewBoundary
                      key={`${vehicleSlug}:${image.key}`}
                      onError={() => setPreviewFailed(true)}
                      fallback={
                        <p
                          role="alert"
                          className="text-destructive p-6 text-sm"
                        >
                          {m['admin.designs.preview_failed']()}
                        </p>
                      }
                    >
                      <Suspense
                        fallback={
                          <p role="status" className="p-6 text-sm">
                            {m['viewer.loading']()}
                          </p>
                        }
                      >
                        <VehicleViewer
                          vehicleSlug={vehicleSlug}
                          textureCanvas={image.canvas}
                          labels={viewerLabels}
                          editorPreview
                          minimal
                          controls={false}
                          motion={false}
                          className="size-full rounded-none border-0"
                        />
                      </Suspense>
                    </PreviewBoundary>
                  ) : (
                    <div
                      role="status"
                      className="text-muted-foreground bg-muted flex size-full items-center justify-center p-6 text-center text-sm"
                    >
                      {processing
                        ? m['admin.designs.processing']()
                        : m['admin.designs.preview_empty']()}
                    </div>
                  )}
                </div>
              )}
            </form.Subscribe>
            <p className="text-muted-foreground text-xs">
              {m['admin.designs.cover_hint']()}
            </p>
          </div>
        </fieldset>
        {save.isError && (
          <p role="alert" className="text-destructive mt-4 text-sm">
            {save.error.message}
          </p>
        )}
        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={onClose}
          >
            {m['admin.designs.cancel']()}
          </Button>
          <form.Subscribe selector={(state) => state.values}>
            {(values) => (
              <Button
                type="submit"
                disabled={
                  save.isPending ||
                  processing ||
                  !image ||
                  previewFailed ||
                  !values.ownerId ||
                  !values.title.trim()
                }
              >
                {save.isPending
                  ? m['admin.designs.saving']()
                  : m['admin.designs.save']()}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
