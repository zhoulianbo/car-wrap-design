import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getDbConfigs } from '@/modules/config/service';

// better-auth catch-all — the handler takes a standard Request and
// returns a standard Response, so it mounts directly.
async function handle(request: Request) {
  // Read before handing off to better-auth: its body parser logs an interrupted
  // upload as SERVER_ERROR even when the client has already disconnected.
  if (request.body) {
    try {
      const body = await request.arrayBuffer();
      request = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        signal: request.signal,
        body,
      });
    } catch (error) {
      if (
        request.signal.aborted &&
        error instanceof Error &&
        (error.name === 'AbortError' ||
          ('code' in error && error.code === 'ECONNRESET'))
      ) {
        return new Response(null, { status: 499 });
      }
      throw error;
    }
  }
  const configs = await getDbConfigs();
  const auth = getAuth(configs);
  return auth.handler(request);
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
