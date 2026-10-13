import { createFileRoute } from '@tanstack/react-router';
import { getPublicGalleryPreview } from '@/features/gallery/queries';

import { marketingHead } from '@/lib/seo';
import { VEHICLE_ASSET_MANIFEST } from '@/lib/vehicle-catalog';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { VehicleLanding } from '@/blocks/vehicle-landing';
import { modelYWrapContent } from '@/content/vehicle-landings';

const vehicles = VEHICLE_ASSET_MANIFEST.filter(
  (vehicle) => vehicle.family === 'model-y'
);

export const Route = createFileRoute('/tesla-model-y-wrap')({
  loader: async () => ({
    locale: getLocale(),
    initialDesigns: await getPublicGalleryPreview({
      data: { limit: 10, family: 'model-y' },
    }),
  }),
  head: ({ loaderData }) =>
    marketingHead({
      path: '/tesla-model-y-wrap',
      locale: loaderData?.locale ?? 'en',
      title: m['landing.vehicle_pages.modelY.title'](
        {},
        { locale: loaderData?.locale ?? 'en' }
      ),
      description: m['landing.vehicle_pages.modelY.description'](
        {},
        { locale: loaderData?.locale ?? 'en' }
      ),
    }),
  component: ModelYWrapPage,
});

function ModelYWrapPage() {
  const { locale, initialDesigns } = Route.useLoaderData();
  return (
    <VehicleLanding
      initialDesigns={initialDesigns}
      path="/tesla-model-y-wrap"
      content={modelYWrapContent[locale]}
      vehicleSlug="model-y-2025-premium"
      vehicles={vehicles.map((vehicle) => ({
        slug: vehicle.slug,
        label: `${vehicle.trim} · ${vehicle.year}`,
        image: `/imgs/vehicles/cards/${vehicle.slug}.webp`,
      }))}
    />
  );
}
