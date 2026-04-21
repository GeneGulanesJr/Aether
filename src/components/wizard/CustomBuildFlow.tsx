import { useMemo } from 'react'
import type { Part, BuildSlotCategory } from '../../lib/types'
import type { Platform, SocketOption, WizardState } from '../../lib/buildWizard'
import {
  getSocketsForPlatform,
  isPartCompatible,
  PART_STEPS,
} from '../../lib/buildWizard'

// ═════════════════════════════════════════════════════════════════════════════
// Platform Selection
// ═════════════════════════════════════════════════════════════════════════════

interface PlatformSelectProps {
  onSelect: (platform: Platform) => void
  onBack: () => void
}

export function CustomPlatformSelect({ onSelect, onBack }: PlatformSelectProps) {
  return (
    <div>
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-8">← BACK</button>
      <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-1">
        Custom Build · Step 1
      </p>
      <h2 className="xai-heading text-xai-text">
        Pick your platform
      </h2>
      <p className="mt-2 text-xai-text-3 text-sm leading-[1.6]">
        This determines which CPUs and motherboards you can choose from.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => onSelect('amd')}
          className="xai-card-lg text-left platform-amd"
          aria-label="Select AMD platform — Ryzen processors with AM4 and AM5 sockets"
        >
          <p className="font-mono text-lg text-amd">
            <span aria-hidden="true">🔴 </span>AMD
          </p>
          <p className="font-mono text-xs text-xai-text mt-1">Ryzen™ Processors</p>
          <p className="text-xai-text-3 text-xs mt-2 leading-snug">
            AM4 (DDR4) &amp; AM5 (DDR5) sockets.
            Zen 3 through Zen 5 architectures.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="xai-tag text-[0.5625rem]">AM4</span>
            <span className="xai-tag text-[0.5625rem]">AM5</span>
            <span className="xai-tag text-[0.5625rem]">3D V-Cache</span>
          </div>
        </button>

        <button
          onClick={() => onSelect('intel')}
          className="xai-card-lg text-left platform-intel"
          aria-label="Select Intel platform — Core processors with LGA 1700 and 1851 sockets"
        >
          <p className="font-mono text-lg text-intel">
            <span aria-hidden="true">🔵 </span>Intel
          </p>
          <p className="font-mono text-xs text-xai-text mt-1">Core™ Processors</p>
          <p className="text-xai-text-3 text-xs mt-2 leading-snug">
            LGA 1700 &amp; LGA 1851 sockets.
            12th Gen through Core Ultra 200.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="xai-tag text-[0.5625rem]">LGA 1700</span>
            <span className="xai-tag text-[0.5625rem]">LGA 1851</span>
            <span className="xai-tag text-[0.5625rem]">Quick Sync</span>
          </div>
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Socket / Generation Selection
// ═════════════════════════════════════════════════════════════════════════════

interface SocketSelectProps {
  platform: Platform
  onSelect: (socket: SocketOption) => void
  onBack: () => void
}

export function CustomSocketSelect({ platform, onSelect, onBack }: SocketSelectProps) {
  const sockets = getSocketsForPlatform(platform)
  const platformLabel = platform === 'amd' ? 'AMD' : 'Intel'

  return (
    <div>
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-8">← BACK</button>
      <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-1">
        Custom Build · Step 2
      </p>
      <h2 className="xai-heading-lg text-xai-text">
        Choose your socket
      </h2>
      <p className="mt-2 text-xai-text-3 text-sm leading-[1.6]">
        <span aria-hidden="true">{platform === 'amd' ? '🔴' : '🔵'} </span>
        {platformLabel} — select the generation and RAM type for your build.
        This locks in CPU and motherboard compatibility.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sockets.map((socket) => (
          <button
            key={socket.id}
            onClick={() => onSelect(socket)}
            className="xai-card text-left"
            aria-label={`${socket.label} — ${socket.generation}, ${socket.ramType}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-base text-xai-text">{socket.label}</p>
              <span className="xai-tag text-[0.5625rem]">{socket.ramType}</span>
            </div>
            <p className="font-mono text-xs text-xai-text-3">{socket.generation}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {socket.chipsets.map((cs) => (
                <span key={cs.id} className="xai-tag text-[0.5625rem]">
                  {cs.label}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Free-form Part Selection with Compatibility Filtering
// ═════════════════════════════════════════════════════════════════════════════

interface CustomPartsSelectProps {
  state: WizardState
  socket: SocketOption
  parts: Part[]
  priceByPartId?: Record<string, string>
  onSelectPart: (category: BuildSlotCategory, part: Part) => void
  onRemovePart: (category: BuildSlotCategory) => void
  onReview: () => void
  onBack: () => void
}

export function CustomPartsSelect({
  state,
  socket,
  parts,
  priceByPartId,
  onSelectPart,
  onRemovePart,
  onReview,
  onBack,
}: CustomPartsSelectProps) {
  const selectedCategories = new Set<BuildSlotCategory>(
    Object.keys(state.selectedParts) as BuildSlotCategory[]
  )

  // Memoize compatible parts per category — avoids O(n * 7) filter on every render
  const compatibleByCategory = useMemo(() => {
    const map = new Map<BuildSlotCategory, Part[]>()
    for (const step of PART_STEPS) {
      const category = step.category!
      map.set(
        category,
        parts.filter((p) => p.category === category && isPartCompatible(p, category, socket))
      )
    }
    return map
  }, [parts, socket])

  return (
    <div>
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-8">← BACK</button>

      <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-1">
        Custom Build · Step 3
      </p>
      <h2 className="xai-heading-lg text-xai-text">
        Select your parts
      </h2>
      <p className="mt-2 text-xai-text-3 text-sm leading-[1.6]">
        Pick components in any order. Only parts compatible with{' '}
        <span className="text-xai-text font-mono">{socket.label}</span> are shown.
      </p>

      {/* Socket info bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="xai-tag">
          <span aria-hidden="true">{state.platform === 'amd' ? '🔴' : '🔵'}</span> {state.platform?.toUpperCase()}
        </span>
        <span className="xai-tag xai-tag-accent">{socket.label}</span>
        <span className="xai-tag">{socket.ramType}</span>
        <span className="font-mono text-xs text-xai-text-4">
          {selectedCategories.size}/{PART_STEPS.length} selected
        </span>
      </div>

      {/* Category sections */}
      <div className="mt-8 space-y-8">
        {PART_STEPS.map((step) => {
          const category = step.category!
          const selectedPart = state.selectedParts[category]

          // Filter compatible parts — memoized above
          const compatible = compatibleByCategory.get(category) ?? []

          return (
            <section key={step.id}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm" aria-hidden="true">{step.icon}</span>
                  <h3 className="font-mono text-xs text-xai-text uppercase tracking-wider">
                    {step.label}
                  </h3>
                  {!step.required && (
                    <span className="xai-tag text-[0.5rem]">OPTIONAL</span>
                  )}
                </div>
                {selectedPart && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-xai-text truncate max-w-[180px] sm:max-w-none">
                      {selectedPart.name}
                    </span>
                    <button
                      onClick={() => onRemovePart(category)}
                      className="xai-btn xai-btn-ghost text-[0.625rem] py-1.5 px-3"
                      aria-label={`Remove ${selectedPart.name}`}
                    >
                      REMOVE
                    </button>
                  </div>
                )}
              </div>

              {/* Selected part card */}
              {selectedPart && (
                <div className="xai-card xai-card-active mb-2" role="status" aria-label={`${selectedPart.name} selected`}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                    <p className="font-mono text-sm text-xai-text">{selectedPart.name}</p>
                    {priceByPartId?.[selectedPart.id] && (
                      <span className="font-mono text-sm text-xai-text">
                        {priceByPartId[selectedPart.id]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4">
                    {Object.entries(selectedPart.specs).slice(0, 4).map(([k, v]) => (
                      <span key={k} className="font-mono text-[0.625rem] text-xai-text-3">
                        {k}: <span className="text-xai-text-2">{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Compatible parts grid */}
              {!selectedPart && (
                <>
                  {compatible.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {compatible.map((part) => (
                        <button
                          key={part.id}
                          onClick={() => onSelectPart(category, part)}
                          className="xai-card text-left"
                        >
                          <p className="text-xai-text text-sm font-normal">
                            {part.name}
                          </p>
                          <div className="mt-1.5 space-y-0.5">
                            {Object.entries(part.specs).slice(0, 4).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="font-mono text-[0.625rem] text-xai-text-4">{k}</span>
                                <span className="font-mono text-[0.625rem] text-xai-text-2">{v}</span>
                              </div>
                            ))}
                          </div>
                          {priceByPartId?.[part.id] && (
                            <p className="font-mono text-sm text-xai-text mt-2">
                              {priceByPartId[part.id]}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="xai-card text-center py-8">
                      <p className="font-mono text-xs text-xai-text-4 uppercase tracking-wider">
                        No compatible parts available yet
                      </p>
                      <p className="font-mono text-[0.625rem] text-xai-text-3 mt-1">
                        Catalog data for this socket is still being added
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>
          )
        })}
      </div>

      {/* Review button */}
      <div className="flex items-center justify-between mt-10 border-t border-xai-border pt-6">
        <div />
        <button
          onClick={onReview}
          className="xai-btn xai-btn-primary"
        >
          REVIEW BUILD →
        </button>
      </div>
    </div>
  )
}
