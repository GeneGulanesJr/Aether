/**
 * Filter panel component for part filtering.
 * xAI theme: clean inputs with accent focus.
 *
 * Can be used standalone (internal state) or controlled (external state).
 */

import { useId } from 'react'
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
    ? Boolean(filters.search || filters.category || filters.brand || filters.socket || filters.priceMin || filters.priceMax || filters.coreCount)
    : internalFilters.hasActiveFilters
  const filteredCount = internalFilters.filteredCount
  const totalCount = internalFilters.totalCount

  // Use options from the hook
  const { brands, sockets, coreCounts } = internalFilters.options

  // Stable unique IDs per instance (avoids duplicate IDs when both modes mount)
  const uid = useId()

  // Compact horizontal layout for inline (controlled) use
  if (isControlled(props)) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <input
          id={uid + '-search'}
          type="search"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className="xai-input w-36 !py-1 !px-2 !text-[0.5625rem]"
          aria-label="Search parts"
        />

        {/* Brand */}
        {brands.length > 1 && (
          <select
            id={uid + '-brand'}
            value={filters.brand}
            onChange={(e) => setFilter('brand', e.target.value)}
            className="xai-input !py-1 !px-2 !text-[0.5625rem]"
            aria-label="Filter by brand"
          >
            <option value="">Brand</option>
            {brands.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Socket */}
        {sockets.length > 1 && (
          <select
            id={uid + '-socket'}
            value={filters.socket}
            onChange={(e) => setFilter('socket', e.target.value)}
            className="xai-input !py-1 !px-2 !text-[0.5625rem]"
            aria-label="Filter by socket"
          >
            <option value="">Socket</option>
            {sockets.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Price range */}
        <div className="flex items-center gap-1">
          <span className="font-mono text-[0.5rem] text-xai-text-4">₱</span>
          <input
            type="number"
            placeholder="Min"
            value={filters.priceMin}
            onChange={(e) => setFilter('priceMin', e.target.value)}
            className="xai-input w-20 !py-1 !px-2 !text-[0.5625rem]"
            aria-label="Minimum price"
          />
          <span className="font-mono text-[0.5rem] text-xai-text-4">–</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.priceMax}
            onChange={(e) => setFilter('priceMax', e.target.value)}
            className="xai-input w-20 !py-1 !px-2 !text-[0.5625rem]"
            aria-label="Maximum price"
          />
        </div>

        {/* Core count filter */}
        {coreCounts.length > 1 && (
          <select
            id={uid + '-cores'}
            value={filters.coreCount}
            onChange={(e) => setFilter('coreCount', e.target.value)}
            className="xai-input !py-1 !px-2 !text-[0.5625rem]"
            aria-label="Filter by core count"
          >
            <option value="">Cores</option>
            {coreCounts.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Results count */}
        <span className="font-mono text-[0.5rem] text-xai-text-4 ml-auto">
          <span className="text-xai-accent">{filteredCount}</span>/{totalCount}
        </span>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="font-mono text-[0.5rem] text-xai-accent uppercase tracking-wider hover:text-xai-text transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    )
  }

  // Standalone card layout
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
          htmlFor={uid + '-search'}
          className="mb-1 block font-mono text-[0.625rem] text-xai-text-4 uppercase"
        >
          Search
        </label>
        <input
          id={uid + '-search'}
          type="search"
          placeholder="Search by name..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className="xai-input w-full"
          aria-describedby="filter-search-help"
        />
      </div>

      {/* Brand */}
      {brands.length > 1 && (
        <div className="mt-3">
          <label
            htmlFor={uid + '-brand'}
            className="mb-1 block font-mono text-[0.625rem] text-xai-text-4 uppercase"
          >
            Brand
          </label>
          <select
            id={uid + '-brand'}
            value={filters.brand}
            onChange={(e) => setFilter('brand', e.target.value)}
            className="xai-input w-full"
          >
            <option value="">All brands</option>
            {brands.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Socket */}
      {sockets.length > 0 && (
        <div className="mt-3">
          <label
            htmlFor={uid + '-socket'}
            className="mb-1 block font-mono text-[0.625rem] text-xai-text-4 uppercase"
          >
            Socket
          </label>
          <select
            id={uid + '-socket'}
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

      {/* Price range */}
      <div className="mt-3">
        <span className="mb-1 block font-mono text-[0.625rem] text-xai-text-4 uppercase">
          Price Range (₱)
        </span>
        <div className="flex items-center gap-2">
          <input
            id="filter-price-min"
            type="number"
            placeholder="Min"
            value={filters.priceMin}
            onChange={(e) => setFilter('priceMin', e.target.value)}
            className="xai-input w-full"
            aria-label="Minimum price"
          />
          <span className="font-mono text-[0.625rem] text-xai-text-4">–</span>
          <input
            id="filter-price-max"
            type="number"
            placeholder="Max"
            value={filters.priceMax}
            onChange={(e) => setFilter('priceMax', e.target.value)}
            className="xai-input w-full"
            aria-label="Maximum price"
          />
        </div>
      </div>

      {/* Core count */}
      {coreCounts.length > 1 && (
        <div className="mt-3">
          <label
            htmlFor={uid + '-cores'}
            className="mb-1 block font-mono text-[0.625rem] text-xai-text-4 uppercase"
          >
            Core Count
          </label>
          <select
            id={uid + '-cores'}
            value={filters.coreCount}
            onChange={(e) => setFilter('coreCount', e.target.value)}
            className="xai-input w-full"
          >
            <option value="">All core counts</option>
            {coreCounts.map((opt) => (
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
