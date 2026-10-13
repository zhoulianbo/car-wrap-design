import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { WrapStudio } from '@/features/wrap-studio';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import type { UserWrapSummary } from '@/lib/wrap-types';
import { m } from '@/paraglide/messages.js';
import { buttonVariants } from '@/components/ui/button';

export const Route = createFileRoute('/wraps/$wrapId/edit')({
  head: () => ({
    meta: [
      { title: `${m['studio.title']()} | Car Wrap Design` },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: WrapEditorPage,
});

function WrapEditorPage() {
  const { wrapId } = Route.useParams();
  const { data: session, isPending } = useSession();
  const query = useQuery({
    queryKey: ['user-wrap', session?.user.id, wrapId],
    queryFn: () => apiGet<UserWrapSummary>(`/api/wraps/${wrapId}`),
    enabled: Boolean(session?.user),
  });
  if (isPending || query.isLoading)
    return (
      <div className="bg-background text-muted-foreground flex min-h-screen items-center justify-center text-sm">
        {m['studio.loading_wrap']()}
      </div>
    );
  if (!session?.user)
    return (
      <div className="bg-background text-foreground flex h-dvh flex-col items-center justify-center gap-5">
        <p>{m['wraps.sign_in_hint']()}</p>
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent(`/wraps/${wrapId}/edit`)}`}
          className={buttonVariants()}
        >
          {m['wraps.sign_in']()}
        </Link>
      </div>
    );
  if (!query.data)
    return (
      <div className="bg-background text-destructive flex min-h-screen items-center justify-center text-sm">
        {query.error?.message || m['studio.wrap_missing']()}
      </div>
    );
  return (
    <WrapStudio
      key={wrapId}
      vehicleSlug={query.data.vehicleSlug}
      wrap={query.data}
    />
  );
}
