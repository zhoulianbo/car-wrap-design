import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Cpu, Database, RefreshCw } from 'lucide-react';

import { tStatus } from '@/core/i18n/dynamic';
import { apiGet } from '@/lib/api-client';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface GenerationOperation {
  id: string;
  userId: string;
  mode: string;
  providerPredictionId: string | null;
  costCredits: number;
  status: string;
  refundStatus: string;
  errorSummary: string | null;
  createdAt: string;
}

interface OperationsResult {
  health: {
    replicateConfigured: boolean;
    storageConfigured: boolean;
  };
  generations: {
    items: GenerationOperation[];
    total: number;
  };
}

const PAGE_SIZE = 20;

function WrapOperationsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const query = useQuery({
    queryKey: ['admin-wrap-operations', page, status],
    queryFn: () =>
      apiGet<OperationsResult>(
        `/api/admin/wrap-operations?page=${page}&pageSize=${PAGE_SIZE}&status=${status}`
      ),
    placeholderData: keepPreviousData,
  });
  const columns: Column<GenerationOperation>[] = [
    {
      header: m['admin.wrap_operations.task'](),
      cell: (item) => (
        <div className="max-w-[190px]">
          <p className="truncate font-mono text-xs">{item.id}</p>
          <p className="text-muted-foreground mt-1 truncate font-mono text-[11px]">
            {item.providerPredictionId ||
              m['admin.wrap_operations.provider_not_created']()}
          </p>
        </div>
      ),
    },
    {
      header: m['admin.wrap_operations.mode'](),
      cell: (item) => tStatus(item.mode),
    },
    {
      header: m['admin.wrap_operations.credits'](),
      cell: (item) => item.costCredits,
    },
    {
      header: m['admin.wrap_operations.status'](),
      cell: (item) => <Badge variant="outline">{tStatus(item.status)}</Badge>,
    },
    {
      header: m['admin.wrap_operations.refund'](),
      cell: (item) => (
        <Badge variant="secondary">{tStatus(item.refundStatus)}</Badge>
      ),
    },
    {
      header: m['admin.wrap_operations.created'](),
      cell: (item) => formatDateTime(item.createdAt),
    },
  ];

  const health = query.data?.health;
  const generationPage = query.data?.generations;

  return (
    <div className="space-y-7 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {m['admin.wrap_operations.title']()}
          </h1>
          <p className="text-muted-foreground">
            {m['admin.wrap_operations.description']()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          <RefreshCw className="size-4" />
          {m['common.table.refresh']()}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            label: m['admin.wrap_operations.replicate'](),
            ready: health?.replicateConfigured,
            icon: Cpu,
          },
          {
            label: m['admin.wrap_operations.storage'](),
            ready: health?.storageConfigured,
            icon: Database,
          },
        ].map(({ label, ready, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="bg-muted rounded-xl p-3">
                <Icon className="size-5" />
              </div>
              <div>
                <p className="font-medium">{label}</p>
                <p
                  className={cn(
                    'mt-1 text-xs',
                    ready ? 'text-emerald-500' : 'text-amber-500'
                  )}
                >
                  {ready
                    ? m['admin.wrap_operations.configured']()
                    : m['admin.wrap_operations.not_configured']()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            {m['admin.wrap_operations.generations']()}
          </h2>
          <p className="text-muted-foreground text-sm">
            {m['admin.wrap_operations.generations_description']()}
          </p>
        </div>
        <div className="border-border flex gap-1 overflow-x-auto border-b">
          {['all', 'queued', 'processing', 'succeeded', 'failed'].map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setStatus(item);
                  setPage(1);
                }}
                className={cn(
                  '-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize',
                  status === item
                    ? 'border-primary text-foreground'
                    : 'text-muted-foreground border-transparent'
                )}
              >
                {tStatus(item)}
              </button>
            )
          )}
        </div>
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={generationPage?.items ?? []}
              total={generationPage?.total ?? 0}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              rowKey={(item) => item.id}
              onRefresh={() => query.refetch()}
              loading={query.isFetching}
              emptyText={m['admin.wrap_operations.no_generations']()}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export const Route = createFileRoute('/admin/wrap-operations')({
  component: WrapOperationsPage,
});
