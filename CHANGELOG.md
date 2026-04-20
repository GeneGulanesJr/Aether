# Changelog

## [0.0.1-scaffold] - 2026-04-20

### Added

- Initial scaffold: Vite + React + TypeScript + Tailwind, React Router, TanStack Query
- Layout placeholders: `AppShell`, `BuilderPage`, `PartGrid`, `PartCard`, `BuildSummaryPanel`
- Domain types in `src/lib/types.ts` and R2 fetch helpers in `src/lib/dataClient.ts`
- JSON Schema skeletons under `schema/` and sample fixtures under `data-fixtures/`
- `scripts/validate-schemas.mjs` and `npm run validate:schemas`
- Cloudflare-oriented docs: `README.md`, `docs/scaffold-checklist.md`, `wrangler.toml`, `.env.example`
- GitHub Actions: `ci.yml` (lint, typecheck, schema validate, build), `publish-r2.yml` (disabled until configured)
- SPA routing fallback via `public/_redirects`

### Changed

- Reformatted `pcstorelist.md`: title, aligned four-column table with cleaned notes (removed stray suffixes), and a short Shopee/Lazada search guideline.
