/**
 * Snapshot prices from R2 into a bundled JSON file.
 *
 * Usage:
 *   VITE_R2_BASE_URL=https://pub-xxx.r2.dev node scripts/snapshot-prices.mjs
 *
 * Or add to package.json:
 *   "snapshot:prices": "VITE_R2_BASE_URL=$VITE_R2_BASE_URL node scripts/snapshot-prices.mjs"
 *
 * The script:
 *   1. Fetches manifest.json from R2
 *   2. Fetches all price shards
 *   3. Merges entries and writes src/data/prices_snapshot.json
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const OUTPUT_PATH = resolve(PROJECT_ROOT, 'src/data/prices_snapshot.json')

const r2Base = process.env.VITE_R2_BASE_URL?.replace(/\/+$/, '')
if (!r2Base) {
  console.error('Error: VITE_R2_BASE_URL is not set.')
  console.error('Usage: VITE_R2_BASE_URL=https://pub-xxx.r2.dev node scripts/snapshot-prices.mjs')
  process.exit(1)
}

function joinUrl(base, path) {
  return `${base}/${path.startsWith('/') ? path.slice(1) : path}`
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${url}`)
  }
  return res.json()
}

async function main() {
  console.log(`Fetching prices from ${r2Base}...`)

  // 1. Fetch manifest
  const manifest = await fetchJson(joinUrl(r2Base, 'manifest.json'))
  console.log(`Manifest version: ${manifest.version}`)

  // 2. Filter price shards
  const priceKeys = manifest.shards
    .map((s) => s.key)
    .filter((k) => k.startsWith('prices/') && k.endsWith('.json') && !k.endsWith('manifest.json'))

  console.log(`Found ${priceKeys.length} price shard(s): ${priceKeys.join(', ')}`)

  // 3. Fetch all shards in parallel
  const shards = await Promise.all(priceKeys.map((key) => fetchJson(joinUrl(r2Base, key))))
  const entries = shards.flatMap((shard) => shard.entries)

  console.log(`Total price entries: ${entries.length}`)

  // 4. Write snapshot
  const snapshot = {
    schemaVersion: '1.0',
    snapshotVersion: manifest.version,
    capturedAt: new Date().toISOString(),
    entries,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2))
  console.log(`Written to ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error('Snapshot failed:', err.message)
  process.exit(1)
})
