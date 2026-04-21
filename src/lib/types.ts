/** Domain types for PC Builder (PH). Scaffold only — expand in a later phase. */

export type BuildSlotCategory =
  | 'cpu'
  | 'motherboard'
  | 'ram'
  | 'gpu'
  | 'storage'
  | 'psu'
  | 'case'
  | 'cpu_cooler'
  | 'fans'
  | 'monitor'

export interface Part {
  id: string
  name: string
  category: string
  specs: Record<string, string>
  imageUrl?: string | null
}

export interface PriceEntry {
  partId: string
  amountPhp: number
  retailer?: string
  productUrl?: string
  observedAt?: string
}

export interface PriceShardRef {
  /** R2 object key relative to bucket root, e.g. `catalog/cpus.json` */
  key: string
  sha256?: string
  updatedAt?: string
}

export interface PriceManifest {
  version: string
  updatedAt: string
  shards: PriceShardRef[]
}

/** Shard file listing PHP offers for parts (separate from manifest). */
export interface PriceListFile {
  schemaVersion: string
  entries: PriceEntry[]
}

/** One row in a catalog shard file */
export interface CatalogShardFile {
  schemaVersion: string
  category: string
  items: Part[]
}

export interface BuildSlot {
  category: BuildSlotCategory
  part: Part | null
}

/**
 * Loading state enum for catalog data fetching.
 * Used to drive UI states (skeleton, error, content).
 */
export type CatalogLoadingState = 'idle' | 'loading' | 'error' | 'success'

/**
 * User-friendly filter state for part browsing.
 * @see usePartFilters
 */
export interface PartFilters {
  search: string
  category: string
  brand: string
  socket: string
  priceMin: string
  priceMax: string
}
