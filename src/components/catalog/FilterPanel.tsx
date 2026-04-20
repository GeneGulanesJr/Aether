/**
 * Filter panel component for part filtering.
 * xAI theme: clean inputs with accent focus.
 *
 * Can be used standalone (internal state) or controlled (external state).
 */

import { useMemo } from 'react'
import { usePartFilters } from '../../hooks/usePartFilters'
import type { Part, PartFilters } from '../../lib/types'

interface FilterPanelControlledProps {
  /** Parts to extract filter options from */
  parts: Part[]
  /** External filter state */
  filters: PartFilters
  /** External filter setter */
  onFilterChange: (key: keyof PartFilters, value: string) => void
  /** External clear handler */
  onClearFilters: () => void
}

type FilterPanelProps = {
  /** Parts to extract filter options from and filter */
  parts: Part[]
} | FilterPanelControlledProps

function isControlled(props: FilterPanelProps): props is FilterPanelControlledProps {
  return 'filters' in props
}

export function FilterPanel(props: FilterPanelProps) {
  // Internal state mode
  const internalFilters = usePartFilters(props.parts)

  // Choose between internal or external state
  const filters = isControlled(props) ? props.filters : internalFilters.filters
  const setFilter = isControlled(props) ? props.onFilterChange : internalFilters.setFilter
  const clearFilters = isControlled(props) ? props.onClearFilters : internalFilters.clearFilters
  const hasActiveFilters = isControlled(props)
    ? Boolean(filters.search || filters.category || filters.socket || filters.priceMin || filters.priceMax)
    : internalFilters.hasActiveFilters
  const filteredCount = internalFilters.filteredCount
  const totalCount = internalFilters.totalCount

  // Extract filter options from parts data
  const { categories, sockets } = useMemo(() => {
    const categoryCounts = new Map<string, number>()
    const socketCounts = new Map<string, number>()

    for (const part of props.parts) {
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
  }, [props.parts])

  return (
    <section
      aria-label="Filter parts"
      className="xai-card"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-wider">
          Filters
        </p>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="font-mono text-[0.625rem] text-xai-accent uppercase tracking-wider transition-colors hover:text-xai-text"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mt-3">
        <label
          htmlFor="filter-search"
          className="mb-1 block font-mono text-[0.625rem] text-xai-text-4 uppercase"
        >
          Search
        </label>
        <input
          id="filter-search"
          type="search"
          placeholder="Search by name..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className="xai-input w-full"
        />
      </div>

      {/* Category */}
      <div className="mt-3">
        <label
          htmlFor="filter-category"
          className="mb-1 block font-mono text-[0.625rem] text-xai-text-4 uppercase"
        >
          Category
        </label>
        <select
          id="filter-category"
          value={filters.category}
          onChange={(e) => setFilter('category', e.target.value)}
          className="xai-input w-full"
        >
          <option value="">All categories</option>
          {categories.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.count})
            </option>
          ))}
        </select>
      </div>

      {/* Socket */}
      {sockets.length > 0 && (
        <div className="mt-3">
          <label
            htmlFor="filter-socket"
            className="mb-1 block font-mono text-[0.625rem] text-xai-text-4 uppercase"
          >
            Socket
          </label>
          <select
            id="filter-socket"
            value={filters.socket}
            onChange={(e) => setFilter('socket', e.target.value)}
            className="xai-input w-full"
          >
            <option value="">All sockets</option>
            {sockets.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Results count */}
      <p className="mt-3 font-mono text-[0.625rem] text-xai-text-4">
        Showing{' '}
        <span className="text-xai-accent">{filteredCount}</span> of{' '}
        <span className="text-xai-text-3">{totalCount}</span> parts
      </p>
    </section>
  )
}
