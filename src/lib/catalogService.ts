import { buildPriceMap } from './priceUtils'
import { fetchCatalog, fetchPrices, fetchManifest, ApiClientError } from './apiClient'
import { parseCatalogFixture, parsePriceFixture } from './catalogParsers'
import type { Part, PriceEntry, PriceListFile } from './types'

export interface CatalogServiceResult {
  parts: Part[]
  priceByPartId: Record<string, string> | undefined
  priceEntries: PriceEntry[]
  statusMessage: string
  loadingState: 'idle' | 'loading' | 'error' | 'success'
}

export interface FixtureCatalogResult extends CatalogServiceResult {
  mode: 'fixture'
}

export interface ApiCatalogResult extends CatalogServiceResult {
  mode: 'api'
}

export type CatalogServiceResultUnion = FixtureCatalogResult | ApiCatalogResult

/** Extract error message from known error types. */
function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return `${error.kind} error: ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/** Load catalog data in fixture mode (offline, sample data). */
export function loadFixtureCatalog(): FixtureCatalogResult {
  const catalog = parseCatalogFixture()
  const prices = parsePriceFixture()
  return {
    parts: catalog.items,
    priceByPartId: buildPriceMap(prices),
    priceEntries: prices.entries,
    statusMessage:
      'Fixture mode (set VITE_API_URL to load data from the Worker API).',
    mode: 'fixture',
    loadingState: 'success' as const,
  }
}

/** Load catalog data from the Worker API (backed by D1). */
export async function loadApiCatalog(): Promise<ApiCatalogResult> {
  const catalog = await fetchCatalog()
  const priceResponse = await fetchPrices()
  const manifest = await fetchManifest()

  const entries = priceResponse.entries
  const priceListFile: PriceListFile = {
    schemaVersion: '1.0',
    entries,
  }

  return {
    parts: catalog.items,
    priceByPartId: buildPriceMap(priceListFile),
    priceEntries: entries,
    statusMessage: `API — ${manifest.categories.length} categories, ${catalog.items.length} parts, ${entries.length} prices.`,
    mode: 'api',
    loadingState: 'success' as const,
  }
}

export { getErrorMessage }