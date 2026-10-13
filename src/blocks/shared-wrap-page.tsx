import { useQuery } from '@tanstack/react-query';

import { Link } from '@/core/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import { vehicleWrapName } from '@/lib/wrap-naming';
import type { SharedWrapPreview } from '@/lib/wrap-types';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { WrapImagePreview } from '@/blocks/wrap-image-preview';
import { Button, buttonVariants } from '@/components/ui/button';

export function SharedWrapPage({ token }: { token: string }) {
  const query = useQuery({
    queryKey: ['shared-wrap', token],
    queryFn: () =>
      apiGet<SharedWrapPreview>(`/api/share/${encodeURIComponent(token)}`),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <Header />
      <main className="page-container pt-28 pb-16 sm:pt-36">
        <h1 className="font-headline text-3xl font-semibold sm:text-4xl">
          {m['sharing.page_title']()}
        </h1>
        {query.isPending ? (
          <p role="status" className="py-16">
            {m['sharing.loading']()}
          </p>
        ) : query.isError ? (
          <div role="alert" className="grid justify-items-start gap-4 py-16">
            <h2 className="text-xl font-medium">
              {m['sharing.unavailable']()}
            </h2>
            <p className="text-muted-foreground">
              {m['sharing.unavailable_description']()}
            </p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              {m['sharing.retry']()}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mt-3 mb-8">
              {vehicleWrapName(query.data.vehicleSlug)} ·{' '}
              {m['sharing.view_hint']()}
            </p>
            <WrapImagePreview
              key={`${token}-${query.data.version}`}
              vehicleSlug={query.data.vehicleSlug}
              finish={query.data.finish}
              color={query.data.color}
              imageUrl={`/api/share/${encodeURIComponent(token)}?texture=1&v=${query.data.version}`}
              className="h-[60dvh] min-h-80 rounded-3xl"
            />
          </>
        )}
        <Link
          href="/create"
          className={`${buttonVariants({ size: 'lg' })} mt-8`}
        >
          {m['sharing.create_own']()}
        </Link>
      </main>
      <Footer />
    </div>
  );
}
