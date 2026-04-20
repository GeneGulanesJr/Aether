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
# Option 1: Fixture mode (uses local sample data, no R2 required)
VITE_R2_BASE_URL=

# Option 2: R2 mode (loads catalog + prices from Cloudflare R2)
VITE_R2_BASE_URL=https://your-account.r2.cloudflarestorage.com/your-bucket
```

The app runs in **fixture mode** by default when `VITE_R2_BASE_URL` is empty.

## Data Modes

### Fixture Mode
- Uses sample JSON files in `data-fixtures/`
- Good for development and testing
- No network requests required

### R2 Mode
- Fetches catalog shards and price manifest from Cloudflare R2
- Requires `VITE_R2_BASE_URL` to be set
- Manifest at: `<base>/prices/manifest.json`
- Catalog shards at: `<base>/catalog/<category>.json`

## Adding New Catalog Categories

1. **Create the catalog shard file** in R2 or fixtures:

```json
{
  "schemaVersion": "1.0",
  "category": "cpu_cooler",
  "items": [
    {
      "id": "cooler-001",
      "name": "Example Cooler",
      "category": "cpu_cooler",
      "specs": {
        "socket": "LGA1700",
        "type": "Air"
      }
    }
  ]
}
```

2. **Update slot definitions** in `src/data/slots.json`:

```json
{
  "id": "cpu_cooler",
  "category": "cpu_cooler",
  "label": "CPU Cooler",
  "required": false,
  "order": 7
}
```

3. **Update the `BuildSlotCategory` type** in `src/lib/types.ts`:

```ts
export type BuildSlotCategory =
  | 'cpu'
  | 'motherboard'
  // ... existing
  | 'cpu_cooler'  // Add new category
```

## JSON Schema Validation

Schemas are defined in the `schema/` directory:

| Schema | Purpose |
|--------|---------|
| `catalog.schema.json` | Catalog shard file structure |
| `prices.schema.json` | Price manifest and entry format |
| `slots.schema.json` | Build slot definitions |

Use [Ajv](https://ajv.js.org/) or similar to validate JSON fixtures against schemas during development.

## Project Structure

```
src/
├── components/
│   ├── builder/        # Build summary, configuration panel
│   ├── catalog/         # Part cards, grid, skeleton loaders
│   └── layout/          # App shell, navigation
├── data/
│   └── slots.json       # Slot definitions (add new categories here)
├── hooks/
│   └── useCatalogData.ts  # React Query hooks for catalog + prices
├── lib/
│   ├── dataClient.ts    # R2 fetching with error handling
│   ├── env.ts           # Environment variable access
│   ├── priceUtils.ts    # Price formatting utilities
│   ├── slots.ts         # Slot management
│   └── types.ts         # TypeScript type definitions
├── pages/
│   └── BuilderPage.tsx  # Main page
└── styles/
    └── globals.css      # Tailwind + custom utilities
```

## React Query Caching

The app uses React Query with optimized cache settings:

| Setting | Value | Purpose |
|--------|-------|---------|
| `staleTime` | 5 minutes | Avoid refetching on focus |
| `gcTime` | 30 minutes | Keep data in cache for returning users |
| `retry` | 2 | Handle transient network failures |

## Adding New Parts

1. Add to R2 catalog shard (e.g., `catalog/fans.json`)
2. Create or update price entries for the parts
3. Optionally add to `slots.json` if it should appear in build summary
4. Update price shard manifest with the new entries

## License

MIT
