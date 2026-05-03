#!/usr/bin/env node

/**
 * verify-catalog-coverage.mjs
 * Verifies catalog coverage for all Aether stores by matching scraped store items
 * against catalog items using SKU, _key, or name matching.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Stores without SKU - use _key or name matching
const KEY_BASED_STORES = new Set(['bermorzone', 'villman']);

// Load all store items from NDJSON files
function loadStoreItems(storePath) {
  const items = [];
  const content = fs.readFileSync(storePath, 'utf-8');
  const lines = content.trim().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      try {
        items.push(JSON.parse(line));
      } catch (e) {
        console.error(`Error parsing line in ${storePath}: ${e.message}`);
      }
    }
  }
  return items;
}

// Load all catalog items from JSON files
function loadCatalogItems(catalogPath) {
  const data = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  return data.items || [];
}

// Normalize name for matching (trim, lowercase, collapse whitespace)
function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Compute simple hash of a string
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Main verification function
async function verifyAllStores() {
  const storeDir = path.join(rootDir, 'scrapper', 'output');
  const catalogDir = path.join(rootDir, 'src', 'data');
  const reportsDir = path.join(rootDir, 'verification_reports');

  // Ensure reports directory exists
  fs.mkdirSync(reportsDir, { recursive: true });

  // Discover store files
  const storeFiles = fs.readdirSync(storeDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  console.log(`Found ${storeFiles.length} store files`);

  // Discover catalog files
  const catalogFiles = fs.readdirSync(catalogDir)
    .filter(f => f.startsWith('catalog_') && f.endsWith('.json'))
    .sort();

  console.log(`Found ${catalogFiles.length} catalog files`);

  // Load all catalog items into a map by category
  const allCatalogItems = [];
  const catalogByCategory = new Map();

  for (const catalogFile of catalogFiles) {
    const catalogPath = path.join(catalogDir, catalogFile);
    const category = catalogFile.replace('catalog_', '').replace('.json', '');
    const items = loadCatalogItems(catalogPath);
    items.forEach(item => {
      item._sourceCategory = category;
      allCatalogItems.push(item);
    });
    catalogByCategory.set(category, items);
    console.log(`  Loaded ${items.length} items from ${catalogFile}`);
  }

  // Build lookup maps for fast matching
  const catalogBySKU = new Map();  // SKU -> catalog item (first match)
  const catalogByKey = new Map();  // _key equivalent -> catalog item
  const catalogByName = new Map(); // normalized name -> array of items (for duplicates handling)

  for (const item of allCatalogItems) {
    const sku = item.specs?.SKU;
    if (sku) {
      if (!catalogBySKU.has(sku)) {
        catalogBySKU.set(sku, []);
      }
      catalogBySKU.get(sku).push(item);
    }

    // Also index secondary offer SKUs from storeOffers array
    if (item.storeOffers && Array.isArray(item.storeOffers)) {
      for (const offer of item.storeOffers) {
        const osku = (offer?.sku || '').toString().trim();
        if (osku && !catalogBySKU.has(osku)) {
          catalogBySKU.set(osku, []);
        }
        if (osku) {
          catalogBySKU.get(osku).push(item);
        }
      }
    }

    // Check if catalog item has a _key field (unlikely based on structure)
    // Or use id as key equivalent
    if (item._key) {
      catalogByKey.set(item._key, item);
    }

    // Also index by name for exact matching fallback
    const normName = normalizeName(item.name);
    if (!catalogByName.has(normName)) {
      catalogByName.set(normName, []);
    }
    catalogByName.get(normName).push(item);
  }

  // Per-store results
  const storeResults = [];

  // Aggregate stats
  const aggregate = {
    totalItems: 0,
    matchedItems: 0,
    missingItems: 0,
    duplicateStoreItems: 0,
    crossCatalogDuplicates: 0
  };

  // Process each store
  for (const storeFile of storeFiles) {
    const storePath = path.join(storeDir, storeFile);
    const storeName = storeFile.replace('.json', '');
    const storeItems = loadStoreItems(storePath);

    console.log(`\nProcessing store: ${storeName} (${storeItems.length} items)`);

    const result = {
      store: storeName,
      totalItems: storeItems.length,
      matched: 0,
      missing: 0,
      duplicates: 0,
      missingByCategory: new Map(), // raw category -> count
      categoryMismatches: new Map(), // {rawCategory} -> {catalogCategory} -> count
      sampleMissing: [],
      allMissing: [], // ALL missing items for JSON export
      duplicateItems: [],
      crossCatalogDuplicates: []
    };

    // Track matched catalog items per store (to detect multi-catalog coverage)
    const matchedCatalogIds = new Set();
    const matchedByItem = new Map(); // store item index -> catalog item

    // Detect duplicates within store items themselves
    const seenKeys = new Map(); // _key -> indices
    const seenNames = new Map(); // normalized name -> indices

    for (let i = 0; i < storeItems.length; i++) {
      const item = storeItems[i];
      const key = item._key;
      const normName = normalizeName(item.name);

      // Duplicate detection by _key
      if (key) {
        if (seenKeys.has(key)) {
          result.duplicates++;
          result.duplicateItems.push({
            reason: 'duplicate_key',
            key,
            indices: [seenKeys.get(key), i],
            name: item.name
          });
        } else {
          seenKeys.set(key, i);
        }
      }

      // Duplicate detection by name (if no key or different key but same name)
      if (seenNames.has(normName)) {
        const prevIdx = seenNames.get(normName);
        // Only report if keys are different (true duplicate)
        if (!key || storeItems[prevIdx]._key !== key) {
          result.duplicates++;
          result.duplicateItems.push({
            reason: 'duplicate_name',
            name: item.name,
            indices: [prevIdx, i],
            key: key
          });
        }
      } else if (!key) {
        seenNames.set(normName, i);
      }
    }

    // Match each store item to catalog
    for (let i = 0; i < storeItems.length; i++) {
      const item = storeItems[i];
      let matched = null;
      let matchType = null;

      // Try SKU matching (if store item has SKU)
      if (item.sku) {
        const sku = String(item.sku).trim();
        if (catalogBySKU.has(sku)) {
          const candidates = catalogBySKU.get(sku);
          // Prefer candidate that hasn't been matched yet, but allow any
          matched = candidates[0]; // Take first
          matchType = 'sku';
        }
      }

      // If no match and store is key-based (bermorzone, villman)
      if (!matched && KEY_BASED_STORES.has(storeName.toLowerCase())) {
        // Try _key matching
        if (item._key && catalogByKey.has(item._key)) {
          matched = catalogByKey.get(item._key);
          matchType = 'key';
        }
        // TODO: Normalized name hash matching could be added here if needed
      }

      // Fallback to exact name match
      if (!matched) {
        const normName = normalizeName(item.name);
        if (catalogByName.has(normName)) {
          const candidates = catalogByName.get(normName);
          // Pick first candidate that hasn't been exhausted, could also try to find unused
          matched = candidates[0];
          matchType = 'name';
        }
      }

      if (matched) {
        result.matched++;
        matchedCatalogIds.add(matched.id);

        // Track cross-catalog duplicates
        // Check if this catalog item (by id) was already matched by another store item
        // (within same store - but we want to know if this item appears in multiple catalogs too)
        // For cross-catalog: check if the same item (by normalized identity) appears in multiple catalog files

        // Category consistency check
        const rawCategory = item.category || 'unknown';
        const catalogCategory = matched._sourceCategory;
        if (rawCategory !== catalogCategory) {
          if (!result.categoryMismatches.has(rawCategory)) {
            result.categoryMismatches.set(rawCategory, new Map());
          }
          const catMap = result.categoryMismatches.get(rawCategory);
          catMap.set(catalogCategory, (catMap.get(catalogCategory) || 0) + 1);
        }
      } else {
        result.missing++;
        const rawCategory = item.category || 'unknown';
        if (!result.missingByCategory.has(rawCategory)) {
          result.missingByCategory.set(rawCategory, 0);
        }
        result.missingByCategory.set(rawCategory, result.missingByCategory.get(rawCategory) + 1);

        // Collect ALL missing items for JSON export
        result.allMissing.push({
          name: item.name,
          category: rawCategory,
          sku: item.sku,
          key: item._key,
          brand: item.brand || '',
          price: item.price
        });

        // Also keep sample for text report (first 20)
        if (result.sampleMissing.length < 20) {
          result.sampleMissing.push({
            name: item.name,
            category: rawCategory,
            sku: item.sku,
            key: item._key
          });
        }
      }
    }

    // Compute cross-catalog duplicates: items that appear in multiple catalog files
    // We need to check catalog items across all categories that share same canonical identity
    // Canonical identity could be: same name across different catalogs, or items with SKU that appears in multiple catalogs
    const catalogIdCounts = new Map();
    for (const catItem of allCatalogItems) {
      const id = catItem.id; // Unique id per item
      // Count occurrences by basic fingerprint: name + SKU
      const fingerprint = `${catItem.name}|${catItem.specs?.SKU || ''}`;
      catalogIdCounts.set(fingerprint, (catalogIdCounts.get(fingerprint) || 0) + 1);
    }
    // Items that appear in multiple catalogs (fingerprint count > 1)
    for (const [fingerprint, count] of catalogIdCounts) {
      if (count > 1) {
        aggregate.crossCatalogDuplicates += (count - 1); // count of extra duplicates
      }
    }

    // Count duplicates detected in this store
    aggregate.duplicateStoreItems += result.duplicates;

    // Update aggregates
    aggregate.totalItems += result.totalItems;
    aggregate.matchedItems += result.matched;
    aggregate.missingItems += result.missing;

    storeResults.push(result);

    // Write per-store report
    writeStoreReport(path.join(reportsDir, `${storeName}_report_v2.txt`), result);
    // Write JSON data for programmatic analysis (especially for missing items)
    if (storeName === 'datablitz') {
      writeStoreJSON(path.join(reportsDir, `${storeName}_missing_items.json`), result);
    }
  }

  // Write aggregate report
  writeAggregateReport(path.join(reportsDir, 'aggregate_v2.txt'), storeResults, aggregate);

  console.log('\n=== Verification Complete ===');
  console.log(`Total items across all stores: ${aggregate.totalItems}`);
  console.log(`Total matched: ${aggregate.matchedItems} (${(aggregate.matchedItems/aggregate.totalItems*100).toFixed(1)}%)`);
  console.log(`Total missing: ${aggregate.missingItems} (${(aggregate.missingItems/aggregate.totalItems*100).toFixed(1)}%)`);
  console.log(`Store duplicates detected: ${aggregate.duplicateStoreItems}`);
  console.log(`Cross-catalog duplicates: ${aggregate.crossCatalogDuplicates}`);
  console.log(`Reports written to: ${reportsDir}`);
}

function writeStoreReport(reportPath, result) {
  const lines = [];

  lines.push(`========================================`);
  lines.push(`STORE COVERAGE REPORT: ${result.store.toUpperCase()}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`========================================`);
  lines.push('');

  // SUMMARY
  lines.push('--- SUMMARY ---');
  lines.push(`Total Items  : ${result.totalItems}`);
  lines.push(`Matched      : ${result.matched}`);
  lines.push(`Missing      : ${result.missing}`);
  lines.push(`Duplicates   : ${result.duplicates}`);
  lines.push(`Coverage %   : ${result.totalItems > 0 ? (result.matched / result.totalItems * 100).toFixed(1) : 0}%`);
  lines.push('');

  // TOP MISSING RAW CATEGORIES
  lines.push('--- TOP MISSING RAW CATEGORIES (Top 10) ---');
  const sortedMissing = Array.from(result.missingByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (sortedMissing.length === 0) {
    lines.push('No missing items - full coverage!');
  } else {
    for (const [cat, count] of sortedMissing) {
      lines.push(`  ${cat}: ${count} missing`);
    }
  }
  lines.push('');

  // TOP RAW CATEGORY MISMATCHES
  lines.push('--- TOP RAW CATEGORY MISMATCHES ---');
  const mismatchList = [];
  for (const [rawCat, catMap] of result.categoryMismatches.entries()) {
    for (const [catalogCat, count] of catMap.entries()) {
      mismatchList.push({ raw: rawCat, catalog: catalogCat, count });
    }
  }
  mismatchList.sort((a, b) => b.count - a.count);
  if (mismatchList.length === 0) {
    lines.push('No category mismatches detected.');
  } else {
    for (const m of mismatchList.slice(0, 20)) {
      lines.push(`  Raw: "${m.raw}" -> Catalog: "${m.catalog}" (${m.count} items)`);
    }
  }
  lines.push('');

  // SAMPLE MISSING ITEMS
  lines.push('--- SAMPLE MISSING ITEMS (up to 5) ---');
  if (result.sampleMissing.length === 0) {
    lines.push('No missing items.');
  } else {
    for (let idx = 0; idx < result.sampleMissing.length; idx++) {
      const mi = result.sampleMissing[idx];
      lines.push(`  [${idx + 1}] ${mi.name}`);
      lines.push(`       Category: ${mi.category}, SKU: ${mi.sku || 'null'}, Key: ${mi.key || 'null'}`);
    }
  }
  lines.push('');

  // DUPLICATE ITEMS
  lines.push('--- DUPLICATE ITEMS ---');
  if (result.duplicateItems.length === 0) {
    lines.push('No duplicates found.');
  } else {
    for (let idx = 0; idx < result.duplicateItems.length; idx++) {
      const dup = result.duplicateItems[idx];
      lines.push(`  [${idx + 1}] Reason: ${dup.reason}`);
      lines.push(`       Name: ${dup.name}`);
      if (dup.key) lines.push(`       Key: ${dup.key}`);
      lines.push(`       Indices: ${dup.indices.join(', ')}`);
    }
  }
  lines.push('');

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`  Written: ${reportPath}`);
}

function writeAggregateReport(reportPath, storeResults, aggregate) {
  const lines = [];

  lines.push('========================================');
  lines.push('AGGREGATE CATALOG COVERAGE REPORT');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total Stores: ${storeResults.length}`);
  lines.push('========================================');
  lines.push('');

  // Per-store summary table
  lines.push('--- PER-STORE SUMMARY ---');
  lines.push(`${'Store'.padStart(20)} ${'Total'.padStart(8)} ${'Matched'.padStart(8)} ${'Missing'.padStart(8)} ${'Dupes'.padStart(8)} ${'Coverage%'.padStart(10)}`);
  lines.push('-'.repeat(70));

  for (const r of storeResults) {
    const coverage = r.totalItems > 0 ? (r.matched / r.totalItems * 100).toFixed(1) : '0.0';
    lines.push(`${r.store.padStart(20)} ${String(r.totalItems).padStart(8)} ${String(r.matched).padStart(8)} ${String(r.missing).padStart(8)} ${String(r.duplicates).padStart(8)} ${coverage.padStart(10)}%`);
  }
  lines.push('');

  // Aggregate totals
  lines.push('--- AGGREGATE TOTALS ---');
  lines.push(`Total items across all stores : ${aggregate.totalItems}`);
  lines.push(`Total matched                 : ${aggregate.matchedItems}`);
  lines.push(`Total missing                 : ${aggregate.missingItems}`);
  lines.push(`Store-internal duplicates     : ${aggregate.duplicateStoreItems}`);
  lines.push(`Cross-catalog duplicates      : ${aggregate.crossCatalogDuplicates}`);
  const overallCoverage = aggregate.totalItems > 0
    ? (aggregate.matchedItems / aggregate.totalItems * 100).toFixed(2)
    : '0.00';
  lines.push(`Overall coverage percentage   : ${overallCoverage}%`);
  lines.push('');

  // Category coverage breakdown (aggregate missing by category)
  lines.push('--- MISSING BY RAW CATEGORY (Aggregate) ---');
  const allMissingCats = new Map();
  for (const r of storeResults) {
    for (const [cat, count] of r.missingByCategory) {
      allMissingCats.set(cat, (allMissingCats.get(cat) || 0) + count);
    }
  }
  const sortedAllCats = Array.from(allMissingCats.entries())
    .sort((a, b) => b[1] - a[1]);
  if (sortedAllCats.length === 0) {
    lines.push('No missing items across all stores.');
  } else {
    for (const [cat, count] of sortedAllCats) {
      lines.push(`  ${cat}: ${count} missing`);
    }
  }
  lines.push('');

  // Per-store missing top categories
  lines.push('--- PER-STORE TOP MISSING CATEGORIES ---');
  for (const r of storeResults) {
    if (r.missing > 0) {
      const topCats = Array.from(r.missingByCategory.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      lines.push(`  ${r.store}:`);
      for (const [cat, count] of topCats) {
        lines.push(`    ${cat}: ${count}`);
      }
    }
  }
  lines.push('');

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`  Written: ${reportPath}`);
}

// Write JSON data export for programmatic analysis
function writeStoreJSON(jsonPath, result) {
  const data = {
    store: result.store,
    totalItems: result.totalItems,
    matched: result.matched,
    missing: result.missing,
    duplicates: result.duplicates,
    coverage: (result.totalItems > 0 ? (result.matched / result.totalItems * 100).toFixed(1) : 0) + '%',
    missingByCategory: Object.fromEntries(result.missingByCategory),
    categoryMismatches: Object.fromEntries(
      Array.from(result.categoryMismatches.entries()).map(([rawCat, catMap]) => [
        rawCat,
        Object.fromEntries(catMap)
      ])
    ),
    sampleMissing: result.sampleMissing,
    allMissing: result.allMissing // full list
  };
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  JSON export: ${jsonPath}`);
}

// Run
verifyAllStores().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
