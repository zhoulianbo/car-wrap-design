import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import {
  getWrapShare,
  ShareConflictError,
  ShareNotFoundError,
  updateWrapShare,
} from '@/modules/user-wraps/sharing';
import { respData, respErr } from '@/lib/resp';

const input = z.object({
  version: z.number().int().positive(),
  action: z.enum(['generate', 'regenerate', 'enable', 'disable']),
  token: z
    .string()
    .regex(/^[a-f0-9]{32}$/)
    .optional(),
});
const headers = { 'Cache-Control': 'private, no-store' };
async function handle({
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
    if (!session?.user)
      return respErr('Unauthorized', { status: 401, headers });
    if (request.method === 'GET')
      return respData(await getWrapShare(session.user.id, params.id), {
        headers,
      });
    const parsed = input.safeParse(await request.json());
    if (!parsed.success)
      return respErr('Invalid share request', { status: 400, headers });
    return respData(
      await updateWrapShare({
        userId: session.user.id,
        wrapId: params.id,
        ...parsed.data,
      }),
      { headers }
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Sharing failed', {
      status:
        error instanceof ShareNotFoundError
          ? 404
          : error instanceof ShareConflictError
            ? 409
            : 500,
      headers,
    });
  }
}
export const Route = createFileRoute('/api/wraps/$id/share')({
  server: { handlers: { GET: handle, POST: handle } },
});
