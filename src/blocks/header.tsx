import { m } from '@/paraglide/messages.js';
import { SiteHeader } from '@/components/site-header';

export function Header() {
  const navLinks = [
    { href: '/', label: m['landing.nav.home']() },
    { href: '/gallery', label: m['landing.nav.gallery']() },
    {
      label: m['landing.nav.cars'](),
      children: [
        { href: '/tesla-wrap', label: m['landing.nav.tesla_wrap']() },
        {
          href: '/tesla-model-y-wrap',
          label: m['landing.nav.tesla_model_y_wrap'](),
        },
        {
          href: '/tesla-model-3-wrap',
          label: m['landing.nav.tesla_model_3_wrap'](),
        },
      ],
    },
    { href: '/blog', label: m['landing.nav.blog']() },
    { href: '/pricing', label: m['landing.nav.pricing']() },
    {
      href: '/ai-car-wrap-generator',
      label: m['landing.nav.ai_generator'](),
      accent: true,
    },
  ];

  return <SiteHeader navLinks={navLinks} />;
}
