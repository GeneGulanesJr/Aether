import { useQuery } from '@tanstack/react-query'
import { fetchCatalogShard, fetchPriceManifest, fetchPriceShard } from '../lib/dataClient'
import { buildPriceMap } from '../lib/priceUtils'
import { getDataSourceMode } from '../lib/env'
import { parseCatalogFixture, parsePriceFixture } from '../lib/catalogParsers'
import { getErrorMessage } from '../lib/errors'
import type { Part, PriceEntry, PriceListFile } from '../lib/types'

export { DEFAULT_SLOTS } from '../lib/slots'

export type DataSourceMode = 'fixture' | 'r2'

export interface CatalogData {
  parts: Part[]
  priceByPartId: Record<string, string> | undefined
  /** Raw price entries for build calculations */
  priceEntries: PriceEntry[]
  statusMessage: string
  mode: DataSourceMode
  loadingState: 'idle' | 'loading' | 'error' | 'success'
}

/** R2 shard keys that are catalog shards (contain parts). */
function isCatalogShard(key: string): boolean {
  return key.startsWith('catalog/') && key.endsWith('.json')
}

/** R2 shard keys that are price shards (contain price entries). */
function isPriceShard(key: string): boolean {
  return key.startsWith('prices/') && key.endsWith('.json') && !key.endsWith('manifest.json')
}

/**
 * Fetches catalog data and prices.
 * Dynamically loads all catalog + price shards listed in the R2 manifest.
 * Returns parts, formatted prices, and raw price entries for calculations.
 */
export function useCatalogData(): CatalogData {
  const mode = getDataSourceMode()

  // Step 1: fetch manifest (only in R2 mode)
  const manifestQuery = useQuery({
    queryKey: ['r2', 'manifest'],
    queryFn: fetchPriceManifest,
    enabled: mode === 'r2',
  })

  // Step 2: fetch all catalog + price shards once manifest is available
  const shardsQuery = useQuery({
    queryKey: ['r2', 'shards', manifestQuery.data?.version],
    queryFn: async () => {
      const manifest = manifestQuery.data!
      const catalogKeys = manifest.shards
        .map((s) => s.key)
        .filter(isCatalogShard)
      const priceKeys = manifest.shards
        .map((s) => s.key)
        .filter(isPriceShard)

      const [catalogResults, priceResults] = await Promise.all([
        Promise.all(catalogKeys.map((key) => fetchCatalogShard(key))),
        Promise.all(priceKeys.map((key) => fetchPriceShard(key))),
      ])

      const parts = catalogResults.flatMap((shard) => shard.items)
      const entries = priceResults.flatMap((shard) => shard.entries)

      return { parts, entries }
    },
    enabled: mode === 'r2' && manifestQuery.isSuccess,
  })

  // ─── Fixture mode ──────────────────────────────────────────────────────
  if (mode === 'fixture') {
    const catalog = parseCatalogFixture()
    const prices: PriceListFile = parsePriceFixture()
    return {
      parts: catalog.items,
      priceByPartId: buildPriceMap(prices),
      priceEntries: prices.entries,
      statusMessage:
        'Fixture mode (set VITE_R2_BASE_URL to load manifest + shards from R2).',
      mode,
      loadingState: 'success' as const,
    }
  }

  // ─── R2 loading states ─────────────────────────────────────────────────
  if (manifestQuery.isLoading || shardsQuery.isLoading) {
    return {
      parts: [],
      priceByPartId: undefined,
      priceEntries: [],
      statusMessage: '',
      mode,
      loadingState: 'loading' as const,
    }
  }

  if (manifestQuery.isError) {
    return {
      parts: [],
      priceByPartId: undefined,
      priceEntries: [],
      statusMessage: `Manifest error: ${getErrorMessage(manifestQuery.error)}`,
      mode,
      loadingState: 'error' as const,
    }
  }

  if (shardsQuery.isError) {
    return {
      parts: [],
      priceByPartId: undefined,
      priceEntries: [],
      statusMessage: `Shard error: ${getErrorMessage(shardsQuery.error)}`,
      mode,
      loadingState: 'error' as const,
    }
  }

  const manifest = manifestQuery.data
  const shards = shardsQuery.data

  if (!manifest || !shards) {
    return {
      parts: [],
      priceByPartId: undefined,
      priceEntries: [],
      statusMessage: 'Waiting for R2 data…',
      mode,
      loadingState: 'idle' as const,
    }
  }

  // Build price map from raw entries
  const priceListFile: PriceListFile = {
    schemaVersion: '1.0',
    entries: shards.entries,
  }

  return {
    parts: shards.parts,
    priceByPartId: buildPriceMap(priceListFile),
    priceEntries: shards.entries,
    statusMessage: `R2 manifest v${manifest.version} — ${shards.parts.length} parts, ${shards.entries.length} prices.`,
    mode,
    loadingState: 'success' as const,
  }
}
