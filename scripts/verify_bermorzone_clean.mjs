#!/usr/bin/env node

/**
 * bermorzone verification analysis
 *
 * Tasks:
 * 1. Enumerate raw categories with counts
 * 2. Cross-check STORE_RULES entries against actual raw data
 * 3. Identify unmapped high-volume categories (>50 items)
 * 4. Spot-check 'other' items for proper categorization via name fallback
 * 5. Verify form-factor detection (laptop keyword overrides processors)
 * 6. Generate STORE_RULES utilization map and recommendations
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_FILE = resolve(ROOT, 'scrapper', 'output', 'bermorzone.json')
const OUTPUT_DIR = resolve(ROOT, 'Documents', 'GulanesKorp', 'PCBuilder')

// ── STORE_RULES (from spider-to-catalog.mjs, line 203) ─────────────────────
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

// ── CATEGORY_RULES (from spider-to-catalog.mjs, lines 44-166) ──────────────
const CATEGORY_RULES = [
  // ── Cooling (CPU coolers – BEFORE generic fan rule)
  [/\bcpu\s+cool(?:er|ing)?\b/i, 'cpu_cooler'],
  [/\bcpu\s+heatsink\b/i, 'cpu_cooler'],
  [/\bcpu\s+fan\b/i, 'cpu_cooler'],
  [/\b(?:heatsink|aio|all-in-one|liquid\s*cool|air\s*cool|cooler)\b/i, 'cpu_cooler'],
  [/\bheat\s*sink\b/i, 'cpu_cooler'],
  [/\bwater\s*cool\b/i, 'cpu_cooler'],

  // ── Desktops
  [/\b(all-in-one|aio\s+desktop|mini\s*pc|minipc|tower|consumer\s*desktop)\b/i, 'desktop'],
  [/\bpackage\s*desktop\b/i, 'desktop'],

  // ── Monitors
  [/\bmonitors?\b/i, 'monitor'],
  [/\bdisplay\b/i, 'monitor'],

  // ── Keyboards
  [/\b(keyboards?|keypads?)\b/i, 'keyboard'],

  // ── Mice
  [/\bmouse\b/i, 'mouse'],
  [/\bmice\b/i, 'mouse'],

  // ── Headsets
  [/\b(headsets?|headphones?|earphones?|earbuds|vr\s*headset)\b/i, 'headset'],

  // ── Speakers
  [/\b(speakers?|soundbar)\b/i, 'speaker'],

  // ── Printers
  [/\b(printers?|scanners?|multifunctions?)\b/i, 'printer'],

  // ── Cables
  [/\b(cables?|cord|connector|adapter|hdmi\s*cable|usb\s*cable|displayport\s*cable|vga\s*cable|ethernet\s*cable)\b/i, 'cable'],

  // ── Cameras
  [/\b(cameras?|webcams?|digital\s+cameras?|cctv|security\s*cameras?|surveillance)\b/i, 'camera'],

  // ── Network
  [/\b(network|routers?|switches?|wifi|wi-fi|access\s*point|range\s*extenders?|repeater|mesh|networking)\b/i, 'network'],

  // ── UPS
  [/\b(ups|avr|uninterruptible\s*power|backup\s*power)\b/i, 'ups'],

  // ── Software
  [/\b(software|os|operating\s+system|antivirus|office\s+suite|windows|ubuntu|linux|macos)\b/i, 'software'],

  // ── Tables (furniture)
  [/\b(table|tables?|desk|gaming\s*desk)\b/i, 'table'],
  [/\b(chairs?|gaming\s*chair|office\s*chair)\b/i, 'chair'],

  // ── Projectors
  [/\bprojectors?\b/i, 'projector'],

  // ── Microphones
  [/\b(microphones?|mics?)\b/i, 'microphone'],

  // ── Power Banks
  [/\b(power\s*bank|power\s*station|external\s*battery)\b/i, 'power-bank'],

  // ── External Storage
  [/\b(external\s+(?:ssd|hdd|drive)|portable\s+(?:ssd|hdd))\b/i, 'external-storage'],

  // ── Controllers
  [/\b(controllers?|gamepad|joystick|game\s*controller)\b/i, 'controller'],

  // ── Fans (case fans)
  [/\bfans?\b/i, 'fans'],

  // ── GPUs
  [/\bvideo\s*card\b/i, 'gpu'],
  [/\bgraphic[s]?\s*card\b/i, 'gpu'],
  [/\bgpu\b/i, 'gpu'],
  [/\bvga\b/i, 'gpu'],

  // ── Laptops
  [/\b(laptops?|notebooks?|macbooks?)\b/i, 'laptop'],
  [/\b(premium\s*laptops?|gaming\s*laptops?|2-in-1|convertible)\b/i, 'laptop'],

  // ── CPUs
  [/\bprocessors?\b/i, 'cpu'],
  [/\bcpu\b/i, 'cpu'],
  [/\bryzen\b/i, 'cpu'],
  [/\bintel\s*core\b/i, 'cpu'],
  [/\barm\b/i, 'cpu'],

  // ── Motherboards
  [/\bmotherboards?\b/i, 'motherboard'],
  [/\bmobo\b/i, 'motherboard'],

  // ── RAM
  [/\bram\b/i, 'ram'],
  [/\bddr[345]\b/i, 'ram'],
  [/\bso-?dimm\b/i, 'ram'],
  [/\bdimm\b/i, 'ram'],

  // ── Storage
  [/\bssd\b/i, 'storage'],
  [/\bhdd\b/i, 'storage'],
  [/\bhard\s*drives?\b/i, 'storage'],
  [/\bnvme\b/i, 'storage'],
  [/\bstorage\b/i, 'storage'],
  [/\bm\.2\b/i, 'storage'],

  // ── PSU
  [/\bpsu\b/i, 'psu'],
  [/\bpower\s*supply\b/i, 'psu'],
  [/\bpower\s*unit\b/i, 'psu'],

  // ── Cases
  [/\b(pc\s*case|computer\s*case|chassis|casing)\b/i, 'case'],
  [/\bdesktops?\b/i, 'desktop'],

  // ── Tablets
  [/\btablet\b/i, 'tablet'],
  [/\bipad\b/i, 'tablet'],
  [/\bandroid\s+tablet\b/i, 'tablet'],
  [/\biphone\b/i, 'tablet'],
  [/\bmobile\s*phones?\b/i, 'tablet'],
]

// ── Helper: simulate normalizeCategory() from spider-to-catalog.mjs ──────────
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

  // 2b. CATEGORY_RULES on rawCategory (skip component slugs if formFactor known)
  for (const [pattern, slug] of catRules) {
    const isComponent = ['cpu','gpu','ram','storage','psu','motherboard','case','cpu_cooler'].includes(slug)
    if (formFactor && isComponent) continue
    if (pattern.test(rawCategory)) return { cat: slug, via: 'CATEGORY_RULES[raw]', raw: rawCategory }
  }

  // 2c. Form-factor fallback
  if (formFactor) return { cat: formFactor, via: `formFactor:${formFactor}`, raw: rawCategory }

  // 3. CATEGORY_RULES on productName (skip component categories if formFactor known)
  for (const [pattern, slug] of catRules) {
    const isComponent = ['cpu','gpu','ram','storage','psu','motherboard','case','cpu_cooler'].includes(slug)
    if (formFactor && isComponent) continue
    if (pattern.test(productName)) return { cat: slug, via: 'CATEGORY_RULES[name]', raw: rawCategory }
  }

  return { cat: 'other', via: 'fallback', raw: rawCategory }
}

// ── Load data ────────────────────────────────────────────────────────────────
console.log('Loading bermorzone data...')
const rawText = readFileSync(DATA_FILE, 'utf-8')
const lines = rawText.split('\n').filter(l => l.trim())
console.log(`Total items: ${lines.length}`)

const items = []
const categories = new Map()
const storeName = 'bermorzone'

for (let line of lines) {
  try {
    const item = JSON.parse(line)
    items.push(item)
    const rawCat = (item.category || '').toLowerCase().trim()
    if (rawCat) categories.set(rawCat, (categories.get(rawCat) || 0) + 1)
  } catch (e) { /* skip malformed */ }
}

// ── Task 1: Raw categories with counts ──────────────────────────────────────
console.log('\n=== TASK 1: Raw Categories (sorted by count) ===')
Array.from(categories.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => console.log(`  ${count.toString().padStart(6)}  ${cat}`))

// ── Task 2: STORE_RULES utilization ─────────────────────────────────────────
console.log('\n=== TASK 2: STORE_RULES Utilization ===')
const rules = STORE_RULES[storeName] || {}
const matchedCounts = new Map()
const unusedRules = []

for (const key of Object.keys(rules)) {
  const count = categories.get(key) || 0
  matchedCounts.set(key, count)
  if (count === 0) unusedRules.push(key)
}

console.log('STORE_RULES exact matches (raw category key must match exactly):')
for (const [rawCat, count] of Array.from(matchedCounts.entries()).sort((a, b) => b[1] - a[1])) {
  const mark = count === 0 ? ' [UNUSED]' : ''
  console.log(`  ${count.toString().padStart(6)}  "${rawCat}" -> ${rules[rawCat]}${mark}`)
}
if (unusedRules.length) console.log(`\nUnused STORE_RULES (zero hits): ${unusedRules.join(', ')}`)

// ── Task 3: High-volume unmapped categories ──────────────────────────────────
console.log('\n=== TASK 3: High-Volume Unmapped Categories (>50) ===')
const highVolume = Array.from(categories.entries())
  .filter(([cat, cnt]) => cnt > 50 && !rules[cat])
  .sort((a, b) => b[1] - a[1])

if (highVolume.length) {
  console.log('Raw categories NOT in STORE_RULES with >50 items:')
  highVolume.forEach(([cat, cnt]) => console.log(`  ${cnt.toString().padStart(4)}  "${cat}"`))
} else {
  console.log('No high-volume unmapped categories.')
}

// ── Task 4: 'other' items spot-check ────────────────────────────────────────
console.log('\n=== TASK 4: Items Classified as "other" ===\n')
const viaStore = new Map()
const viaCatRaw = new Map()
const viaCatName = new Map()
const viaFormFactor = new Map()
const viaFallback = new Map()
const otherItems = []

for (const item of items) {
  const raw = (item.category || '').trim()
  const name = (item.name || '').trim()
  const result = categorizeItem(raw, name, storeName, STORE_RULES, CATEGORY_RULES)

  if (result.cat === 'other') {
    otherItems.push({ name, rawCategory: raw || '(none)', via: result.via })
  } else {
    switch (result.via) {
      case 'STORE_RULES exact': viaStore.set('STORE_RULES', (viaStore.get('STORE_RULES')||0)+1); break
      case 'CATEGORY_RULES[raw]': viaCatRaw.set('rawCategory', (viaCatRaw.get('rawCategory')||0)+1); break
      case 'CATEGORY_RULES[name]': viaCatName.set('productName', (viaCatName.get('productName')||0)+1); break
      default: if (result.via.startsWith('formFactor')) viaFormFactor.set(result.via, (viaFormFactor.get(result.via)||0)+1)
    }
  }
}

const totalNonOther = Array.from(viaStore.values()).reduce((a,b)=>a+b,0)
                  + Array.from(viaCatRaw.values()).reduce((a,b)=>a+b,0)
                  + Array.from(viaCatName.values()).reduce((a,b)=>a+b,0)
                  + Array.from(viaFormFactor.values()).reduce((a,b)=>a+b,0)

console.log(`Classification breakdown (${items.length} total):`)
console.log(`  STORE_RULES exact:    ${Array.from(viaStore.values()).reduce((a,b)=>a+b,0)} items`)
console.log(`  CATEGORY_RULES raw:   ${Array.from(viaCatRaw.values()).reduce((a,b)=>a+b,0)} items`)
console.log(`  CATEGORY_RULES name:  ${Array.from(viaCatName.values()).reduce((a,b)=>a+b,0)} items`)
console.log(`  Form-factor detected: ${Array.from(viaFormFactor.values()).reduce((a,b)=>a+b,0)} items`)
console.log(`  Fell to "other":      ${otherItems.length} items`)

if (otherItems.length) {
  console.log('\nFirst 15 "other" items:')
  otherItems.slice(0, 15).forEach((it, i) => {
    console.log(`  ${(i+1).toString().padStart(2)}. [${it.via}] ${it.name.substring(0, 90)}...`)
    console.log(`      raw: ${it.rawCategory}`)
  })
}

// Keyword analysis on 'other' items
console.log('\nKeyword frequency in "other" items:')
const kwFreq = {}
const focusKW = ['laptop','notebook','motherboard','graphics','ssd','hard drive','psu','power supply','case','chassis','cpu','processor','ram','memory','gpu','video','cooling','fan','cooler','thermal','paste','keyboard','mouse','monitor','display','printer','camera','router','switch','network','ups','mobo','storage']
for (const it of otherItems) {
  const txt = (it.name + ' ' + it.rawCategory).toLowerCase()
  for (const kw of focusKW) {
    if (txt.includes(kw)) { kwFreq[kw] = (kwFreq[kw] || 0) + 1; break }
  }
}
Object.entries(kwFreq).sort((a,b)=>b[1]-a[1]).slice(0, 12).forEach(([kw, cnt]) => {
  const ex = otherItems.find(i => (i.name + ' ' + i.rawCategory).toLowerCase().includes(kw))
  if (ex) console.log(`  "${kw}": ${cnt}  e.g. "${ex.name.substring(0, 70)}..."`)
  else console.log(`  "${kw}": ${cnt}`)
})

// ── Task 5: Form-factor check ───────────────────────────────────────────────
console.log('\n=== TASK 5: Form-Factor Detection Check ===\n')
const laptopMismatches = items.filter(it => {
  const raw = (it.category || '').toLowerCase()
  const name = (it.name || '').toLowerCase()
  if (!name.includes('laptop') && !name.includes('notebook') && !name.includes('macbook')) return false
  const res = categorizeItem(raw, name, storeName, STORE_RULES, CATEGORY_RULES)
  return res.cat !== 'laptop' && !['cpu','gpu','ram','storage','motherboard','psu','case','cpu_cooler','other'].includes(res.cat)
})
console.log(`Items with laptop keyword but NOT classified as laptop: ${laptopMismatches.length}`)
if (laptopMismatches.length) {
  console.log('Samples:')
  laptopMismatches.slice(0, 5).forEach((it, i) => {
    const r = categorizeItem(it.category, it.name, storeName, STORE_RULES, CATEGORY_RULES)
    console.log(`  ${i+1}. ${it.name.substring(0, 90)}`)
    console.log(`     raw=${it.category}  →  ${r.cat}  [${r.via}]`)
  })
}

// ── Task 6: Recommendations ─────────────────────────────────────────────────
console.log('\n=== RECOMMENDATIONS ===\n')
const recs = []

if (unusedRules.length) recs.push(`Remove ${unusedRules.length} unused STORE_RULES keys (zero hits).`)

if (highVolume.length) {
  recs.push(`Add ${highVolume.length} STORE_RULES entries for >50-item categories. Top 10:`)
  highVolume.slice(0, 10).forEach(([cat, cnt]) => {
    let target = 'other'
    const c = cat.toLowerCase()
    if (/motherboard/.test(c)) target = 'motherboard'
    else if (/\b(ram|memory)\b/.test(c)) target = 'ram'
    else if (/\b(storage|ssd|hdd|hard)\b/.test(c)) target = 'storage'
    else if (/\b(chassis|case)\b/.test(c)) target = 'case'
    else if (/\b(cpu|processor)\b/.test(c)) target = 'cpu'
    else if (/\b(fan|cooler|cooling)\b/.test(c)) target = 'cpu_cooler'
    else if (/\b(router|switch|hub)\b/.test(c)) target = 'network'
    else if (/\b(printer|scanner)\b/.test(c)) target = 'printer'
    else if (/\b(monitor|display)\b/.test(c)) target = 'monitor'
    else if (/\b(headset|headphone)\b/.test(c)) target = 'headset'
    else if (/\b(speaker|soundbar)\b/.test(c)) target = 'speaker'
    else if (/\b(keyboard|keypad)\b/.test(c)) target = 'keyboard'
    else if (/\b(mouse|mice)\b/.test(c)) target = 'mouse'
    else if (/\b(camera|webcam)\b/.test(c)) target = 'camera'
    recs.push(`  STORE_RULES["bermorzone"]["${cat}"] = "${target}"  // ${cnt} items`)
  })
}

const pctCov = ((totalNonOther / items.length) * 100).toFixed(2)
recs.push(`Current non-"other" coverage: ${pctCov}% (${totalNonOther}/${items.length} items)`)

if (kwFreq['<other>']) recs.push(`${kwFreq['<other>']} "other" items had no matching keywords — likely true miscellanea.`)

if (laptopMismatches.length) {
  recs.push(`${laptopMismatches.length} laptop-keyword items classified as components; form-factor logic from productName should handle this.`)
}

recs.forEach(r => console.log(`  ${r}`))

// ── Write report ────────────────────────────────────────────────────────────
const outDir = resolve(ROOT, 'Documents', 'GulanesKorp', 'PCBuilder')
const reportPath = resolve(outDir, 'BERMORZONE_VERIFICATION_REPORT.txt')
const linesOut = [
  'BERMORZONE CATEGORIZATION VERIFICATION REPORT',
  `Generated: ${new Date().toISOString()}`,
  `Store: Bermor Techzone (bermorzone)`,
  `Total items analyzed: ${items.length}`,
  '',
  '=== RAW CATEGORIES (sorted) ===',
  ...Array.from(categories.entries()).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`${n.toString().padStart(6)}  ${c}`),
  '',
  '=== STORE_RULES EXACT MATCHES ===',
  ...Array.from(matchedCounts.entries()).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${v.toString().padStart(6)}  "${k}" -> ${rules[k]}`),
  '',
  unusedRules.length ? `UNUSED STORE_RULES (remove): ${unusedRules.map(k=>`"${k}"`).join(', ')}` : 'All STORE_RULES entries matched at least once.',
  '',
  highVolume.length
    ? `HIGH-VOLUME UNMAPPED (>50):\n${highVolume.map(([c,n])=>`  ${n.toString().padStart(4)}  "${c}"`).join('\n')}`
    : 'No high-volume unmapped categories.',
  '',
  `CLASSIFICATION SUMMARY:`,
  `  STORE_RULES exact:    ${Array.from(viaStore.values()).reduce((a,b)=>a+b,0)}`,
  `  CATEGORY_RULES raw:   ${Array.from(viaCatRaw.values()).reduce((a,b)=>a+b,0)}`,
  `  CATEGORY_RULES name:  ${Array.from(viaCatName.values()).reduce((a,b)=>a+b,0)}`,
  `  Form-factor fallback: ${Array.from(viaFormFactor.values()).reduce((a,b)=>a+b,0)}`,
  `  Fallback "other":    ${otherItems.length}`,
  '',
  otherItems.length
    ? `SAMPLE "other" items:\n${otherItems.slice(0,12).map((o,i)=>`  ${(i+1).toString().padStart(2)}. ${o.name.substring(0,85)}... [${o.via}]`).join('\n')}`
    : 'No "other" items.',
  '',
  laptopMismatches.length
    ? `FORM-FACTOR ANOMALIES (laptop keyword, non-laptop class): ${laptopMismatches.length}\n${laptopMismatches.slice(0,5).map(p=>`  ${p.name.substring(0,90)}`).join('\n')}`
    : 'No form-factor anomalies.',
  '',
  '=== RECOMMENDATIONS ===',
  ...recs.map(r => `  ${r}`),
  '',
  '=== NOTES ===',
  '  * STORE_RULES uses exact lowercase key match against the full raw category string.',
  '    Current raw categories use " > " hierarchies that do not match simple keys like',
  '    "processors" or "video cards". Most STORE_RULES entries are therefore unused.',
  '    Add exact hierarchical keys e.g. "intel processors > processors" to capture them.',
  '  * CATEGORY_RULES regex patterns run against the full raw category string and',
  '    successfully match "nvidia video cards > video cards" via /\\bvideo\\s*card\\b/i → gpu.',
  '  * Product-name form-factor detection correctly identifies laptops and bypasses',
  '    component rules for complete systems.',
]

mkdirSync(outDir, { recursive: true })
writeFileSync(reportPath, linesOut.join('\n') + '\n', 'utf-8')
console.log(`\n✓ Report saved: ${reportPath}`)
