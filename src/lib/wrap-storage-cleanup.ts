import { and, eq, isNull, or } from 'drizzle-orm';

import { db } from '@/core/db';
import type { StorageManager } from '@/core/storage';
import { aiGeneration, design, userAsset, userWrap } from '@/config/db/schema';

/** Only remove superseded objects after commit, and never delete an editable layer's source. */
export async function removeUnusedWrapImages(
  storage: StorageManager,
  images: { key?: string | null; url?: string | null }[]
) {
  const failures: string[] = [];
  for (const image of new Map(
    images.filter((x) => x.key).map((x) => [x.key, x])
  ).values()) {
    const key = image.key!;
    try {
      const [wraps, publications, assets, generations] = await Promise.all([
        db()
          .select({
            textureKey: userWrap.textureKey,
            canvasJson: userWrap.canvasJson,
          })
          .from(userWrap)
          .where(isNull(userWrap.deletedAt)),
        db()
          .select({ id: design.id })
          .from(design)
          .where(
            and(
              isNull(design.deletedAt),
              or(eq(design.textureKey, key), eq(design.coverKey, key))
            )
          )
          .limit(1),
        db()
          .select({ id: userAsset.id })
          .from(userAsset)
          .where(
            and(isNull(userAsset.deletedAt), eq(userAsset.storageKey, key))
          )
          .limit(1),
        db()
          .select({ id: aiGeneration.id })
          .from(aiGeneration)
          .where(eq(aiGeneration.outputKey, key))
          .limit(1),
      ]);
      const referenced =
        publications.length ||
        assets.length ||
        generations.length ||
        wraps.some(
          (w: { textureKey: string | null; canvasJson: string }) =>
            w.textureKey === key ||
            (image.url &&
              (w.canvasJson.includes(image.url) ||
                w.canvasJson.includes(encodeURIComponent(image.url))))
        );
      if (referenced) continue;
      await storage.deleteFile({ key });
    } catch {
      failures.push(key);
    }
  }
  return failures;
}
