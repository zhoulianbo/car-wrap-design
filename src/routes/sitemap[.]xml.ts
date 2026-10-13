import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { locales, localizeUrl } from '@/paraglide/runtime.js';
import { getBlogPostsFn } from '@/content/posts/server';

// Only editorial/marketing entry points belong in the sitemap. Gallery search
// URLs and community design detail pages are intentionally excluded.
const STATIC_PATHS = [
  '/',
  '/tesla-wrap',
  '/tesla-model-y-wrap',
  '/tesla-model-3-wrap',
  '/ai-car-wrap-generator',
  '/gallery',
  '/blog',
  '/pricing',
  '/privacy-policy',
  '/terms-of-service',
];

function escapeXml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[character]!
  );
}

function urlFor(path: string, locale: (typeof locales)[number]) {
  return localizeUrl(`${envConfigs.app_url.replace(/\/$/, '')}${path}`, {
    locale,
  }).href;
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const paths = new Map<
          string,
          Map<(typeof locales)[number], string | undefined>
        >();
        for (const path of STATIC_PATHS) {
          paths.set(
            path,
            new Map(locales.map((locale) => [locale, undefined]))
          );
        }
        for (const locale of locales) {
          const posts = await getBlogPostsFn({ data: { locale } });
          for (const post of posts) {
            const path = `/blog/${encodeURIComponent(post.slug)}`;
            const versions = paths.get(path) ?? new Map();
            versions.set(locale, post.updatedAt || post.createdAt);
            paths.set(path, versions);
          }
        }
        const entries: string[] = [];
        for (const [path, versions] of paths) {
          const alternates = [...versions.keys()].map(
            (locale) =>
              `    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(urlFor(path, locale))}"/>`
          );
          for (const [locale, lastmod] of versions) {
            entries.push(
              [
                '  <url>',
                `    <loc>${escapeXml(urlFor(path, locale))}</loc>`,
                ...alternates,
                ...(lastmod
                  ? [`    <lastmod>${escapeXml(lastmod)}</lastmod>`]
                  : []),
                '  </url>',
              ].join('\n')
            );
          }
        }
        return new Response(
          [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
            ...entries,
            '</urlset>',
            '',
          ].join('\n'),
          { headers: { 'Content-Type': 'application/xml' } }
        );
      },
    },
  },
});
