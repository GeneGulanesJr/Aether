/**
 * Snapshot prices from the Worker API (D1) into a bundled JSON file.
 *
 * Usage:
 *   D2_API_URL=https://pcbuilderv2.your-account.workers.dev node scripts/snapshot-prices.mjs
 *
 * The script:
 *   1. Fetches prices from the Worker API
 *   2. Writes src/data/prices_snapshot.json
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const OUTPUT_PATH = resolve(PROJECT_ROOT, 'src/data/prices_snapshot.json')

const apiUrl = process.env.D2_API_URL?.replace(/\/+$/, '')
if (!apiUrl) {
  console.error('Error: D2_API_URL is not set.')
  console.error('Usage: D2_API_URL=https://pcbuilderv2.workers.dev node scripts/snapshot-prices.mjs')
  process.exit(1)
}

async function fetchJson(path) {
  const url = `${apiUrl}${path}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${url}`)
  }
  return res.json()
}

async function main() {
  console.log(`Fetching prices from ${apiUrl}...`)

  const priceResponse = await fetchJson('/api/prices')
  const entries = priceResponse.entries

  console.log(`Total price entries: ${entries.length}`)

  const manifest = await fetchJson('/api/manifest')

  const snapshot = {
    schemaVersion: '1.0',
    snapshotVersion: manifest.updatedAt,
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