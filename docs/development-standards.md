# Development Standards

## Boundaries

- Routes parse input, authorize, call a service, and return `respData` or `respErr`.
- Business rules live in `src/modules`. React components never import database or module code.
- Browser data uses TanStack Query and `@/lib/api-client`; components do not call `fetch` directly.
- Files are named by function (`vehicle-viewer`, `wrap-editor`, `design-gallery`), never by the domain name.
- Translation sources use five large functional domains under `messages/{locale}/`: `common`, `marketing`, `dashboard`, `admin`, and `studio`. Admin copy stays isolated so locales that do not maintain an admin translation can fall back to English without mixing it into the user dashboard catalog. Each file contains nested JSON objects. Known messages still use static compiled access such as `m['landing.hero.headline']()` so Paraglide can tree-shake each message module.
- Every new key is added to the matching English and Chinese domain file. The path arrays in `project.inlang/settings.json` must stay in sync with the domain files.

## React and TypeScript

- All TypeScript remains strict. Avoid `any` except at a provider boundary, then normalize immediately.
- Use regular React components. This TanStack Start project has no React Server Components and no `use client` directive.
- Keep continuous pointer and camera values outside React render state. UI state may use local state or a reducer.
- Long pages are composed from blocks. Durable, content-agnostic renderers live in components.

## API and persistence

- Validate request bodies with Zod and enforce ownership inside services.
- Only an explicit Save persists a user wrap: one editable snapshot, final texture, 3D cover, and finish. The internal `version` detects concurrent edits and is never displayed.
- Wraps, uploaded attachments, and AI tasks each belong directly to a user. Uploading or generating must not create a wrap. Attachment keys are unpredictable; validate ownership, signature, MIME, and per-user quota. Gallery entries keep independent image references.
- Credit consumption and task creation are atomic. Failed candidates are refunded idempotently.
- Provider credentials remain in encrypted admin config. Provider/model routing remains in code.

## Verification

- Run targeted type and behavior checks while developing.
- Run `pnpm db:push` immediately after schema changes in local development.
- Run `pnpm build` after route, schema, dependency, or large feature changes.
- UI preview uses `bash ~/bin/dev-verify "pnpm dev"`; never leave port 3100 listening.
