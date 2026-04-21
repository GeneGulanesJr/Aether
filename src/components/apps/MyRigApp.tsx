/**
 * My Rig App — Build manager window.
 * Shows slots, compatibility warnings, total price, save button.
 */

import { useCallback } from 'react'
import type { PriceEntry } from '../../lib/types'
import type { UseBuildResult } from '../../hooks/useBuild'
import { CompatibilityChecker } from '../builder/CompatibilityChecker'
import { useWindowManager } from '../../lib/windowManager'

interface MyRigAppProps {
  build: UseBuildResult
  priceEntries: PriceEntry[]
}

const CATEGORY_ICONS: Record<string, string> = {
  cpu: '🖥️',
  motherboard: '🔌',
  ram: '🧩',
  gpu: '🎮',
  storage: '💾',
  psu: '⚡',
  case: '🏠',
  cpu_cooler: '❄️',
  fans: '🌀',
  monitor: '🖥️',
}

export function MyRigApp({ build }: MyRigAppProps) {
  const { openWindow } = useWindowManager()

  const handleBrowseCategory = useCallback((category: string) => {
    openWindow('marketplace', 'Marketplace', { category })
  }, [openWindow])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Compatibility warnings */}
      <div className="shrink-0">
        <CompatibilityChecker slots={build.slots} />
      </div>

      {/* Slot list */}
      <div className="flex-1 min-h-0 overflow-auto">
        {build.slots.map((slot) => {
          const icon = CATEGORY_ICONS[slot.category] ?? '📦'
          const isFilled = slot.part !== null

          return (
            <div
              key={slot.category}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-xai-border group"
            >
              <span className="text-base shrink-0" aria-hidden="true">{icon}</span>

              {isFilled ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
                      {slot.category.replace('_', ' ')}
                    </p>
                    <p className="font-mono text-xs text-xai-text truncate">
                      {slot.part!.name}
                    </p>
                    {slot.part!.priceEntry && (
                      <p className="font-mono text-[0.5625rem] text-xai-text-3 xai-price">
                        ₱{slot.part!.priceEntry.amountPhp.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => build.removePart(slot.category)}
                    className="shrink-0 w-5 h-5 flex items-center justify-center text-xai-text-4 hover:text-xai-error transition-colors text-xs"
                    aria-label={`Remove ${slot.category}`}
                  >
                    ×
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
                      {slot.category.replace('_', ' ')}
                    </p>
                    <p className="font-mono text-[0.5625rem] text-xai-text-4 italic">
                      Empty
                    </p>
                  </div>
                  <button
                    onClick={() => handleBrowseCategory(slot.category)}
                    className="shrink-0 font-mono text-[0.5rem] text-xai-text-4 uppercase tracking-wider hover:text-xai-text transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Browse →
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary bar */}
      <div className="shrink-0 px-4 py-3 border-t border-xai-border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
            {build.selectedCount} parts
          </span>
          <span className="font-mono text-sm text-xai-text xai-price">
            ₱{build.totalPrice.toLocaleString()}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const data = JSON.stringify(build.slots.map(s => ({ category: s.category, partId: s.part?.id })), null, 2)
              navigator.clipboard.writeText(data)
            }}
            className="xai-btn xai-btn-ghost flex-1 text-[0.5625rem] py-1.5"
          >
            Export
          </button>
          <button
            onClick={build.clearBuild}
            className="xai-btn xai-btn-ghost flex-1 text-[0.5625rem] py-1.5"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
