# Aether

A React + TypeScript web app for browsing PC parts and building custom computer configurations. Designed for the Philippine market with PHP pricing support.

![Architecture](docs/architecture.html)

## Quick Start

```bash
npm install
npm run dev
```

All parts and prices are bundled at build time from `src/data/*.json` — no database or API required.

## Data Sources

Aether aggregates pricing from **14 Philippine retailers**, providing over **50,000 price entries** across **30+ product categories**:

| Retailer | Website | Prices |
|---|---|---|
| DataBlitz | [ecommerce.datablitz.com.ph](https://ecommerce.datablitz.com.ph) | 22,711 |
| EasyPC | [easypc.com.ph](https://easypc.com.ph) | 7,135 |
| Bermor Techzone | [bermorzone.com.ph](https://bermorzone.com.ph) | 6,657 |
| DynaQuest PC | [dynaquestpc.com](https://dynaquestpc.com) | 3,772 |
| PCWORX | [pcworx.ph](https://pcworx.ph) | 3,459 |
| PC Express | [pcx.com.ph](https://pcx.com.ph) | 2,550 |
| Gigahertz | [gigahertz.com.ph](https://gigahertz.com.ph) | 2,379 |
| VillMan | [villman.com](https://villman.com) | 2,322 |
| iTech | [itech.ph](https://itech.ph) | 884 |
| Octagon | [octagon.com.ph](https://octagon.com.ph) | 746 |
| Complink | [complink.com.ph](https://complink.com.ph) | 533 |
| Ben Store | [benstore.com.ph](https://benstore.com.ph) | 420 |
| Electroworld | [electroworld.abenson.com](https://electroworld.abenson.com) | 234 |
| Silicon Valley | [siliconvalley.com.ph](https://siliconvalley.com.ph) | 227 |

## Data Architecture

Aether uses a **build-time data** approach:

- **Parts catalog**: `src/data/catalog_*.json` (~30 categories, loaded async after first paint)
- **Prices**: `src/data/prices_snapshot.json` (bundled price snapshot)
- **Build slots**: `src/data/slots.json`
- **Zero network calls** — everything works offline, no database needed

To update prices or parts, edit the JSON files in `src/data/` and rebuild.

## Architecture

```
┌──────────────────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐
│  14 PH Retailers  │────▶│  src/data/ │────▶│   Vite   │────▶│  Static  │
│  (spider → JSON)  │     │  *.json     │     │  + React │     │   SPA    │
└──────────────────┘     └──────┬─────┘     └──────────┘     └──────────┘
                                │                                │
                           Schema CI                          ┌───┴────┐
                         (validate:schemas)                   │  3D     │
                                                             │  Build  │
                                                             │  Scene  │
                                                             │  Wizard │
                                                             │  Market │
                                                             └────────┘
```

- **Frontend**: React + Vite — pure static SPA, deployed to any static host
- **Data**: Bundled JSON — parts and prices are compiled into the app at build time
- **Scraper**: Python/Scrapy spiders that generate the JSON data files (not in git repo)

## Development

```bash
# Start the frontend
npm run dev

# Validate schema files
npm run validate:schemas

# Run tests
npm run test

# Type check
npm run typecheck
```

## Deployment

Since Aether is a pure static app, deploy the `dist/` folder to any static host:

```bash
npm run build
# Deploy dist/ to Cloudflare Pages, Vercel, Netlify, etc.
```

## Adding New Catalog Categories

1. Add a `src/data/catalog_<category>.json` file following the existing schema
2. Import it in `src/hooks/useCatalogData.ts` → `loadStaticParts()`
3. Add the category to `BuildSlotCategory` type in `src/lib/types.ts`
4. Update slot definitions in `src/data/slots.json`

## Project Structure

```
src/                    # React frontend
├── components/
│   ├── builder/        # Build summary, configuration panel
│   ├── catalog/        # Part cards, grid, skeleton loaders
│   ├── desktop/        # Desktop OS layout (windowed UI)
│   ├── layout/         # App shell, navigation
│   ├── scene/          # Three.js 3D PC visualization
│   └── wizard/         # Guided build wizard flow
├── data/               # Bundled JSON (static parts + price snapshot)
│   ├── catalog_*.json   # Per-category part catalogs (~30 categories)
│   ├── prices_snapshot.json  # Price data from scrapers
│   └── slots.json        # Build slot definitions
├── hooks/
│   ├── useCatalogData.ts  # Main data hook (loads bundled JSON)
│   ├── useBuild.ts        # Build state management
│   └── usePartFilters.ts  # Filter and sort logic
├── lib/
│   ├── buildWizard.ts     # Guided build logic
│   ├── format.ts          # PHP formatting
│   ├── priceUtils.ts      # Price formatting utilities
│   ├── slots.ts           # Slot management
│   ├── types.ts           # TypeScript type definitions
│   └── wattageEstimator.ts # PSU wattage calculator
└── pages/

schema/                 # JSON Schema validation
├── catalog.schema.json
└── prices.schema.json

data-fixtures/          # Sample JSON for schema validation CI
├── catalog/
│   └── cpus.sample.json
└── prices/
    ├── manifest.sample.json
    └── entries.sample.json
```

## License

MIT