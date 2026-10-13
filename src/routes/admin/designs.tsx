import { useEffect, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Check,
  Eye,
  EyeOff,
  Flag,
  LoaderCircle,
  Pencil,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { tStatus } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import {
  apiGet,
  apiGetBlob,
  apiPatch,
  apiUpload,
  type PageResult,
} from '@/lib/api-client';
import { renderVehicleCover } from '@/lib/capture-generation-cover';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { PaintFinishKey, VehicleSlug } from '@/lib/vehicle-catalog';
import { m } from '@/paraglide/messages.js';
import { AdminAddDesign } from '@/blocks/admin-add-design';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

type ModerationStatus =
  | 'private'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'reported'
  | 'hidden';

interface ModeratedDesign {
  id: string;
  designId: string | null;
  version: number;
  updatedAt: string;
  slug: string;
  title: string;
  textureUrl: string | null;
  coverUrl: string | null;
  visibility: string;
  showInHero: boolean;
  moderationStatus: ModerationStatus;
  usesAi: boolean;
  finish: PaintFinishKey;
  ownerId: string;
  vehicleSlug: string;
  viewCount: number;
  remixCount: number;
  publishedAt: string;
}

interface DesignReport {
  id: string;
  designId: string;
  designSlug: string;
  designTitle: string;
  textureUrl: string | null;
  coverUrl: string | null;
  reporterId: string;
  reason: string;
  details: string | null;
  status: string;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const PAGE_SIZE = 20;

function DesignsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'designs' | 'reports'>('designs');
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => setPage(1), [view, status, debouncedSearch]);

  const designsQuery = useQuery({
    queryKey: ['admin-designs', page, status, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        status,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      return apiGet<PageResult<ModeratedDesign>>(
        `/api/admin/designs?${params}`
      );
    },
    placeholderData: keepPreviousData,
    enabled: view === 'designs',
  });

  const reportsQuery = useQuery({
    queryKey: ['admin-design-reports', page, status],
    queryFn: () =>
      apiGet<PageResult<DesignReport>>(
        `/api/admin/design-reports?page=${page}&pageSize=${PAGE_SIZE}&status=${status}`
      ),
    placeholderData: keepPreviousData,
    enabled: view === 'reports',
  });

  const [editingDesign, setEditingDesign] = useState<ModeratedDesign | null>(
    null
  );
  const [editedTitle, setEditedTitle] = useState('');
  const [dialogMode, setDialogMode] = useState<'edit' | 'approve'>('approve');
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const openTitleDialog = (item: ModeratedDesign, mode: 'edit' | 'approve') => {
    setEditingDesign(item);
    setEditedTitle(item.title);
    setDialogMode(mode);
  };
  const imageCell = (url: string | null, title: string) =>
    url ? (
      <button
        type="button"
        title={m['admin.designs.enlarge']()}
        aria-label={`${m['admin.designs.enlarge']()} · ${title}`}
        onClick={() => setPreviewImage({ url, title })}
        className="bg-muted block size-20 shrink-0 overflow-hidden rounded-md border"
      >
        <img
          src={url}
          alt={title}
          loading="lazy"
          width={80}
          height={80}
          className="size-20 object-contain"
        />
      </button>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  const moderateMutation = useMutation({
    mutationFn: (input: {
      id: string;
      status: ModerationStatus;
      title?: string;
      version?: number;
      approve?: boolean;
    }) => {
      const item =
        editingDesign?.id === input.id
          ? editingDesign
          : designsQuery.data?.items.find((item) => item.id === input.id);
      if (!item) throw new Error(m['admin.designs.refresh_review']());
      if (!input.approve)
        return apiPatch('/api/admin/designs', {
          id: input.id,
          status: input.status,
          title: input.title,
          version: item.version,
        });
      return (async () => {
        const texture = await apiGetBlob(
          `/api/admin/designs?wrapId=${encodeURIComponent(item.id)}&version=${item.version}`
        );
        const url = URL.createObjectURL(texture);
        try {
          const cover = await renderVehicleCover({
            vehicleSlug: item.vehicleSlug as VehicleSlug,
            finish: item.finish,
            textureUrl: url,
            errorMessage: m['studio.cover_save_failed'](),
          });
          const form = new FormData();
          form.set(
            'data',
            JSON.stringify({
              id: item.id,
              version: item.version,
              title: input.title,
            })
          );
          form.set(
            'cover',
            new File([cover], 'cover.webp', { type: 'image/webp' })
          );
          return await apiUpload<{ cleanupPending?: boolean }>(
            '/api/admin/designs',
            form,
            undefined,
            'PATCH'
          );
        } finally {
          URL.revokeObjectURL(url);
        }
      })();
    },
    onSuccess: (result: any) => {
      if (result?.cleanupPending)
        toast.warning(m['admin.designs.cleanup_pending']());
      setEditingDesign(null);
      toast.success(m['admin.designs.updated']());
      queryClient.invalidateQueries({ queryKey: ['admin-designs'] });
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      queryClient.invalidateQueries({ queryKey: ['hero-designs'] });
      queryClient.invalidateQueries({ queryKey: ['wrap-dashboard'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reportMutation = useMutation({
    mutationFn: (input: {
      id: string;
      status: 'resolved' | 'dismissed';
      designStatus?: ModerationStatus;
    }) => apiPatch('/api/admin/design-reports', input),
    onSuccess: () => {
      toast.success(m['admin.designs.report_updated']());
      queryClient.invalidateQueries({ queryKey: ['hero-designs'] });
      queryClient.invalidateQueries({ queryKey: ['wrap-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-design-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-designs'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const heroMutation = useMutation({
    mutationFn: (input: { id: string; showInHero: boolean }) =>
      apiPatch('/api/admin/designs', input),
    onSuccess: () => {
      toast.success(m['admin.designs.updated']());
      queryClient.invalidateQueries({ queryKey: ['admin-designs'] });
      queryClient.invalidateQueries({ queryKey: ['hero-designs'] });
      queryClient.invalidateQueries({ queryKey: ['wrap-dashboard'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const designColumns: Column<ModeratedDesign>[] = [
    ...(['approved', 'all'].includes(status)
      ? [
          {
            header: m['admin.designs.show_in_hero'](),
            cell: (item: ModeratedDesign) => (
              <span title={m['admin.designs.show_in_hero']()}>
                <Switch
                  checked={item.showInHero}
                  aria-label={`${m['admin.designs.show_in_hero']()} · ${item.title}`}
                  disabled={
                    heroMutation.isPending ||
                    designsQuery.isFetching ||
                    item.moderationStatus !== 'approved' ||
                    item.visibility !== 'public'
                  }
                  onCheckedChange={(checked) =>
                    heroMutation.mutate({
                      id: item.designId!,
                      showInHero: checked,
                    })
                  }
                />
              </span>
            ),
          },
        ]
      : []),
    {
      header: m['admin.designs.texture'](),
      cell: (item) =>
        imageCell(
          item.textureUrl,
          `${item.title} · ${m['admin.designs.texture']()}`
        ),
    },
    {
      header: m['admin.designs.cover'](),
      cell: (item) =>
        imageCell(
          item.coverUrl,
          `${item.title} · ${m['admin.designs.cover']()}`
        ),
    },
    {
      header: m['admin.designs.design'](),
      cell: (item) => (
        <div>
          {item.moderationStatus === 'approved' &&
          item.visibility === 'public' ? (
            <Link
              href={`/gallery/${item.slug}`}
              target="_blank"
              className="font-medium hover:underline"
            >
              {item.title}
            </Link>
          ) : (
            <span className="font-medium">{item.title}</span>
          )}
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            {item.slug}
          </p>
        </div>
      ),
    },
    {
      header: m['admin.designs.vehicle'](),
      cell: (item) => item.vehicleSlug,
    },
    {
      header: m['admin.designs.status'](),
      cell: (item) => (
        <Badge variant="outline">
          {item.visibility === 'private'
            ? m['admin.designs.private']()
            : tStatus(item.moderationStatus)}
        </Badge>
      ),
    },
    {
      header: m['admin.designs.activity'](),
      cell: (item) => `${item.viewCount} / ${item.remixCount}`,
    },
    {
      header: m['admin.designs.updated_at'](),
      cell: (item) => formatDateTime(item.updatedAt),
    },
    {
      header: m['admin.designs.actions'](),
      className: 'min-w-[180px]',
      cell: (item) =>
        item.visibility === 'private' ? null : (
          <div className="flex max-w-[340px] flex-wrap gap-1">
            {['approved', 'all'].includes(status) &&
              item.designId &&
              item.moderationStatus === 'approved' && (
                <Button
                  size="sm"
                  variant="ghost"
                  title={m['admin.designs.edit_title']()}
                  disabled={
                    moderateMutation.isPending || designsQuery.isFetching
                  }
                  onClick={() => openTitleDialog(item, 'edit')}
                >
                  <Pencil className="size-4" />
                  {m['admin.designs.edit_title']()}
                </Button>
              )}
            {['pending', 'rejected', 'reported', 'all'].includes(status) && (
              <Button
                size="sm"
                variant="ghost"
                title={m['admin.designs.review']()}
                disabled={moderateMutation.isPending || designsQuery.isFetching}
                onClick={() => openTitleDialog(item, 'approve')}
              >
                <Check className="size-4 text-emerald-500" />
                {m['admin.designs.review']()}
              </Button>
            )}
            {['pending', 'reported', 'all'].includes(status) && (
              <Button
                size="sm"
                variant="ghost"
                title={m['admin.designs.reject']()}
                disabled={moderateMutation.isPending || designsQuery.isFetching}
                onClick={() =>
                  moderateMutation.mutate({ id: item.id, status: 'rejected' })
                }
              >
                <X className="size-4 text-red-500" />
                {m['admin.designs.reject']()}
              </Button>
            )}
            {['approved', 'all'].includes(status) &&
              item.designId &&
              item.moderationStatus === 'approved' && (
                <Button
                  size="sm"
                  variant="ghost"
                  title={m['admin.designs.hide']()}
                  disabled={
                    moderateMutation.isPending || designsQuery.isFetching
                  }
                  onClick={() =>
                    moderateMutation.mutate({ id: item.id, status: 'hidden' })
                  }
                >
                  <EyeOff className="size-4" />
                  {m['admin.designs.hide']()}
                </Button>
              )}
            {(status === 'hidden' ||
              (status === 'all' && item.moderationStatus === 'hidden')) && (
              <Button
                size="sm"
                variant="ghost"
                title={m['admin.designs.show']()}
                disabled={moderateMutation.isPending || designsQuery.isFetching}
                onClick={() =>
                  moderateMutation.mutate({ id: item.id, status: 'approved' })
                }
              >
                <Eye className="size-4" />
                {m['admin.designs.show']()}
              </Button>
            )}
            {status === 'reported' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setView('reports');
                  setStatus('open');
                  setPage(1);
                }}
              >
                {m['admin.designs.tab_reports']()}
              </Button>
            )}
          </div>
        ),
    },
  ];

  const reportColumns: Column<DesignReport>[] = [
    {
      header: m['admin.designs.texture'](),
      cell: (item) =>
        imageCell(
          item.textureUrl,
          `${item.designTitle} · ${m['admin.designs.texture']()}`
        ),
    },
    {
      header: m['admin.designs.cover'](),
      cell: (item) =>
        imageCell(
          item.coverUrl,
          `${item.designTitle} · ${m['admin.designs.cover']()}`
        ),
    },
    {
      header: m['admin.designs.design'](),
      cell: (item) => <span className="font-medium">{item.designTitle}</span>,
    },
    {
      header: m['admin.designs.reason'](),
      cell: (item) => (
        <div className="max-w-[280px]">
          <p>{item.reason}</p>
          <p className="text-muted-foreground truncate text-xs">
            {item.details || '—'}
          </p>
        </div>
      ),
    },
    {
      header: m['admin.designs.status'](),
      cell: (item) => <Badge variant="outline">{tStatus(item.status)}</Badge>,
    },
    {
      header: m['admin.designs.reported'](),
      cell: (item) => formatDateTime(item.createdAt),
    },
    {
      header: m['admin.designs.actions'](),
      className: 'w-[150px]',
      cell: (item) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={reportMutation.isPending || item.status !== 'open'}
            onClick={() =>
              reportMutation.mutate({
                id: item.id,
                status: 'resolved',
                designStatus: 'hidden',
              })
            }
          >
            {m['admin.designs.hide']()}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={reportMutation.isPending || item.status !== 'open'}
            onClick={() =>
              reportMutation.mutate({
                id: item.id,
                status: 'dismissed',
                designStatus: 'approved',
              })
            }
          >
            {m['admin.designs.dismiss']()}
          </Button>
        </div>
      ),
    },
  ];

  const statuses =
    view === 'designs'
      ? ['pending', 'reported', 'approved', 'rejected', 'hidden', 'all']
      : ['open', 'resolved', 'dismissed', 'all'];

  return (
    <div className="space-y-6 p-6">
      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.title}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[70vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editingDesign)}
        onOpenChange={(open) => {
          if (!open && !moderateMutation.isPending) setEditingDesign(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'approve'
                ? m['admin.designs.review']()
                : m['admin.designs.edit_title']()}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'approve'
                ? m['admin.designs.review_hint']()
                : m['admin.designs.edit_title_hint']()}
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label={m['admin.designs.name']()}
            value={editedTitle}
            maxLength={120}
            disabled={moderateMutation.isPending}
            onChange={(e) => setEditedTitle(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={moderateMutation.isPending}
              onClick={() => setEditingDesign(null)}
            >
              {m['admin.designs.cancel']()}
            </Button>
            <Button
              disabled={!editedTitle.trim() || moderateMutation.isPending}
              onClick={() =>
                editingDesign &&
                moderateMutation.mutate({
                  id: editingDesign.id,
                  status:
                    dialogMode === 'approve'
                      ? 'approved'
                      : editingDesign.moderationStatus,
                  title: editedTitle.trim(),
                  approve: dialogMode === 'approve',
                })
              }
            >
              {moderateMutation.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              {moderateMutation.isPending && dialogMode === 'approve'
                ? m['generator.cover_rendering']()
                : dialogMode === 'approve'
                  ? m['admin.designs.confirm_approve']()
                  : m['admin.designs.save_title']()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{m['admin.designs.title']()}</h1>
          <p className="text-muted-foreground">
            {m['admin.designs.description']()}
          </p>
        </div>
        <AdminAddDesign
          onCreated={() => {
            setView('designs');
            setStatus('approved');
            setPage(1);
            setSearch('');
          }}
        />
      </div>

      <div className="flex gap-2">
        {(['designs', 'reports'] as const).map((item) => (
          <Button
            key={item}
            variant={view === item ? 'default' : 'outline'}
            onClick={() => {
              setView(item);
              setStatus(item === 'designs' ? 'pending' : 'open');
            }}
          >
            {item === 'designs' ? (
              m['admin.designs.tab_designs']()
            ) : (
              <>
                <Flag className="size-4" /> {m['admin.designs.tab_reports']()}
              </>
            )}
          </Button>
        ))}
      </div>

      <div className="border-border flex gap-1 overflow-x-auto border-b">
        {statuses.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatus(item)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize',
              status === item
                ? 'border-primary text-foreground'
                : 'text-muted-foreground border-transparent'
            )}
          >
            {item === 'pending'
              ? m['admin.designs.pending_review']()
              : item === 'reported'
                ? m['admin.designs.reported_designs']()
                : tStatus(item)}
          </button>
        ))}
      </div>

      {status === 'reported' && view === 'designs' && (
        <p className="text-muted-foreground text-sm">
          {m['admin.designs.reported_hint']()}
        </p>
      )}
      <Card>
        <CardContent>
          {view === 'designs' ? (
            <DataTable
              columns={designColumns}
              data={designsQuery.data?.items ?? []}
              total={designsQuery.data?.total ?? 0}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              rowKey={(item) => item.id}
              search={search}
              onSearchChange={setSearch}
              onRefresh={() => designsQuery.refetch()}
              loading={designsQuery.isFetching}
              emptyText={m['admin.designs.empty']()}
            />
          ) : (
            <DataTable
              columns={reportColumns}
              data={reportsQuery.data?.items ?? []}
              total={reportsQuery.data?.total ?? 0}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              rowKey={(item) => item.id}
              onRefresh={() => reportsQuery.refetch()}
              loading={reportsQuery.isFetching}
              emptyText={m['admin.designs.no_reports']()}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/admin/designs')({
  component: DesignsPage,
});
