import { PartCard } from './PartCard'
import type { Part, PriceEntry } from '../../lib/types'

interface PartGridProps {
  parts: Part[]
  priceByPartId?: Record<string, string>
  blueprint?: boolean
  onAddToBuild?: (part: Part) => void
  selectedPartIds?: Record<string, string | null>
}

function PartGrid({ parts, priceByPartId, blueprint, onAddToBuild, selectedPartIds }: PartGridProps) {
  if (parts.length === 0) {
    return (
      <div className="xai-card flex min-h-[12rem] items-center justify-center">
        <span className="font-mono text-xs text-xai-text-4 uppercase tracking-wider">
          No parts match your filters.
        </span>
      </div>
    )
  }

  // Build set of selected IDs for quick lookup
  const selectedIds = new Set<string>(
    Object.values(selectedPartIds ?? {}).filter(Boolean) as string[]
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {parts.map((part) => (
        <PartCard
          key={part.id}
          part={part}
          priceLabel={priceByPartId?.[part.id]}
          blueprint={blueprint}
          onAddToBuild={onAddToBuild}
          isSelected={selectedIds.has(part.id)}
        />
      ))}
    </div>
  )
}

export { PartGrid }
export type { PartGridProps }
