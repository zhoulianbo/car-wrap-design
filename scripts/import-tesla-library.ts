import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';

import { design, user, userWrap } from '../src/config/db/schema';
import { db } from '../src/core/db';
import { createStorageKey } from '../src/lib/storage-key';
import { getStorage } from '../src/modules/storage/service';

const SOURCE_REPOSITORY = 'https://github.com/teslamotors/custom-wraps';
const RAW_ROOT =
  'https://raw.githubusercontent.com/teslamotors/custom-wraps/master';
const TESLA_USER_ID = 'tesla-official-library';
const TESLA_USER_EMAIL = 'tesla@source.invalid';
const OUTPUT_DIR = '/private/tmp/tesla-wrap-library';
const sourceDirectory = process.env.TESLA_CUSTOM_WRAPS_DIR;

const EXAMPLES = [
  'Acid_Drip.png',
  'Ani.png',
  'Apocalypse.png',
  'Avocado_Green.png',
  'Camo.png',
  'Cosmic_Burst.png',
  'Divide.png',
  'Doge.png',
  'Dot_Matrix.png',
  'Ice_Cream.png',
  'Leopard.png',
  'Pixel_Art.png',
  'Reindeer.png',
  'Rudi.png',
  'Sakura.png',
  'Sketch.png',
  'String_Lights.png',
  'Valentine.png',
  'Vintage_Gradient.png',
  'Vintage_Stripes.png',
] as const;

const MODELS = [
  {
    directory: 'model3',
    label: 'Model 3',
    vehicleSlug: 'model-3-legacy',
  },
  {
    directory: 'modely',
    label: 'Model Y',
    vehicleSlug: 'model-y-legacy',
  },
] as const;

const dryRun = process.argv.includes('--dry-run');

function slugify(value: string) {
  return value
    .replace(/\.png$/i, '')
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleFromFilename(value: string) {
  return value
    .replace(/\.png$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function xmlEscape(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => {
    const replacements: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;',
    };
    return replacements[character];
  });
}

async function download(url: string) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Download failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function sourceAsset(relativePath: string) {
  return sourceDirectory
    ? readFile(path.join(sourceDirectory, relativePath))
    : download(`${RAW_ROOT}/${relativePath}`);
}

async function createCover(params: {
  texture: Buffer;
  vehicle: Buffer;
  title: string;
  model: string;
}) {
  const background = await sharp(params.texture)
    .resize(1200, 750, { fit: 'cover' })
    .blur(28)
    .modulate({ brightness: 0.38, saturation: 0.8 })
    .webp({ quality: 88 })
    .toBuffer();
  const texturePanel = await sharp(params.texture)
    .resize(430, 430, { fit: 'contain', background: '#05070a' })
    .webp({ quality: 92 })
    .toBuffer();
  const vehicle = await sharp(params.vehicle)
    .resize(610, 678, { fit: 'contain' })
    .webp({ quality: 92 })
    .toBuffer();
  const labels = Buffer.from(`
    <svg width="1200" height="750" xmlns="http://www.w3.org/2000/svg">
      <rect x="48" y="52" width="450" height="450" rx="24" fill="#080b10" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
      <rect x="32" y="536" width="490" height="174" rx="20" fill="#05070a" opacity=".84"/>
      <text x="58" y="582" fill="#78f7c3" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="3">TESLA OFFICIAL WRAP</text>
      <text x="58" y="640" fill="#ffffff" font-family="Arial, sans-serif" font-size="44" font-weight="700">${xmlEscape(params.title)}</text>
      <text x="58" y="682" fill="#9ca3af" font-family="Arial, sans-serif" font-size="22">${xmlEscape(params.model)}</text>
    </svg>
  `);
  return sharp(background)
    .composite([
      { input: labels, left: 0, top: 0 },
      { input: texturePanel, left: 58, top: 62 },
      { input: vehicle, left: 560, top: 18 },
    ])
    .webp({ quality: 90 })
    .toBuffer();
}

async function upload(
  storage: NonNullable<Awaited<ReturnType<typeof getStorage>>>,
  key: string,
  body: Buffer
) {
  if (await storage.exists({ key })) {
    const url = storage.getPublicUrl({ key });
    if (!url) throw new Error(`No public URL for existing object: ${key}`);
    return url;
  }
  const result = await storage.uploadFile({
    body,
    key,
    contentType: 'image/webp',
    disposition: 'inline',
  });
  if (!result.success || !result.url) {
    throw new Error(result.error || `Upload failed: ${key}`);
  }
  return result.url;
}

async function ensureTeslaUser() {
  const [existing] = await db()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, TESLA_USER_ID))
    .limit(1);
  if (existing) return existing.id;
  await db().insert(user).values({
    id: TESLA_USER_ID,
    name: 'Tesla',
    email: TESLA_USER_EMAIL,
    emailVerified: true,
    utmSource: 'official-library',
  });
  return TESLA_USER_ID;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const vehicleImages = new Map<string, Buffer>();
  for (const model of MODELS) {
    vehicleImages.set(
      model.directory,
      await sourceAsset(`${model.directory}/vehicle_image.png`)
    );
  }

  const storage = dryRun ? null : await getStorage({ root: true });
  if (!dryRun && !storage) throw new Error('R2 storage is not configured');
  const ownerId = dryRun ? TESLA_USER_ID : await ensureTeslaUser();
  let created = 0;
  let skipped = 0;

  for (const model of MODELS) {
    for (const filename of EXAMPLES) {
      const sourceSlug = slugify(filename);
      const librarySlug = `tesla-${model.directory}-${sourceSlug}`;
      const publishKey = `tesla-custom-wraps:${model.directory}:${sourceSlug}`;
      if (!dryRun) {
        const [existing] = await db()
          .select({ id: design.id })
          .from(design)
          .where(eq(design.publishKey, publishKey))
          .limit(1);
        if (existing) {
          skipped += 1;
          continue;
        }
      }

      const texturePng = await sourceAsset(
        `${model.directory}/example/${filename}`
      );
      const title = titleFromFilename(filename);
      const texture = await sharp(texturePng)
        .webp({ quality: 94, effort: 5 })
        .toBuffer();
      const cover = await createCover({
        texture: texturePng,
        vehicle: vehicleImages.get(model.directory)!,
        title,
        model: `Tesla ${model.label}`,
      });
      const designKey = createStorageKey('design', 'webp', librarySlug);
      const coverKey = createStorageKey('cover', 'webp', librarySlug);

      if (dryRun) {
        await writeFile(path.join(OUTPUT_DIR, `${librarySlug}.webp`), texture);
        await writeFile(
          path.join(OUTPUT_DIR, `${librarySlug}-cover.webp`),
          cover
        );
        created += 1;
        continue;
      }

      const textureUrl = await upload(storage!, designKey, texture);
      const coverUrl = await upload(storage!, coverKey, cover);
      const wrapId = crypto.randomUUID();
      const designId = crypto.randomUUID();
      const canvasJson = JSON.stringify({
        version: 1,
        width: 1024,
        height: 1024,
        background: '#000000',
        nodes: [
          {
            id: `official-${sourceSlug}`,
            kind: 'image',
            name: `${title} official texture`,
            imageUrl: textureUrl,
            x: 0,
            y: 0,
            width: 1024,
            height: 1024,
            rotation: 0,
            opacity: 1,
            scaleX: 1,
            scaleY: 1,
          },
        ],
      });
      await db().transaction(async (tx: any) => {
        await tx.insert(userWrap).values({
          id: wrapId,
          userId: ownerId,
          vehicleSlug: model.vehicleSlug,
          name: `${title} · Tesla ${model.label}`,
          templateVersion: 'tesla-custom-wraps-official',
          canvasJson,
          textureKey: designKey,
          textureUrl,
          coverKey,
          coverUrl,
          finish: 'gloss',
          version: 1,
          status: 'published',
        });
        await tx.insert(design).values({
          id: designId,
          ownerId,
          sourceWrapId: wrapId,
          vehicleSlug: model.vehicleSlug,
          slug: librarySlug,
          title,
          description: `Official Tesla ${model.label} custom wrap example imported from ${SOURCE_REPOSITORY}.`,
          snapshotJson: canvasJson,
          textureKey: designKey,
          textureUrl,
          coverKey,
          coverUrl,
          finish: 'gloss',
          templateVersion: 'tesla-custom-wraps-official',
          visibility: 'public',
          usesAi: false,
          publicPrompt: false,
          moderationStatus: 'approved',
          publishKey,
        });
      });
      created += 1;
      console.log(`Imported ${created}/40: ${librarySlug}`);
    }
  }
  console.log(
    dryRun
      ? `Generated ${created} preview pairs in ${OUTPUT_DIR}`
      : `Tesla library ready: ${created} imported, ${skipped} already present`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
