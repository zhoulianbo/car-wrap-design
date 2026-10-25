/// <reference types="vite/client" />
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { ThemeProvider } from 'next-themes';

import { envConfigs } from '@/config';
import { getQueryClient } from '@/lib/query-client';
import { noindexRobotsForPath } from '@/lib/seo-indexing';
import { getLocale } from '@/paraglide/runtime.js';
import { Ads } from '@/components/analytics/ads';
import { GoogleAnalytics } from '@/components/analytics/google-analytics';
import { Plausible } from '@/components/analytics/plausible';
import { CustomerService } from '@/components/customer-service';
import { SandboxPreviewBridge } from '@/components/sandbox-preview-bridge';
import { Toaster } from '@/components/ui/sonner';

import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@/styles/globals.css';

const GoogleOneTap = lazy(() =>
  import('@/components/google-one-tap').then((module) => ({
    default: module.GoogleOneTap,
  }))
);

// Analytics IDs live in the DB config (1h-cached service). Fetched via a
// server function so drizzle/db code never reaches the client bundle.
const getAnalyticsConfigs = createServerFn().handler(async () => {
  const { getAllConfigs } = await import('@/modules/config/service');
  const { getPublicFooterLinks } =
    await import('@/modules/footer-links/service');
  const [configs, footerLinks] = await Promise.all([
    getAllConfigs(),
    getLocale() === 'en' ? getPublicFooterLinks() : Promise.resolve([]),
  ]);
  return {
    footerLinks,
    gaId: configs.google_analytics_id?.trim() || '',
    plausibleDomain: configs.plausible_domain?.trim() || '',
    plausibleSrc: configs.plausible_src?.trim() || '',
    adsenseCode: configs.adsense_code?.trim() || '',
    crispWebsiteId:
      configs.crisp_enabled === 'true'
        ? configs.crisp_website_id?.trim() || ''
        : '',
    tawkPropertyId:
      configs.tawk_enabled === 'true'
        ? configs.tawk_property_id?.trim() || ''
        : '',
    tawkWidgetId:
      configs.tawk_enabled === 'true'
        ? configs.tawk_widget_id?.trim() || ''
        : '',
  };
});

export const Route = createRootRoute({
  loader: () => getAnalyticsConfigs(),
  head: ({ matches }) => {
    const robots = noindexRobotsForPath(matches.at(-1)?.pathname ?? '/');
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: envConfigs.app_name },
        { name: 'description', content: envConfigs.app_description },
        ...(robots ? [{ name: 'robots', content: robots }] : []),
      ],
      links: [
        ...(envConfigs.assets_url
          ? [
              {
                rel: 'preconnect',
                href: envConfigs.assets_url,
                crossOrigin: 'anonymous' as const,
              },
            ]
          : []),
        {
          rel: 'icon',
          href: '/favicon-32x32.png?v=20261007-4',
          type: 'image/png',
          sizes: '32x32',
        },
        {
          rel: 'shortcut icon',
          href: '/favicon.ico?v=20261007-4',
          type: 'image/x-icon',
        },
        {
          rel: 'apple-touch-icon',
          href: '/apple-touch-icon.png?v=20261007-4',
          sizes: '180x180',
        },
      ],
    };
  },
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootComponent() {
  const analytics = Route.useLoaderData();

  return (
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <Outlet />
        <SandboxPreviewBridge />
        <Toaster position="top-center" richColors />
        <DeferredGoogleOneTap />
        {analytics?.gaId ? (
          <GoogleAnalytics measurementId={analytics.gaId} />
        ) : null}
        {analytics?.plausibleDomain || analytics?.plausibleSrc ? (
          <Plausible
            domain={analytics.plausibleDomain}
            src={analytics.plausibleSrc || undefined}
          />
        ) : null}
        {analytics?.adsenseCode ? <Ads code={analytics.adsenseCode} /> : null}
        <CustomerService
          crispWebsiteId={analytics?.crispWebsiteId || undefined}
          tawkPropertyId={analytics?.tawkPropertyId || undefined}
          tawkWidgetId={analytics?.tawkWidgetId || undefined}
        />
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

function DeferredGoogleOneTap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const enable = () => setReady(true);
    const timeout = window.setTimeout(enable, 15_000);
    window.addEventListener('pointerdown', enable, {
      once: true,
      passive: true,
    });
    window.addEventListener('keydown', enable, { once: true });
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('pointerdown', enable);
      window.removeEventListener('keydown', enable);
    };
  }, []);

  return ready ? (
    <Suspense fallback={null}>
      <GoogleOneTap />
    </Suspense>
  ) : null;
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <a href="/" className="text-sm underline underline-offset-4">
        Back to home
      </a>
    </div>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Oops</h1>
      <p className="text-muted-foreground">
        Something went wrong. Please try again.
      </p>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="bg-muted mt-2 max-w-lg overflow-auto rounded p-4 text-xs">
          {error.message}
        </pre>
      )}
      <button
        type="button"
        onClick={reset}
        className="text-sm underline underline-offset-4"
      >
        Try again
      </button>
    </div>
  );
}
