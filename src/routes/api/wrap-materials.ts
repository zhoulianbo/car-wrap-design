import { createFileRoute } from '@tanstack/react-router';

import { listWrapMaterials } from '@/modules/vehicles/service';
import { respData, respErr } from '@/lib/resp';

async function GET() {
  try {
    return respData(await listWrapMaterials());
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to load materials'
    );
  }
}

export const Route = createFileRoute('/api/wrap-materials')({
  server: { handlers: { GET } },
});
