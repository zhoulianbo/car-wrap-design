import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Coins, Images, Plus, Sparkles, TrendingDown } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import {
  DashboardWrapCard,
  type DashboardWrap,
} from '@/blocks/dashboard-wrap-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Dashboard = {
  wrapCount: number;
  generationCount: number;
  balance: number;
  todayConsumed: number;
  items: DashboardWrap[];
};
const PAGE_SIZE = 12;

function DashboardPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['wrap-dashboard', session?.user.id, page],
    queryFn: () =>
      apiGet<Dashboard>(
        `/api/wraps?view=dashboard&page=${page}&pageSize=${PAGE_SIZE}&utcOffset=${-new Date().getTimezoneOffset()}`
      ),
    enabled: Boolean(session?.user),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
  const stats = query.data;
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {m['settings.title']()}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {m['settings.welcome']({
            name: session?.user?.name || session?.user?.email || '',
          })}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: m['settings.overview.wrap_count'](),
            value: stats?.wrapCount,
            hint: m['settings.overview.wrap_count_hint'](),
            icon: Images,
          },
          {
            label: m['settings.overview.generation_count'](),
            value: stats?.generationCount,
            hint: m['settings.overview.generation_count_hint'](),
            icon: Sparkles,
          },
          {
            label: m['settings.overview.total_credits'](),
            value: stats?.balance,
            hint: m['settings.overview.total_credits_hint'](),
            icon: Coins,
          },
          {
            label: m['settings.overview.today_consumed'](),
            value: stats?.todayConsumed,
            hint: m['settings.overview.today_consumed_hint'](),
            icon: TrendingDown,
          },
        ].map(({ label, value, hint, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {value ?? '—'}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <section className="space-y-4" aria-labelledby="dashboard-wraps-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="dashboard-wraps-title" className="text-lg font-semibold">
              {m['wraps.title']()}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {m['settings.overview.wraps_description']()}
            </p>
          </div>
          <Link
            href="/ai-car-wrap-generator"
            className={buttonVariants({ size: 'sm' })}
          >
            <Plus className="size-4" />
            {m['wraps.create']()}
          </Link>
        </div>
        {query.isError ? (
          <div role="alert" className="border-border rounded-xl border p-6">
            <p className="mb-3">{m['settings.overview.load_failed']()}</p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              {m['wraps.retry']()}
            </Button>
          </div>
        ) : query.isPending ? (
          <p role="status" className="text-muted-foreground py-12 text-center">
            {m['studio.loading_wrap']()}
          </p>
        ) : stats?.items.length ? (
          <div
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            aria-busy={query.isFetching}
          >
            {stats.items.map((wrap) => (
              <DashboardWrapCard key={wrap.id} wrap={wrap} />
            ))}
          </div>
        ) : (
          <p className="border-border text-muted-foreground rounded-xl border border-dashed p-12 text-center">
            {m['wraps.empty']()}
          </p>
        )}
        {(stats?.wrapCount ?? 0) > PAGE_SIZE && (
          <div className="flex items-center justify-end gap-3">
            <span className="text-muted-foreground text-sm">
              {m['common.table.page_info']({
                current: page,
                total: Math.ceil((stats?.wrapCount ?? 0) / PAGE_SIZE),
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || query.isFetching}
              onClick={() => setPage(page - 1)}
            >
              {m['common.table.previous']()}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                page * PAGE_SIZE >= (stats?.wrapCount ?? 0) || query.isFetching
              }
              onClick={() => setPage(page + 1)}
            >
              {m['common.table.next']()}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
});
