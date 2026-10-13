import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import { getGenerationWrap } from '@/modules/user-wraps/service';
import { respData, respErr } from '@/lib/resp';

const schema = z.object({
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
    if (!parsed.success) return respErr('Invalid save data', { status: 400 });
    const saved = await getGenerationWrap(session.user.id, params.id);
    return respData({ id: saved.id }, { status: 201 });
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to save wrap'
    );
  }
}

export const Route = createFileRoute('/api/ai-generations/$id/save')({
  server: { handlers: { POST } },
});
