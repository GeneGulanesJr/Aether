#!/usr/bin/env python3
"""
Parse AMD and Intel processor specification CSVs into a unified JSON database.

Run: python scripts/parse-cpu-specs.py

Reads:
  docs/AMD_Processor Specifications.csv
  docs/INTEL_Processor Specification.csv

Writes:
  scripts/cpu-specs-database.json  (used by enrich-catalog.js)

Database format:
{
  "amd": [
    { "name": "AMD Ryzen 7 7700X", "modelKeys": ["7700x", "ryzen 7 7700x"], "specs": { ... } },
    ...
  ],
  "intel": [
    { "name": "Intel Core i5-14600K", "modelKeys": ["14600k", "i5-14600k", "core 5 14600k"], "specs": { ... } },
    ...
  ]
}
"""

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AMD_CSV = ROOT / "docs" / "AMD_Processor Specifications.csv"
INTEL_CSV = ROOT / "docs" / "INTEL_Processor Specification.csv"
OUTPUT = ROOT / "scripts" / "cpu-specs-database.json"


def clean(s: str) -> str:
    """Strip whitespace, normalize Unicode."""
    s = s.strip()
    s = s.replace("\u2122", "").replace("\u00ae", "").replace("\u0099", "")
    # Normalize multiple spaces
    s = re.sub(r'\s+', ' ', s)
    return s


def parse_amd_csv(path: Path) -> list:
    """Parse AMD processor specifications CSV.

    Returns list of {name, modelKeys, specs} dicts.
    """
    results = []
    seen_names = set()

    with open(path, "r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = clean(row.get("Name", ""))
            if not name:
                continue

            # Only include Desktop form factors (must contain "Desktop")
            form_factor = clean(row.get("Form Factor", ""))
            if "desktop" not in form_factor.lower():
                # Skip pure laptop/handheld parts
                continue

            cores = clean(row.get("# of CPU Cores", ""))
            threads = clean(row.get("# of Threads", ""))
            boost_clock = clean(row.get("Max. Boost Clock", ""))
            base_clock = clean(row.get("Base Clock", ""))
            l2_cache = clean(row.get("L2 Cache", ""))
            l3_cache = clean(row.get("L3 Cache", ""))
            tdp = clean(row.get("Default TDP", ""))
            ctdp = clean(row.get("AMD Configurable TDP (cTDP)", ""))
            socket = clean(row.get("CPU Socket", ""))
            mem_type = clean(row.get("System Memory Type", ""))
            mem_channels = clean(row.get("Memory Channels", ""))
            pcie_ver = clean(row.get("PCI Express® Version", ""))
            graphics = clean(row.get("Graphics Model", ""))
            graphics_cores = clean(row.get("Graphics Core Count", ""))
            unlocked = clean(row.get("Unlocked for Overclocking", ""))
            max_temp = clean(row.get("Max. Operating Temperature (Tjmax)", ""))

            specs = {}
            if cores:
                specs["cores"] = cores
            if threads:
                specs["threads"] = threads
            if boost_clock:
                specs["boostClock"] = boost_clock
            if base_clock:
                specs["baseClock"] = base_clock
            if l2_cache:
                specs["l2Cache"] = l2_cache
            if l3_cache:
                specs["l3Cache"] = l3_cache
            if tdp:
                specs["tdp"] = tdp
            if ctdp:
                specs["configurableTdp"] = ctdp
            if socket:
                specs["socket"] = socket
            if mem_type:
                specs["memoryType"] = mem_type
            if mem_channels:
                specs["memoryChannels"] = mem_channels
            if pcie_ver:
                specs["pcieVersion"] = pcie_ver
            if graphics and graphics != "N/A":
                specs["integratedGraphics"] = graphics
            if graphics_cores:
                specs["graphicsCoreCount"] = graphics_cores
            if unlocked.lower() in ("yes", "true"):
                specs["unlocked"] = "Yes"
            if max_temp:
                specs["maxTemp"] = max_temp

            # Build match keys from the name
            name_clean = name.lower().replace("™", "").replace("®", "")
            name_clean = name_clean.replace("processor", "").replace("with radeon graphics", "")
            name_clean = name_clean.replace("desktop", "").replace("gaming", "")
            name_clean = name_clean.replace("and content creation", "")
            name_clean = re.sub(r'\s+', ' ', name_clean).strip()

            model_keys = []

            # Pattern: "Ryzen 7 7700X" -> ["ryzen 7 7700x", "7700x"]
            ryzen_match = re.search(r'ryzen\s*(?:ai\s+)?(\d+)\s+(\d{3,5}[a-z0-9]*)', name_clean)
            if ryzen_match:
                model_keys.append(f"ryzen {ryzen_match.group(1)} {ryzen_match.group(2)}".lower())
                model_keys.append(ryzen_match.group(2).lower())

            # Pattern: simple model number "5600X"
            model_match = re.search(r'(\d{3,5}[a-z0-9]*)', name_clean)
            if model_match:
                key = model_match.group(1).lower()
                if key not in model_keys:
                    model_keys.append(key)

            # Full clean name as a fallback
            model_keys.append(name_clean)

            # Deduplicate name
            if name not in seen_names:
                seen_names.add(name)
                results.append({
                    "name": name,
                    "modelKeys": model_keys,
                    "specs": specs,
                })

    return results


def parse_intel_csv(path: Path) -> list:
    """Parse Intel processor specification CSV.

    Returns list of {name, modelKeys, specs} dicts.
    """
    results = []
    seen_procs = set()

    with open(path, "r", encoding="utf-8", errors="replace") as f:
        rows = list(csv.reader(f))

    # Data starts at row 7 (rows 0-5 are title/empty, row 6 is the header)
    for i in range(7, len(rows)):
        row = rows[i]
        if len(row) < 10:
            continue

        proc_num = clean(row[0])
        if not proc_num:
            continue
        # Skip empty/header rows
        if proc_num.startswith("Click") or proc_num.startswith("Intel"):
            continue
        # Skip rows without core count data
        if not row[6].strip() and not row[9].strip():
            continue

        brand_type = clean(row[1])
        series = clean(row[2])
        brand_level = clean(row[3])
        generation = clean(row[4])
        year = clean(row[5])
        cores = clean(row[6])
        p_cores = clean(row[7])
        e_cores = clean(row[8])
        threads = clean(row[9])
        max_turbo = clean(row[10])
        p_core_base = clean(row[11])
        e_core_base = clean(row[12])
        base_freq = clean(row[13])
        cache = clean(row[14])
        tdp_raw = clean(row[15])
        max_mem = clean(row[16])
        mem_types = clean(row[17])
        pcie_lanes = clean(row[18])
        socket = clean(row[19])
        graphics = clean(row[20])
        graphics_freq = clean(row[21])

        # Deduplicate
        if proc_num in seen_procs:
            continue
        seen_procs.add(proc_num)

        specs = {}
        if cores:
            specs["cores"] = cores
        if p_cores:
            specs["pCores"] = p_cores
        if e_cores:
            specs["eCores"] = e_cores
        if threads:
            specs["threads"] = threads
        if max_turbo:
            specs["boostClock"] = f"{max_turbo} GHz"
        if p_core_base and p_core_base != "N/A":
            specs["pCoreBaseClock"] = f"{p_core_base} GHz"
        if e_core_base and e_core_base != "N/A":
            specs["eCoreBaseClock"] = f"{e_core_base} GHz"
        if base_freq and base_freq != "N/A":
            specs["baseClock"] = f"{base_freq} GHz"
        elif p_core_base and p_core_base != "N/A":
            specs["baseClock"] = f"{p_core_base} GHz"
        if cache:
            specs["cache"] = f"{cache} MB"
        if tdp_raw:
            tdp_clean = tdp_raw.replace("\n", " ").strip()
            tdp_match = re.match(r'(\d+)', tdp_clean)
            if tdp_match:
                specs["tdp"] = f"{tdp_match.group(1)}W"
        if max_mem:
            specs["maxMemory"] = max_mem
        if mem_types:
            specs["memoryType"] = mem_types
        if pcie_lanes:
            specs["pcieLanes"] = pcie_lanes
        if socket:
            specs["socket"] = socket
        if graphics and graphics not in ("No", "N/A", ""):
            specs["integratedGraphics"] = graphics
        if graphics_freq and graphics_freq not in ("N/A", ""):
            specs["graphicsMaxFreq"] = f"{graphics_freq} GHz"
        if generation and generation != "N/A":
            specs["generation"] = generation
        if year:
            specs["yearLaunched"] = year
        if brand_type:
            specs["brandType"] = brand_type
        if series:
            specs["series"] = series

        # Build match keys
        model_keys = []
        proc_lower = proc_num.lower().strip()

        # The raw processor number: "14600k", "285k", "i5-14600k"
        model_keys.append(proc_lower)

        # Extract pure numeric model: "14600K" -> "14600k"
        model_num_match = re.search(r'(\d{3,5}[a-z0-9]*)', proc_lower)
        if model_num_match:
            pure_model = model_num_match.group(1)
            if pure_model != proc_lower:
                model_keys.append(pure_model)

        # With brand prefix: "i5-14600K" format
        if brand_level:
            model_in_key = model_num_match.group(1) if model_num_match else proc_lower
            model_keys.append(f"i{brand_level}-{model_in_key}")

        # Full model: "Core Ultra 7 265K", "Core i5-14600K"
        if brand_type and brand_level:
            brand_short = brand_type.replace("Intel® Core™ Ultra", "Core Ultra").replace("Intel® Core™", "Core").replace("Intel®", "").strip()
            model_in_key = model_num_match.group(1) if model_num_match else proc_lower
            model_keys.append(f"{brand_short} {brand_level} {model_in_key}".lower())

        # Build display name
        display_name = f"Intel {brand_type} {brand_level} {proc_num}" if brand_type else f"Intel {proc_num}"
        display_name = display_name.replace("Intel® ", "Intel ").replace("  ", " ").strip()

        results.append({
            "name": display_name,
            "modelKeys": model_keys,
            "specs": specs,
        })

    return results


def main():
    print("Parsing AMD processor specifications...")
    amd_specs = parse_amd_csv(AMD_CSV)
    print(f"  Found {len(amd_specs)} AMD processor entries")

    print("Parsing Intel processor specifications...")
    intel_specs = parse_intel_csv(INTEL_CSV)
    print(f"  Found {len(intel_specs)} Intel processor entries")

    database = {
        "amd": amd_specs,
        "intel": intel_specs,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(database, f, indent=2)
    print(f"\nWrote database to {OUTPUT}")

    # Print sample entries for verification
    print("\n--- AMD Sample Entries ---")
    for entry in amd_specs[:3]:
        print(f"  {entry['name']}")
        print(f"    Keys: {entry['modelKeys']}")
        print(f"    Specs: cores={entry['specs'].get('cores')}, threads={entry['specs'].get('threads')}, tdp={entry['specs'].get('tdp')}, socket={entry['specs'].get('socket')}")

    print("\n--- Intel Sample Entries ---")
    for entry in intel_specs[:5]:
        print(f"  {entry['name']}")
        print(f"    Keys: {entry['modelKeys']}")
        print(f"    Specs: cores={entry['specs'].get('cores')}, threads={entry['specs'].get('threads')}, tdp={entry['specs'].get('tdp')}, socket={entry['specs'].get('socket')}")


if __name__ == "__main__":
    main()