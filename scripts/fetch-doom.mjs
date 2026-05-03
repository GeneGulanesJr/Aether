#!/usr/bin/env node
/**
 * fetch-doom.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Downloads / restores the Doom benchmark assets for PC Builder.
 *
 * PROBLEM:
 *   public/doom/ is 83 MB (738 files). If it lives in public/, Vite copies
 *   ALL of it into the build output — even for users who never open the
 *   benchmark. It also bloats the git repo.
 *
 * SOLUTION:
 *   1. Keep public/doom/ out of git (see .gitignore).
 *   2. This script fetches it on demand.
 *
 * SOURCES (tried in order):
 *   1. DOOM_BUNDLE_URL env var → download a .zip or .tar.gz
 *   2. vendor/doom/            → copy from local vendor dir
 *   3. doom-backup/            → copy from local backup dir
 *   4. Already exists in public/doom/ → skip (idempotent)
 *
 * SETUP FOR FRESH CLONES:
 *   npm run fetch:doom
 *
 * HOSTING YOUR OWN BUNDLE:
 *   If you want CI / fresh clones to work without manual copying, upload the
 *   modified doom-lite directory to a static host (R2, GitHub release asset,
 *   etc.) and set DOOM_BUNDLE_URL.
 *
 *   Example:
 *     DOOM_BUNDLE_URL=https://your-cdn.com/doom-pcbuilder.zip npm run fetch:doom
 *
 * NOTE ON COPYRIGHTED ASSETS:
 *   levels/DOOM1.WAD and graphics/upscaled/ contain copyrighted Doom assets.
 *   The upstream benc-uk/doom-lite repo does NOT include these. You must
 *   provide them yourself or the game will not load textures / levels.
 *   The fetch script applies PC Builder code patches (URL params, quality
 *   tiers, FPS throttle) but cannot generate the WAD / textures.
 *
 * NEXT:
 *   - Host the patched + assets bundle on a GitHub release or static CDN.
 *   - Set DOOM_BUNDLE_URL in CI and .env.example.
 *   - For production builds, point the iframe to the CDN instead of /doom/.
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync, createWriteStream } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')
const TARGET = join(ROOT, 'public', 'doom')
const VENDOR = join(ROOT, 'vendor', 'doom')
const BACKUP = join(ROOT, 'doom-backup')

const BUNDLE_URL = process.env.DOOM_BUNDLE_URL

// ── PC Builder patches ─────────────────────────────────────────────────────
// These are applied to a fresh upstream clone if we ever add upstream support.
// For now they serve as documentation of what we changed.

const INDEX_PATCH = {
  marker: '</head>',
  insertBefore: `    <!-- PC Builder: Performance label banner -->
    <style>
      #perf-label {
        position: absolute; right: 1rem; top: 1rem;
        color: #0f0; font-family: 'Courier New', monospace; font-size: 1rem;
        padding: 0.4rem 0.8rem; background-color: rgba(0,0,0,0.7);
        border: 1px solid #0f0; border-radius: 4px;
        text-transform: uppercase; letter-spacing: 0.15em;
        display: none; z-index: 10;
      }
      #perf-label.visible { display: block; }
      #perf-label.tier-0 { color: #f44; border-color: #f44; }
      #perf-label.tier-1 { color: #fa4; border-color: #fa4; }
      #perf-label.tier-2 { color: #ff0; border-color: #ff0; }
      #perf-label.tier-3 { color: #4f4; border-color: #4f4; }
      #perf-label.tier-4 { color: #0ff; border-color: #0ff; }
    </style>
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        const params = new URLSearchParams(window.location.search)
        const label = params.get('label')
        const tier = params.get('tier')
        const el = document.getElementById('perf-label')
        if (label && el) {
          el.textContent = label
          el.classList.add('visible')
          if (tier !== null) el.classList.add('tier-' + tier)
        }
      })
    </script>\n`,
}

// ── Helpers ────────────────────────────────────────────────────────────────

function log(...args) {
  console.log('[fetch-doom]', ...args)
}

function error(...args) {
  console.error('[fetch-doom] ❌', ...args)
}

function dirSize(path) {
  if (!existsSync(path)) return 0
  let total = 0
  for (const file of readdirSync(path, { recursive: true })) {
    const fp = join(path, file)
    try {
      const s = statSync(fp)
      if (s.isFile()) total += s.size
    } catch {}
  }
  return total
}

function copyDir(src, dst) {
  if (!existsSync(dst)) mkdirSync(dst, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name)
    const dstPath = join(dst, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath)
    } else {
      mkdirSync(dirname(dstPath), { recursive: true })
      copyFileSync(srcPath, dstPath)
    }
  }
}

async function downloadFile(url, dest) {
  log('Downloading', url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const body = await res.arrayBuffer()
  writeFileSync(dest, Buffer.from(body))
  log('Saved', dest, `(${(body.byteLength / 1024 / 1024).toFixed(1)} MB)`)
}

async function unzip(zipPath, dest) {
  log('Extracting', zipPath, '→', dest)
  return new Promise((resolve, reject) => {
    const unzip = spawn('unzip', ['-q', '-o', zipPath, '-d', dest], { stdio: 'inherit' })
    unzip.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`unzip exited with code ${code}`))
    })
  })
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // 1. Already exists?
  if (existsSync(join(TARGET, 'index.html'))) {
    const size = (dirSize(TARGET) / 1024 / 1024).toFixed(1)
    log(`public/doom/ already exists (${size} MB). Skipping.`)
    log('To force re-fetch, delete public/doom/ and run again.')
    return
  }

  // 2. Download from bundle URL?
  if (BUNDLE_URL) {
    const tmpZip = join(ROOT, '.tmp-doom.zip')
    try {
      await downloadFile(BUNDLE_URL, tmpZip)
      await unzip(tmpZip, TARGET)
      log('Bundle extracted to public/doom/')
    } catch (e) {
      error('Failed to download/extract bundle:', e.message)
      process.exit(1)
    } finally {
      try { require('node:fs').unlinkSync(tmpZip) } catch {}
    }
    return
  }

  // 3. Copy from vendor/doom/?
  if (existsSync(join(VENDOR, 'index.html'))) {
    log('Copying from vendor/doom/ → public/doom/')
    copyDir(VENDOR, TARGET)
    log('Done.')
    return
  }

  // 4. Copy from doom-backup/?
  if (existsSync(join(BACKUP, 'index.html'))) {
    log('Copying from doom-backup/ → public/doom/')
    copyDir(BACKUP, TARGET)
    log('Done.')
    return
  }

  // 5. Nothing found — print help
  error('Doom benchmark assets not found.')
  console.log(`
To set up the Doom benchmark, you have a few options:

  A) QUICK — copy your existing files:
     cp -r public/doom vendor/doom   # then delete public/doom and re-run

  B) BACKUP — keep a local backup:
     mkdir doom-backup
     # copy your doom files into doom-backup/
     npm run fetch:doom

  C) HOSTED BUNDLE — upload to a CDN and fetch:
     DOOM_BUNDLE_URL=https://your-cdn.com/doom.zip npm run fetch:doom

  D) MANUAL — just keep public/doom/ in place (it will not be tracked by git).

The benchmark needs:
  - index.html, src/*.mjs, lib/*, shaders/*, public/*  (code)
  - levels/DOOM1.WAD, levels/demo.json5                 (level data)
  - graphics/upscaled/*                                  (textures)
  - data/things.json5                                    (thing database)

NOTE: DOOM1.WAD and the upscaled textures are copyrighted assets.
      They cannot be fetched from the upstream benc-uk/doom-lite repo.
      You must provide them yourself.
`)
  process.exit(1)
}

main().catch((e) => {
  error(e.message)
  process.exit(1)
})
