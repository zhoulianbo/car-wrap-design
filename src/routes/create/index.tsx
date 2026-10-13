import { createFileRoute, redirect } from '@tanstack/react-router';

import { DEFAULT_VEHICLE_SLUG } from '@/lib/vehicle-catalog';

export const Route = createFileRoute('/create/')({
  beforeLoad: () => {
    throw redirect({
      to: '/create/$vehicleSlug',
      params: { vehicleSlug: DEFAULT_VEHICLE_SLUG },
      search: { generation: undefined, design: undefined },
      replace: true,
    });
  },
});
