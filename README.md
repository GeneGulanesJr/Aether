# Aether

A React + TypeScript web app for browsing PC parts and building custom computer configurations. Designed for the Philippine market with PHP pricing support.

## Quick Start

```bash
npm install
npm run dev
```

All parts and prices are bundled at build time from `src/data/*.json` — no database or API required.

## Data Architecture

Aether uses a **build-time data** approach:

- **Parts catalog**: `src/data/catalog_*.json` (~30 categories, loaded async after first paint)
- **Prices**: `src/data/prices_snapshot.json` (bundled price snapshot)
- **Build slots**: `src/data/slots.json`
- **Zero network calls** — everything works offline, no database needed

To update prices or parts, edit the JSON files in `src/data/` and rebuild.

## Architecture

```
┌──────────────┐
│   Frontend   │
│   (React +   │
│    Vite)     │
│              │
│  src/data/   │
│  *.json      │ (bundled at build time)
└──────────────┘
```

- **Frontend**: React + Vite — pure static SPA, deployed to any static host
- **Data**: Bundled JSON — parts and prices are compiled into the app at build time
- **Scraper**: Python/Scrapy spiders (in `scrapper/`) that generate the JSON data files

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

scrapper/               # Python Scraper
└── pcparts/
    ├── pipelines.py        # Clean + deduplicate items
    └── spiders/            # Per-retailer spiders

schema/                 # JSON Schema validation
├── catalog.schema.json
└── prices.schema.json
```

## License

MIT