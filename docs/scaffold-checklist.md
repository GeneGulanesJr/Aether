# Scaffold acceptance checklist

Use this before starting heavy feature work.

## Repository / app

- [ ] `npm install` completes without errors
- [ ] `npm run dev` opens the app and `/` redirects to `/build`
- [ ] Placeholder regions render: status strip, filters placeholder, part grid, build summary
- [ ] Fixture mode shows sample CPUs with **₱** prices from `data-fixtures/`

## Quality gates

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run validate:schemas` passes
- [ ] `npm run build` produces `dist/`

## R2 + CORS (when enabling R2 mode)

- [ ] R2 bucket exists and objects are reachable at `VITE_R2_BASE_URL`
- [ ] At minimum, these keys exist for smoke test:
  - [ ] `prices/manifest.json`
  - [ ] `catalog/cpus.json`
- [ ] CORS on the R2 public bucket allows:
  - [ ] **Origin:** your Pages site URL (e.g. `https://<project>.pages.dev` and custom domain if any)
  - [ ] **Methods:** `GET`, `HEAD`
  - [ ] **Headers:** `Content-Type` (if needed by browser preflight)
- [ ] `VITE_R2_BASE_URL` has **no trailing slash**
- [ ] Spot-check in browser devtools: manifest + `catalog/cpus.json` return **200** and JSON parses

## Cloudflare Pages

- [ ] Project connected to this repo
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Production URL loads `/build` after deploy

## CI

- [ ] GitHub Actions `CI` workflow passes on `main` / PRs
- [ ] `publish-r2.yml` left disabled (`if: false`) until secrets + bucket are ready

## Free-tier sanity (R2)

- [ ] Understand [R2 free tier](https://developers.cloudflare.com/r2/pricing/) limits (storage + Class A/B ops)
- [ ] Plan batch uploads (few `PUT`s per release), not per-SKU writes
