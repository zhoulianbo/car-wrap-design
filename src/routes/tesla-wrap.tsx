import { createFileRoute } from '@tanstack/react-router';
import { getPublicGalleryPreview } from '@/features/gallery/queries';

import { marketingHead } from '@/lib/seo';
import { VEHICLE_ASSET_MANIFEST } from '@/lib/vehicle-catalog';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { VehicleLanding } from '@/blocks/vehicle-landing';
import { teslaWrapContent } from '@/content/vehicle-landings';

export const Route = createFileRoute('/tesla-wrap')({
  loader: async () => ({
    locale: getLocale(),
    initialDesigns: await getPublicGalleryPreview({
      data: { limit: 10 },
    }),
  }),
  head: ({ loaderData }) =>
    marketingHead({
      path: '/tesla-wrap',
      locale: loaderData?.locale ?? 'en',
      title: m['landing.vehicle_pages.tesla.title'](
        {},
        { locale: loaderData?.locale ?? 'en' }
      ),
      description: m['landing.vehicle_pages.tesla.description'](
        {},
        { locale: loaderData?.locale ?? 'en' }
      ),
    }),
  component: TeslaWrapPage,
});

function TeslaWrapPage() {
  const { locale, initialDesigns } = Route.useLoaderData();
  return (
    <VehicleLanding
      initialDesigns={initialDesigns}
      path="/tesla-wrap"
      content={teslaWrapContent[locale]}
      vehicleSlug="model-3-2024-performance"
      vehicles={VEHICLE_ASSET_MANIFEST.map((vehicle) => ({
        slug: vehicle.slug,
        label: `${vehicle.trim} · ${vehicle.year}`,
        image: `/imgs/vehicles/cards/${vehicle.slug}.webp`,
      }))}
    />
  );
}
