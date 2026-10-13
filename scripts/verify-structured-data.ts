/** Exercise the real SSR component without writing content or running scripts. */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StructuredData } from '../src/components/seo/structured-data';

const cases = [
  'Car Wrap Design',
  '中文车衣 & "quoted" artwork',
  '</script><p data-audit-marker>escaped content</p>',
  '</ScRiPt><p>mixed case closing tag</p>',
  '<!-- <script>script-like content</script> -->',
  'Literal \\u003c text and <tag> must both round-trip',
];

for (const value of cases) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: value,
    author: { '@type': 'Person', name: value },
  };
  const html = renderToStaticMarkup(createElement(StructuredData, { data }));
  assert.ok(html.startsWith('<script type="application/ld+json">'));
  const body = html.slice(html.indexOf('>') + 1, -'</script>'.length);
  assert.ok(
    !body.includes('<'),
    'JSON-LD cannot open HTML or close its script'
  );
  assert.equal((html.match(/<\/script\s*>/gi) ?? []).length, 1);
  assert.deepEqual(
    JSON.parse(body),
    data,
    'Escaping must preserve every value'
  );
}

console.log(`Structured data SSR checks passed (${cases.length} cases).`);
