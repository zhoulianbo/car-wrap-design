import assert from 'node:assert/strict';

import { locales } from '../src/paraglide/runtime.js';

const base = (
  process.argv.find((value) => /^https?:\/\//.test(value)) ??
  'http://localhost:3100'
).replace(/\/$/, '');
const production = process.argv.includes('--production');
async function page(path: string) {
  const response = await fetch(`${base}${path}`, { redirect: 'manual' });
  return { response, html: await response.text() };
}
function robots(html: string) {
  return (
    html.match(/<meta\b[^>]*name="robots"[^>]*content="([^"]*)"/)?.[1] ?? ''
  );
}
function canonical(html: string) {
  return html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]*)"/)?.[1];
}
const robotResponse = await page('/robots.txt');
assert.equal(robotResponse.response.status, 200);
assert.ok(robotResponse.html.includes('Disallow: /api/'));
assert.ok(!robotResponse.html.includes('Disallow: /*?*'));

const sitemap = await page('/sitemap.xml');
assert.equal(sitemap.response.status, 200);
const urls = [...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(
  (match) => new URL(match[1])
);
assert.ok(urls.length >= 10 * locales.length);
assert.equal(new Set(urls.map(String)).size, urls.length);
assert.ok(urls.some((url) => url.pathname === '/gallery'));
assert.ok(urls.some((url) => url.pathname === '/zh/gallery'));
assert.ok(
  urls.every((url) => !url.search && !/\/gallery\//.test(url.pathname))
);
const prefixes = locales.map((locale) => (locale === 'en' ? '' : `/${locale}`));
const localizedPrefix = new RegExp(
  `^/(?:${locales.filter((locale) => locale !== 'en').join('|')})(?=/|$)`
);
for (const url of urls.filter((url) => !localizedPrefix.test(url.pathname))) {
  for (const prefix of prefixes) {
    const alternatePath =
      url.pathname === '/' ? prefix || '/' : `${prefix}${url.pathname}`;
    assert.ok(
      urls.some((other) => other.pathname === alternatePath),
      `Missing alternate loc: ${alternatePath}`
    );
  }
}

const publicResult = await fetch(`${base}/api/gallery?page=1&pageSize=20`).then(
  (response) => response.json()
);
assert.equal(publicResult.code, 0);
for (const prefix of prefixes) {
  const gallery = await page(`${prefix}/gallery`);
  assert.equal(
    gallery.response.status,
    200,
    'Clean gallery URL must not redirect'
  );
  assert.equal(gallery.response.headers.get('location'), null);
  assert.ok(robots(gallery.html).startsWith('index,follow'));
  assert.equal(new URL(canonical(gallery.html)!).pathname, `${prefix}/gallery`);
  for (const item of publicResult.data.items) {
    assert.ok(
      gallery.html.includes(`href="${prefix}/gallery/${item.slug}"`),
      `Missing SSR design link: ${item.slug}`
    );
  }
  for (const query of [
    'search=Ice',
    'vehicle=model-3-legacy',
    'sort=likes',
    'page=2',
  ]) {
    const filtered = await page(`${prefix}/gallery?${query}`);
    assert.equal(filtered.response.status, 200);
    assert.equal(robots(filtered.html), 'noindex,follow');
    assert.equal(
      new URL(canonical(filtered.html)!).pathname,
      `${prefix}/gallery`
    );
  }
  for (const path of ['sign-in', 'admin', 'dashboard', 'forgot-password']) {
    const privatePage = await page(`${prefix}/${path}`);
    assert.match(
      privatePage.response.headers.get('x-robots-tag') ?? '',
      /noindex/
    );
    if (privatePage.response.status === 200)
      assert.match(robots(privatePage.html), /noindex/);
  }
  const home = await page(prefix || '/');
  assert.equal(home.response.status, 200);
  assert.ok(!home.response.headers.get('x-robots-tag')?.includes('noindex'));
  if (publicResult.data.items.length)
    assert.ok(home.html.includes(`href="${prefix}/gallery/`));
  const article = await page(`${prefix}/blog/tesla-wrap-complete-guide`);
  assert.equal(article.response.status, 200);
  assert.ok(article.html.includes('"@type":"BlogPosting"'));
  assert.match(article.html, /property="og:type" content="article"/);
  assert.ok(article.html.includes('width="1600" height="900"'));
  assert.ok(
    article.html.includes('hrefLang="zh"') ||
      article.html.includes('hreflang="zh"')
  );
  assert.ok(!article.html.includes('blog.editorial_'));
  const legal = await page(`${prefix}/privacy-policy`);
  assert.ok(
    legal.html.includes('hrefLang="zh"') || legal.html.includes('hreflang="zh"')
  );
}
if (publicResult.data.items.length) {
  const item = publicResult.data.items[0];
  const detail = await page(`/gallery/${item.slug}`);
  assert.equal(detail.response.status, 200);
  assert.ok(
    detail.html.includes(
      `src="${(item.textureUrl || item.coverUrl).replaceAll('&', '&amp;')}"`
    )
  );
}
const llms = await page('/llms-full.txt');
assert.equal(llms.response.status, 200);
assert.ok(
  llms.html.includes('## Guides (en)') && llms.html.includes('## Guides (zh)')
);
assert.ok(!llms.html.includes('export const meta'));
assert.ok(!/^import .* from /m.test(llms.html));
assert.ok(llms.html.length > 8000, 'Local guide bodies should be included');
if (production) {
  assert.equal((await page('/cover-preview')).response.status, 404);
  const debugWrite = await fetch(`${base}/api/cover-preview`, {
    method: 'POST',
    body: '',
  });
  assert.equal(debugWrite.status, 404);
}
console.log(
  `PASS: clean gallery, parameter noindex, SSR links/images, ${urls.length} editorial sitemap URLs, private-page directives, multilingual metadata, article schema and llms content${production ? ', production debug routes disabled' : ''}.`
);
