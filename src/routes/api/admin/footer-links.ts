import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import {
  deleteFooterLink,
  listFooterLinks,
  saveFooterLink,
  syncFooterLinksToKv,
} from '@/modules/footer-links/service';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr } from '@/lib/resp';

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const idSchema = z.string().trim().min(1).max(200);

async function handle(request: Request) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user)
      return respErr('Unauthorized', { ...noStore, status: 401 });
    const permission =
      request.method === 'GET' ? 'admin.settings.read' : 'admin.settings.write';
    if (!(await hasPermission(session.user.id, permission))) {
      return respErr('Forbidden', { ...noStore, status: 403 });
    }
    if (request.method === 'GET')
      return respData(await listFooterLinks(), noStore);
    if (request.method === 'DELETE') {
      const id = idSchema.parse(new URL(request.url).searchParams.get('id'));
      return respData(await deleteFooterLink(id), noStore);
    }
    const body = await request.json();
    if (request.method === 'POST' && body?.action === 'sync') {
      return respData(await syncFooterLinksToKv(), noStore);
    }
    const id = request.method === 'PUT' ? idSchema.parse(body?.id) : undefined;
    return respData(await saveFooterLink(body, id), noStore);
  } catch (error) {
    return respErr(error instanceof z.ZodError ? 'Invalid parameters' : error, {
      ...noStore,
      status:
        error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500,
    });
  }
}

export const Route = createFileRoute('/api/admin/footer-links')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
      PUT: ({ request }) => handle(request),
      DELETE: ({ request }) => handle(request),
    },
  },
});
