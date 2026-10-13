import { envConfigs } from '@/config';
import { locales, localizeUrl } from '@/paraglide/runtime.js';

type SupportedLocale = (typeof locales)[number];

export function localizedAbsoluteUrl(path: string, locale: string) {
  const cleanPath = path === '/' ? '/' : `/${path.replace(/^\/+/, '')}`;
  return localizeUrl(`${envConfigs.app_url}${cleanPath}`, {
    locale: locale as SupportedLocale,
  }).href;
}

export function marketingHead({
  path,
  locale,
  title,
  description,
  image = '/og-image.png?v=20261007-3',
  robots = 'index,follow,max-image-preview:large',
}: {
  path: string;
  locale: string;
  title: string;
  description: string;
  image?: string;
  robots?: string;
}) {
  const canonical = localizedAbsoluteUrl(path, locale);
  const imageUrl = new URL(image, envConfigs.app_url).href;
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: robots },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: envConfigs.app_name },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
      { property: 'og:image', content: imageUrl },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      ...locales.map((loc) => ({
        rel: 'alternate',
        hrefLang: loc,
        href: localizedAbsoluteUrl(path, loc),
      })),
      {
        rel: 'alternate',
        hrefLang: 'x-default',
        href: localizedAbsoluteUrl(path, 'en'),
      },
    ],
  };
}
