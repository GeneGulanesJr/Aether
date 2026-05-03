#!/usr/bin/env python3
"""
Validate Complink catalog coverage.
- Parses complink.json (JSONL format)
- Checks STORE_RULES mapping coverage
- Verifies in-stock priced items exist in catalog files
"""

import json
import os
import re
from collections import defaultdict
from pathlib import Path

# Configuration
COMPLINK_JSONL = Path("/home/genegulanesjr/Documents/GulanesKorp/PCBuilder/scrapper/output/complink.json")
CATALOG_DIR = Path("/home/genegulanesjr/Documents/GulanesKorp/PCBuilder/src/data")
WORKSPACE = Path("/home/genegulanesjr/Documents/GulanesKorp/PCBuilder")

# STORE_RULES mapping from spider-to-catalog.mjs
STORE_RULES = {
    "AMD Motherboard": "motherboard",
    "Intel Motherboard": "motherboard",
    "AMD Processor": "cpu",
    "Intel Processor": "cpu",
    "Graphics Card": "gpu",
    "RAM": "ram",
    "SSD": "storage",
    "Power Supply": "psu",
    "PC Case": "case",
    "CPU Cooler": "cpu_cooler",
    "Monitor": "monitor",
    "Laptop": "laptop",
    "Keyboard": "keyboard",
    "Mouse": "mouse",
    "Headset": "headset",
    "Speaker": "speaker",
    "Webcam": "camera",
    "Printer": "printer",
    "Gamepad": "gamepad",
    "Adapter": "adapter",
    "Cable": "cable",
    "Software": "software",
    "UPS": "ups"
}

def parse_complink_jsonl():
    """Parse the complink.jsonl file and return products by category."""
    categories = set()
    products_by_category = defaultdict(list)
    all_products = []

    with open(COMPLINK_JSONL, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                product = json.loads(line)
                all_products.append(product)
                category = product.get("category", "Unknown")
                categories.add(category)
                products_by_category[category].append(product)
            except json.JSONDecodeError as e:
                print(f"Warning: Failed to parse line: {e}")

    return categories, products_by_category, all_products

def load_catalog_items():
    """Load all catalog JSON files and extract product identifiers."""
    catalog_items = {}  # category -> set of normalized names/skus

    for catalog_file in sorted(CATALOG_DIR.glob("catalog_*.json")):
        category_name = catalog_file.stem.replace("catalog_", "").replace("-", "_")
        with open(catalog_file, 'r') as f:
            try:
                data = json.load(f)
                # Catalog structure: {schemaVersion, category, items: []}
                if isinstance(data, dict) and "items" in data:
                    items = data["items"]
                else:
                    print(f"  Warning: Unexpected catalog structure in {catalog_file.name}")
                    continue

                # Extract identifiers (name, id, and brand+name)
                identifiers = set()
                for item in items:
                    name = item.get("name", "")
                    brand = item.get("brand", "")
                    product_id = item.get("id", "")

                    # Normalize name
                    norm_name = normalize_string(name)
                    if norm_name:
                        identifiers.add(norm_name)

                    # Normalize id
                    if product_id:
                        identifiers.add(str(product_id).lower())

                    # Brand + name combo
                    if brand and name:
                        norm_brand_name = normalize_string(f"{brand} {name}")
                        identifiers.add(norm_brand_name)

                catalog_items[category_name] = identifiers
                print(f"  Loaded {len(identifiers)} items from {catalog_file.name}")
            except json.JSONDecodeError as e:
                print(f"  Warning: Failed to parse {catalog_file.name}: {e}")

    return catalog_items

def normalize_string(s):
    """Normalize a string for matching (lowercase, strip, remove special chars)."""
    if not s:
        return ""
    s = str(s).lower().strip()
    # Remove common e-commerce suffixes/punctuation
    s = re.sub(r'[^\w\s-]', ' ', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def match_product_to_catalog(product, catalog_items):
    """Check if a product matches any item in the catalog using normalized name/id comparison."""
    name = product.get("name", "")
    brand = product.get("brand", "")
    sku = product.get("sku", "")

    norm_name = normalize_string(name)
    norm_brand_name = normalize_string(f"{brand} {name}") if brand else norm_name
    norm_sku = str(sku).lower() if sku else ""

    # Build search keys
    search_keys = []
    if norm_name:
        search_keys.append(norm_name)
    if norm_brand_name and norm_brand_name != norm_name:
        search_keys.append(norm_brand_name)
    if norm_sku:
        search_keys.append(norm_sku)

    # Search through all catalog categories
    for category, identifiers in catalog_items.items():
        for key in search_keys:
            if key in identifiers:
                return True, category
            # Also check if key is a substring of any identifier (partial match)
            for ident in identifiers:
                if key in ident or ident in key:
                    return True, category

    return False, None

def main():
    print("="*60)
    print("COMPLINK CATALOG COVERAGE VALIDATION")
    print("="*60)

    # Step 1: Parse complink.json
    print("\n[1] Parsing complink.json...")
    categories, products_by_category, all_products = parse_complink_jsonl()
    print(f"  Total products: {len(all_products)}")
    print(f"  Unique categories ({len(categories)}): {sorted(categories)}")

    # Step 2: Check STORE_RULES coverage
    print("\n[2] Checking STORE_RULES coverage...")
    uncovered_categories = []
    for cat in sorted(categories):
        mapped = STORE_RULES.get(cat)
        if mapped:
            print(f"  ✓ '{cat}' -> '{mapped}' (covered)")
        else:
            print(f"  ✗ '{cat}' -> NOT COVERED")
            uncovered_categories.append(cat)

    # Step 3: Load catalog items
    print("\n[3] Loading catalog files...")
    catalog_items = load_catalog_items()
    total_catalog_items = sum(len(v) for v in catalog_items.values())
    print(f"\n  Total catalog items loaded: {total_catalog_items}")

    # Step 4: Check in-stock priced items against catalog
    print("\n[4] Checking in-stock priced items against catalog...")
    in_stock_priced = [p for p in all_products if p.get("availability") == "in_stock" and p.get("price", 0) > 0]
    print(f"  In-stock with price > 0: {len(in_stock_priced)}")

    missing_items = []
    found_count = 0

    for i, product in enumerate(in_stock_priced):
        if i % 100 == 0 and i > 0:
            print(f"  Checked {i}/{len(in_stock_priced)}...")
        found, catalog_cat = match_product_to_catalog(product, catalog_items)
        if found:
            found_count += 1
        else:
            missing_items.append({
                "name": product.get("name", ""),
                "brand": product.get("brand", ""),
                "category": product.get("category", ""),
                "sku": product.get("sku", ""),
                "price": product.get("price", 0)
            })

    # Step 5: Report results
    print("\n" + "="*60)
    print("RESULTS SUMMARY")
    print("="*60)

    coverage_pct = (found_count / len(in_stock_priced) * 100) if in_stock_priced else 0

    print(f"\nTotal raw categories:   {len(categories)}")
    print(f"STORE_RULES covered:    {len(categories) - len(uncovered_categories)}")
    print(f"Uncovered categories:   {len(uncovered_categories)}")
    if uncovered_categories:
        for uc in uncovered_categories:
            print(f"  - {uc}")

    print(f"\nIn-stock priced items:  {len(in_stock_priced)}")
    print(f"Found in catalog:       {found_count}")
    print(f"Missing from catalog:   {len(missing_items)}")
    print(f"Coverage:               {coverage_pct:.1f}%")

    result = "PASS" if len(missing_items) == 0 and len(uncovered_categories) == 0 else "FAIL"
    print(f"\nOverall result: {result}")

    if missing_items:
        print("\n--- Missing Items (first 10 per category) ---")
        # Group by category
        by_cat = defaultdict(list)
        for item in missing_items:
            by_cat[item["category"]].append(item)

        for cat in sorted(by_cat.keys()):
            print(f"\nCategory: {cat} ({len(by_cat[cat])} missing)")
            for item in by_cat[cat][:10]:
                print(f"  - [{item['brand']}] {item['name']} (SKU: {item['sku']}, PHP {item['price']:,.0f})")
            if len(by_cat[cat]) > 10:
                print(f"  ... and {len(by_cat[cat]) - 10} more")

    return {
        "pass": result == "PASS",
        "coverage_pct": coverage_pct,
        "uncovered_categories": uncovered_categories,
        "missing_items_count": len(missing_items),
        "total_products": len(all_products),
        "in_stock_priced": len(in_stock_priced),
        "found_in_catalog": found_count
    }

if __name__ == "__main__":
    result = main()
    print("\n" + "="*60)
