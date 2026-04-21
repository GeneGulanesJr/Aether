/**
 * Part Properties App — Shows specs and price for a single part.
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

export function PartPropertiesApp({ part, priceByPartId, priceEntries, build }: PartPropertiesAppProps) {
  const priceLabel = priceByPartId[part.id]
  const priceEntry = priceEntries.find(e => e.partId === part.id)

  const specs = useMemo(() => {
    return Object.entries(part.specs ?? {}).slice(0, 12)
  }, [part.specs])

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

        {/* Specs */}
        {specs.length > 0 && (
          <div className="px-4 py-3 border-b border-xai-border">
            <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mb-2">
              Specifications
            </p>
            <div className="space-y-1">
              {specs.map(([key, value]) => (
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
