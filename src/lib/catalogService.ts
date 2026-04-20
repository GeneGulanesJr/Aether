import { buildPriceMap } from './priceUtils'
import { fetchCatalogShard, fetchPriceManifest, DataClientError } from './dataClient'
import { parseCatalogFixture, parsePriceFixture } from './catalogFixtures'
import type { Part } from './types'

export interface CatalogServiceResult {
  parts: Part[]
  priceByPartId: Record<string, string> | undefined
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
    statusMessage:
      'Fixture mode (set VITE_R2_BASE_URL to load manifest + shards from R2).',
    mode: 'fixture',
    loadingState: 'success' as const,
  }
}

/** Load catalog data from R2 (manifest + shards). */
export async function loadR2Catalog(): Promise<R2CatalogResult> {
  const manifest = await fetchPriceManifest()
  const cpus = await fetchCatalogShard('catalog/cpus.json')

  return {
    parts: cpus.items,
    priceByPartId: undefined, // price shard merge is a later phase
    statusMessage: `R2 manifest v${manifest.version} — price shard merge is a later phase.`,
    mode: 'r2',
    loadingState: 'success' as const,
  }
}

export { getErrorMessage }
