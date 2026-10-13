import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Link2, LoaderCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { apiGet, apiPost } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-message';
import type { PaintFinishKey, VehicleSlug } from '@/lib/vehicle-catalog';
import type { WrapShareLink } from '@/lib/wrap-types';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import { WrapImagePreview } from '@/blocks/wrap-image-preview';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export function WrapShareDialog({
  open,
  onOpenChange,
  vehicleSlug,
  textureCanvas,
  finish,
  color,
  wrap,
  userId,
  hasUnsavedChanges,
  onSave,
  onRequireSignIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleSlug: VehicleSlug;
  textureCanvas: HTMLCanvasElement | null;
  finish: PaintFinishKey;
  color: string;
  wrap?: { id: string; version: number };
  userId?: string;
  hasUnsavedChanges: boolean;
  onSave: () => Promise<{ id: string; version: number } | undefined>;
  onRequireSignIn: () => boolean;
}) {
  const queryClient = useQueryClient();
  const [copiedUrl, setCopiedUrl] = useState('');
  const shareQuery = useQuery({
    queryKey: ['wrap-share', userId, wrap?.id],
    queryFn: () => apiGet<WrapShareLink>(`/api/wraps/${wrap!.id}/share`),
    enabled: open && Boolean(userId && wrap?.id),
    staleTime: 0,
    retry: false,
  });
  const link = shareQuery.data;
  const url =
    link?.token && typeof window !== 'undefined'
      ? new URL(localizeHref(`/share/${link.token}`), window.location.origin)
          .href
      : '';
  const mutation = useMutation({
    mutationFn: async (
      action: 'generate' | 'regenerate' | 'enable' | 'disable'
    ) => {
      const target =
        action === 'generate' || action === 'regenerate'
          ? await onSave()
          : wrap;
      if (!target) throw new Error(m['sharing.save_required']());
      const result = await apiPost<WrapShareLink>(
        `/api/wraps/${target.id}/share`,
        { action, version: target.version, token: link?.token ?? undefined }
      );
      return { target, result };
    },
    onSuccess: async ({ target, result }) => {
      await queryClient.cancelQueries({
        queryKey: ['wrap-share', userId, target.id],
      });
      queryClient.setQueryData(['wrap-share', userId, target.id], result);
      setCopiedUrl('');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
  const change = (action: 'generate' | 'regenerate' | 'enable' | 'disable') => {
    if (onRequireSignIn()) mutation.mutate(action);
  };
  const busy = mutation.isPending || shareQuery.isFetching;
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!mutation.isPending) onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl p-5 sm:max-w-3xl sm:p-8">
        <DialogHeader className="pr-6">
          <DialogTitle className="text-2xl font-semibold">
            {m['sharing.title']()}
          </DialogTitle>
          <DialogDescription>{m['sharing.description']()}</DialogDescription>
        </DialogHeader>
        {open && (
          <WrapImagePreview
            vehicleSlug={vehicleSlug}
            textureCanvas={textureCanvas}
            finish={finish}
            color={color}
            initialAutoRotate={false}
            className="h-[min(42dvh,420px)] min-h-52 rounded-2xl"
          />
        )}
        {shareQuery.isError ? (
          <div role="alert" className="grid gap-3">
            <p>{m['sharing.load_failed']()}</p>
            <Button variant="outline" onClick={() => void shareQuery.refetch()}>
              {m['sharing.retry']()}
            </Button>
          </div>
        ) : link?.token ? (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="wrap-share-active">
                {link.active ? m['sharing.active']() : m['sharing.inactive']()}
              </label>
              <Switch
                id="wrap-share-active"
                checked={link.active}
                disabled={busy}
                onCheckedChange={(active) =>
                  change(active ? 'enable' : 'disable')
                }
              />
            </div>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
              <Input
                aria-label={m['sharing.address']()}
                value={url}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 font-mono"
              />
              <Button
                disabled={busy || !link.active}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopiedUrl(url);
                  } catch {
                    toast.error(m['sharing.copy_failed']());
                  }
                }}
              >
                {copiedUrl === url ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copiedUrl === url
                  ? m['sharing.copied']()
                  : m['sharing.copy']()}
              </Button>
            </div>
            {hasUnsavedChanges && (
              <Button disabled={busy} onClick={() => change('generate')}>
                {m['sharing.save_changes']()}
              </Button>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => change('regenerate')}
            >
              {mutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {m['sharing.regenerate']()}
            </Button>
            <p className="text-muted-foreground text-xs leading-5">
              {m['sharing.regenerate_hint']()}
            </p>
          </div>
        ) : (
          <Button size="lg" disabled={busy} onClick={() => change('generate')}>
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Link2 className="size-4" />
            )}
            {busy ? m['sharing.generating']() : m['sharing.generate']()}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
