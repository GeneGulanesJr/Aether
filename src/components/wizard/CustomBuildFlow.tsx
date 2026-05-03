import { useMemo, useState } from 'react'
import type { Part, BuildSlotCategory } from '../../lib/types'
import type { Platform, SocketOption, WizardState } from '../../lib/buildWizard'
import {
  getSocketsForPlatform,
  isPartCompatible,
  PART_STEPS,
} from '../../lib/buildWizard'
import { simplifyPartName, type SortField } from '../../hooks/usePartFilters'
import { parsePrice } from '../../lib/priceUtils'

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
        {sockets.length > 0 ? sockets.map((socket) => (
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
        )) : (
          <div className="col-span-full xai-card text-center py-12">
            <p className="font-mono text-xs text-xai-text-4 uppercase tracking-wider">
              No sockets available for {platformLabel}
            </p>
            <p className="font-mono text-xs text-xai-text-3 mt-2">
              Platform data is still being added. Try selecting the other platform.
            </p>
            <button
              onClick={onBack}
              className="xai-btn xai-btn-ghost text-xs py-1.5 px-3 mt-4"
            >
              ← BACK TO PLATFORM
            </button>
          </div>
        )}
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

  // Global sort for all category sections
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState('')

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Memoize compatible parts per category — avoids O(n * 7) filter on every render
  const compatibleByCategory = useMemo(() => {
    const map = new Map<BuildSlotCategory, Part[]>()
    for (const step of PART_STEPS) {
      const category = step.category!
      let partsForCat = parts.filter((p) => p.category === category && isPartCompatible(p, category, socket))

      // Apply search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        partsForCat = partsForCat.filter((p) =>
          p.name.toLowerCase().includes(q)
        )
      }

      // Sort parts
      const dir = sortDir === 'asc' ? 1 : -1
      partsForCat.sort((a, b) => {
        switch (sortField) {
          case 'name': return dir * a.name.localeCompare(b.name)
          case 'price': {
            const pa = parsePrice(priceByPartId?.[a.id], a.id) || Infinity
            const pb = parsePrice(priceByPartId?.[b.id], b.id) || Infinity
            return dir * (pa - pb)
          }
          case 'cores': {
            const ca = parseInt(a.specs?.cores) || 0
            const cb = parseInt(b.specs?.cores) || 0
            return dir * (ca - cb)
          }
          default: return 0
        }
      })

      map.set(category, partsForCat)
    }
    return map
  }, [parts, socket, searchQuery, sortField, sortDir, priceByPartId])

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

      {/* Sort + Search controls — single row */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <input
          type="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="xai-input !py-1 !px-2 !text-[0.5625rem] w-36"
          aria-label="Search parts"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="font-mono text-[0.5rem] text-xai-accent uppercase tracking-wider hover:text-xai-text transition-colors"
          >
            Clear
          </button>
        )}
        <span className="font-mono text-[0.4375rem] text-xai-text-4 mx-1">|</span>
        {([['name', 'Name'], ['price', 'Price'], ['cores', 'Cores']] as [SortField, string][]).map(([field, label]) => {
          const isActive = sortField === field
          return (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={[
                'font-mono text-[0.5rem] uppercase tracking-wider transition-colors',
                isActive ? 'text-xai-accent' : 'text-xai-text-4 hover:text-xai-text',
              ].join(' ')}
            >
              {label}{isActive && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          )
        })}
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

              {/* Compatible parts list */}
              {compatible.length > 0 ? (
                <div className="divide-y divide-xai-border">
                  {compatible.map((part) => {
                    const isSelected = selectedPart?.id === part.id
                    // Skip metadata fields, show only technical specs
                    const techSpecs = Object.entries(part.specs)
                      .filter(([k]) => !['brand', 'sku', 'availability'].includes(k))
                      .slice(0, 2)
                    return (
                      <button
                        key={part.id}
                        onClick={() => onSelectPart(category, part)}
                        className={`flex w-full items-center gap-3 py-2.5 px-1 text-left transition-colors hover:bg-xai-hover ${isSelected ? 'bg-xai-hover' : ''}`}
                        aria-label={`Select ${simplifyPartName(part.name, part.category)}${isSelected ? ', currently selected' : ''}`}
                        aria-pressed={isSelected}
                      >
                        {isSelected && (
                          <span className="font-mono text-[0.5625rem] text-[var(--color-xai-accent)] uppercase tracking-wider shrink-0">✓</span>
                        )}
                        <p className="text-xai-text text-sm font-normal truncate flex-1">
                          {simplifyPartName(part.name, part.category)}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {techSpecs.map(([k, v]) => (
                            <span key={k} className="font-mono text-[0.5rem] text-xai-text-4 bg-xai-bg px-1.5 py-0.5">
                              {v}
                            </span>
                          ))}
                        </div>
                        {priceByPartId?.[part.id] && (
                          <span className="font-mono text-sm text-xai-text shrink-0 ml-2">
                            {priceByPartId[part.id]}
                          </span>
                        )}
                      </button>
                    )
                  })}
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
