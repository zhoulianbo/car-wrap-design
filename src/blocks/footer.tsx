import { useLoaderData } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SiteFooter, type FooterColumn } from '@/components/site-footer';

export function Footer() {
  const shell = useLoaderData({ from: '__root__' });
  const columns: FooterColumn[] = [
    {
      title: m['landing.footer.product'](),
      links: [
        {
          label: m['landing.nav.ai_generator'](),
          href: '/ai-car-wrap-generator',
        },
        { label: m['landing.nav.gallery'](), href: '/gallery' },
      ],
    },
    {
      title: m['landing.footer.popular_vehicles'](),
      links: [
        {
          label: m['landing.nav.tesla_model_y_wrap'](),
          href: '/tesla-model-y-wrap',
        },
        {
          label: m['landing.nav.tesla_model_3_wrap'](),
          href: '/tesla-model-3-wrap',
        },
      ],
    },
    {
      title: m['landing.footer.resources'](),
      links: [
        { label: m['landing.nav.blog'](), href: '/blog' },
        { label: m['landing.nav.pricing'](), href: '/pricing' },
      ],
    },
    {
      title: m['landing.footer.company_legal'](),
      links: [
        { label: m['landing.footer.privacy'](), href: '/privacy-policy' },
        { label: m['landing.footer.terms'](), href: '/terms-of-service' },
      ],
    },
  ];

  return (
    <SiteFooter
      tagline={m['landing.footer.tagline']()}
      footerLinks={getLocale() === 'en' ? shell?.footerLinks : []}
      brandLinks={[
        { label: 'llms.txt', href: '/llms.txt' },
        { label: 'llms-full.txt', href: '/llms-full.txt' },
      ]}
      columns={columns}
      email="support@carwrapdesign.app"
      copyright={m['landing.footer.copyright']({
        year: new Date().getFullYear(),
      })}
      showBuiltWith={false}
    />
  );
}
