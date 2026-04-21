import { buildPriceMap } from './priceUtils'
import { fetchCatalogShard, fetchPriceManifest, fetchPriceShard, DataClientError } from './dataClient'
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

export interface R2CatalogResult extends CatalogServiceResult {
  mode: 'r2'
}

export type CatalogServiceResultUnion = FixtureCatalogResult | R2CatalogResult

/** Extract error message from known error types. */
function getErrorMessage(error: unknown): string {
  if (error instanceof DataClientError) {
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
      'Fixture mode (set VITE_R2_BASE_URL to load manifest + shards from R2).',
    mode: 'fixture',
    loadingState: 'success' as const,
  }
}

function isCatalogShard(key: string): boolean {
  return key.startsWith('catalog/') && key.endsWith('.json')
}

function isPriceShard(key: string): boolean {
  return key.startsWith('prices/') && key.endsWith('.json') && !key.endsWith('manifest.json')
}

/** Load catalog data from R2 (manifest + all shards). */
export async function loadR2Catalog(): Promise<R2CatalogResult> {
  const manifest = await fetchPriceManifest()

  const catalogKeys = manifest.shards.map((s) => s.key).filter(isCatalogShard)
  const priceKeys = manifest.shards.map((s) => s.key).filter(isPriceShard)

  const [catalogResults, priceResults] = await Promise.all([
    Promise.all(catalogKeys.map((key) => fetchCatalogShard(key))),
    Promise.all(priceKeys.map((key) => fetchPriceShard(key))),
  ])

  const parts = catalogResults.flatMap((shard) => shard.items)
  const entries = priceResults.flatMap((shard) => shard.entries)

  const priceListFile: PriceListFile = {
    schemaVersion: '1.0',
    entries,
  }

  return {
    parts,
    priceByPartId: buildPriceMap(priceListFile),
    priceEntries: entries,
    statusMessage: `R2 manifest v${manifest.version} — ${parts.length} parts, ${entries.length} prices.`,
    mode: 'r2',
    loadingState: 'success' as const,
  }
}

export { getErrorMessage }
