# Project Architecture

## Product flow

`Marketing page -> vehicle selection -> 3D preview -> sign in to edit -> explicit Save -> user wrap -> publish -> Gallery -> local Remix draft`

Uploads and AI generation belong directly to the user and work before the first Save. AI success atomically settles held credits and creates a user wrap; publishing is a separate admin review.

## Frontend

- `src/blocks`: localized marketing sections with no configuration required.
- `src/components/vehicle-viewer`: reusable GLB viewer receiving vehicle/material props.
- `src/components/wrap-editor`: reusable canvas editor receiving an editable document and callbacks.
- `src/features`: stateful product composition for creator, user wraps, generation, and publishing.
- `src/routes`: locale-free TanStack file routes. Paraglide adds the Chinese URL prefix.

## Localization

Paraglide imports five nested source files from `messages/{locale}/`: `common` for shared UI, `marketing` for landing pages and blog content, `dashboard` for user-facing account surfaces, `admin` for the optional translated admin surface, and `studio` for the 3D viewer, editor, and AI generator. Keeping `admin` separate lets a locale intentionally use the English fallback without coupling that choice to dashboard translations. The existing top-level namespaces remain intact inside those files, while the compiler emits one module per message for static, tree-shakeable loading. Runtime components must not load an entire locale catalog or introduce a second translation provider.

Three.js and Konva are loaded only by product routes or an in-view marketing demo. Gallery lists render image covers and never load GLBs.

## Backend

- `src/lib/vehicle-catalog.ts`: release-managed vehicle catalog, including brand,
  model assets, UV template, compatibility status, and display order.
- `user-wraps`: user-owned editable wraps, explicit saves, optimistic updates, texture references and review state.
- `design-gallery`: publish snapshots, list/detail, Remix, reports, moderation.
- `ai-tasks`: existing credit-aware task service extended with wrap generation orchestration.
- Existing payment, credits, config, auth, and storage services remain authoritative.

Vehicle availability, display order, template version, and technical calibration
all live in the code-side manifest and change through a release. User wraps and
designs persist only the stable vehicle slug, so public vehicle reads do not
depend on the database.

## Persistence and storage

- D1 is the production database; all three committed schema templates stay equivalent.
- R2 uses `design/{YYYYMM}`, `cover/{YYYYMM}`, and `storage/{YYYYMM}` for final textures/AI results, covers, and uploaded user attachments. AI reference uploads are retained attachments and count toward the same user quota.
- AI layout guides live at `templates/ai-guides/{vehicleSlug}.png` in the bucket root. White pixels are printable panels; black pixels are excluded space. Generate all files from the current UV templates with `node --import tsx scripts/generate-template-guides.ts`; the local copies are under `public/imgs/templates/ai-guides/`. Publish them before deploying new or changed vehicle templates with `node --import tsx scripts/generate-template-guides.ts --upload --bucket=car-wrap-design --public-base=https://assets.carwrapdesign.app`. This uploads only named guides and verifies the public bytes. Generation requests check the public PNG with HEAD before reserving credits, then pass its URL as the first AI reference; they never process or upload guides. Original transparent UV templates remain authoritative for editor geometry and output clipping. Keep old hash-named objects while older deployed code or in-flight provider tasks may still use them.
- `user_wrap` stores the current editable snapshot, final texture, material, AI provenance, sharing preference, and review status. Names, covers and community counters belong to `design`. It is not a parent container for assets or tasks. Save replaces the current snapshot; editing does not write to the database.
- `user_asset` only stores user uploads, with a cumulative 5 MiB free / 50 MiB paid quota. `ai_generation` stores outputs directly and carries its own user and vehicle context.
- Published designs retain the last approved snapshot while a newer user version is pending. Approval checks the source version and replaces that snapshot with a fresh cover and texture while retaining the public identity and counters. Source deletion removes the publication. Superseded files are deleted only after checking live references; saved remixes own copied base images.
- The local SQLite migration is backed up and verified by `scripts/migrate-user-owned-wraps.ts`; remote production migrations require separate review. See `database-dictionary.md` for all fields and migration boundaries.
