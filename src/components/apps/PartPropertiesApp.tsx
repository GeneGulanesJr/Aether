/**
 * Part Properties App — Shows specs and price for a single part.
 * For CPU parts, specs are grouped by category (Core, Clocks, Cache, etc.)
 * for a complete picture from the CSV database.
 */

import { useMemo } from 'react'
import type { Part, PriceEntry } from '../../lib/types'
import type { UseBuildResult } from '../../hooks/useBuild'

interface PartPropertiesAppProps {
  part: Part
  priceByPartId: Record<string, string>
  priceEntries: PriceEntry[]
  build: UseBuildResult
}

/**
 * Spec group definitions for CPU parts.
 * Each group has a title and keys to display within it.
 * Keys are the labeled spec names from enrich-catalog.js.
 */
const CPU_SPEC_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: '⏱ Cores & Threads',
    keys: ['Cores', 'P-Cores', 'E-Cores', 'Threads'],
  },
  {
    title: '🔄 Clocks',
    keys: ['Base Clock', 'Boost Clock', 'P-Core Base', 'E-Core Base'],
  },
  {
    title: '💾 Cache',
    keys: ['Cache', 'L2 Cache', 'L3 Cache'],
  },
  {
    title: '⚡ Power & Thermal',
    keys: ['TDP', 'Configurable TDP', 'Max Temp'],
  },
  {
    title: '🔌 Platform',
    keys: ['Socket', 'Memory Type', 'Memory Channels', 'Max Memory', 'PCIe Version', 'PCIe Lanes'],
  },
  {
    title: '🖥️ Graphics',
    keys: ['Integrated GPU', 'GPU Cores', 'GPU Max Freq'],
  },
  {
    title: '📋 Info',
    keys: ['Brand', 'Unlocked', 'Generation', 'Year', 'Series'],
  },
]

/** Keys that are informational and should be shown at the bottom, not in groups */
// const INFO_KEYS = new Set(['Brand', 'SKU', 'Availability', 'Unlocked', 'Generation', 'Year', 'Series'])

/** All keys that are part of CPU spec groups (used to detect remaining ungrouped) */
// const ALL_GROUPED_CPU_KEYS = new Set(CPU_SPEC_GROUPS.flatMap(g => g.keys))

export function PartPropertiesApp({ part, priceByPartId, priceEntries, build }: PartPropertiesAppProps) {
  const priceLabel = priceByPartId[part.id]
  const priceEntry = priceEntries.find(e => e.partId === part.id)

  const isCpu = part.category === 'cpu'

  /** Grouped specs for CPU parts */
  const cpuGroupedSpecs = useMemo(() => {
    if (!isCpu) return null

    const specsMap = part.specs ?? {}
    const groups: { title: string; items: [string, string][] }[] = []
    const shownKeys = new Set<string>()

    // Build groups with only keys that exist in this part's specs
    for (const groupDef of CPU_SPEC_GROUPS) {
      const items: [string, string][] = []
      for (const key of groupDef.keys) {
        const value = specsMap[key]
        if (value !== undefined && value !== '' && value !== 'N/A') {
          items.push([key, value])
          shownKeys.add(key)
        }
      }
      if (items.length > 0) {
        groups.push({ title: groupDef.title, items })
      }
    }

    // Collect remaining specs not in any group (e.g., SKU, Availability, custom fields)
    const remaining: [string, string][] = []
    for (const [key, value] of Object.entries(specsMap)) {
      if (!shownKeys.has(key) && value !== undefined && value !== '' && value !== 'N/A') {
        remaining.push([key, value])
      }
    }
    if (remaining.length > 0) {
      groups.push({ title: '📋 Details', items: remaining })
    }

    return groups
  }, [isCpu, part.specs])

  /** Flat spec list for non-CPU parts */
  const flatSpecs = useMemo(() => {
    if (isCpu) return []
    return Object.entries(part.specs ?? {}).filter(([_, v]) => v !== '' && v !== 'N/A')
  }, [isCpu, part.specs])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-xai-border shrink-0">
        <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-wider mb-1">
          {part.category}
        </p>
        <h3 className="font-mono text-sm text-xai-text leading-snug">
          {part.name}
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {/* Image */}
        {part.imageUrl && (
          <div className="px-4 py-3 border-b border-xai-border">
            <img
              src={part.imageUrl}
              alt={part.name}
              className="w-full h-32 object-contain bg-xai-bg-surface"
              loading="lazy"
            />
          </div>
        )}

        {/* CPU: Grouped specs */}
        {isCpu && cpuGroupedSpecs && cpuGroupedSpecs.length > 0 && (
          <div className="divide-y divide-xai-border">
            {cpuGroupedSpecs.map((group) => (
              <div key={group.title} className="px-4 py-3">
                <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mb-2">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span className="font-mono text-[0.5625rem] text-xai-text-4 truncate">
                        {key}
                      </span>
                      <span className="font-mono text-[0.5625rem] text-xai-text-3 text-right truncate">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Non-CPU: Flat spec list */}
        {!isCpu && flatSpecs.length > 0 && (
          <div className="px-4 py-3 border-b border-xai-border">
            <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mb-2">
              Specifications
            </p>
            <div className="space-y-1">
              {flatSpecs.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2">
                  <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider truncate">
                    {key}
                  </span>
                  <span className="font-mono text-[0.5625rem] text-xai-text-3 text-right truncate">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price */}
        <div className="px-4 py-3 border-b border-xai-border">
          <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mb-2">
            Price
          </p>
          {priceLabel ? (
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg text-xai-text xai-price">
                {priceLabel}
              </span>
              {priceEntry?.retailer && (
                <span className="font-mono text-[0.5rem] text-xai-text-4 uppercase tracking-wider">
                  @ {priceEntry.retailer}
                </span>
              )}
            </div>
          ) : (
            <span className="font-mono text-xs text-xai-text-4">No price data</span>
          )}
        </div>
      </div>

      {/* Add to build */}
      <div className="px-4 py-3 border-t border-xai-border shrink-0">
        <button
          onClick={() => build.addPart(part, priceEntry)}
          className="xai-btn xai-btn-primary w-full text-[0.625rem]"
        >
          Add to Build
        </button>
      </div>
    </div>
  )
}