import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import type { UserWrapSummary } from '@/lib/wrap-types';
import { m } from '@/paraglide/messages.js';
import { DashboardWrapCard } from '@/blocks/dashboard-wrap-card';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Button, buttonVariants } from '@/components/ui/button';

export const Route = createFileRoute('/wraps/')({
  head: () => ({
    meta: [
      { title: m['wraps.title']() },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: WrapsPage,
});

function WrapsPage() {
  const { data: session, isPending } = useSession();
  const query = useQuery({
    queryKey: ['user-wraps', session?.user.id],
    queryFn: () => apiGet<UserWrapSummary[]>('/api/wraps'),
    enabled: Boolean(session?.user),
  });
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main className="page-container pt-32 pb-24">
        <div className="flex items-center justify-between gap-5">
          <h1 className="font-headline text-4xl font-semibold">
            {m['wraps.title']()}
          </h1>
          <Link href="/create/model-3-2024-base" className={buttonVariants()}>
            <Plus className="size-4" />
            {m['wraps.create']()}
          </Link>
        </div>
        {isPending ? (
          <p className="text-muted-foreground mt-16">
            {m['studio.loading_wrap']()}
          </p>
        ) : !session?.user ? (
          <div className="border-border mt-16 rounded-2xl border p-10 text-center">
            <p>{m['wraps.sign_in_hint']()}</p>
            <Link
              href="/sign-in?callbackUrl=/wraps"
              className={`${buttonVariants()} mt-6`}
            >
              {m['wraps.sign_in']()}
            </Link>
          </div>
        ) : query.isLoading ? (
          <p className="text-muted-foreground mt-16">
            {m['studio.loading_wrap']()}
          </p>
        ) : query.isError ? (
          <div className="text-destructive mt-16">
            <p>{query.error.message}</p>
            <Button onClick={() => void query.refetch()} variant="outline">
              {m['wraps.retry']()}
            </Button>
          </div>
        ) : query.data?.length ? (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.map((wrap) => (
              <DashboardWrapCard key={wrap.id} wrap={wrap} />
            ))}
          </div>
        ) : (
          <p className="border-border text-muted-foreground mt-16 rounded-2xl border border-dashed p-12 text-center">
            {m['wraps.empty']()}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
