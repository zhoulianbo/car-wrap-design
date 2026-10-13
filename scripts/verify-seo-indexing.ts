import assert from 'node:assert/strict';

import { noindexRobotsForPath } from '../src/lib/seo-indexing';
import { locales } from '../src/paraglide/runtime.js';

const privatePaths = [
  '/admin',
  '/admin/settings',
  '/dashboard',
  '/settings',
  '/create',
  '/create/model-3-legacy',
  '/projects/example',
  '/wraps/example/edit',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth-callback',
  '/redeem-invite',
  '/cover-preview',
  '/share/example-token',
];

for (const prefix of ['', ...locales.map((locale) => `/${locale}`)]) {
  for (const path of privatePaths) {
    for (const suffix of ['', '/', '?next=%2Fgallery', '#example']) {
      assert.equal(
        noindexRobotsForPath(`${prefix}${path}${suffix}`),
        'noindex,nofollow'
      );
    }
  }
  for (const path of [
    '/',
    '/gallery',
    '/gallery/example',
    '/gallery?vehicle=model-3-legacy',
    '/tesla-wrap',
    '/tesla-model-3-wrap',
    '/ai-car-wrap-generator',
    '/blog/tesla-wrap-complete-guide',
    '/pricing',
    '/privacy-policy',
    '/create-guide',
    '/shareable-designs',
    '/administer-designs',
  ]) {
    assert.equal(noindexRobotsForPath(`${prefix}${path}`), undefined, path);
  }
}

console.log(
  'SEO indexing policy passed: private/public paths, locales, boundaries and query strings.'
);
