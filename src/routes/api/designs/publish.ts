import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import { publishDesign } from '@/modules/design-gallery/service';
import { respData, respErr } from '@/lib/resp';

const schema = z.object({
  wrapId: z.string().min(1).optional(),
  generationId: z.string().min(1).optional(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  visibility: z.enum(['public', 'unlisted']).default('public'),
  usesAi: z.boolean().optional(),
  publicPrompt: z.boolean().optional(),
  prompt: z.string().trim().max(2000).optional(),
  publishKey: z.string().min(8).max(120),
});

async function POST({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return respErr('Invalid publish data', { status: 400 });
    return respData(
      await publishDesign({ userId: session.user.id, ...parsed.data }),
      { status: 201 }
    );
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'Failed to publish design'
    );
  }
}

export const Route = createFileRoute('/api/designs/publish')({
  server: { handlers: { POST } },
});
