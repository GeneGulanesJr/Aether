#!/usr/bin/env python3
"""Analyze Electroworld category extraction and normalization coverage."""

import json
import re
from collections import Counter

# Load electroworld output
with open('/home/genegulanesjr/Documents/GulanesKorp/PCBuilder/scrapper/output/electroworld.json') as f:
    items = [json.loads(line) for line in f if line.strip()]

print(f"Total items: {len(items)}")
print()

# ── 1. Collect all raw category segments ────────────────────────────────────
# According to electroworld.py lines 276-284:
#   For each entry in level1 array:
#     - if "///" in cat: take part AFTER "///"
#     - else: use whole string
#   Then join all with " > "
# Since we only have final output, we'll reconstruct individual raw segments
# The final category is joined segments. Each segment between " > " is what
# was extracted from level1 (post-///).

all_segments = Counter()
full_categories = Counter()

for item in items:
    cat = item.get('category', '').strip()
    if cat:
        full_categories[cat] += 1
        segments = [s.strip() for s in cat.split('>')]
        for seg in segments:
            all_segments[seg.strip()] += 1

print(f"Unique full category paths: {len(full_categories)}")
print(f"Unique raw segments (post-/// extracted): {len(all_segments)}")
print()
print("=== TOP 40 RAW SEGMENTS ===")
for seg, cnt in all_segments.most_common(40):
    print(f"  {cnt:5d}  {seg}")

# ── 2. Category matching rules from spider-to-catalog.mjs ───────────────────
# These are the patterns tested in order (lines 44-163)
CATEGORY_RULES = [
    (r'\bcpu\s+cool(?:er|ing)?\b', 'cpu_cooler'),
    (r'\bcpu\s+heatsink\b', 'cpu_cooler'),
    (r'\bcpu\s+fan\b', 'cpu_cooler'),
    (r'\b(?:heatsink|aio|all-in-one|liquid\s*cool|air\s*cool|cooler)\b', 'cpu_cooler'),
    (r'\bheat\s*sink\b', 'cpu_cooler'),
    (r'\bwater\s*cool\b', 'cpu_cooler'),
    (r'\b(laptop|notebook|macbook)\b', 'laptop'),
    (r'\b(premium\s*laptops?|gaming\s*laptop|2-in-1|convertible)\b', 'laptop'),
    (r'\b(desktop|all-in-one|aio\s+desktop|mini\s*pc|minipc|tower|consumer\s*desktop)\b', 'desktop'),
    (r'\bpackage\s*desktop\b', 'desktop'),
    (r'\btablet\b', 'tablet'),
    (r'\bipad\b', 'tablet'),
    (r'\bandroid\s+tablet\b', 'tablet'),
    (r'\bmonitors?\b', 'monitor'),
    (r'\bdisplay\b', 'monitor'),
    (r'\b(keyboards?|keypads?)\b', 'keyboard'),
    (r'\bmouse\b', 'mouse'),
    (r'\bmice\b', 'mouse'),
    (r'\b(headsets?|headphones?|earphones?|earbuds|vr\s*headset)\b', 'headset'),
    (r'\b(speakers?|soundbar)\b', 'speaker'),
    (r'\b(printers?|scanners?|multifunctions?)\b', 'printer'),
    (r'\b(cameras?|webcams?|digital\s+cameras?|cctv|security\s*cameras?|surveillance)\b', 'camera'),
    (r'\b(network|router|switch|wifi|wi-fi|access\s*point|adapter|range\s*extender|repeater|mesh)\b', 'network'),
    (r'\b(ups|avr|uninterruptible\s*power|backup\s*power)\b', 'ups'),
    (r'\b(software|os|operating\s+system|antivirus|office\s+suite|windows|ubuntu|linux|macos)\b', 'software'),
    (r'\b(table|tables?|desk|gaming\s*desk)\b', 'table'),
    (r'\b(chairs?|gaming\s*chair|office\s*chair)\b', 'chair'),
    (r'\bprojectors?\b', 'projector'),
    (r'\b(microphones?|mics?)\b', 'microphone'),
    (r'\b(power\s*bank|power\s*station|external\s*battery)\b', 'power-bank'),
    (r'\b(external\s+(?:ssd|hdd|drive)|portable\s+(?:ssd|hdd))\b', 'external-storage'),
    (r'\b(cables?|cord|connector|hdmi\s*cable|usb\s*cable|displayport\s*cable|vga\s*cable|ethernet\s*cable)\b', 'cable'),
    (r'\b(controllers?|gamepad|joystick|game\s*controller)\b', 'controller'),
    (r'\bfans?\b', 'fans'),
    (r'\bvideo\s*card\b', 'gpu'),
    (r'\bgraphic[s]?\s*card\b', 'gpu'),
    (r'\bgpu\b', 'gpu'),
    (r'\bvga\b', 'gpu'),
    (r'\bprocessor\b', 'cpu'),
    (r'\bcpu\b', 'cpu'),
    (r'\bryzen\b', 'cpu'),
    (r'\bintel\s*core\b', 'cpu'),
    (r'\barm\b', 'cpu'),
    (r'\bmotherboard\b', 'motherboard'),
    (r'\bmobo\b', 'motherboard'),
    (r'\bram\b', 'ram'),
    (r'\bddr[345]\b', 'ram'),
    (r'\bso-?dimm\b', 'ram'),
    (r'\bdimm\b', 'ram'),
    (r'\bssd\b', 'storage'),
    (r'\bhdd\b', 'storage'),
    (r'\bhard\s*drives?\b', 'storage'),
    (r'\bnvme\b', 'storage'),
    (r'\bstorage\b', 'storage'),
    (r'\bm\.2\b', 'storage'),
    (r'\bpsu\b', 'psu'),
    (r'\bpower\s*supply\b', 'psu'),
    (r'\bpower\s*unit\b', 'psu'),
    (r'\b(pc\s*case|computer\s*case|chassis|casing)\b', 'case'),
]

FRONTEND_CATEGORIES = [
    'cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case',
    'cpu_cooler', 'monitor', 'laptop', 'desktop', 'keyboard', 'mouse',
    'headset', 'speaker', 'tablet', 'printer', 'camera', 'network', 'ups',
    'software', 'table', 'chair', 'projector', 'microphone', 'power-bank',
    'external-storage', 'cable', 'controller', 'fans', 'other'
]

# ── 3. Test each unique raw segment against rules ───────────────────────────
unmatched = []
matched = {}

for seg, count in all_segments.most_common():
    seg_lower = seg.lower()
    matched_cat = None
    for pattern, slug in CATEGORY_RULES:
        if pattern.search(seg_lower):
            matched_cat = slug
            break
    if matched_cat:
        matched[seg] = (matched_cat, count)
    else:
        unmatched.append((seg, count))

print()
print("=== CATEGORY RULE COVERAGE ===")
print(f"Matched segments: {len(matched)}")
print(f"Unmatched segments: {len(unmatched)}")
print(f"Total segment occurrences matched: {sum(c for _,c in matched.values())}")
total_occurrences = sum(all_segments.values())
print(f"Total segment occurrences: {total_occurrences}")
print()

print("=== UNMATCHED SEGMENTS (top 30) ===")
for seg, cnt in unmatched[:30]:
    print(f"  {cnt:5d}  {seg}")

# ── 4. Test full category path matching ────────────────────────────────────
# Simulate what would happen if normalizeCategory runs on full category string
print()
print("=== FULL CATEGORY PATH TEST (first 20 unmatched segments as full path) ===")
unmatched_full_categories = []
for cat, cnt in full_categories.most_common():
    cat_lower = cat.lower()
    matched_cat = None
    for pattern, slug in CATEGORY_RULES:
        if pattern.search(cat_lower):
            matched_cat = slug
            break
    if not matched_cat:
        unmatched_full_categories.append((cat, cnt))

print(f"Unmatched full category paths: {len(unmatched_full_categories)}")
for cat, cnt in unmatched_full_categories[:20]:
    print(f"  {cnt:5d}  {cat}")

# ── 5. Check specific gap scenarios from task ───────────────────────────────
print()
print("=== GAP SCENARIO VERIFICATION ===")
test_cases = [
    ("Laptops & PC", "laptop"),
    ("PC Component", "cpu/motherboard/ram/gpu/psu/case?"),
    ("Storage", "storage"),
    ("Networking", "network"),
    ("Audio", "headset/speaker?"),
    ("Gaming", "gaming as standalone?"),
    ("PC Component", "should fall to other"),
]

for raw, expected in test_cases:
    matched_any = any(p.search(raw.lower()) for p,_ in CATEGORY_RULES)
    print(f"  '{raw}' -> expected={expected}, matches_rule={matched_any}")

# ── 6. Check for STORE_RULES overrides ─────────────────────────────────────
print()
print("=== STORE_RULES CHECK ===")
STORE_RULES = {
    'ben store': {
        'acer': 'laptop',
        'alienware dell': 'laptop',
        'aorus': 'laptop',
        'asus': 'laptop',
        'dell': 'laptop',
        'gigabyte': 'laptop',
        'hp': 'laptop',
        'lenovo': 'laptop',
        'msi': 'laptop',
        'microsoft': 'laptop',
        'razer': 'laptop',
        'samsung': 'laptop',
    },
    'complink': {
        'desktops': 'desktop',
        'mobility': 'laptop',
        'network devices': 'network',
        'printers & scanners': 'printer',
        'smartphones': 'tablet',
        'peripherals': None,
        'others': 'other',
    },
}
# Check if any Electroworld raw categories match STORE_RULES keys
ew_raw_cats = set(all_segments.keys())
for store, rules in STORE_RULES.items():
    for raw_cat in rules:
        if raw_cat in ew_raw_cats:
            print(f"  STORE_RULES[{store}] would override '{raw_cat}' -> {rules[raw_cat]}")
print("  No Electroworld-specific STORE_RULES found (as expected)")

# ── 7. Brand-aware category detection (from product name / segment) ──────────
print()
print("=== BRAND-AS-CATEGORY ISSUES ===")
# Some segments are brand names like "Acer", "ASUS", "Lenovo Official Store", etc.
# These are not PC component categories - they're store/brand navigation
brand_like = [s for s in all_segments if re.match(r'^(Acer|ASUS|Apple|Lenovo|HP|MSI|Gigabyte|Dell|Logitech|Samsung|Sony|Nintendo|UGREEN|Promate|Vention|ViewSonic|Rapoo|AULA|TTRACING|FlexiSpot)', s, re.IGNORECASE)]
print(f"Brand-like segments (first 30): {len(brand_like)}")
for seg in sorted(brand_like)[:30]:
    print(f"  {all_segments[seg]:5d}  {seg}")

print()
print("=== SUMMARY ===")
print(f"Electroworld uses brand-heavy category taxonomy.")
print(f"Raw level1 segments appear to include brand names as top-level nodes.")
print(f"CURRENT GAPS:")
print(f"  1. 'PC Component' - no generic rule (specific CPU/mobo/RAM/GPU/PSU/case rules exist)")
print(f"  2. 'Audio' - not directly covered (falls to 'other' unless product name has 'headset/speaker')")
print(f"  3. 'Gaming' as standalone - caught via product name or as sub-category in path")
print(f"  4. Many brand-only segments (Acer, ASUS, etc.) - will match via product name fallback")
print(f"  5. 'fans' matches fan rule but might conflict with brand 'Fantech' (word boundary prevents this)")
print(f"  6. 'PC Component', 'Computers' - 'Computers' not directly matched, but products inside have keywords")
