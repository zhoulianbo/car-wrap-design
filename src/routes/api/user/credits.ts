import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import { getCreditHistoryPage } from '@/modules/credits/service';
import { respErr, respPage } from '@/lib/resp';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  transactionType: z.enum(['grant', 'consume']).optional(),
  search: z.string().max(200).optional(),
});

async function GET({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    );
    if (!parsed.success) return respErr('Invalid query', { status: 400 });
    const result = await getCreditHistoryPage({
      userId: session.user.id,
      ...parsed.data,
    });
    return respPage(result.items, result.total);
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

export const Route = createFileRoute('/api/user/credits')({
  server: { handlers: { GET } },
});
