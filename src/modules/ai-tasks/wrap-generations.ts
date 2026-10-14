import { and, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';

import {
  AIMediaType,
  isKieGptImage25Model,
  AITaskStatus as ProviderTaskStatus,
  type AIProvider,
  type AITaskResult,
} from '@/core/ai';
import { db } from '@/core/db';
import { atomicOperation, isD1 } from '@/core/db/atomic';
import type { StorageManager } from '@/core/storage';
import {
  aiGeneration,
  aiTask,
  design,
  user,
  userAsset,
  userWrap,
} from '@/config/db/schema';
import {
  getBalance,
  prepareD1Consumption,
  prepareD1Revocation,
  prepareD1Settlement,
  reserve,
  revoke,
  settleReservation,
} from '@/modules/credits/service';
import { generationErrorCode } from '@/lib/error-codes';
import { readGenerationCover } from '@/lib/generation-cover';
import { prepareGenerationTemplateGuide } from '@/lib/generation-template-guide';
import { normalizeGeneratedWrap } from '@/lib/normalize-generated-wrap';
import { ensurePng } from '@/lib/png-bytes';
import { createStorageKey } from '@/lib/storage-key';
import { getVehicleAssetConfig, type VehicleSlug } from '@/lib/vehicle-catalog';
import { imageWrapDocument } from '@/lib/wrap-document';
import { storeWrapImage } from '@/lib/wrap-image-storage';
import { aiWrapName } from '@/lib/wrap-naming';
import { WrapTextureFitError } from '@/lib/wrap-texture';
import type { AiGenerationMode } from '@/lib/wrap-types';

import { AITaskStatus } from './service';

export const WRAP_GENERATION_MODEL = 'black-forest-labs/flux-2-pro';
export const WRAP_GENERATION_COST = 10;

export async function getOwnedSucceededGeneration(
  userId: string,
  generationId: string
) {
  const [row] = await db()
    .select()
    .from(aiGeneration)
    .where(
      and(eq(aiGeneration.id, generationId), eq(aiGeneration.userId, userId))
    )
    .limit(1);
  if (!row || row.status !== 'succeeded' || !row.outputKey || !row.outputUrl) {
    throw new Error('Generated image is not ready to save');
  }
  const [task] = await db()
    .select({ result: aiTask.taskResult })
    .from(aiTask)
    .where(eq(aiTask.id, row.aiTaskId))
    .limit(1);
  return { ...row, ...readGenerationCover(task?.result) };
}

export async function listUserGenerations(userId: string) {
  const rows = await db()
    .select({ generation: aiGeneration, result: aiTask.taskResult })
    .from(aiGeneration)
    .innerJoin(aiTask, eq(aiTask.id, aiGeneration.aiTaskId))
    .where(eq(aiGeneration.userId, userId))
    .orderBy(desc(aiGeneration.createdAt))
    .limit(60);
  return rows.map(
    (row: {
      generation: typeof aiGeneration.$inferSelect;
      result: string | null;
    }) => ({
      ...publicGeneration(row.generation),
      coverUrl: readGenerationCover(row.result).coverUrl,
    })
  );
}

function publicGeneration(row: typeof aiGeneration.$inferSelect) {
  return {
    id: row.id,
    vehicleSlug: row.vehicleSlug,
    mode: row.mode,
    prompt: row.prompt,
    style: row.style,
    baseColor: row.baseColor,
    costCredits: row.costCredits,
    status: row.status,
    outputUrl: row.outputUrl,
    wrapId: undefined as string | undefined,
    coverUrl: undefined as string | undefined,
    errorCode:
      row.status === 'failed' ? generationErrorCode(row.errorSummary) : null,
    errorSummary:
      row.status === 'failed' ? generationErrorCode(row.errorSummary) : null,
    refundStatus: row.refundStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function publicGenerationWithOutput(
  row: typeof aiGeneration.$inferSelect
) {
  const [task] = await db()
    .select({ result: aiTask.taskResult })
    .from(aiTask)
    .where(eq(aiTask.id, row.aiTaskId))
    .limit(1);
  const [wrap] = await db()
    .select({ id: userWrap.id })
    .from(userWrap)
    .where(
      and(
        eq(userWrap.generationId, row.id),
        eq(userWrap.userId, row.userId),
        isNull(userWrap.deletedAt)
      )
    )
    .limit(1);
  return {
    ...publicGeneration(row),
    wrapId: wrap?.id,
    coverUrl: readGenerationCover(task?.result).coverUrl,
  };
}

export async function createWrapGeneration(params: {
  userId: string;
  vehicleSlug: VehicleSlug;
  mode: AiGenerationMode;
  prompt: string;
  style?: string;
  baseColor?: string;
  preferredColors?: string[];
  openToGallery?: boolean;
  inputAssetIds?: string[];
  storage: StorageManager;
  idempotencyKey: string;
  provider: AIProvider;
  providerModel: string;
  callbackUrl?: string;
  onStage?: (stage: string) => void;
}) {
  params.onStage?.('generation_preflight');
  const [duplicate] = await db()
    .select()
    .from(aiGeneration)
    .where(eq(aiGeneration.idempotencyKey, params.idempotencyKey))
    .limit(1);
  if (duplicate) {
    if (duplicate.userId !== params.userId)
      throw new Error('Generation key is already in use');
    return publicGenerationWithOutput(duplicate);
  }

  const [owner] = await db()
    .select({ isPaid: user.isPaid })
    .from(user)
    .where(eq(user.id, params.userId))
    .limit(1);
  const openToGallery = !owner?.isPaid || params.openToGallery !== false;
  const balance = await getBalance(params.userId);
  if (balance < WRAP_GENERATION_COST) throw new Error('Insufficient credits');

  const inputUrls: string[] = [];
  for (const assetId of params.inputAssetIds ?? []) {
    const [asset] = await db()
      .select()
      .from(userAsset)
      .where(
        and(
          eq(userAsset.id, assetId),
          eq(userAsset.ownerId, params.userId),
          isNull(userAsset.deletedAt)
        )
      )
      .limit(1);
    if (!asset?.publicUrl) throw new Error('Input asset is unavailable');
    inputUrls.push(asset.publicUrl);
  }
  if (params.mode === 'image-to-image' && inputUrls.length === 0) {
    throw new Error('Image-to-image generation needs a reference image');
  }

  // Verify the pre-generated public guide before reserving credits or calling a paid model.
  const guideImageUrl = await prepareGenerationTemplateGuide(
    params.vehicleSlug,
    params.storage,
    params.onStage
  );

  params.onStage?.('reserve_credits_and_create_task');
  const generationId = crypto.randomUUID();
  const taskId = crypto.randomUUID();
  let task: typeof aiTask.$inferSelect;
  let generation: typeof aiGeneration.$inferSelect;
  try {
    const created = await atomicOperation(async (tx, read, commit) => {
      const [existing] = await read(
        tx
          .select()
          .from(aiGeneration)
          .where(eq(aiGeneration.idempotencyKey, params.idempotencyKey))
          .limit(1)
      );
      if (existing) return { existing };
      const billing = {
        userId: params.userId,
        credits: WRAP_GENERATION_COST,
        scene: 'wrap_generation',
        description: 'AI car wrap generation',
        metadata: JSON.stringify({ taskId }),
        reservation: true,
      };
      const planned = isD1()
        ? await prepareD1Consumption(billing, { read })
        : null;
      const charged = planned ?? (await reserve({ ...billing, tx }));
      if (!charged.success || !charged.consumedCredit)
        throw new Error('Insufficient credits');
      const results = await commit([
        ...(planned?.queries ?? []),
        tx
          .insert(aiTask)
          .values({
            id: taskId,
            userId: params.userId,
            mediaType: 'wrap-image',
            provider: params.provider.name,
            model: params.providerModel,
            prompt: params.prompt,
            options: JSON.stringify({
              openToGallery,
              preferredColors: params.preferredColors,
              mode: params.mode,
              vehicleSlug: params.vehicleSlug,
              idempotencyKey: params.idempotencyKey,
            }),
            status: AITaskStatus.PENDING,
            costCredits: WRAP_GENERATION_COST,
            scene: 'wrap_generation',
            creditId: charged.consumedCredit.id,
            taskInfo: JSON.stringify({ creditId: charged.consumedCredit.id }),
          })
          .returning(),
        tx
          .insert(aiGeneration)
          .values({
            id: generationId,
            aiTaskId: taskId,
            templateVersion: getVehicleAssetConfig(params.vehicleSlug)
              .templateVersion,
            vehicleSlug: params.vehicleSlug,
            userId: params.userId,
            mode: params.mode,
            provider: params.provider.name,
            model: params.providerModel,
            prompt: params.prompt,
            style: params.style,
            baseColor: params.baseColor,
            inputAssetsJson: JSON.stringify(params.inputAssetIds ?? []),
            idempotencyKey: params.idempotencyKey,
            costCredits: WRAP_GENERATION_COST,
            status: 'queued',
          })
          .returning(),
      ]);
      return { task: results.at(-2)[0], generation: results.at(-1)[0] };
    });
    if ('existing' in created && created.existing) {
      if (created.existing.userId !== params.userId) {
        throw new Error('Generation key is already in use');
      }
      return publicGenerationWithOutput(created.existing);
    }
    task = created.task;
    generation = created.generation;
  } catch (error) {
    // A concurrent request can win the unique idempotency key between the
    // initial lookup and transaction. Return its record instead of charging
    // or calling the provider twice.
    const [concurrent] = await db()
      .select()
      .from(aiGeneration)
      .where(eq(aiGeneration.idempotencyKey, params.idempotencyKey))
      .limit(1);
    if (concurrent?.userId === params.userId) {
      return publicGenerationWithOutput(concurrent);
    }
    throw error;
  }

  try {
    const nativeTransparency =
      (params.provider.name === 'kie' &&
        isKieGptImage25Model(params.providerModel)) ||
      (params.provider.name === 'grsai' &&
        ['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare'].includes(
          params.providerModel
        ));
    const prompt = [
      'TASK: Recolor ONLY the printable white pixels of the FIRST reference image to create a finished vehicle-wrap texture. Return one square PNG texture atlas at the same full-canvas framing; no cropping, padding, or zoom.',
      'MASK POLARITY: The FIRST image is an opaque black-and-white UV layout guide, not a drawing of a car. WHITE pixels are the only printable surface; BLACK pixels are empty, non-printable space. The black background makes the layout visible and is not a requested artwork color. Replace white panel interiors with artwork; keep empty space empty. Never invert this positive/negative mask or paint the space surrounding a white island instead of the island itself. The final artwork may use any requested color, including black and white; the original mask alone determines where artwork belongs.',
      'LAYOUT: Preserve every island at its exact original pixel position, silhouette, scale, and rotation relative to the full canvas. Geometry takes priority over the artwork brief. Do not move, resize, rotate, mirror, merge, split, duplicate, add, or rearrange panels. Follow each actual white contour, not its bounding rectangle or an imagined vehicle silhouette. Keep internal cutouts, narrow gaps, and large empty areas unpainted. Do not bridge separate islands, widen thin strips into broad panels, or fill the empty space between a strip and a neighboring panel. Paint every small isolated white island completely, regardless of what vehicle part its shape resembles; never reinterpret it as a hole or background. Preserve printable white regions that touch any canvas edge; do not add an outer margin.',
      'ART DIRECTION: Follow the user brief faithfully in its original language, including short names and themes. Preserve explicit user requirements for colors, panel placement, coverage, and exclusions. Develop the artwork within this image request; return the finished texture without a written explanation.',
      'COMPOSITION: Adapt the artwork to the printable islands while maintaining a coherent visual design across the vehicle. Place main subjects on large body panels with enough room to keep them recognizable after template clipping. Use narrow strips and small panels to continue the palette and supporting patterns rather than squeezing complete subjects into them. Keep repeated subjects, typography, and decorative details consistent. Orient artwork, numbers, and lettering for reading on the assembled vehicle; different UV islands may require different rotations. Extend the background artwork completely to each printable boundary.',
      'FINISHING: The application will fill transparent gaps with the selected base color or a color sampled from the artwork, clip every output to the fixed template, and add a fine antialiased inward black outline to each panel. Do not draw additional panel borders or leave a blank margin for them. These panel outlines are separate from any outlines used within the artwork. Keep important subjects clear of panel edges; final clipping cannot restore a misplaced or cut-off subject.',
      'SURFACE: Deliver a flat 2D texture atlas. Flat describes the canvas projection, not the artistic style or subject matter. Illustration, photography, typography, patterns, gradients, highlights, illustrated bevels, and shading may all be part of the printed artwork. Keep the UV silhouettes fixed; illustrated depth must never reshape panels or extend into non-printable space. Present the artwork on the fixed atlas rather than replacing the atlas with an assembled vehicle mockup or a presentation scene.',
      nativeTransparency
        ? 'BACKGROUND: Fill every white island with opaque artwork, including narrow strips and small panels. Do not leave unpainted margins, transparent holes, or faded edges within panels. Make all non-printable regions fully transparent (alpha 0), including internal cutouts, gaps, and unused canvas pixels. Return real PNG transparency; never draw a checkerboard or simulate transparency with a solid color. The application will resize the result, fill transparent panel gaps, apply the authoritative template contour and a smooth black panel outline, and compress the PNG.'
        : 'BACKGROUND: Fill every white island with opaque artwork, including narrow strips and small panels. Do not leave unpainted margins, transparent holes, or faded edges within panels. Keep non-printable regions solid black and undecorated, including internal cutouts, gaps, and unused canvas pixels. Never draw a checkerboard or simulated transparency. The application will resize the result, generate transparency and a smooth black panel outline from the authoritative template, and compress the PNG.',
      inputUrls.length
        ? "REFERENCES: Use the reference images AFTER the first image as the primary source for the visual design. Preserve their main artwork, subjects, colors, style, distinctive details, numbers, lettering, and logos unless the user asks to change them. A request for a similar wrap on another vehicle means transferring the reference design onto the FIRST image's target UV layout. Adapt the artwork's placement and proportions to the target panels while retaining the reference design's visual identity and hierarchy. The FIRST image controls panel geometry; later references control artwork content. Do not copy the reference vehicle's UV arrangement, background, or empty cutouts. Explicit changes in the user brief take precedence over the reference artwork."
        : 'DESIGN: Create a finished wrap based on the user brief. Freely develop its subject matter, visual style, composition, and details, including imagery, numbers, lettering, and logos where they suit the requested design. The FIRST image defines where the artwork belongs, not what its creative content must be.',
      `USER BRIEF: ${params.prompt}`,
      params.style ? `Visual style: ${params.style}.` : '',
      params.baseColor ? `Base color: ${params.baseColor}.` : '',
      params.preferredColors?.length
        ? `Preferred palette: ${params.preferredColors.join(', ')}.`
        : '',
      'FINAL MASK CHECK: Before returning the image, compare its coverage with the FIRST mask: every printable white island is painted, every original non-printable gap/cutout remains empty, small isolated white islands are not punched out, thin strips have not expanded into neighboring empty space, and real panels touching the canvas edges remain intact. Apply the artwork brief only within these fixed regions. Return only the finished texture image.',
    ]
      .filter(Boolean)
      .join('\n\n');
    params.onStage?.('provider_generate');
    const result = await params.provider.generate({
      params: {
        mediaType: AIMediaType.IMAGE,
        model: params.providerModel,
        prompt,
        async: true,
        callbackUrl: params.callbackUrl,
        options: {
          aspect_ratio: params.provider.name === 'grsai' ? '1024x1024' : '1:1',
          output_format: 'png',
          // Native alpha is composited over the base; the template owns the final outline.
          background: nativeTransparency ? 'transparent' : 'opaque',
          ...(params.provider.name === 'kie' && nativeTransparency
            ? { resolution: '1K' }
            : {}),
          image_input: [guideImageUrl, ...inputUrls],
        },
      },
    });
    params.onStage?.('persist_provider_result');
    await db()
      .update(aiTask)
      .set({
        taskId: result.taskId,
        status: AITaskStatus.PROCESSING,
        taskResult: JSON.stringify(result.taskResult ?? {}),
      })
      .where(eq(aiTask.id, task.id));
    const [updated] = await db()
      .update(aiGeneration)
      .set({
        providerPredictionId: result.taskId,
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(aiGeneration.id, generationId))
      .returning();
    return publicGeneration(updated);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 500)
        : 'Provider request failed';
    return failWrapGeneration(generation, message);
  }
}

async function failWrapGeneration(
  generation: typeof aiGeneration.$inferSelect,
  message: string
) {
  return atomicOperation(async (tx, read, commit) => {
    const [current] = await read(
      tx
        .select()
        .from(aiGeneration)
        .where(eq(aiGeneration.id, generation.id))
        .limit(1)
        .for('update')
    );
    if (!current || !['queued', 'processing'].includes(current.status))
      return publicGeneration(current ?? generation);
    const [task] = await read(
      tx
        .select({ creditId: aiTask.creditId })
        .from(aiTask)
        .where(eq(aiTask.id, generation.aiTaskId))
        .limit(1)
    );
    let refunds: any[] = [];
    if (task?.creditId) {
      if (isD1()) refunds = await prepareD1Revocation(task.creditId, { read });
      else await revoke(task.creditId, tx);
    }
    const results = await commit([
      ...refunds,
      tx
        .update(aiGeneration)
        .set({
          status: 'failed',
          errorSummary: message.slice(0, 500),
          refundStatus: 'refunded',
          completionClaim: null,
          completionClaimedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(aiGeneration.id, generation.id))
        .returning(),
      tx
        .update(aiTask)
        .set({
          status: AITaskStatus.FAILED,
          taskResult: JSON.stringify({ error: message }),
        })
        .where(eq(aiTask.id, generation.aiTaskId)),
    ]);
    return publicGeneration(results.at(-2)[0]);
  });
}

export async function completeWrapGeneration(params: {
  generationId: string;
  result: AITaskResult;
  storage?: StorageManager | null;
}) {
  const [generation] = await db()
    .select()
    .from(aiGeneration)
    .where(eq(aiGeneration.id, params.generationId))
    .limit(1);
  if (!generation) throw new Error('Generation not found');
  if (generation.status === 'succeeded' || generation.status === 'failed') {
    return publicGenerationWithOutput(generation);
  }

  if (params.result.taskStatus === ProviderTaskStatus.SUCCESS) {
    const remoteUrl = params.result.taskInfo?.images?.[0]?.imageUrl;
    if (!remoteUrl || !params.storage) {
      throw new Error('Generated image storage is unavailable');
    }

    const claimId = crypto.randomUUID();
    const [claimed] = await db()
      .update(aiGeneration)
      .set({
        completionClaim: claimId,
        completionClaimedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiGeneration.id, generation.id),
          eq(aiGeneration.status, generation.status),
          or(
            isNull(aiGeneration.completionClaim),
            lt(
              aiGeneration.completionClaimedAt,
              new Date(Date.now() - 5 * 60_000)
            )
          )
        )
      )
      .returning({ id: aiGeneration.id });
    if (!claimed) {
      const [current] = await db()
        .select()
        .from(aiGeneration)
        .where(eq(aiGeneration.id, generation.id))
        .limit(1);
      return publicGenerationWithOutput(current ?? generation);
    }

    try {
      const downloaded = await fetch(remoteUrl);
      if (!downloaded.ok) {
        throw new Error(
          `Generated image download failed (${downloaded.status})`
        );
      }
      const png = await normalizeGeneratedWrap(
        await ensurePng(new Uint8Array(await downloaded.arrayBuffer())),
        generation.vehicleSlug,
        generation.baseColor
      );
      const key = createStorageKey('design', 'png');
      const saved = await params.storage.uploadFile({
        body: png,
        key,
        contentType: 'image/png',
        disposition: 'inline',
      });
      if (!saved.success || !saved.url) {
        throw new Error(saved.error || 'Failed to store generated image');
      }
      // Commit the output, settled credits and owned wrap together; publication waits for review.
      const updated = await atomicOperation(async (tx, read, commit) => {
        const [current] = await read(
          tx
            .select()
            .from(aiGeneration)
            .where(
              and(
                eq(aiGeneration.id, generation.id),
                eq(aiGeneration.completionClaim, claimId),
                eq(aiGeneration.status, generation.status)
              )
            )
            .limit(1)
            .for('update')
        );
        if (!current) throw new Error('Generation completion claim expired');
        const [billing] = await read(
          tx
            .select()
            .from(aiTask)
            .where(eq(aiTask.id, generation.aiTaskId))
            .limit(1)
        );
        if (!billing?.creditId)
          throw new Error('Credit reservation is missing');
        let settlement: any[] = [];
        if (isD1())
          settlement = await prepareD1Settlement(billing.creditId, { read });
        else await settleReservation(billing.creditId, tx);
        const openToGallery =
          JSON.parse(billing.options || '{}').openToGallery !== false;
        const wrapId = crypto.randomUUID();
        const results = await commit([
          ...settlement,
          tx
            .update(aiGeneration)
            .set({
              status: 'succeeded',
              outputKey: saved.key || key,
              outputUrl: saved.url,
              completionClaim: null,
              completionClaimedAt: null,
              updatedAt: new Date(),
            })
            .where(eq(aiGeneration.id, generation.id))
            .returning(),
          tx
            .update(aiTask)
            .set({
              status: AITaskStatus.SUCCESS,
              taskResult: JSON.stringify({
                outputKey: saved.key || key,
                outputUrl: saved.url,
              }),
            })
            .where(eq(aiTask.id, generation.aiTaskId)),
          tx.insert(userWrap).values({
            id: wrapId,
            name: aiWrapName(generation.prompt),
            userId: generation.userId,
            vehicleSlug: generation.vehicleSlug,
            templateVersion: generation.templateVersion,
            generationId: generation.id,
            canvasJson: JSON.stringify(
              imageWrapDocument(
                `/api/wraps/${wrapId}?texture=1&source=${encodeURIComponent(saved.url!)}`
              )
            ),
            textureKey: saved.key || key,
            textureUrl: saved.url,
            finish: 'gloss',
            usesAi: true,
            openToGallery,
            moderationStatus: openToGallery ? 'pending' : 'private',
            status: 'saved',
            version: 1,
            idempotencyKey: `generation:${generation.id}`,
          }),
        ]);
        return results.at(-3)[0];
      });
      return publicGenerationWithOutput(updated);
    } catch (error) {
      await db()
        .update(aiGeneration)
        .set({
          completionClaim: null,
          completionClaimedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(aiGeneration.id, generation.id),
            eq(aiGeneration.completionClaim, claimId)
          )
        );
      if (error instanceof WrapTextureFitError)
        return failWrapGeneration(generation, error.message);
      throw error;
    }
  }

  if (
    params.result.taskStatus === ProviderTaskStatus.FAILED ||
    params.result.taskStatus === ProviderTaskStatus.CANCELED
  ) {
    const message = params.result.taskInfo?.errorMessage || 'Generation failed';
    return failWrapGeneration(generation, message);
  }

  const [updated] = await db()
    .update(aiGeneration)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(
      and(
        eq(aiGeneration.id, generation.id),
        eq(aiGeneration.status, generation.status)
      )
    )
    .returning();
  return publicGeneration(updated ?? generation);
}

export async function getWrapGeneration(params: {
  userId: string;
  generationId: string;
  provider?: AIProvider;
  storage?: StorageManager | null;
}) {
  const [generation] = await db()
    .select()
    .from(aiGeneration)
    .where(
      and(
        eq(aiGeneration.id, params.generationId),
        eq(aiGeneration.userId, params.userId)
      )
    )
    .limit(1);
  if (!generation) throw new Error('Generation not found');
  if (!params.provider || !generation.providerPredictionId)
    return publicGenerationWithOutput(generation);
  if (generation.status === 'succeeded' || generation.status === 'failed') {
    return publicGenerationWithOutput(generation);
  }
  if (
    generation.lastPolledAt &&
    Date.now() - generation.lastPolledAt.getTime() < 15_000
  ) {
    return publicGeneration(generation);
  }

  const [claimed] = await db()
    .update(aiGeneration)
    .set({ lastPolledAt: new Date() })
    .where(
      and(
        eq(aiGeneration.id, generation.id),
        eq(aiGeneration.status, generation.status),
        generation.lastPolledAt
          ? eq(aiGeneration.lastPolledAt, generation.lastPolledAt)
          : isNull(aiGeneration.lastPolledAt)
      )
    )
    .returning({ id: aiGeneration.id });
  if (!claimed) {
    const [current] = await db()
      .select()
      .from(aiGeneration)
      .where(eq(aiGeneration.id, generation.id))
      .limit(1);
    return publicGenerationWithOutput(current ?? generation);
  }
  try {
    const result = await params.provider.query?.({
      taskId: generation.providerPredictionId,
      mediaType: AIMediaType.IMAGE,
      model: generation.model,
    });
    if (!result) return publicGeneration(generation);
    return completeWrapGeneration({
      generationId: generation.id,
      result,
      storage: params.storage,
    });
  } catch (error) {
    return {
      ...publicGeneration(generation),
      syncWarning: 'AI_UNAVAILABLE',
    };
  }
}

export async function getWrapGenerationProviderName(params: {
  userId: string;
  generationId: string;
}) {
  const [generation] = await db()
    .select({ provider: aiGeneration.provider })
    .from(aiGeneration)
    .where(
      and(
        eq(aiGeneration.id, params.generationId),
        eq(aiGeneration.userId, params.userId)
      )
    )
    .limit(1);
  if (!generation) throw new Error('Generation not found');
  return generation.provider;
}

export async function handleWrapGenerationWebhook(params: {
  provider: string;
  providerPredictionId: string;
  result: AITaskResult;
  storage?: StorageManager | null;
}) {
  const [generation] = await db()
    .select({ id: aiGeneration.id, provider: aiGeneration.provider })
    .from(aiGeneration)
    .where(
      and(
        eq(aiGeneration.provider, params.provider),
        eq(aiGeneration.providerPredictionId, params.providerPredictionId)
      )
    )
    .limit(1);
  if (!generation) throw new Error('Generation callback does not match a task');
  return completeWrapGeneration({
    generationId: generation.id,
    result: params.result,
    storage: params.storage,
  });
}

export async function listWrapGenerationsForAdmin(params: {
  page: number;
  pageSize: number;
  status?: string;
}) {
  const statusCondition =
    params.status && params.status !== 'all'
      ? eq(aiGeneration.status, params.status)
      : undefined;
  const [{ total }] = await db()
    .select({ total: sql<number>`count(*)` })
    .from(aiGeneration)
    .where(statusCondition);
  const items = await db()
    .select({
      id: aiGeneration.id,
      vehicleSlug: aiGeneration.vehicleSlug,
      userId: aiGeneration.userId,
      mode: aiGeneration.mode,
      provider: aiGeneration.provider,
      model: aiGeneration.model,
      providerPredictionId: aiGeneration.providerPredictionId,
      costCredits: aiGeneration.costCredits,
      status: aiGeneration.status,
      refundStatus: aiGeneration.refundStatus,
      errorSummary: aiGeneration.errorSummary,
      createdAt: aiGeneration.createdAt,
      updatedAt: aiGeneration.updatedAt,
    })
    .from(aiGeneration)
    .where(statusCondition)
    .orderBy(desc(aiGeneration.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);
  return { items, total: Number(total ?? 0) };
}

/** Persist a real 3D cover and publish only once it is available. No extra AI call. */
export async function saveGenerationCover(
  userId: string,
  generationId: string,
  body: Uint8Array,
  storage: StorageManager
) {
  const generation = await getOwnedSucceededGeneration(userId, generationId);
  if (generation.coverKey && generation.coverUrl)
    return { coverKey: generation.coverKey, coverUrl: generation.coverUrl };
  const claimId = crypto.randomUUID();
  const [claimed] = await db()
    .update(aiGeneration)
    .set({ completionClaim: claimId, completionClaimedAt: new Date() })
    .where(
      and(
        eq(aiGeneration.id, generationId),
        or(
          isNull(aiGeneration.completionClaim),
          lt(aiGeneration.completionClaimedAt, new Date(Date.now() - 60_000))
        )
      )
    )
    .returning({ id: aiGeneration.id });
  if (!claimed) throw new Error('Cover is already being saved; retry shortly');
  try {
    // A competing request may have completed after our initial read.
    const current = await getOwnedSucceededGeneration(userId, generationId);
    if (current.coverKey && current.coverUrl)
      return { coverKey: current.coverKey, coverUrl: current.coverUrl };
    const saved = await storeWrapImage(storage, body, 'cover');
    await atomicOperation(async (tx, read, commit) => {
      const [current] = await read(
        tx
          .select()
          .from(aiGeneration)
          .where(
            and(
              eq(aiGeneration.id, generationId),
              eq(aiGeneration.completionClaim, claimId)
            )
          )
          .limit(1)
          .for('update')
      );
      if (!current) throw new Error('Cover save claim expired');
      await commit([
        tx
          .update(aiGeneration)
          .set({
            completionClaim: null,
            completionClaimedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(aiGeneration.id, generationId)),
        tx
          .update(aiTask)
          .set({
            taskResult: JSON.stringify({
              outputKey: generation.outputKey,
              outputUrl: generation.outputUrl,
              coverKey: saved.key,
              coverUrl: saved.url,
            }),
          })
          .where(eq(aiTask.id, generation.aiTaskId)),
      ]);
    });
    return { coverKey: saved.key, coverUrl: saved.url };
  } finally {
    await db()
      .update(aiGeneration)
      .set({ completionClaim: null, completionClaimedAt: null })
      .where(
        and(
          eq(aiGeneration.id, generationId),
          eq(aiGeneration.completionClaim, claimId)
        )
      );
  }
}
