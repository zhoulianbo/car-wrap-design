import assert from 'node:assert/strict';

import { storageObjectUrl } from '../src/lib/storage-object-url';

const domain = 'https://assets.example.test';
const key = 'design/202610/example.webp';
assert.equal(
  storageObjectUrl(`${domain}/${key}`, domain).href,
  `${domain}/${key}`
);
assert.equal(
  storageObjectUrl(`https://pub-old.r2.dev/${key}`, domain, key).href,
  `${domain}/${key}`
);
assert.equal(
  storageObjectUrl(`https://pub-old.r2.dev/${key}`, `${domain}/assets/`, key)
    .href,
  `${domain}/assets/${key}`
);
assert.throws(() => storageObjectUrl(`https://untrusted.test/${key}`, domain));
for (const invalid of [
  '//evil.test/a.webp',
  '../a.webp',
  'design//a.webp',
  'a.webp?redirect=https://evil.test',
  'https://evil.test/a.webp',
]) {
  assert.throws(() =>
    storageObjectUrl(`https://pub-old.r2.dev/${key}`, domain, invalid)
  );
}
assert.throws(() => storageObjectUrl('http://127.0.0.1/private', domain, key));
assert.throws(() =>
  storageObjectUrl('https://user:pass@example.test/a.webp', domain, key)
);
assert.throws(() =>
  storageObjectUrl(
    `https://pub-old.r2.dev/${key}`,
    'http://assets.example.test',
    key
  )
);
console.log(
  'PASS: trusted storage domain migration, optional base path, and invalid source/key rejection.'
);
