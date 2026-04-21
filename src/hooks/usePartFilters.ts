/**
 * Part filtering hook with local state.
 * Provides filter controls and filtered part lists.
 */

import { useState, useMemo, useCallback } from 'react'
import type { Part } from '../lib/types'

/** Extract brand from part name/specs based on category */
export function extractBrand(part: Part): string {
  const name = part.name.toLowerCase()
  const cat = part.category.toLowerCase()

  if (cat === 'cpu' || cat === 'motherboard') {
    if (name.includes('intel') || /\bi[3579]\b/.test(name) || name.includes('lga')) return 'Intel'
    if (name.includes('amd') || name.includes('ryzen') || name.includes('athlon') || name.includes('am4') || name.includes('am5')) return 'AMD'
  }
  if (cat === 'gpu') {
    if (name.includes('nvidia') || name.includes('geforce') || name.includes('rtx') || name.includes('gtx')) return 'NVIDIA'
    if (name.includes('amd') || name.includes('radeon') || name.includes('rx ')) return 'AMD'
    if (name.includes('intel') || name.includes('arc ')) return 'Intel'
  }
  if (cat === 'ram') {
    if (name.includes('corsair')) return 'Corsair'
    if (name.includes('g.skill') || name.includes('gskill')) return 'G.Skill'
    if (name.includes('kingston')) return 'Kingston'
    if (name.includes('crucial')) return 'Crucial'
    if (name.includes('teamgroup') || name.includes('team group') || name.includes('t-force')) return 'TeamGroup'
    if (name.includes('adata') || name.includes('xpg')) return 'Adata/XPG'
  }
  if (cat === 'storage') {
    if (name.includes('samsung')) return 'Samsung'
    if (name.includes('western digital') || name.includes('wd ')) return 'WD'
    if (name.includes('kingston')) return 'Kingston'
    if (name.includes('crucial')) return 'Crucial'
    if (name.includes('seagate')) return 'Seagate'
  }
  if (cat === 'psu') {
    if (name.includes('corsair')) return 'Corsair'
    if (name.includes('seasonic')) return 'Seasonic'
    if (name.includes('evga')) return 'EVGA'
    if (name.includes('coolermaster') || name.includes('cooler master')) return 'Cooler Master'
    if (name.includes('thermaltake')) return 'Thermaltake'
  }
  if (cat === 'case') {
    if (name.includes('nzxt')) return 'NZXT'
    if (name.includes('corsair')) return 'Corsair'
    if (name.includes('lian li') || name.includes('lian-li')) return 'Lian Li'
    if (name.includes('coolermaster') || name.includes('cooler master')) return 'Cooler Master'
    if (name.includes('phanteks')) return 'Phanteks'
    if (name.includes('fractal')) return 'Fractal'
  }
  if (cat === 'cpu_cooler') {
    if (name.includes('noctua')) return 'Noctua'
    if (name.includes('corsair')) return 'Corsair'
    if (name.includes('coolermaster') || name.includes('cooler master')) return 'Cooler Master'
    if (name.includes('nzxt')) return 'NZXT'
    if (name.includes('deepcool')) return 'Deepcool'
    if (name.includes('arctic')) return 'Arctic'
    if (name.includes('be quiet') || name.includes('bequiet')) return 'be quiet!'
  }

  return 'Other'
}

/** Deduplicate parts by normalized name, keeping lowest-priced */
export function deduplicateByName(
  parts: Part[],
  priceByPartId: Record<string, string>
): Part[] {
  const seen = new Map<string, Part>()
  const priceToNum = (s: string | undefined): number => {
    if (!s) return Infinity
    return parseFloat(s.replace(/[₱,\s]/g, '')) || Infinity
  }

  for (const part of parts) {
    const key = part.name.toLowerCase().replace(/\s+/g, ' ').trim()
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, part)
    } else {
      // Keep the one with lower price
      const existingPrice = priceToNum(priceByPartId[existing.id])
      const newPrice = priceToNum(priceByPartId[part.id])
      if (newPrice < existingPrice) {
        seen.set(key, part)
      }
    }
  }
  return Array.from(seen.values())
}

export interface PartFilters {
  search: string
  category: string
  brand: string
  socket: string
  priceMin: string
  priceMax: string
}

export interface FilterOption {
  value: string
  label: string
  count: number
}

export interface FilterOptions {
  categories: FilterOption[]
  brands: FilterOption[]
  sockets: FilterOption[]
}

export interface UsePartFiltersResult {
  /** Current filter state */
  filters: PartFilters
  /** Update a single filter value */
  setFilter: (key: keyof PartFilters, value: string) => void
  /** Clear all filters */
  clearFilters: () => void
  /** Whether any filters are active */
  hasActiveFilters: boolean
  /** Filtered parts derived from source parts + filters */
  filteredParts: Part[]
  /** Available filter options derived from parts */
  options: FilterOptions
  /** Filtered parts count out of total */
  filteredCount: number
  totalCount: number
}

/** Options for the hook */
export interface UsePartFiltersOptions {
  /** Price map for filtering and deduplication */
  priceByPartId?: Record<string, string>
  /** Whether to deduplicate parts by name (default false) */
  deduplicate?: boolean
}

const EMPTY_FILTERS: PartFilters = {
  search: '',
  category: '',
  brand: '',
  socket: '',
  priceMin: '',
  priceMax: '',
}

/**
 * Hook for managing part filters with local state.
 * Returns filtered parts and filter controls.
 *
 * @example
 * ```tsx
 * const { filters, setFilter, filteredParts } = usePartFilters(parts)
 * ```
 */
export function usePartFilters(parts: Part[], opts?: UsePartFiltersOptions): UsePartFiltersResult {
  const priceByPartId = opts?.priceByPartId
  const shouldDedup = opts?.deduplicate ?? false

  // Deduplicate source parts if requested
  const sourceParts = useMemo(() => {
    if (!shouldDedup || !priceByPartId) return parts
    return deduplicateByName(parts, priceByPartId)
  }, [parts, shouldDedup, priceByPartId])

  const [filters, setFilters] = useState<PartFilters>({ ...EMPTY_FILTERS })

  // Helper: parse formatted price to number
  const priceToNum = useCallback((s: string | undefined): number => {
    if (!s) return NaN
    return parseFloat(s.replace(/[₱,\s]/g, '')) || NaN
  }, [])

  // Extract available options from source parts
  const options: FilterOptions = useMemo(() => {
    const categoryCounts = new Map<string, number>()
    const brandCounts = new Map<string, number>()
    const socketCounts = new Map<string, number>()

    for (const part of sourceParts) {
      const cat = part.category || 'Unknown'
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1)

      const brand = extractBrand(part)
      brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1)

      const socket = part.specs?.socket || ''
      if (socket) {
        socketCounts.set(socket, (socketCounts.get(socket) ?? 0) + 1)
      }
    }

    return {
      categories: Array.from(categoryCounts.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      brands: Array.from(brandCounts.entries())
        .filter(([v]) => v !== 'Other')
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      sockets: Array.from(socketCounts.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }
  }, [sourceParts])

  // Apply filters to source parts
  const filteredParts = useMemo(() => {
    const minPrice = filters.priceMin ? parseFloat(filters.priceMin) : NaN
    const maxPrice = filters.priceMax ? parseFloat(filters.priceMax) : NaN

    return sourceParts.filter((part) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!part.name.toLowerCase().includes(searchLower) &&
            !part.category.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Category filter
      if (filters.category && part.category !== filters.category) {
        return false
      }

      // Brand filter
      if (filters.brand && extractBrand(part) !== filters.brand) {
        return false
      }

      // Socket filter
      if (filters.socket && part.specs?.socket !== filters.socket) {
        return false
      }

      // Price range filter
      if (priceByPartId && (!isNaN(minPrice) || !isNaN(maxPrice))) {
        const price = priceToNum(priceByPartId[part.id])
        if (!isNaN(price)) {
          if (!isNaN(minPrice) && price < minPrice) return false
          if (!isNaN(maxPrice) && price > maxPrice) return false
        }
      }

      return true
    })
  }, [sourceParts, filters, priceByPartId, priceToNum])

  const setFilter = useCallback((key: keyof PartFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS })
  }, [])

  const hasActiveFilters = Boolean(
    filters.search || filters.category || filters.brand || filters.socket || filters.priceMin || filters.priceMax
  )

  return {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    filteredParts,
    options,
    filteredCount: filteredParts.length,
    totalCount: sourceParts.length,
  }
}