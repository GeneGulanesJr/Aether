#!/usr/bin/env node

/**
 * bermorzone verification analysis
 *
 * Tasks:
 * 1. Enumerate raw categories with counts
 * 2. Cross-check STORE_RULES entries against actual raw data
 * 3. Identify unmapped high-volume categories (>50 items)
 * 4. Spot-check 'other' items for proper categorization
 * 5. Verify form-factor detection (laptop keyword in name but processors category)
 * 6. Generate STORE_RULES utilization map and recommendations
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_FILE = resolve(ROOT, 'scrapper', 'output', 'bermorzone.json')
const OUTPUT_DIR = resolve(ROOT, 'Documents', 'GulanesKorp', 'PCBuilder')

// ── STORE_RULES (from spider-to-catalog.mjs) ─────────────────────────────
const STORE_RULES = {
  'bermorzone': {
    'processors': 'cpu',
    'computer processors': 'cpu',
    'cpus': 'cpu',
    'motherboard': 'motherboard',
    'motherboards': 'motherboard',
    'memory': 'ram',
    'ram': 'ram',
    'graphics card': 'gpu',
    'video card': 'gpu',
    'video cards': 'gpu',
    'amd video cards': 'gpu',
    'nvidia video cards': 'gpu',
    'gpu': 'gpu',
    'hard drive': 'storage',
    'ssd': 'storage',
    'power supply': 'psu',
    'pc case': 'case',
    'computer case': 'case',
    'laptops': 'laptop',
    'notebooks': 'laptop',
    'gaming laptops': 'laptop',
    'flash drive': 'storage',
    'flash drives': 'storage',
    'memory card': 'storage',
    'memory cards': 'storage',
    'thermalpaste': 'other',
    'thermal paste': 'other',
    'thermal grease': 'other',
    'cooling systems > watercooling kits': 'cpu_cooler',
    'cooling systems > watercooling': 'cpu_cooler',
    'watercooling': 'cpu_cooler',
    'water cooling': 'cpu_cooler',
  },
}

// ── CATEGORY_RULES (name-fallback patterns) ────────────────────────────────
const CATEGORY_RULES = [
  [/\\bcpu\\s+cool(?:er|ing)?\\b/i, 'cpu_cooler'],
  [/\\bcpu\\s+heatsink\\b/i, 'cpu_cooler'],
  [/\\bcpu\\s+fan\\b/i, 'cpu_cooler'],
  [/\\b(?:heatsink|aio|all-in-one|liquid\\s*cool|air\\s*cool|cooler)\\b/i, 'cpu_cooler'],
  [/\\bheat\\s*sink\\b/i, 'cpu_cooler'],
  [/\\bwater\\s*cool\\b/i, 'cpu_cooler'],

  [/\\b(all-in-one|aio\\s+desktop|mini\\s*pc|minipc|tower|consumer\\s*desktop)\\b/i, 'desktop'],
  [/\\bpackage\\s*desktop\\b/i, 'desktop'],

  [/\\bmonitors?\\b/i, 'monitor'],
  [/\\bdisplay\\b/i, 'monitor'],

  [/\\b(keyboards?|keypads?)\\b/i, 'keyboard'],
  [/\\bmouse\\b/i, 'mouse'],
  [/\\bmice\\b/i, 'mouse'],

  [/\\b(headsets?|headphones?|earphones?|earbuds|vr\\s*headset)\\b/i, 'headset'],
  [/\\b(speakers?|soundbar)\\b/i, 'speaker'],

  [/\\b(printers?|scanners?|multifunctions?)\\b/i, 'printer'],

  [/\\b(cables?|cord|connector|adapter|hdmi\\s*cable|usb\\s*cable|displayport\\s*cable|vga\\s*cable|ethernet\\s*cable)\\b/i, 'cable'],

  [/\\b(cameras?|webcams?|digital\\s+cameras?|cctv|security\\s*cameras?|surveillance)\\b/i, 'camera'],

  [/\\b(network|routers?|switches?|wifi|wi-fi|access\\s*point|range\\s*extenders?|repeater|mesh|networking)\\b/i, 'network'],

  [/\\b(ups|avr|uninterruptible\\s*power|backup\\s*power)\\b/i, 'ups'],

  [/\\b(software|os|operating\\s+system|antivirus|office\\s+suite|windows|ubuntu|linux|macos)\\b/i, 'software'],

  [/\\b(table|tables?|desk|gaming\\s*desk)\\b/i, 'table'],
  [/\\b(chairs?|gaming\\s*chair|office\\s*chair)\\b/i, 'chair'],

  [/\\bprojectors?\\b/i, 'projector'],

  [/\\bflash\\s+drive\\b/i, 'storage'],
  [/\\bmemory\\s+card\\b/i, 'storage'],
  [/\\bthermal\\s*paste\\b/i, 'other'],
  [/\\bthermal\\s+grease\\b/i, 'other'],
  [/\\b水冷\\b/i, 'cpu_cooler'],
]

// ── Helpers ────────────────────────────────────────────────────────────────
function matchRule(name, rules) {
  for (const [pattern, cat] of Object.entries(rules)) {
    const regex = new RegExp(pattern, 'i')
    if (regex.test(name)) return { cat, via: pattern }
  }
  return null
}

function matchCategoryRule(name) {
  for (const [regex, cat] of CATEGORY_RULES) {
    if (regex.test(name)) return { cat, via: regex.toString() }
  }
  return null
}

// ── Load data ──────────────────────────────────────────────────────────────
console.log('Loading bermorzone data...')
const rawText = readFileSync(DATA_FILE, 'utf-8')
const lines = rawText.split('\n').filter(l => l.trim())
console.log(`Total items: ${lines.length}`)

const items = []
let categories = new Map()
let storeName = 'bermorzone'

for (let line of lines) {
  try {
    const item = JSON.parse(line)
    items.push(item)

    const rawCat = (item.category || '').toLowerCase().trim()
    if (rawCat) {
      categories.set(rawCat, (categories.get(rawCat) || 0) + 1)
    }
  } catch (e) {
    // skip malformed
  }
}

// ── Task 1: Enumerate raw categories with counts ──────────────────────────
console.log('\n=== TASK 1: Raw Categories (sorted by count) ===')
let sortedCats = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])
sortedCats.forEach(([cat, count]) => {
  console.log(`  ${count.toString().padStart(6)}  ${cat}`)
})

// ── Task 2: Cross-check STORE_RULES entries ───────────────────────────────
console.log('\n=== TASK 2: STORE_RULES Utilization ===')
const rules = STORE_RULES[storeName] || {}
const matchedCounts = {}
const unmatchedRules = []

for (const [rawCat, targetCat] of Object.entries(rules)) {
  const normalized = rawCat.toLowerCase()
  const count = categories.get(normalized) || 0
  matchedCounts[rawCat] = count
  if (count === 0) {
    unmatchedRules.push({ rule: rawCat, target: targetCat })
  }
}

console.log('\nSTORE_RULES matches by raw category:')
for (const [rawCat, count] of Object.entries(matchedCounts).sort((a, b) => b[1] - a[1])) {
  const marker = count === 0 ? ' [UNUSED]' : ''
  console.log(`  ${count.toString().padStart(6)}  "${rawCat}" -> ${rules[rawCat]}${marker}`)
}

if (unmatchedRules.length > 0) {
  console.log('\nUnused STORE_RULES entries (can be removed):')
  unmatchedRules.forEach(({ rule, target }) => {
    console.log(`  "${rule}" -> ${target}`)
  })
}

// ── Task 3: Identify unmapped high-volume categories ──────────────────────
console.log('\n=== TASK 3: High-Volume Unmapped Categories (>50 items) ===')
const highVolumeUnmapped = []
for (const [cat, count] of sortedCats) {
  // Check if this raw category is matched by any STORE_RULES value
  const directlyMapped = rules[cat]
  // Also check if the STORE_RULES key pattern matches (lowercase)
  const patternMapped = Object.keys(rules).some(k => k.toLowerCase() === cat)

  if (!directlyMapped && !patternMapped && count > 50) {
    highVolumeUnmapped.push({ category: cat, count })
  }
}

if (highVolumeUnmapped.length > 0) {
  console.log('Categories in raw data but NOT in STORE_RULES (consider adding):')
  highVolumeUnmapped.forEach(({ category, count }) => {
    console.log(`  ${count.toString().padStart(6)}  "${category}"`)
  })
} else {
  console.log('No high-volume unmapped categories found.')
}

// ── Simulate normalizeCategory(item) ───────────────────────────────────────
/**
 * Duplicates the normalizeCategory logic from spider-to-catalog.mjs:
 *   1. STORE_RULES[store][rawCategory] exact match
 *   2a. Form-factor detection from productName (laptop/notebook/macbook, 2-in-1, etc.)
 *   2b. CATEGORY_RULES match on rawCategory (skipping component slugs if formFactor known)
 *   2c. Form-factor fallback if detected
 *   3. CATEGORY_RULES match on productName (skipping component slugs if formFactor known)
 *   4. Fallback → 'other'
 */
function categorizeItem(rawCategory, productName, storeName, rules, catRules) {
  const rawLower = rawCategory.toLowerCase()
  const nameLower = productName.toLowerCase()

  // 1. STORE_RULES exact override on rawCategory
  if (rawLower && rules[storeName] && typeof rules[storeName] === 'object') {
    const override = rules[storeName][rawLower]
    if (override) return { cat: override, via: 'STORE_RULES exact', raw: rawCategory }
  }

  // 2a. Form-factor detection from product name
  let formFactor = null
  if (nameLower.match(/\b(laptop|notebook|macbook)\b/) ||
      nameLower.match(/\d{1,2}\.?\d*\s*inch\b/) ||
      nameLower.match(/\b(?:gaming\s*)?(?:laptop|notebook)\b/) ||
      nameLower.match(/\b(?:2-in-1|convertible|ultrabook)\b/) ||
      nameLower.match(/intel core i[0-9].+?(?:\s|$).+?(?:win(?:dows)?\s*11|win(?:dows)?\s*10|windows)/)) {
    formFactor = 'laptop'
  } else if (nameLower.match(/\b(all-in-one|aio\s*desktop|mini\s*pc|minipc|tower|consumer\s*desktop)\b/)) {
    formFactor = 'desktop'
  }

  // 2b. CATEGORY_RULES on rawCategory (skip component categories if formFactor known)
  for (const [pattern, slug] of catRules) {
    const isComponent = ['cpu','gpu','ram','storage','psu','motherboard','case','cpu_cooler'].includes(slug)
    if (formFactor && isComponent) continue
    if (pattern.test(rawCategory)) return { cat: slug, via: `CATEGORY_RULES[raw]: ${pattern}`, raw: rawCategory }
  }

  // 2c. Form-factor fallback
  if (formFactor) return { cat: formFactor, via: `formFactor:${formFactor}`, raw: rawCategory }

  // 3. CATEGORY_RULES on productName (skip component categories if formFactor known)
  for (const [pattern, slug] of catRules) {
    const isComponent = ['cpu','gpu','ram','storage','psu','motherboard','case','cpu_cooler'].includes(slug)
    if (formFactor && isComponent) continue
    if (pattern.test(productName)) return { cat: slug, via: `CATEGORY_RULES[name]: ${pattern}`, raw: rawCategory }
  }

  return { cat: 'other', via: 'fallback', raw: rawCategory }
}

// Note: CATEGORY_RULES is already declared above (line 63) with full patterns from spider-to-catalog.mjs

// ── Analyze each item with correct algorithm ───────────────────────────────
console.log('\n=== TASK 4: Spot-check items classified as "other" ===\n')

const viaStoreRules = new Map()
const viaCategoryRules = new Map()
const viaFallback = new Map()
const otherItems = []

for (const item of items) {
  const rawCat = (item.category || '').trim()
  const name = (item.name || '').trim()
  const store = (item.store || '').toLowerCase().trim() || 'bermorzone'

  const result = categorizeItem(rawCat, name, store, STORE_RULES, CATEGORY_RULES)

  if (result.cat === 'other') {
    otherItems.push({
      name,
      rawCategory: rawCat || '(none)',
      source: result.via,
    })
  } else {
    // Track which path produced non-other results
    if (result.via.includes('STORE_RULES')) viaStoreRules.set(result.via, (viaStoreRules.get(result.via) || 0) + 1)
    else viaCategoryRules.set(result.via, (viaCategoryRules.get(result.via) || 0) + 1)
  }
}

// Summary of non-other classification paths
console.log('Items by classification path:')
console.log(`  STORE_RULES exact: ${Array.from(viaStoreRules.values()).reduce((a,b)=>a+b,0)} items`)
viaStoreRules.forEach((count, via) => console.log(`    ${via}: ${count}`))
console.log(`  CATEGORY_RULES (raw or name): ${Array.from(viaCategoryRules.values()).reduce((a,b)=>a+b,0)} items`)
viaCategoryRules.forEach((count, via) => console.log(`    ${via}: ${count}`))
console.log(`  Fallback to "other": ${otherItems.length} items`)

if (otherItems.length > 0) {
  console.log('\nFirst 15 "other" items:')
  otherItems.slice(0, 15).forEach((item, i) => {
    console.log(`  ${(i+1).toString().padStart(2)}. [${item.source}]`)
    console.log(`      Name: ${item.name.substring(0, 100)}`)
    console.log(`      Raw:  ${item.rawCategory}`)
  })
}

// Analyze which keywords from name might be missing in CATEGORY_RULES
console.log('\nKeyword coverage check for "other" items:')
const keywordChecks = ['laptop','notebook','motherboard','graphics','ssd','hard drive','power','psu','case','cpu','processor','ram','memory','gpu','video','cooling','fan','cooler','thermal','paste','keyboard','mouse','monitor','display','printer','camera','router','switch','network','ups','motherboard','mobo']
const kwStats = {}
for (const item of otherItems) {
  const name = item.name.toLowerCase()
  const raw = item.rawCategory.toLowerCase()
  let found = false
  for (const kw of keywordChecks) {
    if (name.includes(kw) || raw.includes(kw)) {
      kwStats[kw] = (kwStats[kw] || 0) + 1
      found = true
      break
    }
  }
  if (!found) {
    kwStats['<other>'] = (kwStats['<other>'] || 0) + 1
  }
}
Object.entries(kwStats)
  .sort((a,b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([kw, cnt]) => {
    console.log(`  "${kw}": ${cnt} items`)
    if (kw !== '<other>') {
      const ex = otherItems.find(i => i.name.toLowerCase().includes(kw) || i.rawCategory.toLowerCase().includes(kw))
      if (ex) console.log(`    e.g. "${ex.name.substring(0, 80)}..."`)
    }
  })

// ── Task 5: Form-Factor Detection Check ────────────────────────────────────
console.log('\n=== TASK 5: Form-Factor Detection Check ===\n')
const laptopInNonLaptop = items.filter(item => {
  const rawCat = (item.category || '').toLowerCase().trim()
  const name = (item.name || '').toLowerCase()
  const hasLaptopKw = name.includes('laptop') || name.includes('notebook') || name.includes('macbook')
  const result = categorizeItem(rawCat, name, 'bermorzone', STORE_RULES, CATEGORY_RULES)
  const isNonLaptop = result.cat !== 'laptop' && !['gpu','cpu','ram','storage','motherboard','psu','case'].includes(result.cat)
  return hasLaptopKw && isNonLaptop
})
console.log(`Items with "laptop"/"notebook" keyword but classified as non-laptop component: ${laptopInNonLaptop.length}`)
if (laptopInNonLaptop.length > 0) {
  console.log('Samples:')
  laptopInNonLaptop.slice(0, 10).forEach((item, i) => {
    const r = categorizeItem(item.category, item.name, 'bermorzone', STORE_RULES, CATEGORY_RULES)
    console.log(`  ${i+1}. ${item.name.substring(0, 100)}`)
    console.log(`     Raw category: ${item.category}`)
    console.log(`     Classified as: ${r.cat} (via: ${r.via})`)
  })
}

// ── Task 6: STORE_RULES utilization summary ─────────────────────────────────
console.log('\n=== TASK 6: STORE_RULES Utilization Map ===\n')
const matchedCounts = new Map()
for (const [k,v] of Object.entries(rules)) matchedCounts.set(k, 0)
for (const item of items) {
  const rawLower = (item.category || '').toLowerCase().trim()
  if (rules['bermorzone'][rawLower]) {
    matchedCounts.set(rawLower, (matchedCounts.get(rawLower) || 0) + 1)
  }
}
console.log('STORE_RULES exact matches:')
for (const [rawCat, count] of Array.from(matchedCounts.entries()).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${count.toString().padStart(6)}  "${rawCat}" -> ${rules['bermorzone'][rawCat]}`)
}

// ── Recommendations ─────────────────────────────────────────────────────────
console.log('\n=== RECOMMENDATIONS ===\n')
const suggestions = []

if (unmatchedRules.length > 0) {
  suggestions.push(`Remove ${unmatchedRules.length} unused STORE_RULES entries (zero hits in current data).`)
}

if (highVolumeUnmapped.length > 0) {
  suggestions.push(`Add ${highVolumeUnmapped.length} STORE_RULES for high-volume raw categories (>50 items each). Top suggestions:`)
  highVolumeUnmapped.slice(0, 10).forEach(({category, count}) => {
    let target = 'other'
    if (/motherboard/i.test(category)) target = 'motherboard'
    else if (/\b(ram|memory)\b/i.test(category)) target = 'ram'
    else if (/\b(storage|ssd|hdd|hard)\b/i.test(category)) target = 'storage'
    else if (/\b(chassis|case)\b/i.test(category)) target = 'case'
    else if (/\b(processor|cpu)\b/i.test(category)) target = 'cpu'
    else if (/\b(fan|cooler|cooling)\b/i.test(category)) target = 'cpu_cooler'
    else if (/\b(router|switch|hub)\b/i.test(category)) target = 'network'
    else if (/\b(printer|scanner)\b/i.test(category)) target = 'printer'
    else if (/\b(monitor|display)\b/i.test(category)) target = 'monitor'
    else if (/\b(headset|headphone)\b/i.test(category)) target = 'headset'
    else if (/\b(speaker|soundbar)\b/i.test(category)) target = 'speaker'
    else if (/\b(keyboard|keypad)\b/i.test(category)) target = 'keyboard'
    else if (/\b(mouse|mice)\b/i.test(category)) target = 'mouse'
    else if (/\b(camera|webcam)\b/i.test(category)) target = 'camera'
    else if (/\b(ups|avr)\b/i.test(category)) target = 'ups'
    suggestions.push(`  STORE_RULES["bermorzone"]["${category}"] = "${target}"  // ${count} items`)
  })
}

if (kwStats['<other>'] > 0) {
  suggestions.push(`${kwStats['<other>']} "other" items had no recognizable keywords — likely true miscellaneous items (keep as "other").`)
}

if (laptopInNonLaptop.length > 0) {
  suggestions.push(`${laptopInNonLaptop.length} items contain laptop keywords but classify as components. This form-factor override currently works via product-name detection; ensure the logic remains intact.`)
}

// Coverage stats
const totalClassified = Array.from(viaStoreRules.values()).reduce((a,b)=>a+b,0) +
                        Array.from(viaCategoryRules.values()).reduce((a,b)=>a+b,0)
const pctCovered = ((totalClassified / items.length) * 100).toFixed(2)
suggestions.push(`Overall category coverage: ${pctCovered}% (${totalClassified}/${items.length} items mapped to a specific non-"other" category).`)

suggestions.forEach(s => console.log(`  ${s}`))

// ── Write full report ───────────────────────────────────────────────────────
const OUTPUT_DIR_CORRECT = resolve(ROOT, 'Documents', 'GulanesKorp', 'PCBuilder')
const reportPath = resolve(OUTPUT_DIR_CORRECT, 'BERMORZONE_VERIFICATION_REPORT.txt')
const reportLines = [
  'BERMORZONE CATEGORIZATION VERIFICATION REPORT',
  `Generated: ${new Date().toISOString()}`,
  `Store: Bermor Techzone (bermorzone)`,
  `Total items analyzed: ${items.length}`,
  '',
  '=== RAW CATEGORIES (sorted by count) ===',
  ...Array.from(categories.entries()).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${n.toString().padStart(6)}  ${c}`),
  '',
  '=== STORE_RULES EXACT MATCHES (by raw category key) ===',
  ...Array.from(matchedCounts.entries()).sort((a,b) => b[1] - a[1]).map(([k, v]) => `${v.toString().padStart(6)}  "${k}" -> ${rules['bermorzone'][k]}`),
  '',
  unmatchedRules.length > 0 ? `UNUSED STORE_RULES (zero hits — consider removal):\n${unmatchedRules.map(u => `  "${u.rule}" -> ${u.target}`).join('\n')}` : 'All STORE_RULES entries have at least one hit.',
  '',
  highVolumeUnmapped.length > 0
    ? `HIGH-VOLUME UNMATCHED RAW CATEGORIES (>50 items — add to STORE_RULES or extend CATEGORY_RULES):\n${highVolumeUnmapped.slice(0, 50).map(h => `  ${h.count.toString().padStart(4)}  "${h.category}"`).join('\n')}`
    : 'No high-volume unmapped categories.',
  '',
  `CATEGORIZATION SUMMARY (simulated normalizeCategory):`,
  `  STORE_RULES exact path: ${Array.from(viaStoreRules.values()).reduce((a,b)=>a+b,0)} items`,
  `  CATEGORY_RULES path:   ${Array.from(viaCategoryRules.values()).reduce((a,b)=>a+b,0)} items`,
  `  Fell to "other":      ${otherItems.length} items`,
  '',
  otherItems.length > 0 ? `SAMPLE "other" items (first 15):\n${otherItems.slice(0,15).map((o,i) => `  ${(i+1).toString().padStart(2)}. ${o.name.substring(0,90)}... [via ${o.source}, raw="${o.rawCategory.substring(0,60)}"]`).join('\n')}` : 'No items classified as "other".',
  '',
  laptopInNonLaptop.length > 0
    ? `FORM-FACTOR ANOMALIES (laptop keyword + non-laptop classification): ${laptopInNonLaptop.length}\n${laptopInNonLaptop.slice(0,5).map(p => `  ${p.name.substring(0,100)}`).join('\n')}`
    : 'No form-factor anomalies detected.',
  '',
  '',
  '=== DETAILED RECOMMENDATIONS ===',
  ...suggestions.map(s => `  - ${s}`),
  '',
  '=== NOTES ===',
  '  * Raw categories use " > " hierarchical separators; CATEGORY_RULES regex patterns',
  '    match against the full raw category string, so patterns like /\\bvideo\\s*card\\b/i',
  '    successfully match "nvidia video cards > video cards" → gpu.',
  '  * STORE_RULES berMorZone keys require exact lowercase match of the entire raw category.',
  '    Most existing keys (e.g., "processors", "video cards") do NOT match the full',
  '    hierarchical category strings (e.g., "intel processors > processors"), hence',
  '    zero STORE_RULES hits. Consider adding exact hierarchical keys to STORE_RULES.',
  '',
]

mkdirSync(OUTPUT_DIR_CORRECT, { recursive: true })
writeFileSync(reportPath, reportLines.join('\n') + '\n', 'utf-8')
console.log(`\n✓ Report written to: ${reportPath}`)

// ── Task 5: Form-factor detection check ────────────────────────────────────
console.log('\n=== TASK 5: Form-Factor Detection Check ===')
const laptopKeywordInProcessors = items.filter(item => {
  const rawCat = (item.category || '').toLowerCase().trim()
  const name = (item.name || '').toLowerCase()
  // Check: raw category suggests processors, but name contains laptop/notebook
  const isProcessorCategory = rawCat.includes('processor') || rawCat.includes('cpu') || rawCat.includes('cpus') || rawCat === 'processors'
  const hasLaptopKeyword = name.includes('laptop') || name.includes('notebook')
  return isProcessorCategory && hasLaptopKeyword
})

console.log(`Items with "laptop"/"notebook" in name but raw category is processors-related: ${laptopKeywordInProcessors.length}`)
if (laptopKeywordInProcessors.length > 0) {
  console.log('\nSamples (need STORE_RULES to override via form_factor mapping):')
  laptopKeywordInProcessors.slice(0, 10).forEach((item, i) => {
    console.log(`  ${i+1}. ${item.name}`)
    console.log(`     Category: ${item.category}`)
    console.log(`     Would STORE_RULES['bermorzone']['${item.category.toLowerCase()}'] match? ${rules[item.category.toLowerCase()] || 'NO'}`)
  })
}

// ── Task 6: Complete verification report ───────────────────────────────────
console.log('\n=== TASK 6: STORE_RULES Utilization Map ===')

// Estimate which STORE_RULES will hit based on category names in raw data
console.log('\nExpected STORE_RULE hits (by raw category):')
for (const [rawCat, target] of Object.entries(rules)) {
  const count = categories.get(rawCat.toLowerCase()) || 0
  const pct = ((count / items.length) * 100).toFixed(2)
  console.log(`  ${count.toString().padStart(6)} items (${pct}%)  "${rawCat}" -> ${target}`)
}

// Summary recommendations
console.log('\n=== RECOMMENDATIONS ===')
const suggestions = []

if (unmatchedRules.length > 0) {
  suggestions.push(`Remove unused STORE_RULES entries: ${unmatchedRules.map(u => `"${u.rule}"`).join(', ')}`)
}

if (highVolumeUnmapped.length > 0) {
  suggestions.push('Consider adding STORE_RULES for these high-volume categories:')
  highVolumeUnmapped.forEach(({ category, count }) => {
    // Guess the target category
    let guessedTarget = 'other'
    if (category.includes('motherboard')) guessedTarget = 'motherboard'
    else if (category.includes('ram') || category.includes('memory')) guessedTarget = 'ram'
    else if (category.includes('psu') || category.includes('power')) guessedTarget = 'psu'
    else if (category.includes('case')) guessedTarget = 'case'
    else if (category.includes('cooler')) guessedTarget = 'cpu_cooler'
    else if (category.includes('fan')) guessedTarget = 'fans'
    suggestions.push(`  STORE_RULES["bermorzone"]["${category}"] = "${guessedTarget}"  (${count} items)`)
  })
}

if (patternGaps.length > 0) {
  suggestions.push('Consider extending CATEGORY_RULES with these keyword patterns:')
  const uniqueGaps = [...new Set(patternGaps.map(g => g.kw))]
  uniqueGaps.forEach(kw => {
    suggestions.push(`  add /\\b${kw}\\b/i pattern`)
  })
}

if (laptopKeywordInProcessors.length > 0) {
  suggestions.push(`Form-factor correction needed: ${laptopKeywordInProcessors.length} "laptop" items in processors category. Ensure STORE_RULES correctly maps processors -> cpu, but consider name-based laptop override.`)
}

if (suggestions.length === 0) {
  suggestions.push('All checks passed — no immediate issues found.')
}

suggestions.forEach(s => console.log(`  * ${s}`))

// Write report file
const reportDate = new Date().toISOString().slice(0, 10)
const reportPath = resolve(OUTPUT_DIR, 'BERMORZONE_VERIFICATION_REPORT.txt')
const reportLines = [
  'BERMORZONE CATEGORIZATION VERIFICATION REPORT',
  `Generated: ${new Date().toISOString()}`,
  `Store: Bermor Techzone (bermorzone)`,
  `Total items analyzed: ${items.length}`,
  '',
  '=== RAW CATEGORIES (sorted by count) ===',
  ...Array.from(categories.entries()).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${n.toString().padStart(6)}  ${c}`),
  '',
  '=== STORE_RULES UTILIZATION ===',
  ...Object.entries(matchedCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v.toString().padStart(6)}  "${k}" -> ${rules[k]}`),
  '',
  unmatchedRules.length > 0 ? `UNUSED STORE_RULES (remove):\n${unmatchedRules.map(u => `  "${u.rule}" -> ${u.target}`).join('\n')}` : 'No unused STORE_RULES entries.',
  '',
  highVolumeUnmapped.length > 0
    ? `HIGH-VOLUME UNMAPPED CATEGORIES (>50):\n${highVolumeUnmapped.map(h => `  ${h.count}  "${h.category}"`).join('\n')}`
    : 'No high-volume unmapped categories.',
  '',
  `ITEMS CLASSIFIED AS "other": ${otherItems.length}`,
  `  STORE_RULES exact: ${viaStoreRules}`,
  `  CATEGORY_RULES name: ${viaCategoryRules}`,
  `  Fallback: ${viaFallback}`,
  '',
  'SAMPLE "other" items:',
  ...otherItems.slice(0, 20).map((o, i) => `  ${(i+1).toString().padStart(2)}. ${o.name.substring(0, 100)}... [via ${o.source}, raw=${o.rawCategory}`),
  '',
  laptopKeywordInProcessors.length > 0
    ? `FORM-FACTOR ANOMALIES (laptop keyword + processors category): ${laptopKeywordInProcessors.length}\n${laptopKeywordInProcessors.slice(0, 5).map(p => `  ${p.name}`).join('\n')}`
    : 'No form-factor anomalies detected.',
  '',
  '=== RECOMMENDATIONS ===',
  ...suggestions.map(s => `  * ${s}`),
  '',
]

mkdirSync(OUTPUT_DIR, { recursive: true })
writeFileSync(reportPath, reportLines.join('\n') + '\n', 'utf-8')
console.log(`\nReport written to: ${reportPath}`)
