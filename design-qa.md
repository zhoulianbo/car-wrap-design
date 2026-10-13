# Wrap Studio verification — 2026-10-08

This record supersedes the earlier prototype-color QA conclusion. The prototype defines layout and interactions; project semantic tokens define the palette for buttons, text, floating panels, and dialogs.

## Implemented behavior

- Full-screen Preview / Edit layout with the transparent checkerboard editing surface and a bottom UV guide that is excluded from exports.
- The editor remains mounted when switching tabs, retaining its current document and undo history.
- Editing never automatically saves. An explicit Save captures final texture, 3D cover, current editable snapshot, paint color, and material.
- Wraps, uploads, AI tasks, and gallery snapshots belong directly to users. Uploading, generating, or opening a remix does not create an empty wrap.
- User-upload quota is separate from generated images, covers, and final textures.
- The public gallery returns fixed image/material references without private editable layer JSON.
- Semantic theme colors and bilingual “My wraps” navigation replace the old project-facing UI.

## Verified this pass

- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed.
- `pnpm db:push`: no differences after the backed-up local SQLite migration.
- `node --import tsx scripts/verify-user-owned-wraps.ts`: passed with a fresh isolated database and mocked provider/storage.
- Integration checks cover user isolation, upload/generation independence, explicit saves, stale-write conflicts, immutable published images/material, remix drafts, duplicate-request charging, repeated completion, one-time refunds, and concurrent attachment quota enforcement.
- Migration audit preserves 45 wrap records, 5 uploaded attachments, 40 gallery entries, and the existing remix record; canvas JSON, owners, asset keys, and public slugs were compared to the backup. Foreign-key check passed.
- Three legacy wraps have no flattened texture; their editable snapshots remain available and the next explicit Save creates texture/cover files.
- Browser: Chinese `/wraps` guest prompt, old `/projects` redirect, signed-out full-screen editor login overlay, and 390 × 844 viewport fit. Document dimensions were 390 × 844 with no overflow. No application console errors were observed during those checks.
- The dev server used the required temporary wrapper. Port 3100 was confirmed released.

## Verification boundaries

Authenticated browser verification was blocked by automatic approval review of the temporary local QA login. The temporary QA account was removed; no authentication bypass was introduced.

Actual R2 writes, paid AI calls, deployed D1 behavior, and an authenticated browser save/reopen cycle were not exercised. The final paint-color export and keyboard gating adjustments passed type/build checks but were not rechecked in an authenticated browser. Older screenshots under tmp are historical visual evidence, not proof of the new persistence flow.

The local migration script does not apply remote production migrations. PostgreSQL/MySQL/D1 migration and runtime validation remain separate deployment work.

## Preview-tab follow-up — 2026-10-08

- Regular `/create/:vehicle` links default to Edit. Gallery cards and detail pages have explicit `3D Preview` links carrying the design slug and `tab=preview`. Locale-aware links now pass query parameters separately to the router.
- Preview uses the existing semantic palette, a responsive vehicle stage, and a floating Front / Rear / Side / rotation / zoom dock. Material, color, and vehicle selectors are absent from Preview. License-plate controls were not added.
- Camera fitting excludes hidden model geometry and fits the visible vehicle to the available viewport. Presets use world-space wheel anchors; selecting a preset pauses rotation. Resizing preserves correct model scale.
- Public textures are read through a same-origin endpoint restricted to visible gallery entries and the configured HTTPS storage origin, with redirects disabled. Binary loading uses TanStack Query and the API client before image decoding, avoiding both missing storage CORS headers and Nitro's development-time static-image dispatch. Image refresh waits for the decoded image to commit to the canvas.
- Browser checks: the gallery Preview link opens the matching texture without login; front/rear/side, zoom, and rotation controls work; selecting a preset stops rotation. Switching to Edit and regular creation entry both show the guest login gate.
- Layout checked at 1920 × 1080, 390 × 844, and 320 × 568 without document overflow. The narrowest toolbar is 302px wide within a 320px viewport.
- Screenshot: `tmp/preview-desktop-20261008.jpg`. No accounts were created or used. Authenticated editing/saving and remote deployment remain untested in this follow-up.

## Editor interaction follow-up — 2026-10-08

- Kept the product's existing typography, semantic controls, emerald accent, and manual Save flow. Added lighter slate inspection backgrounds and preview-only fill lighting for dark paint and wheels.
- Asset library displays usage against the server's 5 MiB / 50 MiB limits, with canvas/reference/delete actions. Delete is owner-scoped, releases active-library quota, and preserves source objects used by saved wraps. Uploaded canvas images use an authenticated, storage-origin-restricted binary endpoint.
- Shape selection arms a crosshair tool; dragging creates the shape. Text is placed by clicking the canvas. Eraser toggles off, selected images have isolated erasure masks, and image flips preserve position. Tooltips and button-anchored material/shape popovers use the existing Base UI dependency.
- The full workspace is the Konva viewport. A dashed guide marks the UV bounds; elements outside remain visible. Texture export crops only the UV rectangle. Side tabs form a collapsible right rail with internally scrolling content on the left. Compact 3D starts still, supports edge/corner resizing, and has camera reset.
- An isolated, synthetic component fixture verified drag-to-draw, click-to-place text, keyboard deletion, eraser cancellation, image flip/erase/undo, material dismissal, preview resizing/reset, asset actions/reference selection, quota feedback, and equal-size image alignment. The fixture was removed after testing; no production auth bypass, accounts, real uploads, or paid calls were used.
- Export pixel checks confirmed 1024 × 1024 output and unchanged sampled pixels after moving the canvas partly offscreen. Erasing the image changed the sampled pixel to the base paint; Undo restored its original value.
- Desktop 1440 × 900 and mobile 390 × 844 / 320 × 568 were checked. Mobile has no compact viewer or document overflow; at 320 × 568 the side content scrolls internally while the canvas keeps its full workspace height.
- The real Chinese Preview page retains default paused rotation and the Edit login gate. Screenshot: `tmp/studio-preview-contrast-20261008.jpg`. Authenticated upload/save/reopen against actual storage remains untested.
- TypeScript, targeted formatting, diff whitespace, production build, and the isolated SQLite integration suite passed. New integration assertions cover foreign-user deletion denial, quota reuse, and retained source references. The concurrent SQLite fixture uses WAL so read snapshots do not block subsequent writes. Existing Three.js deprecation warnings remain.
- Temporary dev services were stopped and port 3100 was confirmed released.

## Studio controls and physical asset deletion — 2026-10-08

- Header Share / Download / Save buttons are 44px high; right-side tabs are 64px high, with larger icons and labels. Vehicle selection uses the existing themed Select component, not the native select.
- Layers use the installed dnd-kit sortable controls with pointer and keyboard sensors. A completed reorder commits one undoable edit; no automatic database save was added.
- Preview now starts rotating by default (supersedes the earlier paused-preview behavior). The Edit viewer remains stationary.
- Deleting an asset now physically deletes its exact owned R2 object before marking the metadata deleted and releasing quota. Storage errors retain the record for retry. Saved textures/covers remain independent. A saved wrap referencing a deleted original opens from its flattened saved texture with an explicit notice; its original layers are no longer individually editable. This supersedes the earlier source-object retention behavior.
- Browser checks: pointer drag and keyboard reorder changed canvas layer order, Undo restored it, custom vehicle selection changed its displayed value, actual Preview began rotating and paused on request, and header buttons measured 44px high. At 320 × 568, the side tabs measured 56 × 64 with no document overflow.
- SQLite integration checks cover ownership, storage-deletion failure, quota release/reuse, preserved saved texture/snapshot, and deleted-source recovery detection. Synthetic R2 transport tests cover signed DELETE, exact root object keys, 404 retry success, and failure propagation. No real R2 files were deleted during verification.
- Screenshots: `tmp/studio-large-header-20261008.jpg` (real Preview page), `tmp/studio-layer-controls-20261008.jpg` (synthetic editor component fixture). Temporary fixture files were removed. No accounts were created or authenticated.
- Restored base images are pinned to their original texture URL; later saves do not turn the base into a recursive reference to the newest composite. Tests reject proxy requests that do not match the current texture or an image reference in the owned snapshot.

## Vehicle material correction — 2026-10-08

- Inspected material names and primitive assignments in all eight shipped body GLBs. `Exterior` is unpainted trim, not body paint. Wrap eligibility now matches only `Paint` and numbered duplicates such as `Paint.001`; exterior trim, window pillars, wheel wells and wheel components keep their original materials.
- Paint conversion preserves sidedness and normal/AO channels. Gloss uses stronger metallic response without sheen or iridescence; environment reflection panels and diffuse fill are balanced to retain body shading instead of washing it out.
- Exterior window glass uses physical transmission with full-opacity reflections, while cabin-side glass and lamp lenses retain their authored properties. Wheels retain authored alloy colors/textures; rubber has a lighter charcoal response for visible detail.
- Browser checks covered Model Y Legacy in white, black and a saturated two-color test wrap, plus Model 3 2024 Base and Model Y 2025 Performance. The actual Chinese Preview page loaded without console errors, started rotating, and paused through its existing control. No authenticated editing, database writes or remote services were used.
- `node --import tsx scripts/verify-vehicle-materials.ts` passed runtime material assignment/isolation, glass shader definitions, finish changes, retained material channels and wheel checks. `node --import tsx scripts/validate-wrap-assets.ts` passed all eight GLBs including paint UV presence. TypeScript, diff whitespace and production build passed. Existing Three.js deprecation warnings remain.
- Screenshots: `tmp/material-preview-final-20261008.png` (actual page, manually rotated/zoomed for inspection), `tmp/material-white-20261008.png` and `tmp/material-wrap-20261008.png` (isolated real-viewer fixture). Temporary fixture sources were removed and port 3100 was confirmed released.
