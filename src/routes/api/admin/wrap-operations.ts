import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { listWrapGenerationsForAdmin } from '@/modules/ai-tasks/wrap-generations';
import { getAllConfigs } from '@/modules/config/service';
import { hasPermission } from '@/modules/rbac/service';
import { getStorage } from '@/modules/storage/service';
import { respData, respErr } from '@/lib/resp';

async function checkAdmin(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
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
    const configs = await getAllConfigs();
    const [generations, storage] = await Promise.all([
      listWrapGenerationsForAdmin({
        page,
        pageSize,
        status: url.searchParams.get('status') || undefined,
      }),
      getStorage(),
    ]);
    return respData({
      health: {
        replicateConfigured: Boolean(configs.replicate_api_token?.trim()),
        storageConfigured: Boolean(storage),
      },
      generations,
    });
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

export const Route = createFileRoute('/api/admin/wrap-operations')({
  server: { handlers: { GET } },
});
