import { useQuery } from '@tanstack/react-query'
import { fetchCatalogShard, fetchPriceManifest } from '../lib/dataClient'
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

/**
 * Fetches catalog data and prices.
 * Returns parts, formatted prices, and raw price entries for calculations.
 */
export function useCatalogData(): CatalogData {
  const mode = getDataSourceMode()

  const manifestQuery = useQuery({
    queryKey: ['r2', 'manifest'],
    queryFn: fetchPriceManifest,
    enabled: mode === 'r2',
  })

  const cpusQuery = useQuery({
    queryKey: ['r2', 'catalog', 'cpus'],
    queryFn: () => fetchCatalogShard('catalog/cpus.json'),
    enabled: mode === 'r2' && manifestQuery.isSuccess,
  })

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

  if (manifestQuery.isLoading || cpusQuery.isLoading) {
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

  if (cpusQuery.isError) {
    return {
      parts: [],
      priceByPartId: undefined,
      priceEntries: [],
      statusMessage: `Catalog error: ${getErrorMessage(cpusQuery.error)}`,
      mode,
      loadingState: 'error' as const,
    }
  }

  const manifest = manifestQuery.data
  const cpus = cpusQuery.data

  if (!manifest || !cpus) {
    return {
      parts: [],
      priceByPartId: undefined,
      priceEntries: [],
      statusMessage: 'Waiting for R2 data…',
      mode,
      loadingState: 'idle' as const,
    }
  }

  return {
    parts: cpus.items,
    priceByPartId: undefined, // price shard merge is a later phase
    priceEntries: [], // merge from shards later
    statusMessage: `R2 manifest v${manifest.version} — price shard merge is a later phase.`,
    mode,
    loadingState: 'success' as const,
  }
}