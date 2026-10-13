import { createFileRoute, Outlet } from '@tanstack/react-router';
import {
  Coins,
  CreditCard,
  Home,
  Key,
  LayoutDashboard,
  LifeBuoy,
  Receipt,
  User,
} from 'lucide-react';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { SupportWidget } from '@/blocks/support-widget';
import { AppLayout } from '@/components/app-layout';

export const Route = createFileRoute('/dashboard')({
  component: SettingsLayout,
});

function SettingsLayout() {
  const group = m['common.systems.settings']();
  const navItems = [
    {
      href: '/dashboard',
      label: m['settings.nav.overview'](),
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard/billing',
      label: m['settings.nav.billing'](),
      icon: CreditCard,
      group,
    },
    {
      href: '/dashboard/payments',
      label: m['settings.nav.payments'](),
      icon: Receipt,
      group,
    },
    {
      href: '/dashboard/credits',
      label: m['settings.nav.credits'](),
      icon: Coins,
      group,
    },
    {
      href: '/dashboard/apikeys',
      label: m['settings.nav.apikeys'](),
      icon: Key,
      group,
    },
    {
      href: '/dashboard/tickets',
      label: m['settings.nav.tickets'](),
      icon: LifeBuoy,
      group,
    },
  ];

  const footerNavItems = [
    {
      href: '/dashboard/profile',
      label: m['settings.nav.profile'](),
      icon: User,
    },
    { href: '/', label: m['common.systems.home'](), icon: Home, newTab: true },
  ];

  return (
    <AppLayout
      navItems={navItems}
      footerNavItems={footerNavItems}
      brand={envConfigs.app_name}
      brandHref="/dashboard"
    >
      <Outlet />
      <SupportWidget />
    </AppLayout>
  );
}
