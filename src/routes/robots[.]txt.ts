import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { locales } from '@/paraglide/runtime.js';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = [
          '# Public pages and rendering assets are crawlable by search and AI crawlers.',
          '# One shared group keeps the same exclusions for all compliant crawlers.',
          'User-agent: *',
          'Allow: /',
          '',
          '# API responses are not search landing pages (including locale-prefixed URLs).',
          ...['', ...locales.map((locale) => `/${locale}`)].flatMap(
            (prefix) => [
              `Disallow: ${prefix}/api$`,
              `Disallow: ${prefix}/api?`,
              `Disallow: ${prefix}/api/`,
            ]
          ),
          '',
          '# Account, editor, and share pages remain crawlable to expose their noindex directives.',
          '# Gallery filters and design pages also control indexing through page metadata.',
          '# Robots rules do not replace authentication or access control.',
          '',
          `Sitemap: ${new URL('/sitemap.xml', envConfigs.app_url).href}`,
          '',
          '# Product documentation for AI readers (informational links, not crawl directives):',
          `# ${new URL('/llms.txt', envConfigs.app_url).href}`,
          `# ${new URL('/llms-full.txt', envConfigs.app_url).href}`,
          '',
        ].join('\n');
        return new Response(body, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
