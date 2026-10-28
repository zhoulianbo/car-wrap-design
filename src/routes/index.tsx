import { createFileRoute } from '@tanstack/react-router';

import { marketingHead } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales } from '@/paraglide/runtime.js';
import { CTA } from '@/blocks/cta';
import { FAQ } from '@/blocks/faq';
import { Features } from '@/blocks/features';
import { Footer } from '@/blocks/footer';
import { GalleryPreview } from '@/blocks/gallery-preview';
import { Header } from '@/blocks/header';
import { Hero } from '@/blocks/hero';
import {
  VehicleShowcase,
  WorkflowShowcase,
  WrapEditorShowcase,
} from '@/blocks/product-showcase';
import { SupportWidget } from '@/blocks/support-widget';
import { StructuredData } from '@/components/seo/structured-data';

/**
 * Default landing page — demo content. Rewrite this file (and the blocks in
 * src/blocks/) for your project. The primitives in src/components/ stay.
 * See /quick-start or /clone-website to automate the rewrite.
 */
function HomePage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main>
        <Hero />
        <GalleryPreview limit={10} deferUntilVisible />
        <WrapEditorShowcase />
        <WorkflowShowcase />
        <Features />
        <VehicleShowcase />
        <FAQ />
        <CTA />
      </main>
      <Footer />
      <SupportWidget />
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': 'https://carwrapdesign.app/#organization',
              name: 'Car Wrap Design',
              url: 'https://carwrapdesign.app/',
              logo: 'https://carwrapdesign.app/logo.png?v=20261007-3',
              image: 'https://carwrapdesign.app/og-image.png?v=20261007-3',
            },
            {
              '@type': 'WebSite',
              '@id': 'https://carwrapdesign.app/#website',
              name: 'Car Wrap Design',
              url: 'https://carwrapdesign.app/',
              publisher: { '@id': 'https://carwrapdesign.app/#organization' },
              inLanguage: [...locales],
            },
            {
              '@type': 'WebApplication',
              name: 'Car Wrap Design',
              applicationCategory: 'DesignApplication',
              operatingSystem: 'Web',
              url: 'https://carwrapdesign.app/create',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description:
                  'Free browser editor and 3D preview; AI generation uses credits.',
              },
            },
          ],
        }}
      />
    </div>
  );
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    return marketingHead({
      path: '/',
      locale,
      title: m['landing.meta.title']({}, { locale }),
      description: m['landing.meta.description']({}, { locale }),
    });
  },
  component: HomePage,
});
