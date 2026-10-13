/** Local fixtures only: no paid AI requests, real user changes, or R2 uploads. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';

import { GrsaiProvider } from '../src/core/ai/grsai';
import { KieProvider } from '../src/core/ai/kie';
import { generationTemplateUrl } from '../src/lib/generation-template-url';
import { VEHICLE_ASSET_MANIFEST } from '../src/lib/vehicle-catalog';
import {
  rotateAroundCenter,
  segmentWrapPanels,
} from '../src/lib/wrap-editor-geometry';
import { aiWrapName } from '../src/lib/wrap-naming';
import {
  fitWrapTexture,
  wrapGenerationGuide,
  wrapTextureMask,
} from '../src/lib/wrap-texture';

assert.equal(
  generationTemplateUrl(
    'model-y-2025-performance',
    'https://assets.carwrapdesign.app/',
    'http://localhost:3000'
  ),
  'https://assets.carwrapdesign.app/templates/tesla/model-y-2025-performance.png'
);
assert.throws(
  () => generationTemplateUrl('cybertruck', '', 'http://localhost:3000'),
  /VITE_ASSETS_URL/
);
function expectedGuideUrl(slug: string) {
  const vehicle = VEHICLE_ASSET_MANIFEST.find((item) => item.slug === slug)!;
  const body = wrapGenerationGuide(
    readFileSync(`public${vehicle.templatePath}`)
  );
  const hash = createHash('sha256').update(body).digest('hex');
  return `https://fixture.invalid/templates/ai-guides/${hash}.png`;
}
assert.equal(aiWrapName('  Bright ocean racing stripes  '), 'Bright ocean');
assert.equal(aiWrapName('Éclat doré métallique'), 'Éclat doré');
assert.equal(aiWrapName('钢铁侠'), '钢铁侠');
assert.equal(aiWrapName('星'.repeat(40)), '星'.repeat(8));
assert.equal(aiWrapName('🌟星'.repeat(30)), '🌟星'.repeat(4));
assert.equal(aiWrapName('abc中文中文中文中文'), 'abc中文中文中文');
assert.equal(aiWrapName('👨‍👩‍👧‍👦'.repeat(10)), '👨‍👩‍👧‍👦'.repeat(8));
assert.equal(aiWrapName(''), 'AI Car Wrap');
const centerInWorld = (
  node: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  },
  c: { x: number; y: number }
) => {
  const a = (node.rotation * Math.PI) / 180;
  return [
    node.x + c.x * node.scaleX * Math.cos(a) - c.y * node.scaleY * Math.sin(a),
    node.y + c.x * node.scaleX * Math.sin(a) + c.y * node.scaleY * Math.cos(a),
  ];
};
for (const center of [
  { x: 0, y: 0 },
  { x: 100, y: 40 },
  { x: -120, y: 50 },
]) {
  const node = { x: 200, y: 230, rotation: 35, scaleX: -1.5, scaleY: 0.7 };
  const before = centerInWorld(node, center);
  const after = centerInWorld(rotateAroundCenter(node, center, 15), center);
  assert.ok(before.every((v, i) => Math.abs(v - after[i]) < 1e-8));
}
for (const vehicle of VEHICLE_ASSET_MANIFEST) {
  const { data, info } = await sharp(`public${vehicle.templatePath}`)
    .resize(1024, 1024)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const map = segmentWrapPanels(
    new Uint8ClampedArray(data),
    info.width,
    info.height
  );
  assert.ok(map.panels.length >= 5, `${vehicle.slug} has selectable UV panels`);
  assert.ok(map.labels[0] <= 0, 'outer frame is not a body panel');
  if (vehicle.slug === 'cybertruck') {
    assert.ok(map.labels[100 * 1024 + 500] > 0, 'upper doors are selectable');
    assert.ok(map.labels[950 * 1024 + 500] > 0, 'lower doors are selectable');
    assert.notEqual(map.labels[100 * 1024 + 500], map.labels[950 * 1024 + 500]);
    assert.equal(
      map.labels[500 * 1024 + 40],
      1,
      'existing interior IDs stay stable'
    );
    assert.equal(
      map.labels[500 * 1024 + 500],
      0,
      'empty space remains unpaintable'
    );
  }
  const all = map.panels.flat();
  assert.equal(new Set(all).size, all.length, 'panels never overlap');
  console.log(`${vehicle.slug}: ${map.panels.length} UV panels`);
}

const directory = mkdtempSync(join(tmpdir(), 'generation-controls-'));
process.env.DATABASE_URL = `file:${join(directory, 'test.db')}`;
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DB_SINGLETON_ENABLED = 'true';
const client = createClient({ url: process.env.DATABASE_URL });
await client.executeMultiple(
  execFileSync(
    'pnpm',
    [
      'exec',
      'drizzle-kit',
      'export',
      '--dialect',
      'sqlite',
      '--schema',
      'src/config/db/schema.sqlite.ts',
    ],
    { encoding: 'utf8' }
  )
);
const { db } = await import('../src/core/db');
const { user, aiTask, design, userWrap, userAsset } =
  await import('../src/config/db/schema');
const { grant, getBalance, getFrozenBalance, getCreditHistoryPage } =
  await import('../src/modules/credits/service');
const {
  createWrapGeneration,
  completeWrapGeneration,
  saveGenerationCover,
  getOwnedSucceededGeneration,
  getWrapGeneration,
} = await import('../src/modules/ai-tasks/wrap-generations');
const {
  approveUserWrap,
  getWrapForReview,
  getPublicDesign,
  moderateDesign,
  publishDesign,
  listDesignsForModeration,
} = await import('../src/modules/design-gallery/service');
const { saveWrap, getWrap } = await import('../src/modules/user-wraps/service');
const { AITaskStatus } = await import('../src/core/ai/types');
const { StorageManager } = await import('../src/core/storage');
const originalFetch = globalThis.fetch;
// Providers may ignore the requested pixel dimensions and return RGB only.
const providerPixels = Buffer.alloc(1254 * 1254 * 3);
for (let y = 0; y < 1254; y++)
  for (let x = 0; x < 1254; x++)
    providerPixels.set([x % 256, 40, y % 256], (y * 1254 + x) * 3);
const png = await sharp(providerPixels, {
  raw: { width: 1254, height: 1254, channels: 3 },
})
  .png()
  .toBuffer();
const expectedTexture = fitWrapTexture(
  png,
  wrapTextureMask(
    readFileSync('public/imgs/templates/tesla/model-3-2024-base.png')
  )
);
const expectedPixels = await sharp(expectedTexture).raw().toBuffer();
const invalidPng = await sharp({
  create: {
    width: 8,
    height: 8,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .png()
  .toBuffer();
const checkerPixels = Buffer.alloc(128 * 128 * 3);
for (let y = 0; y < 128; y++)
  for (let x = 0; x < 128; x++) {
    const value = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? 220 : 255;
    checkerPixels.fill(value, (y * 128 + x) * 3, (y * 128 + x) * 3 + 3);
  }
const checkerPng = await sharp(checkerPixels, {
  raw: { width: 128, height: 128, channels: 3 },
})
  .png()
  .toBuffer();
const webpCover = await sharp(png).resize(800, 800).webp().toBuffer();
const providerRequests: Array<{
  prompt: string;
  aspectRatio: string;
  background: string;
  urls: string[];
  webHook: string;
}> = [];
globalThis.fetch = async (url, init) => {
  if (String(url) === 'https://fixture.invalid/unavailable-template.png')
    return new Response(null, { status: 404 });
  if (String(url) === 'https://api.kie.ai/api/v1/jobs/createTask') {
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.model, 'gpt-image-2-5-sunburst-image-to-image');
    assert.deepEqual(payload.input.input_urls, [
      expectedGuideUrl('model-3-2024-base'),
    ]);
    assert.equal(payload.input.image_input, undefined);
    assert.equal(payload.input.output_format, undefined);
    assert.equal(payload.input.aspect_ratio, '1:1');
    assert.equal(payload.input.resolution, '1K');
    assert.equal(payload.input.background, 'transparent');
    assert.match(payload.input.prompt, /fully transparent \(alpha 0\)/);
    assert(
      !payload.input.prompt.includes('Keep non-printable regions solid black')
    );
    assert.equal(payload.callBackUrl, 'https://fixture.invalid/callback');
    return Response.json({ code: 200, data: { taskId: 'kie-fixture' } });
  }
  if (
    String(url) ===
    'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=kie-fixture'
  ) {
    return Response.json({
      code: 200,
      data: {
        state: 'success',
        createTime: Date.now(),
        resultJson: JSON.stringify({
          resultUrls: ['https://fixture.invalid/output.png'],
        }),
      },
    });
  }
  if (String(url) === 'https://fixture.invalid/v1/draw/completions') {
    assert.equal(init?.method, 'POST');
    providerRequests.push(JSON.parse(String(init?.body)));
    return Response.json({
      code: 0,
      data: { id: `fixture-${providerRequests.length}` },
    });
  }
  if (String(url) === 'https://fixture.invalid/v1/draw/result') {
    return Response.json({
      code: 0,
      data: {
        status: 'failed',
        failure_reason: 'output_moderation',
        error: 'Provider policy message',
        results: null,
      },
    });
  }
  const template = VEHICLE_ASSET_MANIFEST.find((vehicle) =>
    String(url).endsWith(vehicle.templatePath.replace('/imgs', ''))
  );
  if (template)
    return new Response(readFileSync(`public${template.templatePath}`));
  if (String(url) === 'https://fixture.invalid/invalid.png')
    return new Response(invalidPng);
  if (String(url) === 'https://fixture.invalid/checker.png')
    return new Response(checkerPng);
  assert.equal(String(url), 'https://fixture.invalid/output.png');
  return new Response(png);
};
const grsai = new GrsaiProvider({
  apiKey: 'fixture-only',
  baseUrl: 'https://fixture.invalid',
});
const storage = new StorageManager();
let uploads = 0;
let guideUploads = 0;
const guideKeys = new Set<string>();
storage.addProvider({
  name: 'fixture',
  configs: {},
  getPublicUrl: ({ key }) => `https://fixture.invalid/${key}`,
  exists: async ({ key }) => guideKeys.has(key),
  uploadFile: async ({ key, body, contentType }) => {
    if (key.startsWith('templates/ai-guides/')) {
      assert.equal(contentType, 'image/png');
      assert.equal((await sharp(body).metadata()).hasAlpha, false);
      guideUploads++;
      guideKeys.add(key);
      return {
        success: true,
        key,
        url: `https://fixture.invalid/${key}`,
        provider: 'fixture',
      };
    }
    assert.equal(contentType, 'image/png');
    assert.match(key, /\.png$/);
    const { data, info } = await sharp(body)
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual(
      [info.width, info.height, info.channels],
      [1024, 1024, 4],
      'storage receives normalized RGBA PNG'
    );
    assert.deepEqual(
      data,
      expectedPixels,
      'uploaded pixels match the normalized texture exactly'
    );
    assert.equal(
      data[3],
      0,
      'non-printable space is transparent before storage'
    );
    assert.ok(
      body.length < expectedTexture.length,
      'storage receives the compressed file'
    );
    uploads++;
    return {
      success: true,
      key,
      url: `https://fixture.invalid/${key}`,
      provider: 'fixture',
    };
  },
  downloadAndUpload: async () => {
    throw new Error('Unexpected download');
  },
});
try {
  for (const [id, isPaid, openToGallery, expectedPublic] of [
    ['free', false, false, true],
    ['paid-private', true, false, false],
    ['paid-public', true, true, true],
  ] as const) {
    await db()
      .insert(user)
      .values({ id, name: id, email: `${id}@fixture.invalid`, isPaid });
    await grant({ userId: id, credits: 20 });
    const withReference = id === 'paid-public';
    if (withReference) {
      await db().insert(userAsset).values({
        id: 'reference-artwork',
        ownerId: id,
        kind: 'upload',
        source: 'upload',
        storageKey: 'fixture-reference.png',
        publicUrl: 'https://fixture.invalid/reference.png',
        mimeType: 'image/png',
        byteSize: png.length,
        contentHash: 'fixture-reference',
      });
    }
    const generation = await createWrapGeneration({
      userId: id,
      vehicleSlug: 'model-3-2024-base',
      mode: withReference ? 'image-to-image' : 'text-to-image',
      inputAssetIds: withReference ? ['reference-artwork'] : undefined,
      prompt: 'Iron Man',
      preferredColors: id === 'free' ? [] : ['#ff0000', '#00ff00'],
      openToGallery,
      guideImageUrl: generationTemplateUrl(
        'model-3-2024-base',
        'https://fixture.invalid',
        ''
      ),
      storage,
      idempotencyKey: `generation-${id}`,
      providerModel: 'gpt-image-2.5',
      provider: grsai,
    });
    const request = providerRequests.at(-1)!;
    assert.equal(
      request.aspectRatio,
      '1024x1024',
      'Grsai expects this aspect-ratio token; actual output size is normalized separately'
    );
    assert.deepEqual(
      request.urls,
      [
        expectedGuideUrl('model-3-2024-base'),
        ...(withReference ? ['https://fixture.invalid/reference.png'] : []),
      ],
      'The vehicle template must precede any artwork references'
    );
    assert.equal(request.webHook, '-1');
    assert.equal(request.background, 'opaque');
    assert.equal(await getBalance(id), 10);
    assert.equal(await getFrozenBalance(id), 10);
    assert.equal(
      (
        await getCreditHistoryPage({
          userId: id,
          page: 1,
          pageSize: 20,
          transactionType: 'consume',
        })
      ).total,
      0,
      'reservation is not a debit'
    );
    if (id === 'free')
      assert.doesNotMatch(request.prompt, /Preferred palette:|Base color:/);
    else assert.match(request.prompt, /#ff0000, #00ff00/);
    assert.match(request.prompt, /exact original pixel position/);
    assert.match(request.prompt, /non-printable regions solid black/);
    assert.match(
      request.prompt,
      /generate transparency and a smooth black panel outline from the authoritative template/
    );
    assert.doesNotMatch(
      request.prompt,
      /starting point for an original graphic wrap|only when explicitly requested|one or two original focal illustrations|without lettering or logos|rather than reproducing an exact character/
    );
    assert.match(
      request.prompt,
      /colors, panel placement, coverage, and exclusions/
    );
    assert.match(request.prompt, /USER BRIEF: Iron Man/);
    assert.match(request.prompt, /Place main subjects on large body panels/);
    assert.match(request.prompt, /Use narrow strips and small panels/);
    assert.match(request.prompt, /antialiased inward black outline/);
    assert.match(request.prompt, /Geometry takes priority/);
    assert.match(
      request.prompt,
      /rather than replacing the atlas with an assembled vehicle mockup/
    );
    assert.match(
      request.prompt,
      /illustrated bevels, and shading may all be part of the printed artwork/
    );
    assert.match(request.prompt, /illustrated depth must never reshape panels/);
    assert.equal(
      request.prompt.includes('AFTER the first image'),
      withReference
    );
    if (withReference) {
      assert.match(request.prompt, /primary source for the visual design/);
      assert.match(
        request.prompt,
        /numbers, lettering, and logos unless the user asks to change them/
      );
      assert.match(
        request.prompt,
        /transferring the reference design onto the FIRST image's target UV layout/
      );
      assert.match(
        request.prompt,
        /Explicit changes in the user brief take precedence/
      );
      assert.doesNotMatch(request.prompt, /DESIGN: Create a finished wrap/);
    } else {
      assert.match(
        request.prompt,
        /Freely develop its subject matter, visual style, composition, and details/
      );
      assert.doesNotMatch(request.prompt, /REFERENCES:/);
    }
    const [task] = await db()
      .select()
      .from(aiTask)
      .where(eq(aiTask.userId, id));
    assert.equal(JSON.parse(task.options!).openToGallery, expectedPublic);
    const result = {
      taskStatus: AITaskStatus.SUCCESS,
      taskId: id,
      taskInfo: {
        images: [{ imageUrl: 'https://fixture.invalid/output.png' }],
      },
    };
    if (id === 'paid-private') {
      await assert.rejects(
        () =>
          completeWrapGeneration({
            generationId: generation.id,
            result,
            storage: null,
          }),
        /storage is unavailable/
      );
      assert.equal(
        await getFrozenBalance(id),
        10,
        'unsaved output must not settle the hold'
      );
    }
    const completed = await completeWrapGeneration({
      generationId: generation.id,
      result,
      storage,
    });
    await completeWrapGeneration({
      generationId: generation.id,
      result,
      storage,
    });
    assert.equal(
      (await db().select().from(design).where(eq(design.ownerId, id))).length,
      0,
      'no UV atlas is published as a cover'
    );
    const wraps = await db()
      .select()
      .from(userWrap)
      .where(eq(userWrap.userId, id));
    assert.equal(
      wraps.length,
      1,
      'AI output is saved exactly once to the user library'
    );
    assert.equal(
      completed.wrapId,
      wraps[0].id,
      'generator links to the same saved dashboard wrap'
    );
    assert.equal(wraps[0].name, aiWrapName(generation.prompt));
    assert.equal((await getWrap(id, wraps[0].id)).name, wraps[0].name);
    assert.equal(wraps[0].usesAi, true);
    assert.equal(wraps[0].openToGallery, expectedPublic);
    assert.equal(
      wraps[0].moderationStatus,
      expectedPublic ? 'pending' : 'private'
    );
    assert.equal(
      (await db().select().from(design).where(eq(design.ownerId, id))).length,
      0,
      'generation does not create a publication'
    );
    const pending = await listDesignsForModeration({
      page: 1,
      pageSize: 50,
      status: 'pending',
    });
    assert.equal(
      pending.items.some((item: any) => item.id === wraps[0].id),
      expectedPublic
    );
    const all = await listDesignsForModeration({
      page: 1,
      pageSize: 50,
      status: 'all',
    });
    assert.ok(all.items.some((item: any) => item.id === wraps[0].id));
    if (!expectedPublic)
      await assert.rejects(() => getWrapForReview(wraps[0].id, 1), /Private/);
    assert.equal(await getBalance(id), 10);
    assert.equal(await getFrozenBalance(id), 0);
    const debits = await getCreditHistoryPage({
      userId: id,
      page: 1,
      pageSize: 20,
      transactionType: 'consume',
    });
    assert.equal(debits.total, 1);
    assert.equal(debits.items[0].balanceAfter, 10);
    if (expectedPublic) {
      const { saved: publication } = await approveUserWrap({
        wrapId: wraps[0].id,
        version: 1,
        title: 'Edited by reviewer',
        textureKey: 'published.png',
        textureUrl: 'https://fixture.invalid/published.png',
        coverKey: 'cover.webp',
        coverUrl: 'https://fixture.invalid/cover.webp',
      });
      assert.equal(publication.title, 'Edited by reviewer');
      assert.equal((await getWrap(id, wraps[0].id)).name, 'Edited by reviewer');
      assert.equal(publication.sourceWrapId, wraps[0].id);
      assert.equal(publication.publicPrompt, true);
      assert.equal(publication.prompt, generation.prompt);
      assert.equal(
        (await getPublicDesign(publication.slug, false))?.prompt,
        generation.prompt
      );
      // Publications created before prompt snapshots still display their original AI prompt.
      await db()
        .update(design)
        .set({ publicPrompt: false, prompt: null })
        .where(eq(design.id, publication.id));
      assert.equal(
        (await getPublicDesign(publication.slug, false))?.prompt,
        generation.prompt
      );
      await moderateDesign({ designId: publication.id, status: 'hidden' });
      assert.equal(
        await getPublicDesign(publication.slug, false),
        null,
        'hidden work never exposes its prompt'
      );
    }
  }
  assert.equal(
    uploads,
    3,
    'duplicate completion never uploads/publishes twice'
  );
  assert.equal(
    providerRequests.length,
    3,
    'One provider request per generation'
  );

  await assert.rejects(
    () =>
      createWrapGeneration({
        userId: 'paid-private',
        vehicleSlug: 'cybertruck',
        mode: 'text-to-image',
        prompt: 'Blue',
        guideImageUrl: 'https://fixture.invalid/unavailable-template.png',
        storage,
        idempotencyKey: 'unavailable-guide',
        provider: grsai,
        providerModel: 'gpt-image-2.5-sunburst',
      }),
    /Wrap template unavailable/
  );
  assert.equal(await getBalance('paid-private'), 10);
  assert.equal(await getFrozenBalance('paid-private'), 0);
  assert.equal(
    providerRequests.length,
    3,
    'Guide failure never calls a paid provider'
  );
  assert.equal(
    (await db().select().from(aiTask).where(eq(aiTask.userId, 'paid-private')))
      .length,
    1,
    'Guide failure does not create a task or reserve credits'
  );

  for (const failure of [
    'failed',
    'output-moderation',
    'canceled',
    'submission',
    'invalid-texture',
    'checker-texture',
  ] as const) {
    const owner = `failure-${failure}`;
    await db()
      .insert(user)
      .values({
        id: owner,
        name: owner,
        email: `${owner}@fixture.invalid`,
        isPaid: true,
      });
    await grant({ userId: owner, credits: 20 });
    const generation = await createWrapGeneration({
      userId: owner,
      vehicleSlug: 'cybertruck',
      mode: 'text-to-image',
      prompt: 'Blue',
      openToGallery: false,
      guideImageUrl: generationTemplateUrl(
        'cybertruck',
        'https://fixture.invalid',
        ''
      ),
      storage,
      idempotencyKey: owner,
      providerModel: 'fixture',
      provider:
        failure === 'submission'
          ? {
              name: 'fixture',
              configs: {},
              generate: async () => {
                throw new Error('Provider unavailable');
              },
            }
          : grsai,
    });
    if (failure !== 'submission') {
      assert.equal(await getFrozenBalance(owner), 10);
      const result =
        failure === 'output-moderation'
          ? await grsai.query({ taskId: owner })
          : {
              taskId: owner,
              taskStatus:
                failure === 'failed'
                  ? AITaskStatus.FAILED
                  : failure === 'invalid-texture' ||
                      failure === 'checker-texture'
                    ? AITaskStatus.SUCCESS
                    : AITaskStatus.CANCELED,
              taskInfo: {
                errorMessage: 'Fixture failure',
                images: [
                  {
                    imageUrl:
                      failure === 'checker-texture'
                        ? 'https://fixture.invalid/checker.png'
                        : 'https://fixture.invalid/invalid.png',
                  },
                ],
              },
            };
      const completed = await completeWrapGeneration({
        generationId: generation.id,
        result,
        storage,
      });
      if (failure === 'output-moderation') {
        assert.equal(completed.status, 'failed');
        assert.equal(completed.errorCode, 'AI_OUTPUT_MODERATED');
        assert.equal(
          (
            await getWrapGeneration({
              userId: owner,
              generationId: generation.id,
            })
          ).errorCode,
          'AI_OUTPUT_MODERATED',
          'reload preserves the moderation error code'
        );
      }
      await completeWrapGeneration({
        generationId: generation.id,
        result,
        storage,
      });
    }
    assert.equal(
      (await db().select().from(userWrap).where(eq(userWrap.userId, owner)))
        .length,
      0,
      'failed validation never saves a user wrap'
    );
    assert.equal(
      await getFrozenBalance(owner),
      0,
      'failed task releases the hold'
    );
    assert.equal(
      await getBalance(owner),
      20,
      'release restores availability exactly once'
    );
    assert.equal(
      (
        await getCreditHistoryPage({
          userId: owner,
          page: 1,
          pageSize: 20,
          transactionType: 'consume',
        })
      ).total,
      0
    );
  }
  for (const model of [
    'gpt-image-2.5',
    'gpt-image-2.5-sunburst',
    'gpt-image-2.5-flare',
  ]) {
    let sharedPrompt: string | undefined;
    for (const vehicleSlug of ['model-3-legacy', 'cybertruck'] as const) {
      const owner = `grsai-background-${model}-${vehicleSlug}`;
      await db()
        .insert(user)
        .values({
          id: owner,
          name: 'Grsai fixture',
          email: `${owner}@fixture.invalid`,
        });
      await grant({ userId: owner, credits: 20 });
      const generation = await createWrapGeneration({
        userId: owner,
        vehicleSlug,
        mode: 'text-to-image',
        prompt: 'Blue',
        guideImageUrl: generationTemplateUrl(
          vehicleSlug,
          'https://fixture.invalid',
          ''
        ),
        storage,
        idempotencyKey: owner,
        provider: grsai,
        providerModel: model,
      });
      const request = providerRequests.at(-1)!;
      const transparent = model !== 'gpt-image-2.5';
      assert.match(request.prompt, /opaque black-and-white UV layout guide/);
      assert.match(request.prompt, /Never invert this positive\/negative mask/);
      assert.match(request.prompt, /Do not bridge separate islands/);
      assert.match(request.prompt, /FINAL MASK CHECK/);
      assert.match(
        request.prompt,
        /Paint every small isolated white island completely/
      );
      assert.match(
        request.prompt,
        /Preserve printable white regions that touch any canvas edge/
      );
      if (sharedPrompt !== undefined) {
        assert.equal(
          request.prompt,
          sharedPrompt,
          'All vehicle templates use the same mask instructions'
        );
      }
      sharedPrompt = request.prompt;
      assert(
        !request.prompt.includes(
          'including the central opening, gaps, and outer border'
        )
      );
      assert(
        !request.prompt.includes('do not reproduce the white outer border')
      );
      assert.equal(request.background, transparent ? 'transparent' : 'opaque');
      assert.equal(request.aspectRatio, '1024x1024');
      assert.equal(request.urls[0], expectedGuideUrl(vehicleSlug));
      assert.equal(
        request.prompt.includes('fully transparent (alpha 0)'),
        transparent
      );
      if (transparent) {
        assert.match(
          request.prompt,
          /apply the authoritative template contour and a smooth black panel outline/
        );
        assert.doesNotMatch(request.prompt, /pad panel edges/);
      }
      assert.equal(
        request.prompt.includes('Keep non-printable regions solid black'),
        !transparent
      );
      await completeWrapGeneration({
        generationId: generation.id,
        result: { taskId: owner, taskStatus: AITaskStatus.FAILED },
      });
      assert.equal(await getBalance(owner), 20);
    }
  }
  await db().insert(user).values({
    id: 'kie-private',
    name: 'Kie fixture',
    email: 'kie@fixture.invalid',
    isPaid: true,
  });
  await grant({ userId: 'kie-private', credits: 20 });
  const kie = new KieProvider({ apiKey: 'fixture-only' });
  const kieGeneration = await createWrapGeneration({
    userId: 'kie-private',
    vehicleSlug: 'model-3-2024-base',
    mode: 'text-to-image',
    prompt: 'Blue',
    openToGallery: false,
    guideImageUrl: generationTemplateUrl(
      'model-3-2024-base',
      'https://fixture.invalid',
      ''
    ),
    storage,
    idempotencyKey: 'kie-private',
    provider: kie,
    providerModel: 'gpt-image-2-5-sunburst-image-to-image',
    callbackUrl: 'https://fixture.invalid/callback',
  });
  assert.equal(await getFrozenBalance('kie-private'), 10);
  const kieCompleted = await getWrapGeneration({
    userId: 'kie-private',
    generationId: kieGeneration.id,
    provider: kie,
    storage,
  });
  assert.equal(kieCompleted.status, 'succeeded');
  assert(kieCompleted.wrapId, 'Kie result saves an editable wrap');
  assert.equal(await getBalance('kie-private'), 10);
  assert.equal(await getFrozenBalance('kie-private'), 0);
  assert.equal(uploads, 4, 'Kie uses the shared normalized PNG storage path');
  assert.equal(
    guideUploads,
    3,
    'Repeated generations reuse each content-addressed guide'
  );
  const { reserve } = await import('../src/modules/credits/service');
  await db().insert(user).values({
    id: 'hold-limit',
    name: 'hold-limit',
    email: 'hold-limit@fixture.invalid',
  });
  await grant({ userId: 'hold-limit', credits: 10 });
  assert.equal(
    (await reserve({ userId: 'hold-limit', credits: 10 })).success,
    true
  );
  assert.equal(
    (await reserve({ userId: 'hold-limit', credits: 10 })).success,
    false,
    'held credits cannot fund another request'
  );
  const saved = await saveWrap({
    userId: 'free',
    vehicleSlug: 'model-3-2024-base',
    canvasJson: JSON.stringify({
      version: 1,
      width: 1024,
      height: 1024,
      background: 'transparent',
      nodes: [],
      panelColors: { 1: '#123456' },
    }),
    finish: 'gloss',
    idempotencyKey: 'panel-save',
    textureKey: 'fixture.png',
    textureUrl: 'https://fixture.invalid/texture.png',
  });
  assert.deepEqual(
    JSON.parse((await getWrap('free', saved.id)).canvasJson).panelColors,
    { 1: '#123456' }
  );
  assert.equal(
    (await db().select().from(userWrap)).length,
    5,
    'generation creates user wraps alongside manual saves'
  );
  console.log(
    'PASS: public CDN references, Grsai and Kie payloads, native transparency request, normalized storage, credit settlement/refunds, automatic user-wrap save, reviewed publication, and reviewer rename. No external requests.'
  );
} finally {
  globalThis.fetch = originalFetch;
  client.close();
}
