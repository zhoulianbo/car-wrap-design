/** Actual Workerd fetch validation, with all outbound traffic handled locally. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Reuse Wrangler's installed runtime and bundler without adding dependencies.
const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve('wrangler'));
const { Miniflare } = wranglerRequire('miniflare');
const { build } = wranglerRequire('esbuild');
const guideUrl =
  'https://guides.invalid/templates/ai-guides/model-3-legacy.png';
const bundle = await build({
  stdin: {
    contents: `
      import { prepareGenerationTemplateGuide } from './src/lib/generation-template-guide';
      export default {
        async fetch(request) {
          try {
            if (new URL(request.url).pathname === '/old-behavior') {
              await fetch(${JSON.stringify(guideUrl)}, { redirect: 'error' });
              return Response.json({ unexpectedSuccess: true });
            }
            const url = await prepareGenerationTemplateGuide('model-3-legacy', {
              getPublicUrl: () => ${JSON.stringify(guideUrl)},
              uploadFile: () => { throw new Error('Unexpected upload'); },
            });
            return Response.json({ url });
          } catch (error) {
            return Response.json({ message: error.message, cause: error.cause?.message }, { status: 502 });
          }
        },
      };
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
});
let status = 200;
let calls = 0;
const worker = new Miniflare({
  modules: true,
  script: bundle.outputFiles[0].text,
  compatibilityDate: '2026-06-03',
  outboundService: (request: Request) => {
    calls++;
    assert.equal(request.url, guideUrl, 'Never follow a redirect target');
    assert.equal(request.method, 'HEAD');
    return new Response(null, {
      status,
      headers: {
        'content-type': 'image/png',
        ...(status >= 300 && status < 400
          ? { location: 'https://redirect.invalid/do-not-fetch' }
          : {}),
      },
    });
  },
});
try {
  const oldResponse = await worker.dispatchFetch(
    'https://test.invalid/old-behavior'
  );
  assert.equal(oldResponse.status, 502);
  assert.match((await oldResponse.json()).message, /Invalid redirect value/);
  assert.equal(calls, 0, 'Old behavior fails before making the request');
  const success = await worker.dispatchFetch('https://test.invalid/guide');
  assert.equal(success.status, 200);
  assert.deepEqual(await success.json(), { url: guideUrl });
  for (status of [301, 302, 303, 307, 308, 403, 404, 500]) {
    const before: number = calls;
    const failure = await worker.dispatchFetch('https://test.invalid/guide');
    assert.equal(failure.status, 502);
    const body = await failure.json();
    assert.equal(body.message, 'Image unavailable');
    assert.match(body.cause, new RegExp('HTTP ' + status));
    assert.equal(calls, before + 1, 'Only the original URL is fetched');
  }
  console.log(
    'PASS: Workerd reproduces the original error; actual guide code accepts PNG and rejects redirects/errors without following them. No external requests.'
  );
} finally {
  await worker.dispose();
}
