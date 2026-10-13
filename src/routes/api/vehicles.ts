import { createFileRoute } from '@tanstack/react-router';

import { listVehicles } from '@/modules/vehicles/service';
import { respData, respErr } from '@/lib/resp';

async function GET() {
  try {
    return respData(await listVehicles());
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to load vehicles'
    );
  }
}

export const Route = createFileRoute('/api/vehicles')({
  server: { handlers: { GET } },
});
