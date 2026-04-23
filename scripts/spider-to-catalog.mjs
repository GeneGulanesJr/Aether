#!/usr/bin/env node

/**
 * spider-to-catalog.mjs — Convert spider JSON output → frontend catalog files.
 *
 * Reads scrapper/output/*.json (NDJSON from Zyte), normalizes categories,
 * deduplicates by name, enriches with CPU specs database, adds normalized fields,
 * and writes src/data/catalog_*.json + src/data/prices_snapshot.json.
 *
 * Workflow:
 *   1. Run spiders on Zyte Cloud
 *   2. Download JSON artifacts into scrapper/output/
 *   3. Run this script
 *   4. npm run build
 *
 * Usage:
 *   node scripts/spider-to-catalog.mjs
 *   node scripts/spider-to-catalog.mjs --input ./custom-output/
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SPIDER_DIR = resolve(ROOT, 'scrapper', 'output')
const DATA_DIR = resolve(ROOT, 'src', 'data')
const SPECS_DB = resolve(ROOT, 'scripts', 'cpu-specs-database.json')

// ── CLI args ──────────────────────────────────────────────────────────

let inputDir = SPIDER_DIR
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === '--input' && process.argv[i + 1]) {
    inputDir = resolve(process.argv[++i])
  }
}

// ── Category normalization ─────────────────────────────────────────────
// Mirrors spider-to-d1.mjs category rules.

const CATEGORY_RULES = [
  [/processor/i, 'cpu'], [/cpus?/i, 'cpu'], [/ryzen/i, 'cpu'],
  [/intel.*core/i, 'cpu'],
  [/video\s*card/i, 'gpu'], [/graphic\s*card/i, 'gpu'], [/gpu/i, 'gpu'],
  [/graphics\s*card/i, 'gpu'], [/vga/i, 'gpu'],
  [/motherboard/i, 'motherboard'], [/mobo/i, 'motherboard'],
  [/memory/i, 'ram'], [/ram/i, 'ram'], [/ddr[345]/i, 'ram'],
  [/so-?dimm/i, 'ram'],
  [/ssd/i, 'storage'], [/hdd/i, 'storage'], [/hard\s*drive/i, 'storage'],
  [/nvme/i, 'storage'], [/storage/i, 'storage'],
  [/psu/i, 'psu'], [/power\s*supply/i, 'psu'], [/power\s*unit/i, 'psu'],
  [/case/i, 'case'], [/chassis/i, 'case'], [/casing/i, 'case'],
  [/cooler/i, 'cpu_cooler'], [/fan/i, 'cpu_cooler'],
  [/liquid\s*cool/i, 'cpu_cooler'], [/aio/i, 'cpu_cooler'],
  [/heatsink/i, 'cpu_cooler'],
  [/monitor/i, 'monitor'], [/display/i, 'monitor'],
]

// Categories the frontend cares about
const FRONTEND_CATEGORIES = ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cpu_cooler', 'monitor']

function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'string') return 'other'
  const s = raw.trim()
  if (!s) return 'other'
  for (const [pattern, slug] of CATEGORY_RULES) {
    if (pattern.test(s)) return slug
  }
  return 'other'
}

// ── CPU Specs Database (from enrich-catalog.js) ───────────────────────

let cpuSpecsDb = null

function loadCpuSpecsDb() {
  try {
    cpuSpecsDb = JSON.parse(readFileSync(SPECS_DB, 'utf-8'))
    console.log(`  Loaded CPU specs database: ${cpuSpecsDb.amd.length} AMD, ${cpuSpecsDb.intel.length} Intel entries`)
  } catch (e) {
    console.warn('  ⚠ Could not load CPU specs database')
    cpuSpecsDb = null
  }
}

function findCpuSpec(name, brand) {
  if (!cpuSpecsDb) return null
  const nameLower = name.toLowerCase().replace(/[™®]/g, '')
  const entries = brand === 'Intel' ? cpuSpecsDb.intel : cpuSpecsDb.amd
  let bestMatch = null
  let bestScore = 0
  for (const entry of entries) {
    const key = (entry.key || '').toLowerCase()
    if (key.length < 8) continue
    if (nameLower.includes(key) && key.length > bestScore) {
      bestMatch = entry
      bestScore = key.length
    }
  }
  return bestMatch
}

// ── Part ID generation ────────────────────────────────────────────────

function hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(16).padStart(16, '0')
}

function makePartId(category, store, name) {
  const slug = `${category}-${store.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`
  return `${slug}-${hashStr(name).slice(0, 12)}`
}

// ── Normalization (mirrors src/lib/normalized/normalize.ts) ──────────

function normalizeCpuSpecs(specs, name) {
  const socket = specs.Socket || specs.socket || ''
  const tdpWatts = parseInt((specs.TDP || specs.tdp || '').replace(/[^\d]/g, '')) || 0
  const memRaw = (specs['Memory Type'] || '').toUpperCase()
  const memoryType = memRaw.includes('DDR5') ? 'DDR5' : 'DDR4'
  const igRaw = specs['Integrated GPU'] || ''
  const integratedGraphics = igRaw && !/none|no|n\/a/i.test(igRaw)
  const memoryTypesSupported = [memoryType]
  if (['AM5', 'LGA1700', 'LGA1851'].includes(socket)) {
    if (!memoryTypesSupported.includes('DDR5')) memoryTypesSupported.push('DDR5')
  }
  const warnings = []
  if (!socket) warnings.push('cpu_socket_missing')
  if (tdpWatts === 0) warnings.push('cpu_tdp_missing')
  return {
    normalized: { category: 'cpu', data: { socket: socket || 'AM4', tdpWatts, memoryTypesSupported, integratedGraphics } },
    meta: { parserVersion: '1.0.0', confidence: warnings.length === 0 ? 1 : 0.7, warnings }
  }
}

function normalizeMbSpecs(specs, name) {
  const socket = specs.socket || specs.Socket || ''
  const chipset = specs.chipset || specs.Chipset || ''
  const ramRaw = (specs.ram || '').toUpperCase()
  const memoryType = ramRaw.includes('DDR5') ? 'DDR5' : 'DDR4'
  let formFactor = 'ATX'
  const nameL = name.toLowerCase()
  if (/mini.?itx/i.test(nameL)) formFactor = 'Mini-ITX'
  else if (/micro.?atx|m.?atx/i.test(nameL)) formFactor = 'Micro-ATX'
  else if (/e.?atx/i.test(nameL)) formFactor = 'E-ATX'
  const warnings = []
  if (!socket) warnings.push('mb_socket_missing')
  if (!chipset) warnings.push('mb_chipset_missing')
  return {
    normalized: {
      category: 'motherboard', data: {
        socket: socket || 'AM4', chipset, formFactor, memoryType,
        memorySlots: formFactor === 'Mini-ITX' ? 2 : 4,
        maxMemoryGb: (formFactor === 'Mini-ITX' ? 2 : 4) * 48,
        m2Slots: 1, sataPorts: 4, pcieX16Slots: 1,
      }
    },
    meta: { parserVersion: '1.0.0', confidence: warnings.length === 0 ? 1 : 0.7, warnings }
  }
}

function normalizeGpuSpecs(specs, name) {
  const vram = parseInt(specs.vram || specs.VRAM || '') || 0
  const warnings = vram === 0 ? ['gpu_vram_missing'] : []
  const nameL = name.toLowerCase()
  let powerDrawWatts = 200
  if (vram >= 16) powerDrawWatts = 300
  else if (vram >= 12) powerDrawWatts = 250
  else if (vram >= 8) powerDrawWatts = 200
  else if (vram >= 6) powerDrawWatts = 160
  else powerDrawWatts = 120
  const powerConnectors = (nameL.includes('4090') || /12vhpwr/i.test(nameL)) ? ['12VHPWR'] : ['8-pin']
  return {
    normalized: { category: 'gpu', data: { vramGb: vram, powerDrawWatts, powerConnectors } },
    meta: { parserVersion: '1.0.0', confidence: warnings.length === 0 ? 1 : 0.7, warnings }
  }
}

// ── Name deduplication ────────────────────────────────────────────────

/** Simplify part name for dedup — same logic as extractModelKey in the frontend. */
function simplifyName(name, category) {
  const clean = name.replace(/[™®©®]|Â®/g, '').trim()
  const cat = category.toLowerCase()

  if (cat === 'cpu') {
    let m = clean.match(/\b(Ryzen\s+\d\s+\d{4}[A-Za-z\d]*)/i)
    if (m) return m[1].trim()
    m = clean.match(/\b(Core\s+i[3579]-?\d{4,5}[A-Za-z\d]*)/i)
    if (m) return m[1].trim()
    m = clean.match(/\b(Core\s+Ultra\s+\d{2,3}[A-Za-z\d]*)/i)
    if (m) return m[1].trim()
    return clean.slice(0, 60)
  }

  // For everything else, strip brand prefix, trim to 60 chars
  return clean.replace(/^(ASUS|MSI|GIGABYTE|GIGA\s*BYTE|EVGA|ZOTAC|CORSAIR| Kingston|CRUCIAL|WD|SEAGATE|SAMSUNG|THERMALTAKE|COOLER\s*MASTER|NZXT|BE\s*QUIET|FRONTIER|DEEPCOOL|ARCTIC|NOCTUA)\s*/i, '').trim().slice(0, 80) || clean.slice(0, 80)
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  if (!existsSync(inputDir)) {
    console.error(`❌ Spider output directory not found: ${inputDir}`)
    process.exit(1)
  }

  console.log('🔄 spider-to-catalog: Spider JSON → Frontend catalog files\n')
  loadCpuSpecsDb()

  // ── Read all spider JSON files ─────────────────────────────────────

  const jsonFiles = readdirSync(inputDir).filter(f => f.endsWith('.json') && !f.startsWith('.')).sort()
  if (jsonFiles.length === 0) {
    console.error('❌ No .json files found in', inputDir)
    process.exit(1)
  }

  console.log(`📂 Reading ${jsonFiles.length} spider files from ${inputDir}`)

  const allItems = []
  for (const file of jsonFiles) {
    const content = readFileSync(resolve(inputDir, file), 'utf-8').trim()
    let items
    if (content.startsWith('[')) {
      items = JSON.parse(content)
    } else {
      items = content.split('\n').filter(Boolean).map(l => JSON.parse(l))
    }
    console.log(`   ${file}: ${items.length} items`)
    allItems.push(...items)
  }

  console.log(`\n📊 Total raw items: ${allItems.length}`)

  // ── Categorize and deduplicate ────────────────────────────────────

  // { category: { nameKey: { best: item, duplicates: [] } } }
  const byCategory = new Map()

  for (const item of allItems) {
    const name = (item.name || '').trim()
    if (!name) continue

    const category = normalizeCategory(item.category)
    if (!FRONTEND_CATEGORIES.includes(category)) continue

    // Skip items with no price info
    if (!item.price && item.price !== 0) continue

    const store = (item.store || 'unknown').trim()
    const brand = (item.brand || '').trim() || (name.split(/\s/)[0] || '')
    const nameKey = simplifyName(name, category).toLowerCase()

    if (!byCategory.has(category)) byCategory.set(category, new Map())
    const catMap = byCategory.get(category)

    if (!catMap.has(nameKey)) {
      catMap.set(nameKey, { best: item, storeOffers: [] })
    }

    const entry = catMap.get(nameKey)

    // Track this as a store offer (no partId yet - will use consolidated ID)
    const storeOffer = {
      retailer: store,
      amountPhp: parseFloat(item.price) || 0,
      originalAmountPhp: item.original_price ? parseFloat(item.original_price) : null,
      productUrl: item.product_url || null,
      observedAt: item.scraped_at || null,
    }
    entry.storeOffers.push(storeOffer)

    // Pick "best" item as the catalog entry (prefer in_stock, then lowest price)
    const currentAvail = (entry.best.availability || '').toLowerCase()
    const newAvail = (item.availability || '').toLowerCase()
    const currentPrice = parseFloat(entry.best.price) || Infinity
    const newPrice = parseFloat(item.price) || Infinity

    if (newAvail === 'in_stock' && currentAvail !== 'in_stock') {
      entry.best = item
    } else if (newAvail === currentAvail && newPrice < currentPrice) {
      entry.best = item
    }
  }

  // ── Generate catalog JSON files ────────────────────────────────────

  console.log('\n📦 Generating catalog files...')
  const allPriceEntries = []

  for (const category of FRONTEND_CATEGORIES) {
    const catMap = byCategory.get(category)
    if (!catMap || catMap.size === 0) {
      console.log(`   ${category}: 0 items (no spider data)`)
      // Still write empty catalog so the frontend doesn't crash
      writeFileSync(
        resolve(DATA_DIR, `catalog_${category}.json`),
        JSON.stringify({ schemaVersion: '1.0', category, items: [] }, null, 2) + '\n'
      )
      continue
    }

    const items = []
    let normalized = 0

    for (const [nameKey, { best, storeOffers }] of catMap) {
      const store = (best.store || 'unknown').trim()
      const partId = makePartId(category, store, best.name)

      // Build specs
      const specs = {}
      if (best.brand) specs.Brand = best.brand
      if (best.sku) specs.SKU = best.sku
      if (best.availability) specs.Availability = best.availability

      // Enrich CPU specs from database
      let enriched = false
      if (category === 'cpu' && cpuSpecsDb) {
        const brand = (best.brand || '').trim()
        const specEntry = findCpuSpec(best.name, brand === 'Intel' ? 'Intel' : 'AMD')
        if (specEntry) {
          Object.assign(specs, specEntry.specs)
          enriched = true
        }
      }

      // Build the item
      const item = {
        id: partId,
        name: best.name,
        category,
        specs,
        imageUrl: best.image_url || null,
      }

      // Add normalized fields
      if (category === 'cpu') {
        const r = normalizeCpuSpecs(specs, best.name)
        item.normalized = r.normalized
        item.parseMeta = r.meta
        normalized++
      } else if (category === 'motherboard') {
        const r = normalizeMbSpecs(specs, best.name)
        item.normalized = r.normalized
        item.parseMeta = r.meta
        normalized++
      } else if (category === 'gpu') {
        const r = normalizeGpuSpecs(specs, best.name)
        item.normalized = r.normalized
        item.parseMeta = r.meta
        normalized++
      }

      items.push(item)

      // Add all store offers as price entries (using consolidated partId)
      for (const offer of storeOffers) {
        allPriceEntries.push({
          partId: partId,
          amountPhp: offer.amountPhp,
          retailer: offer.retailer,
          productUrl: offer.productUrl,
          observedAt: offer.observedAt,
        })
      }
    }

    const catalog = { schemaVersion: '1.0', category, items }
    writeFileSync(
      resolve(DATA_DIR, `catalog_${category}.json`),
      JSON.stringify(catalog, null, 2) + '\n'
    )
    console.log(`   ${category}: ${items.length} items (${normalized} normalized)`)
  }

  // ── Write prices snapshot ──────────────────────────────────────────

  const priceSnapshot = {
    schemaVersion: '1.0',
    generated: new Date().toISOString(),
    entries: allPriceEntries,
  }
  writeFileSync(
    resolve(DATA_DIR, 'prices_snapshot.json'),
    JSON.stringify(priceSnapshot, null, 2) + '\n'
  )
  console.log(`\n💰 Prices: ${allPriceEntries.length} entries across all stores`)

  // ── Also update STORE_URLS in MarketplaceApp ───────────────────────
  // Collect unique store names from price entries
  const uniqueStores = [...new Set(allPriceEntries.map(e => e.retailer).filter(Boolean))]
  console.log(`🏪 Stores: ${uniqueStores.join(', ')}`)

  // ── Summary ────────────────────────────────────────────────────────

  const totalParts = [...byCategory.values()].reduce((sum, m) => sum + m.size, 0)
  console.log(`\n✅ Done! ${totalParts} unique parts, ${allPriceEntries.length} price entries`)
  console.log(`   Next step: npm run build`)
}

main()
