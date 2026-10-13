/** Synthetic transport checks; does not contact R2 or delete real objects. */
import assert from 'node:assert/strict';

import { R2Provider } from '../src/core/storage/r2';

const provider = new R2Provider({
  accountId: 'fixture',
  accessKeyId: 'fixture',
  secretAccessKey: 'fixture',
  bucket: 'test-bucket',
  uploadPath: '',
});
const originalFetch = globalThis.fetch;
let status = 204;
let calls = 0;
globalThis.fetch = async (input) => {
  const request = input as Request;
  assert.equal(request.method, 'DELETE');
  assert.equal(
    request.url,
    'https://fixture.r2.cloudflarestorage.com/test-bucket/storage/202610/fixture.webp'
  );
  assert.ok(request.headers.has('authorization'));
  calls += 1;
  return new Response(null, { status });
};
try {
  await provider.deleteFile({ key: 'storage/202610/fixture.webp' });
  status = 404;
  await provider.deleteFile({ key: 'storage/202610/fixture.webp' });
  status = 403;
  await assert.rejects(
    provider.deleteFile({ key: 'storage/202610/fixture.webp' }),
    /Storage deletion failed/
  );
  assert.equal(calls, 3);
  console.log(
    'PASS: signed R2 DELETE, exact root object key, idempotent missing object, and failure propagation.'
  );
} finally {
  globalThis.fetch = originalFetch;
}
