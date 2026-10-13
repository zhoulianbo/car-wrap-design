import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SharedWrapPage } from '@/blocks/shared-wrap-page';

export const Route = createFileRoute('/share/$token')({
  loader: () => ({
    title: m['sharing.page_title']({}, { locale: getLocale() }),
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.title ?? 'Shared design'} | ${envConfigs.app_name}`,
      },
      { name: 'robots', content: 'noindex,nofollow' },
      { name: 'referrer', content: 'no-referrer' },
    ],
  }),
  headers: () => ({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  }),
  component: SharePage,
});
function SharePage() {
  return <SharedWrapPage token={Route.useParams().token} />;
}
