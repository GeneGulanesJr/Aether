#!/usr/bin/env node

/**
 * Seed D1 with existing catalog and price data.
 *
 * Reads the bundled JSON files from src/data/ and POSTs them
 * to the Worker ingest API. This is a one-time migration step
 * to populate D1 from the existing data.
 *
 * Usage:
 *   node scripts/seed-d2.mjs
 *
 * Required env vars:
 *   D2_API_URL  — Worker API base URL (e.g., http://localhost:8787)
 *   D2_API_KEY  — Ingest API key
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

const apiUrl = process.env.D2_API_URL?.replace(/\/+$/, '')
const apiKey = process.env.D2_API_KEY

if (!apiUrl || !apiKey) {
  console.error('Error: D2_API_URL and D2_API_KEY must be set.')
  console.error('Usage: D2_API_URL=http://localhost:8787 D2_API_KEY=xxx node scripts/seed-d2.mjs')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${apiKey}`,
}

async function postJson(path, body) {
  const url = `${apiUrl}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST ${url} failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function main() {
  console.log(`Seeding D1 at ${apiUrl}...`)

  // ── Seed catalog ──
  const dataDir = resolve(PROJECT_ROOT, 'src/data')
  const catalogFiles = readdirSync(dataDir)
    .filter((f) => f.startsWith('catalog_') && f.endsWith('.json'))

  const allParts = []

  for (const file of catalogFiles) {
    const filePath = resolve(dataDir, file)
    const data = JSON.parse(readFileSync(filePath, 'utf-8'))
    const items = data.items || []
    console.log(`  ${file}: ${items.length} items`)
    allParts.push(...items)
  }

  console.log(`Total parts to seed: ${allParts.length}`)

  // Batch in groups of 100
  for (let i = 0; i < allParts.length; i += 100) {
    const batch = allParts.slice(i, i + 100)
    const result = await postJson('/api/ingest/catalog', { items: batch })
    console.log(`  Seeded parts ${i + 1}-${i + batch.length}: ${JSON.stringify(result)}`)
  }

  // ── Seed prices ──
  const priceFile = resolve(dataDir, 'prices_snapshot.json')
  let priceEntries = []
  try {
    const priceData = JSON.parse(readFileSync(priceFile, 'utf-8'))
    priceEntries = priceData.entries || []
    console.log(`Price entries to seed: ${priceEntries.length}`)
  } catch {
    console.log('No prices_snapshot.json found — skipping price seed.')
  }

  for (let i = 0; i < priceEntries.length; i += 100) {
    const batch = priceEntries.slice(i, i + 100)
    const result = await postJson('/api/ingest/prices', { entries: batch })
    console.log(`  Seeded prices ${i + 1}-${i + batch.length}: ${JSON.stringify(result)}`)
  }

  console.log('Seed complete.')

  // ── Verify ──
  const manifest = await fetch(`${apiUrl}/api/manifest`).then((r) => r.json())
  console.log(`Manifest: ${JSON.stringify(manifest)}`)
}

main().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})