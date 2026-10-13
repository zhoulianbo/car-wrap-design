# 3D Asset Pipeline

## Encrypted model delivery

Source GLBs stay in the local, gitignored `public/models/` directory. The vehicle
manifest continues to name those sources for local asset/material validation.
The viewer maps both body and wheel paths to `public/models-cwm/*.cwm` and
never falls back to fetching the source GLB.

Run `pnpm models:encrypt` after adding or changing source models. It encrypts all
distinct manifest assets with AES-256-GCM, verifies byte-identical decryption,
and leaves unchanged outputs untouched. The format is a 16-byte random IV,
a 16-byte authentication tag, and the encrypted GLB bytes. The public key in
`src/config/model-assets.ts` is intentionally delivered with the browser code;
it is an asset-obfuscation mechanism, not a server credential.

Encrypted models share `VITE_ASSETS_URL` with AI template references. When it
is empty, encrypted files load from the same-origin `/models-cwm/`
folder for local testing. For R2, upload the folder preserving object keys such as
`models-cwm/cybertruck.cwm`, allow GET requests from the site's origin in
the bucket's CORS settings, and set `VITE_ASSETS_URL` to the public asset
origin (for example `https://assets.example.com`) before rebuilding. An optional
base path is supported; do not include `/models-cwm` in the configured
base unless it is also an extra prefix in the object keys. Use
`application/octet-stream` for `.cwm` objects.

Keep `MODEL_ASSET_VERSION` in sync with model/key replacements so browser and
CDN caches receive a new URL. If rotating the public key, regenerate every file
with `pnpm models:encrypt --force` and publish the matching client build and
encrypted files together. Original GLBs must remain excluded from published
assets, including builds made from a local checkout that contains the sources.

Verification: `pnpm exec node --import tsx scripts/verify-encrypted-models.ts`,
plus the existing asset/material checks and a real browser preview. The loader
preserves Draco decoding and `useLoader` caching for repeated/shared models.

## Launch inventory

Only the eight configured Model 3 and Model Y variants are public. Each vehicle manifest entry declares body GLB, wheel GLB, four anchor names, camera calibration, editable material matching, template path, model version, and template version.

Wheel mapping:

- Model 3 Legacy and 2024 Base: Induction.
- Model 3 2024 Performance: Stiletto Silver.
- Model Y Legacy and 2025 Base: Induction.
- Model Y 2025 Premium: Stiletto Silver.
- Model Y 2025 Performance and Model Y L: Machina.

## Assembly and material rules

Clone one wheel scene into `Wheel_LF_Spatial`, `Wheel_RF_Spatial`, `Wheel_LR_Spatial`, and `Wheel_RR_Spatial`. Preserve anchor transforms. Classify editable paint by material/name allowlists and exclude glass, lights, trim, interior, tire, and wheel meshes.

The launch assets expose wrap coordinates through `TEXCOORD_0` on paint primitives. The viewer must use the per-vehicle manifest field and must not assume UV1 exists.

## Studio baseline

- Perspective camera FOV 31 with responsive fit from horizontal and vertical constraints.
- ACES Filmic tone mapping and exposure near 1.02.
- Base paint: metalness 0.05, roughness 0.24, clearcoat 1, clearcoat roughness 0.06.
- PMREM studio reflections, soft key/fill/rim lights, transparent tinted glass, soft contact shadow.
- DPR capped at 1.5 and rendering paused while not visible.

`tmp/tesla-all.webm` is the visual reference for framing, reflection rolloff, ground shadow, and turntable speed.

## Compatibility gate

For every vehicle, apply its official matching Tesla template and inspect door direction, seams, hood, roof, bumpers, and quarter panels. A vehicle may remain viewable, but editor and AI entry points stay disabled until compatibility passes. Export produces a square PNG at 1024px where possible, at most 1MB, and a filename no longer than 30 characters.
