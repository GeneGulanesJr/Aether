# PC Builder (PH)

A React + TypeScript web app for browsing PC parts and building custom computer configurations. Designed for the Philippine market with PHP pricing support.

## Quick Start

```bash
npm install
npm run dev
```

## Environment Configuration

Create a `.env` file in the project root:

```bash
# Option 1: Fixture mode (uses local sample data, no API required)
VITE_API_URL=

# Option 2: API mode (loads catalog + prices from Worker API / D1)
VITE_API_URL=http://localhost:8787
```

The app runs in **fixture mode** by default when `VITE_API_URL` is empty.

## Data Modes

### Fixture Mode
- Uses sample JSON files in `data-fixtures/`
- Good for development and testing
- No network requests required

### API Mode (D1)
- Fetches catalog and prices from the Cloudflare Worker API (backed by D1)
- Requires `VITE_API_URL` to be set
- Endpoints: `/api/catalog`, `/api/prices`, `/api/manifest`
- Run the Worker locally: `npm run dev:worker`
- Seed D1 with existing data: `npm run seed:d2`

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────┐
│   Frontend   │────▶│   Worker API     │────▶│   D1    │
│   (React)    │◀────│   (Hono/TS)      │◀────│ (SQLite)│
└──────────────┘     └──────────────────┘     └─────────┘
                            ▲
                            │ POST /api/ingest/*
                     ┌──────┴──────┐
                     │   Scraper   │
                     │  (Scrapy)   │
                     └─────────────┘
```

- **Frontend**: React + Vite, deployed as static assets via Cloudflare Workers + Assets
- **Worker API**: Hono router serving `/api/*` endpoints, D1 binding for database access
- **D1**: Cloudflare's SQLite database storing parts and prices
- **Scraper**: Python/Scrapy spiders that scrape PH retailers and POST data to the ingest API

## Development

```bash
# Start the Worker with local D1
npm run dev:worker

# In another terminal, start the frontend
npm run dev

# Seed D1 with sample data (one-time, after creating the D1 database)
D2_API_URL=http://localhost:8787 D2_API_KEY=dev-test-key-123 npm run seed:d2
```

## Deployment

```bash
# Create the D1 database (first time only)
npx wrangler d1 create pcbuilder-db
# Copy the database_id into wrangler.toml

# Run schema migration (first time only)
npm run d1:migrate

# Deploy both Worker + static assets
npm run deploy

# Set the ingest API key secret (first time only)
npx wrangler secret put INGEST_API_KEY
```

## Adding New Catalog Categories

1. Parts are stored in the D1 `parts` table with a `category` column
2. The `/api/manifest` endpoint automatically discovers available categories
3. Add the category to `BuildSlotCategory` type in `src/lib/types.ts`
4. Update slot definitions in `src/data/slots.json`

## Project Structure

```
api/                    # Cloudflare Worker API
├── index.ts            # Worker entry point & Hono router
├── types.ts            # Env bindings type
├── db.ts               # D1 query helpers
├── middleware/
│   └── auth.ts         # Bearer token auth for ingest
└── routes/
    ├── catalog.ts      # GET /api/catalog
    ├── prices.ts       # GET /api/prices
    ├── manifest.ts     # GET /api/manifest
    └── ingest.ts       # POST /api/ingest/catalog, /api/ingest/prices

migrations/
└── 0001_initial.sql    # D1 schema: parts + prices tables

src/                    # React frontend
├── components/
│   ├── builder/        # Build summary, configuration panel
│   ├── catalog/        # Part cards, grid, skeleton loaders
│   └── layout/         # App shell, navigation
├── data/               # Bundled JSON (static parts + price snapshot)
├── hooks/
│   ├── useCatalogData.ts  # React Query hooks for catalog + prices
│   └── usePartFilters.ts  # Filter and sort logic
├── lib/
│   ├── apiClient.ts       # Worker API client
│   ├── catalogParsers.ts  # Fixture data parsing
│   ├── catalogService.ts  # Catalog loading orchestrator
│   ├── env.ts             # Environment variable access
│   ├── priceUtils.ts      # Price formatting utilities
│   ├── slots.ts           # Slot management
│   └── types.ts           # TypeScript type definitions
└── pages/

scrapper/               # Python Scraper
└── pcparts/
    ├── d2_api_pipeline.py  # POSTs scraped data to Worker API
    ├── pipelines.py        # Clean + deduplicate items
    └── spiders/            # Per-retailer spiders
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/catalog` | No | All parts |
| GET | `/api/catalog/:category` | No | Parts for one category |
| GET | `/api/prices` | No | All prices (optional `?category=&retailer=`) |
| GET | `/api/manifest` | No | Available categories + retailers |
| POST | `/api/ingest/catalog` | Bearer | Upsert parts |
| POST | `/api/ingest/prices` | Bearer | Upsert prices |

## License

MIT