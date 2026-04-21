/**
 * Marketplace App — Browse catalog by category, view parts grid.
 */

import { useState, useMemo } from 'react'
import type { Part, PriceEntry, BuildSlotCategory } from '../../lib/types'
import type { UseBuildResult } from '../../hooks/useBuild'
import { FilterPanel } from '../catalog/FilterPanel'
import { PartCard } from '../catalog/PartCard'
import { usePartFilters } from '../../hooks/usePartFilters'

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'cpu', label: 'CPU', icon: '🖥️' },
  { id: 'motherboard', label: 'Motherboard', icon: '🔌' },
  { id: 'ram', label: 'RAM', icon: '🧩' },
  { id: 'gpu', label: 'GPU', icon: '🎮' },
  { id: 'storage', label: 'Storage', icon: '💾' },
  { id: 'psu', label: 'PSU', icon: '⚡' },
  { id: 'case', label: 'Case', icon: '🏠' },
  { id: 'cpu_cooler', label: 'Cooling', icon: '❄️' },
  { id: 'monitor', label: 'Monitor', icon: '🖥️' },
]

interface MarketplaceAppProps {
  parts: Part[]
  priceByPartId: Record<string, string>
  priceEntries: PriceEntry[]
  build: UseBuildResult
  initialCategory?: string
  initialSearch?: string
  /** Called after a part is added to the build (e.g. to close the marketplace) */
  onPartAdded?: () => void
}

export function MarketplaceApp({ parts, priceByPartId, priceEntries, build, initialCategory, initialSearch, onPartAdded }: MarketplaceAppProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? null)

  const categoryParts = useMemo(() => {
    if (!selectedCategory) return []
    return parts.filter(p => p.category === selectedCategory)
  }, [parts, selectedCategory])

  const filters = usePartFilters(categoryParts, { priceByPartId, deduplicate: true })

  const filteredParts = useMemo(() => {
    let result = filters.filteredParts
    if (initialSearch) {
      const q = initialSearch.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q))
    }
    return result
  }, [filters.filteredParts, initialSearch])

  // Open part properties window on card click

  // Category grid view
  if (!selectedCategory) {
    return (
      <div className="p-4">
        <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mb-3">
          Categories
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const count = parts.filter(p => p.category === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="xai-card text-left flex flex-col gap-1 p-3"
              >
                <span className="text-lg" aria-hidden="true">{cat.icon}</span>
                <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-xai-text">
                  {cat.label}
                </span>
                <span className="font-mono text-[0.5rem] text-xai-text-4">
                  {count} items
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Parts grid view
  const catInfo = CATEGORIES.find(c => c.id === selectedCategory)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-xai-border shrink-0">
        <button
          onClick={() => setSelectedCategory(null)}
          className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider hover:text-xai-text transition-colors"
        >
          ← Back
        </button>
        <span className="text-base" aria-hidden="true">{catInfo?.icon}</span>
        <span className="font-mono text-[0.625rem] uppercase tracking-wider text-xai-text">
          {catInfo?.label}
        </span>
        <span className="font-mono text-[0.5rem] text-xai-text-4 ml-auto">
          {filteredParts.length} items
        </span>
      </div>

      {/* Filters */}
      <div className="px-3 py-1.5 border-b border-xai-border shrink-0">
        <FilterPanel
          parts={categoryParts}
          filters={filters.filters}
          onFilterChange={filters.setFilter}
          onClearFilters={filters.clearFilters}
        />
      </div>

      {/* Parts grid */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {filteredParts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="font-mono text-xs text-xai-text-4 uppercase tracking-wider">
              No parts found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredParts.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                priceLabel={priceByPartId[part.id]}
                onAddToBuild={() => {
                  build.addPart(part, priceEntries.find(e => e.partId === part.id))
                  onPartAdded?.()
                }}
                isSelected={build.isSlotFilled(part.category as BuildSlotCategory)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
