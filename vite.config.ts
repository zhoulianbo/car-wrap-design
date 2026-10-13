import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

import { loadEnvFiles } from './src/lib/env';

// Populate process.env from .env.local / .env.{NODE_ENV} / .env for the
// dev server and build process (Vite only exposes VITE_* via import.meta.env;
// server code reads secrets from process.env). In production, env comes
// from the actual host/container environment.
loadEnvFiles();

// Cloudflare Workers build (pnpm cf:build / cf:deploy): stub out unused DB
// drivers — mysql2 crashes workerd at module evaluation (node:net,
// node:process requires); postgres.js runs fine under nodejs_compat but is
// dead weight when the backend is D1. Which driver the bundle keeps follows
// wrangler.jsonc `vars.DATABASE_PROVIDER` (the runtime truth on workerd) —
// d1 stubs both, postgresql keeps postgres.js for the Hyperdrive binding.
const isCloudflareBuild = (process.env.NITRO_PRESET || '').includes(
  'cloudflare'
);
const driverStub = new URL('./src/core/db/driver-stub.ts', import.meta.url)
  .pathname;

// Prefer wrangler.jsonc over the build-time env, which can be polluted by
// .env.local (e.g. DATABASE_PROVIDER=sqlite for local dev).
function workersVars(): Record<string, string> {
  try {
    const raw = readFileSync(
      new URL('./wrangler.jsonc', import.meta.url),
      'utf8'
    );
    const vars = raw.match(/"vars"\s*:\s*\{([^}]+)\}/)?.[1] ?? '';
    return Object.fromEntries(
      [...vars.matchAll(/"([A-Z_]+)"\s*:\s*("(?:[^"\\]|\\.)*")/g)].map(
        ([, key, value]) => [key, JSON.parse(value)]
      )
    );
  } catch {
    // no wrangler.jsonc yet (fresh clone) — fall through
  }
  return {};
}

const cloudflareVars = isCloudflareBuild ? workersVars() : {};
const workersDb =
  cloudflareVars.DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'd1';
// Vite replaces the entire import.meta.env object used by publicEnv(), so set
// its input environment rather than defining individual property accesses.
// This also makes Git builds independent of the ignored .env.production file.
if (isCloudflareBuild) Object.assign(process.env, cloudflareVars);
const keepPostgres = workersDb === 'postgresql' || workersDb === 'postgres';
const mdxPlugin = mdx({ providerImportSource: '@mdx-js/react' });

export default defineConfig({
  server: {
    port: 3000,
    // Cloud sandboxes (ShipAny Code / e2b) proxy the dev server through a
    // per-sandbox subdomain; without this Vite's host check blocks the
    // preview with "Blocked request. This host is not allowed."
    allowedHosts: ['.e2b.app', '.ngrok-free.app'],
  },
  resolve: {
    tsconfigPaths: true,
    alias: isCloudflareBuild
      ? {
          mysql2: driverStub,
          ...(keepPostgres ? {} : { postgres: driverStub }),
        }
      : {},
  },
  plugins: [
    // MDX must run before the react plugin so JSX in compiled MDX gets transformed.
    {
      enforce: 'pre',
      ...mdxPlugin,
      transform(code, id) {
        // Vite's raw loader already exports a string; MDX must not compile it.
        if (/[?&]raw(?:&|$)/.test(id)) return;
        return mdxPlugin.transform(code, id);
      },
    },
    tailwindcss(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      outputStructure: 'message-modules',
      cookieName: 'PARAGLIDE_LOCALE',
      strategy: ['url', 'cookie', 'baseLocale'],
      urlPatterns: [
        // API endpoints are never locale-prefixed.
        {
          pattern: '/api/:path(.*)?',
          localized: [
            ['en', '/api/:path(.*)?'],
            ['zh', '/api/:path(.*)?'],
            ['ko', '/api/:path(.*)?'],
            ['de', '/api/:path(.*)?'],
            ['it', '/api/:path(.*)?'],
          ],
        },
        // Bare locale homes match without a trailing-slash redirect.
        {
          pattern: '/',
          localized: [
            ['zh', '/zh'],
            ['ko', '/ko'],
            ['de', '/de'],
            ['it', '/it'],
            ['en', '/'],
          ],
        },
        // Non-default languages use a prefix; English stays unprefixed.
        {
          pattern: '/:path(.*)?',
          localized: [
            ['zh', '/zh/:path(.*)?'],
            ['ko', '/ko/:path(.*)?'],
            ['de', '/de/:path(.*)?'],
            ['it', '/it/:path(.*)?'],
            ['en', '/:path(.*)?'],
          ],
        },
      ],
    }),
    tanstackStart({
      srcDirectory: 'src',
    }),
    viteReact(),
    nitro(),
    {
      name: 'dev-client-disconnect',
      configureServer(server) {
        // Install after Nitro's proxy middleware. An incomplete incoming body
        // can reject in the proxy before the application receives the request.
        return () => {
          server.middlewares.use(
            (
              error: Error & { code?: string },
              request: IncomingMessage,
              _response: ServerResponse,
              next: (error?: unknown) => void
            ) => {
              if (request.aborted && error.code === 'ECONNRESET') return;
              next(error);
            }
          );
        };
      },
    },
  ],
});
