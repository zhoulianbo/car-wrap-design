import { locales } from '@/paraglide/runtime.js';

const PRIVATE_PAGE_PATH =
  /^\/(?:admin|dashboard|settings|create|projects|wraps|sign-in|sign-up|forgot-password|reset-password|verify-email|auth-callback|redeem-invite|cover-preview|share)(?:\/|$)/;

/** Shared by SSR metadata and HTTP responses, including auth redirects. */
export function noindexRobotsForPath(pathname: string): string | undefined {
  const path = pathname
    .split(/[?#]/, 1)[0]
    .replace(new RegExp(`^/(?:${locales.join('|')})(?=/|$)`), '');
  return PRIVATE_PAGE_PATH.test(path) ? 'noindex,nofollow' : undefined;
}
