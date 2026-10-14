/** Local error fixtures only; no external requests. */
import assert from 'node:assert/strict';

import { generationErrorDetails } from '../src/lib/generation-error-log';

const cause = new Error('D1_ERROR: no such table: ai_generation');
const failure = new Error(
  'Failed query: insert into ai_generation\nparams: private prompt,private-user',
  { cause }
);
const details = generationErrorDetails(failure);
assert.match(JSON.stringify(details), /no such table: ai_generation/);
assert.doesNotMatch(JSON.stringify(details), /private prompt|private-user/);
assert.ok(details.stack);

const secret = 'test-secret-value';
const prompt = 'A private design brief';
const sensitive = generationErrorDetails(
  new Error(
    `Upload failed: HTTP 403 Forbidden ${secret} ${prompt} https://example.invalid/callback?token=secret api_key=hidden Bearer hidden-bearer`
  ),
  [secret, prompt]
);
assert.match(JSON.stringify(sensitive), /HTTP 403 Forbidden/);
assert.doesNotMatch(
  JSON.stringify(sensitive),
  /test-secret-value|private design|example.invalid|hidden/
);
assert.deepEqual(generationErrorDetails({ prompt, secret }), {
  message: 'Non-Error thrown',
});
cause.cause = cause;
assert.doesNotThrow(() => JSON.stringify(generationErrorDetails(cause)));
console.log(
  'PASS: diagnostic causes and stack frames retained; secrets, URLs and SQL parameters redacted.'
);
