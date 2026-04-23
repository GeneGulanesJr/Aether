import type { NormalizedData, ParseMeta } from './normalized/types'

/** Domain types for PC Builder (PH). */

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
  normalized?: NormalizedData
  parseMeta?: ParseMeta
  imageUrl?: string | null
}

/**
 * Read a spec value from a Part's specs, checking both the human-labeled
 * (capitalized) key and the raw (lowercase/snake_case) key.
 * Handles the relabeling done by enrich-catalog.js (e.g., "TDP" vs "tdp").
 *
 * Maps canonical names to their possible key variants:
 *   socket  → ["Socket", "socket"]
 *   cores   → ["Cores", "cores", "# of Cores"]
 *   threads → ["Threads", "threads", "# of Threads"]
 *   tdp     → ["TDP", "tdp"]
 *   ram     → ["Memory", "ram", "ram_type"]
 *   vram    → ["VRAM", "vram"]
 *   type    → ["Type", "type"]
 */
const SPEC_KEY_VARIANTS: Record<string, string[]> = {
  socket:  ['Socket', 'socket'],
  cores:   ['Cores', 'cores', '# of Cores'],
  threads: ['Threads', 'threads', '# of Threads'],
  tdp:     ['TDP', 'tdp'],
  ram:     ['Memory', 'ram', 'ram_type'],
  vram:    ['VRAM', 'vram'],
  type:    ['Type', 'type'],
  chipset: ['Chipset', 'chipset'],
  brand:   ['Brand', 'brand'],
}

export function getSpec(specs: Record<string, string>, key: string): string {
  const variants = SPEC_KEY_VARIANTS[key]
  if (variants) {
    for (const v of variants) {
      if (specs[v] !== undefined && specs[v] !== '') return specs[v]
    }
  }
  // Fall back to the key itself (try both cases)
  return specs[key] ?? specs[key.toLowerCase()] ?? specs[key.charAt(0).toUpperCase() + key.slice(1)] ?? ''
}

export interface PriceEntry {
  partId: string
  amountPhp: number
  retailer?: string
  productUrl?: string
  observedAt?: string
}

/** Manifest computed from D1 — available categories and retailers. */
export interface Manifest {
  categories: string[]
  retailers: string[]
  updatedAt: string
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
  coreCount: string
}
