import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api-client';
import {
  footerLinkInputSchema,
  importFooterLinkHtml,
  type FooterLinkInput,
  type FooterLinkItem,
} from '@/lib/footer-links';
import { m } from '@/paraglide/messages.js';
import { DataTable, type Column } from '@/components/data-table';
import { TextField } from '@/components/form-field';
import { StyledSelect } from '@/components/styled-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const endpoint = '/api/admin/footer-links';
const queryKey = ['admin-footer-links'];
const emptyForm: FooterLinkInput = {
  group: 'friend',
  title: '',
  url: '',
  imageUrl: '',
  altText: '',
  rel: '',
  sort: 10,
};
type PublishResult = { synced: boolean };
const PAGE_SIZE = 20;

export function AdminFooterLinks() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FooterLinkItem | null>(null);
  const [formDefaults, setFormDefaults] = useState<FooterLinkInput>(emptyForm);
  const [deleting, setDeleting] = useState<FooterLinkItem | null>(null);
  const [html, setHtml] = useState('');
  const [syncFailed, setSyncFailed] = useState(false);
  const list = useQuery({
    queryKey,
    queryFn: () => apiGet<FooterLinkItem[]>(endpoint),
  });

  function publicationResult(result: PublishResult) {
    setSyncFailed(!result.synced);
    if (result.synced) toast.success(m['admin.footer_links.saved']());
    else toast.warning(m['admin.footer_links.sync_failed']());
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const save = useMutation({
    mutationFn: (value: FooterLinkInput) =>
      editing
        ? apiPut<PublishResult>(endpoint, { ...value, id: editing.id })
        : apiPost<PublishResult>(endpoint, value),
    onSuccess: (result) => {
      publicationResult(result);
      setOpen(false);
      setPage(1);
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      apiDelete<PublishResult>(`${endpoint}?id=${encodeURIComponent(id)}`),
    onSuccess: (result) => {
      publicationResult(result);
      setDeleting(null);
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: refresh,
  });
  const sync = useMutation({
    mutationFn: () => apiPost<PublishResult>(endpoint, { action: 'sync' }),
    onSuccess: publicationResult,
    onError: (error: Error) => toast.error(error.message),
    onSettled: refresh,
  });

  const form = useForm({
    defaultValues: formDefaults,
    validators: { onSubmit: footerLinkInputSchema },
    onSubmitInvalid: () => toast.error(m['admin.footer_links.invalid']()),
    onSubmit: async ({ value }) => {
      await save.mutateAsync(value).catch(() => undefined);
    },
  });

  function openForm(link: FooterLinkItem | null) {
    const values = link ? footerLinkInputSchema.parse(link) : { ...emptyForm };
    setEditing(link);
    setFormDefaults(values);
    form.reset(values);
    setHtml('');
    setOpen(true);
  }

  function importHtml() {
    try {
      const imported = importFooterLinkHtml(html);
      const values = { ...form.state.values, ...imported };
      setFormDefaults(values);
      form.reset(values);
      toast.success(m['admin.footer_links.imported']());
    } catch {
      toast.error(m['admin.footer_links.import_error']());
    }
  }

  const busy = save.isPending || remove.isPending || sync.isPending;
  const items = list.data ?? [];
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  );
  const columns: Column<FooterLinkItem>[] = [
    {
      header: m['admin.footer_links.name'](),
      cell: (link) => (
        <span className="block max-w-48 truncate font-medium">
          {link.title}
        </span>
      ),
    },
    {
      header: m['admin.footer_links.group'](),
      cell: (link) =>
        link.group === 'badge'
          ? m['admin.footer_links.badge']()
          : m['admin.footer_links.friend'](),
    },
    {
      header: m['admin.footer_links.url'](),
      cell: (link) => (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-64 truncate underline"
        >
          {link.url}
        </a>
      ),
    },
    { header: m['admin.footer_links.sort'](), cell: (link) => link.sort },
    {
      header: m['admin.footer_links.actions'](),
      cell: (link) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${m['admin.footer_links.edit']()} ${link.title}`}
            disabled={busy}
            onClick={() => openForm(link)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${m['admin.footer_links.delete']()} ${link.title}`}
            disabled={busy}
            onClick={() => setDeleting(link)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">
            {m['admin.footer_links.title']()}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {m['admin.footer_links.description']()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => sync.mutate()}
            disabled={busy}
          >
            {m['admin.footer_links.sync']()}
          </Button>
          <Button onClick={() => openForm(null)} disabled={busy}>
            <Plus className="size-4" />
            {m['admin.footer_links.add']()}
          </Button>
        </div>
      </div>
      {syncFailed && (
        <p role="alert" className="text-destructive text-sm">
          {m['admin.footer_links.sync_failed']()}
        </p>
      )}
      {list.isError && (
        <p role="alert" className="text-destructive text-sm">
          {list.error.message}
        </p>
      )}
      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={items.slice(
              (currentPage - 1) * PAGE_SIZE,
              currentPage * PAGE_SIZE
            )}
            total={items.length}
            page={currentPage}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            rowKey={(link) => link.id}
            loading={list.isFetching}
            onRefresh={() => list.refetch()}
            emptyText={
              list.isPending
                ? m['admin.loading']()
                : m['admin.footer_links.empty']()
            }
          />
        </CardContent>
      </Card>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!save.isPending) setOpen(next);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? m['admin.footer_links.edit']()
                : m['admin.footer_links.add']()}
            </DialogTitle>
            <DialogDescription>
              {m['admin.footer_links.description']()}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-4"
          >
            <fieldset disabled={save.isPending} className="space-y-4">
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {m['admin.footer_links.import_html']()}
                </summary>
                <label
                  htmlFor="footer-link-html"
                  className="text-muted-foreground mt-3 block text-sm"
                >
                  {m['admin.footer_links.import_hint']()}
                </label>
                <Textarea
                  id="footer-link-html"
                  value={html}
                  onChange={(event) => setHtml(event.target.value)}
                  className="my-2 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={importHtml}
                  disabled={!html.trim() || save.isPending}
                >
                  {m['admin.footer_links.import_button']()}
                </Button>
              </details>
              <form.Field name="group">
                {(field) => (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">
                      {m['admin.footer_links.group']()}
                    </span>
                    <StyledSelect
                      label={m['admin.footer_links.group']()}
                      value={field.state.value}
                      disabled={save.isPending}
                      options={[
                        {
                          value: 'friend',
                          label: m['admin.footer_links.friend'](),
                        },
                        {
                          value: 'badge',
                          label: m['admin.footer_links.badge'](),
                        },
                      ]}
                      onValueChange={(value) =>
                        field.handleChange(
                          value === 'badge' ? 'badge' : 'friend'
                        )
                      }
                    />
                  </div>
                )}
              </form.Field>
              <form.Field name="title">
                {(field) => (
                  <TextField
                    field={field}
                    label={m['admin.footer_links.name']()}
                    required
                  />
                )}
              </form.Field>
              <form.Field name="url">
                {(field) => (
                  <TextField
                    field={field}
                    label={m['admin.footer_links.url']()}
                    type="url"
                    placeholder="https://example.com"
                    required
                  />
                )}
              </form.Field>
              <form.Subscribe selector={(state) => state.values.group}>
                {(group) =>
                  group === 'badge' ? (
                    <>
                      <form.Field name="imageUrl">
                        {(field) => (
                          <TextField
                            field={field}
                            label={m['admin.footer_links.image_url']()}
                            type="url"
                            required
                          />
                        )}
                      </form.Field>
                      <form.Field name="altText">
                        {(field) => (
                          <TextField
                            field={field}
                            label={m['admin.footer_links.alt_text']()}
                          />
                        )}
                      </form.Field>
                    </>
                  ) : null
                }
              </form.Subscribe>
              <form.Field name="rel">
                {(field) => (
                  <TextField
                    field={field}
                    label={m['admin.footer_links.rel']()}
                    placeholder="noopener"
                  />
                )}
              </form.Field>
              <p className="text-muted-foreground text-xs">
                {m['admin.footer_links.rel_hint']()}
              </p>
              <form.Field name="sort">
                {(field) => (
                  <div className="space-y-2">
                    <label
                      htmlFor="footer-link-sort"
                      className="text-sm font-medium"
                    >
                      {m['admin.footer_links.sort']()}
                    </label>
                    <Input
                      id="footer-link-sort"
                      type="number"
                      min={0}
                      max={9999}
                      step={1}
                      required
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.valueAsNumber)
                      }
                    />
                  </div>
                )}
              </form.Field>
            </fieldset>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => setOpen(false)}
              >
                {m['admin.footer_links.cancel']()}
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending
                  ? m['admin.loading']()
                  : m['admin.footer_links.save']()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next && !remove.isPending) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m['admin.footer_links.delete']()}</DialogTitle>
            <DialogDescription>
              {m['admin.footer_links.delete_hint']({
                title: deleting?.title ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              {m['admin.footer_links.cancel']()}
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              {m['admin.footer_links.delete']()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
