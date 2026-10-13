import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import {
  listDesignReports,
  resolveDesignReport,
} from '@/modules/design-gallery/service';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr, respPage } from '@/lib/resp';

async function checkAdmin(request: Request) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw new Error('Unauthorized');
  if (!(await hasPermission(session.user.id, 'admin.*'))) {
    throw new Error('Forbidden');
  }
  return session;
}

async function GET({ request }: { request: Request }) {
  try {
    await checkAdmin(request);
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('pageSize') || 20))
    );
    const result = await listDesignReports({
      page,
      pageSize,
      status: url.searchParams.get('status') || undefined,
    });
    return respPage(result.items, result.total);
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['resolved', 'dismissed']),
  resolutionNote: z.string().max(500).optional(),
  designStatus: z
    .enum(['pending', 'approved', 'rejected', 'reported', 'hidden'])
    .optional(),
});

async function PATCH({ request }: { request: Request }) {
  try {
    const session = await checkAdmin(request);
    const input = updateSchema.parse(await request.json());
    return respData(
      await resolveDesignReport({
        reportId: input.id,
        adminUserId: session.user.id,
        status: input.status,
        resolutionNote: input.resolutionNote,
        designStatus: input.designStatus,
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

export const Route = createFileRoute('/api/admin/design-reports')({
  server: { handlers: { GET, PATCH } },
});
