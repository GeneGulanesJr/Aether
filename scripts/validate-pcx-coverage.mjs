#!/usr/bin/env node

/**
 * validate-pcx-coverage.mjs
 *
 * Validates PC Express catalog coverage by:
 * 1. Parsing raw spider output (pcx.json)
 * 2. Extracting unique categories and in-stock priced items
 * 3. Applying STORE_RULES['PC Express'] category mapping
 * 4. Comparing against generated catalog files
 * 5. Reporting pass/fail, uncovered categories, and missing items
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname, basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PCX_RAW_PATH = resolve(ROOT, 'scrapper', 'output', 'pcx.json')
const CATALOG_DIR = resolve(ROOT, 'src', 'data')
const STORE_RULES_PATH = resolve(ROOT, 'scripts', 'spider-to-catalog.mjs')

// ── Colors ────────────────────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
} // Note: DISABLE_COLORS env var could be checked for CI

function log(msg, color = '') {
  console.log(`${color}${msg}${colors.reset}`)
}

// ── Category normalization rules from spider-to-catalog.mjs ─────────────────

const CATEGORY_RULES = [
  [/\\b(coolers?|cooling|aircool)\\b/i, 'cpu_cooler'],
  [/\\bcpu\\s+(coolers?|aircooling|fan)\\b/i, 'cpu_cooler'],
  [/\\bfan\\b/i, 'cpu_cooler'],
  [/\\bliquid\\s*cool/i, 'cpu_cooler'],
  [/\\baio\\b/i, 'cpu_cooler'],
  [/\\bheat\\s*sink\\b/i, 'cpu_cooler'],
  [/\\bwater\\s*cool/i, 'cpu_cooler'],
  [/\\bprocessor\\b/i, 'cpu'],
  [/\\bcpu\\b/i, 'cpu'],
  [/\\bryzen\\b/i, 'cpu'],
  [/\\bintel\\s*core\\b/i, 'cpu'],
  [/\\bvideo\\s*card\\b/i, 'gpu'],
  [/\\bgraphic\\s*card\\b/i, 'gpu'],
  [/\\bgpu\\b/i, 'gpu'],
  [/\\bvga\\b/i, 'gpu'],
  [/\\bmotherboard\\b/i, 'motherboard'],
  [/\\bmobo\\b/i, 'motherboard'],
  [/\\bmemory\\b/i, 'ram'],
  [/\\bram\\b/i, 'ram'],
  [/\\bddr[345]\\b/i, 'ram'],
  [/\\bso-?dimm\\b/i, 'ram'],
  [/\\bssd\\b/i, 'storage'],
  [/\\bhdd\\b/i, 'storage'],
  [/\\bhard\\s*drive\\b/i, 'storage'],
  [/\\bnvme\\b/i, 'storage'],
  [/\\bstorage\\b/i, 'storage'],
  [/\\bpsu\\b/i, 'psu'],
  [/\\bpower\\s*supply\\b/i, 'psu'],
  [/\\bpower\\s*unit\\b/i, 'psu'],
  [/\\bcase\\b/i, 'case'],
  [/\\bchassis\\b/i, 'case'],
  [/\\bcasing\\b/i, 'case'],
  [/\\bmonitor\\b/i, 'monitor'],
  [/\\bdisplay\\b/i, 'monitor'],

  [/\\bpower\\s*bank\\b/i, 'power-bank'],]

const PCX_STORE_RULES = {
  "PC Express": {
    "Laptops": "laptop",
    "Gaming Laptops": "laptop",
    "Graphics Cards": "gpu",
    "Graphics Card": "gpu",
    "Motherboards": "motherboard",
    "Motherboard": "motherboard",
    "Bluetooth Speakers": "speaker",
    "Power Supplies": "psu",
    "Gaming Monitors": "monitor",
    "Desktop PCs": "desktop",
    "Desktop PC": "desktop",
    "UDIMM": "ram",
    "SODIMM": "ram",
    "Monitor": "monitor",
    "Monitors": "monitor",
    "Solid State Drives (SSD)": "storage",
    "External Storage Devices": "storage",
    "Traditional Hard Drives": "storage",
    "Hard Drive": "storage",
    "Hard Drives": "storage",
    "Label Makers": "other",
    "Flash Memory Cards": "memory-card",
    "Video Game Consoles": "other",
    "Game Consoles": "other",
    "Smartphones": "other",
    "Ink Bottles": "other",
    "Cables": "cable",
    "HDMI Cables": "cable",
    "Adapters": "cable",
    "Gaming Chairs": "chair",
    "Handheld Fan": "cpu_cooler",
    "Office Application Software": "software",
    "Projectors": "projector",
    "Network Attached Storage (NAS)": "external-storage",
    "NAS": "external-storage",
    "Computer System Cooling Parts": "cpu_cooler",
    "CPU Air Coolers": "cpu_cooler",
    "AI Liquid Coolers": "cpu_cooler",
    "PC Case": "case",
  }
};

function normalizeCategory(raw, store = '', name = '') {
  if (!raw || typeof raw !== 'string') return 'other'
  const s = raw.trim()
  if (!s) return 'other'

  // Store-specific overrides (PCX_STORE_RULES)
  if (store && PCX_STORE_RULES[store]) {
    const exact = PCX_STORE_RULES[store][s]
    if (exact) return exact
  }

  // Global regex rules
  for (const [pattern, slug] of CATEGORY_RULES) {
    if (pattern.test(s)) return slug
  }

  // Name fallback
  if (name) {
    for (const [pattern, slug] of CATEGORY_RULES) {
      if (pattern.test(name)) return slug
    }
  }
  return 'other'
}

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

  return clean.replace(/^(ASUS|MSI|GIGABYTE|GIGA\s*BYTE|EVGA|ZOTAC|CORSAIR| Kingston|CRUCIAL|WD|SEAGATE|SAMSUNG|THERMALTAKE|COOLER\s*MASTER|NZXT|BE\s*QUIET|FRONTIER|DEEPCOOL|ARCTIC|NOCTUA)\s*/i, '').trim().slice(0, 80) || clean.slice(0, 80)
}

// ── Main validation ─────────────────────────────────────────────────────────

function main() {
  log('\n=== PC Express Catalog Coverage Validation ===\n', colors.bold + colors.cyan)

  // 1. Verify files exist
  if (!existsSync(PCX_RAW_PATH)) {
    log(`❌ Raw PCX data not found: ${PCX_RAW_PATH}`, colors.red)
    process.exit(1)
  }
  if (!existsSync(CATALOG_DIR)) {
    log(`❌ Catalog directory not found: ${CATALOG_DIR}`, colors.red)
    process.exit(1)
  }

  // 2. Parse raw pcx.json (NDJSON format)
  log(`📂 Reading raw spider data: ${PCX_RAW_PATH}`)
  const content = readFileSync(PCX_RAW_PATH, 'utf-8').trim()
  const lines = content.split('\n')
  const rawItems = []
  let parseErrors = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    try {
      rawItems.push(JSON.parse(line))
    } catch (e) {
      parseErrors++
    }
  }

  log(`   Parsed ${rawItems.length} items (${parseErrors} parse errors)`)

  // 3. Filter to PC Express store only (should be all, but verify)
  const pcxItems = rawItems.filter(item => (item.store || '').trim() === 'PC Express')
  log(`   PC Express items: ${pcxItems.length}`)

  // 4. Extract unique raw categories from spider data
  const rawCategories = new Set()
  for (const item of pcxItems) {
    if (item.category) rawCategories.add(item.category.trim())
  }
  log(`\n📋 Unique categories in raw spider data (${rawCategories.size}):`)
  for (const cat of [...rawCategories].sort()) {
    log(`   • ${cat}`)
  }

  // 5. Normalize categories according to STORE_RULES + CATEGORY_RULES
  const normalizedStats = new Map() // category => { mapped: count, unmapped: count }
  const itemsByNormalizedCat = new Map() // category => Set of simplified names

  for (const item of pcxItems) {
    const rawCat = (item.category || '').trim()
    const normalized = normalizeCategory(rawCat, 'PC Express', item.name)
    const nameKey = simplifyName(item.name || '', normalized).toLowerCase()

    if (!normalizedStats.has(normalized)) {
      normalizedStats.set(normalized, { mapped: 0, unmapped: 0, items: new Set() })
    }
    const stats = normalizedStats.get(normalized)
    stats.items.add(nameKey)

    // Check if it was mapped via STORE_RULES or fell through to CATEGORY_RULES
    const storeRules = PCX_STORE_RULES['PC Express'] || {}
    const storeMapped = storeRules[rawCat]
    if (storeMapped) {
      stats.mapped++
    } else {
      stats.unmapped++
    }

    if (!itemsByNormalizedCat.has(normalized)) {
      itemsByNormalizedCat.set(normalized, new Set())
    }
    itemsByNormalizedCat.get(normalized).add(nameKey)
  }

  log(`\n📊 Normalized category distribution:`)
  for (const [cat, stats] of [...normalizedStats.entries()].sort((a, b) => b[1].items.size - a[1].items.size)) {
    const storePct = stats.mapped > 0 || stats.unmapped > 0
      ? Math.round((stats.mapped / (stats.mapped + stats.unmapped)) * 100)
      : 0
    log(`   ${cat}: ${stats.items.size} unique items (${stats.mapped} via STORE_RULES, ${stats.unmapped} via CATEGORY_RULES, ${storePct}% store-mapped)`)
  }

  // 6. Count in-stock items with price
  const inStockItems = pcxItems.filter(item => {
    const price = item.price
    const avail = (item.availability || '').toLowerCase()
    return price != null && avail === 'in_stock'
  })
  log(`\n💰 In-stock priced items: ${inStockItems.length}`)

  // 7. Load generated catalog files
  const catalogFiles = readdirSync(CATALOG_DIR).filter(f => f.startsWith('catalog_') && f.endsWith('.json'))
  log(`\n📁 Found ${catalogFiles.length} catalog files`)

  const catalogByCategory = new Map()
  let totalCatalogItems = 0

  for (const file of catalogFiles) {
    const filePath = join(CATALOG_DIR, file)
    const catData = JSON.parse(readFileSync(filePath, 'utf-8'))
    const category = catData.category
    const items = catData.items || []
    catalogByCategory.set(category, items)
    totalCatalogItems += items.length
  }

  log(`   Total catalog items: ${totalCatalogItems}`)

  // 8. Build set of catalog item identifiers (name + store for matching)
  // catalog items have: id, name, category, storeOffers (array with retailer, name, sku)
  const catalogItemIdentifiers = new Set() // normalized_name_key + ':' + retailer (lowercase)
  const catalogDetails = new Map() // normalized_name_key => { name, category, retailers: Set }

  for (const [category, items] of catalogByCategory) {
    for (const item of items) {
      // Use the item name to create a normalized key
      const nameKey = simplifyName(item.name, category).toLowerCase()
      for (const offer of (item.storeOffers || [])) {
        const retailer = (offer.retailer || '').toLowerCase()
        const id = `${nameKey}:${retailer}`
        catalogItemIdentifiers.add(id)

        if (!catalogDetails.has(nameKey)) {
          catalogDetails.set(nameKey, { name: item.name, category, retailers: new Set() })
        }
        catalogDetails.get(nameKey).retailers.add(retailer)
      }
    }
  }

  // 9. Build set of raw spider in-stock item identifiers
  const rawInStockIdentifiers = new Set()
  const rawInStockDetails = new Map() // nameKey => { name, rawCategory, price, retailer }

  for (const item of inStockItems) {
    const rawCat = (item.category || '').trim()
    const normalizedCat = normalizeCategory(rawCat, 'PC Express', item.name)
    const nameKey = simplifyName(item.name, normalizedCat).toLowerCase()
    const retailer = (item.store || '').toLowerCase()
    const id = `${nameKey}:${retailer}`
    rawInStockIdentifiers.add(id)

    if (!rawInStockDetails.has(nameKey)) {
      rawInStockDetails.set(nameKey, { name: item.name, rawCategory: rawCat, price: item.price, retailer })
    }
  }

  // 10. Find missing items (in raw in-stock but not in catalog)
  const missingItems = []
  for (const [nameKey, details] of rawInStockDetails) {
    const retailer = (details.retailer || '').toLowerCase()
    const id = `${nameKey}:${retailer}`
    if (!catalogItemIdentifiers.has(id)) {
      missingItems.push({ name: details.name, rawCategory: details.rawCategory, price: details.price, retailer: details.retailer })
    }
  }

  // 11. Category coverage analysis
  const coveredCategories = new Set()
  const uncoveredCategories = new Set()

  for (const [cat, stats] of normalizedStats) {
    if (catalogByCategory.has(cat)) {
      coveredCategories.add(cat)
    } else {
      uncoveredCategories.add(cat)
    }
  }

  // 12. Results summary
  log(`\n=== VALIDATION RESULTS ===\n`, colors.bold)

  const overallPass = missingItems.length === 0 && uncoveredCategories.size === 0
  log(`Overall: ${overallPass ? '✅ PASS' : '❌ FAIL'}`, overallPass ? colors.green : colors.red)

  log(`\n📊 Category Coverage:`)
  log(`   Covered: ${coveredCategories.size} categories`)
  for (const cat of [...coveredCategories].sort()) {
    const rawCount = [...itemsByNormalizedCat.get(cat) || []].length
    const catalogCount = (catalogByCategory.get(cat) || []).length
    log(`     ✅ ${cat}: ${catalogCount} catalog items (from ${rawCount} raw unique items)`)
  }

  if (uncoveredCategories.size > 0) {
    log(`\n   ⚠️  Uncovered (raw spider data but no catalog):`, colors.yellow)
    for (const cat of [...uncoveredCategories].sort()) {
      const rawCount = [...itemsByNormalizedCat.get(cat) || []].length
      log(`     ❌ ${cat}: ${rawCount} raw unique items (no catalog_${cat}.json generated)`)
    }
  }

  log(`\n📦 Item Coverage:`)
  log(`   Raw in-stock priced items (PCX): ${rawInStockIdentifiers.size}`)
  log(`   Catalog items (all stores): ${catalogItemIdentifiers.size}`)
  log(`   Matching PCX in-stock items in catalog: ${rawInStockIdentifiers.size - missingItems.length}`)
  log(`   Missing PCX in-stock items: ${missingItems.length}`)

  if (missingItems.length > 0) {
    log(`\n❌ Missing Items (in raw PCX data, in-stock, with price, but NOT in catalog):`, colors.red)
    // Sort by category then name
    missingItems.sort((a, b) => {
      const catA = (a.rawCategory || '').localeCompare(b.rawCategory || '')
      if (catA !== 0) return catA
      return (a.name || '').localeCompare(b.name || '')
    })
    let displayCount = Math.min(missingItems.length, 50)
    for (let i = 0; i < displayCount; i++) {
      const item = missingItems[i]
      log(`   [${item.rawCategory}] ${item.name} — PHP ${item.price} (SKU: ${item.retailer})`)
    }
    if (missingItems.length > 50) {
      log(`   ... and ${missingItems.length - 50} more items`)
    }
    log(`\n⚠️  Some items may be missing because:\n   - They are truly not in catalog (coverage gap)\n   - Their category didn't map to a frontend category (filtered out as 'other')\n   - They lack required price info`)
  } else {
    log(`\n✅ All in-stock priced PCX items are present in catalog!`, colors.green)
  }

  // 13. Final verdict
  log(`\n${'='.repeat(50)}`)
  if (overallPass) {
    log(`✅ VALIDATION PASSED — Full coverage achieved!`, colors.green + colors.bold)
  } else {
    log(`❌ VALIDATION FAILED — Issues detected:`, colors.red + colors.bold)
    if (uncoveredCategories.size > 0) {
      log(`   • ${uncoveredCategories.size} uncovered categories`)
    }
    if (missingItems.length > 0) {
      log(`   • ${missingItems.length} missing items`)
    }
  }
  log(`${'='.repeat(50)}\n`)

  process.exit(overallPass ? 0 : 1)
}

main()
