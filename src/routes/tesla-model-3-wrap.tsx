import { createFileRoute } from '@tanstack/react-router';
import { getPublicGalleryPreview } from '@/features/gallery/queries';

import { marketingHead } from '@/lib/seo';
import { VEHICLE_ASSET_MANIFEST } from '@/lib/vehicle-catalog';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { VehicleLanding } from '@/blocks/vehicle-landing';
import { model3WrapContent } from '@/content/vehicle-landings';

const vehicles = VEHICLE_ASSET_MANIFEST.filter(
  (vehicle) => vehicle.family === 'model-3'
);

export const Route = createFileRoute('/tesla-model-3-wrap')({
  loader: async () => ({
    locale: getLocale(),
    initialDesigns: await getPublicGalleryPreview({
      data: { limit: 10, family: 'model-3' },
    }),
  }),
  head: ({ loaderData }) =>
    marketingHead({
      path: '/tesla-model-3-wrap',
      locale: loaderData?.locale ?? 'en',
      title: m['landing.vehicle_pages.model3.title'](
        {},
        { locale: loaderData?.locale ?? 'en' }
      ),
      description: m['landing.vehicle_pages.model3.description'](
        {},
        { locale: loaderData?.locale ?? 'en' }
      ),
    }),
  component: Model3WrapPage,
});

function Model3WrapPage() {
  const { locale, initialDesigns } = Route.useLoaderData();
  return (
    <VehicleLanding
      initialDesigns={initialDesigns}
      path="/tesla-model-3-wrap"
      content={model3WrapContent[locale]}
      vehicleSlug="model-3-2024-performance"
      vehicles={vehicles.map((vehicle) => ({
        slug: vehicle.slug,
        label: `${vehicle.trim} · ${vehicle.year}`,
        image: `/imgs/vehicles/cards/${vehicle.slug}.webp`,
      }))}
    />
  );
}
