/**
 * Part filtering hook with URL search params sync.
 * Allows shareable filter state via URL query parameters.
 */

import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Part } from '../lib/types'

export interface PartFilters {
  search: string
  category: string
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
  sockets: FilterOption[]
}

export interface UsePartFiltersResult {
  /** Current filter state (synced with URL) */
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

/**
 * Hook for managing part filters with URL sync.
 * Returns filtered parts and filter controls.
 * 
 * @example
 * ```tsx
 * const { filters, setFilter, filteredParts } = usePartFilters(parts)
 * ```
 */
export function usePartFilters(parts: Part[]): UsePartFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read filters from URL params with defaults
  const filters: PartFilters = useMemo(() => ({
    search: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    socket: searchParams.get('socket') ?? '',
    priceMin: searchParams.get('priceMin') ?? '',
    priceMax: searchParams.get('priceMax') ?? '',
  }), [searchParams])

  // Extract available options from parts
  const options: FilterOptions = useMemo(() => {
    const categoryCounts = new Map<string, number>()
    const socketCounts = new Map<string, number>()

    for (const part of parts) {
      const cat = part.category || 'Unknown'
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1)

      const socket = part.specs?.socket || ''
      if (socket) {
        socketCounts.set(socket, (socketCounts.get(socket) ?? 0) + 1)
      }
    }

    return {
      categories: Array.from(categoryCounts.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      sockets: Array.from(socketCounts.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }
  }, [parts])

  // Apply filters to parts
  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
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

      // Socket filter
      if (filters.socket && part.specs?.socket !== filters.socket) {
        return false
      }

      return true
    })
  }, [parts, filters])

  const setFilter = (key: keyof PartFilters, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) {
        // Map search to 'q' param for cleaner URLs
        const paramKey = key === 'search' ? 'q' : key
        next.set(paramKey, value)
      } else {
        const paramKey = key === 'search' ? 'q' : key
        next.delete(paramKey)
      }
      return next
    }, { replace: true })
  }

  const clearFilters = () => {
    setSearchParams({}, { replace: true })
  }

  const hasActiveFilters = Boolean(
    filters.search || filters.category || filters.socket || filters.priceMin || filters.priceMax
  )

  return {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    filteredParts,
    options,
    filteredCount: filteredParts.length,
    totalCount: parts.length,
  }
}