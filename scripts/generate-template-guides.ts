/** Generate every named AI guide; remote publication requires explicit --upload. */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { generationTemplateGuideKey } from '../src/lib/generation-template-guide';
import { VEHICLE_ASSET_MANIFEST } from '../src/lib/vehicle-catalog';
import { wrapGenerationGuide } from '../src/lib/wrap-texture';

const upload = process.argv.includes('--upload');
const option = (name: string) =>
  process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
const bucket = option('bucket');
const publicBase = option('public-base');
if (upload && (!bucket || !publicBase)) {
  throw new Error('--upload requires --bucket and --public-base');
}
if (upload && new URL(publicBase!).protocol !== 'https:') {
  throw new Error('--public-base must use HTTPS');
}

for (const vehicle of VEHICLE_ASSET_MANIFEST) {
  const key = generationTemplateGuideKey(vehicle.slug);
  const output = resolve('public/imgs', key);
  const guide = Buffer.from(
    wrapGenerationGuide(await readFile(`public${vehicle.templatePath}`))
  );
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(output, guide);
  console.log(`Generated ${key} (${guide.length} bytes)`);
  if (!upload) continue;

  execFileSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'r2',
      'object',
      'put',
      `${bucket}/${key}`,
      '--remote',
      '--file',
      output,
      '--content-type',
      'image/png',
      '--cache-control',
      'public, max-age=0, must-revalidate',
    ],
    { stdio: 'inherit' }
  );
  const publicUrl = new URL(key, `${publicBase!.replace(/\/$/, '')}/`);
  // Bypass any previously cached 404 while verifying the just-published bytes.
  publicUrl.searchParams.set('verify', Date.now().toString());
  const response = await fetch(publicUrl, {
    signal: AbortSignal.timeout(20_000),
  });
  if (
    !response.ok ||
    !response.headers.get('content-type')?.startsWith('image/png')
  ) {
    throw new Error(
      `Public guide verification failed for ${vehicle.slug}: HTTP ${response.status}`
    );
  }
  if (!Buffer.from(await response.arrayBuffer()).equals(guide)) {
    throw new Error(`Published guide differs from local file: ${vehicle.slug}`);
  }
  console.log(`Verified ${vehicle.slug}`);
}
console.log(
  `Done: ${VEHICLE_ASSET_MANIFEST.length} named guides${upload ? ' uploaded and verified' : ' generated locally'}.`
);
