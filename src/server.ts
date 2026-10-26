import handler from '@tanstack/react-start/server-entry';

import { getCookieFromHeader } from './lib/cookie';
import { noindexRobotsForPath } from './lib/seo-indexing';
import { paraglideMiddleware } from './paraglide/server.js';

// On Cloudflare Workers, stash the binding env (D1, ASSETS, …) on globalThis
// so synchronous code paths (e.g. the db() singleton with DATABASE_PROVIDER=d1)
// can reach bindings without threading the request context through every call.
// The specifier is kept non-literal so bundlers leave the import to runtime;
// outside workerd the import rejects and we just move on.
const CF_WORKERS_MODULE = 'cloudflare:workers';
let cfEnvPromise: Promise<void> | null = null;

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  'frame-src https:',
  "worker-src 'self' blob:",
  'upgrade-insecure-requests',
].join('; ');

function applySecurityHeaders(response: Response, url: URL): Response {
  const secured = new Response(response.body, response);
  secured.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  secured.headers.set('X-Content-Type-Options', 'nosniff');
  if (url.protocol === 'https:') {
    secured.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }
  return secured;
}

function ensureCloudflareEnv(): Promise<void> {
  if (!cfEnvPromise) {
    cfEnvPromise = import(/* @vite-ignore */ CF_WORKERS_MODULE)
      .then((mod) => {
        (globalThis as any).__CF_ENV__ = mod.env;
      })
      .catch(() => {
        // Not running on Cloudflare Workers — nothing to stash.
      });
  }
  return cfEnvPromise;
}

// Custom server entry — wraps every request in Paraglide's middleware so
// getLocale() resolves per-request (AsyncLocalStorage) during SSR.
export default {
  async fetch(req: Request): Promise<Response> {
    await ensureCloudflareEnv();
    const url = new URL(req.url);
    let response = await paraglideMiddleware(req, () => handler.fetch(req));
    response = applySecurityHeaders(response, url);
    const robots = noindexRobotsForPath(url.pathname);
    if (robots) {
      response.headers.set('X-Robots-Tag', robots);
    }
    const utmSource = url.searchParams.get('utm_source');
    const existing = getCookieFromHeader(
      req.headers.get('cookie'),
      'utm_source'
    );
    if (utmSource && !existing) {
      const sanitized = utmSource.replace(/[^\w.\-]/g, '').slice(0, 100);
      if (sanitized) {
        response.headers.append(
          'Set-Cookie',
          `utm_source=${sanitized}; Max-Age=2592000; Path=/; SameSite=Lax`
        );
      }
    }
    return response;
  },
};
