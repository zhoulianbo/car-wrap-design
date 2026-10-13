import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import { remixDesign } from '@/modules/design-gallery/service';
import { respData, respErr } from '@/lib/resp';

async function POST({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const parsed = z
      .object({ idempotencyKey: z.string().min(8).max(120) })
      .safeParse(await request.json());
    if (!parsed.success)
      return respErr('Invalid remix request', { status: 400 });
    return respData(
      await remixDesign({
        userId: session.user.id,
        designId: params.id,
        idempotencyKey: parsed.data.idempotencyKey,
      })
    );
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to remix design'
    );
  }
}

export const Route = createFileRoute('/api/designs/$id/remix')({
  server: { handlers: { POST } },
});
