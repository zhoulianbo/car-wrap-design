import { createFileRoute } from '@tanstack/react-router';

async function POST({ request }: { request: Request }) {
  if (!import.meta.env.DEV) return new Response(null, { status: 404 });
  const { writeFile } = await import('node:fs/promises');
  const bytes = new Uint8Array(await request.arrayBuffer());
  await writeFile('tmp/acid-drip-cover-v5.webp', bytes);
  return new Response(null, { status: 204 });
}

export const Route = createFileRoute('/api/cover-preview')({
  server: { handlers: { POST } },
});
