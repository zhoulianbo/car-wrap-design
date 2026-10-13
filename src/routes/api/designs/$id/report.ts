import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import { reportDesign } from '@/modules/design-gallery/service';
import { respData, respErr } from '@/lib/resp';

const schema = z.object({
  reason: z.enum(['copyright', 'unsafe', 'spam', 'other']),
  details: z.string().trim().max(2000).optional(),
  idempotencyKey: z.string().min(8).max(120),
});

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
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return respErr('Invalid report request', { status: 400 });
    return respData(
      await reportDesign({
        userId: session.user.id,
        designId: params.id,
        ...parsed.data,
      }),
      { status: 201 }
    );
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to report design'
    );
  }
}

export const Route = createFileRoute('/api/designs/$id/report')({
  server: { handlers: { POST } },
});
