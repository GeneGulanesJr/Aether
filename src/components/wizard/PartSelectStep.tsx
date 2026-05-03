import { useState, useMemo } from 'react'
import type { Part } from '../../lib/types'
import type { StepInfo, Platform, SocketOption } from '../../lib/buildWizard'
import { isPartCompatible } from '../../lib/buildWizard'
import { simplifyPartName, usePartFilters, type SortField } from '../../hooks/usePartFilters'
import { parsePrice } from '../../lib/priceUtils'

interface PartSelectStepProps {
  step: StepInfo
  platform: Platform
  /** When provided (guided mode), filter parts by actual socket compatibility. */
  socket?: SocketOption | null
  parts: Part[]
  selectedPart: Part | null
  priceByPartId?: Record<string, string>
  /** Budget limits from guided mode — tags over-budget parts visually. */
  budgetLimit?: { hard: number; stretch: number }
  onSelect: (part: Part) => void
  onRemove: () => void
  onNext: () => void
  onBack: () => void
  isLast: boolean
}

export function PartSelectStep({
  step,
  platform,
  socket,
  parts,
  selectedPart,
  priceByPartId,
  budgetLimit,
  onSelect,
  onRemove,
  onNext,
  onBack,
  isLast,
}: PartSelectStepProps) {
  // Filter parts using the real compatibility engine when socket is known,
  // otherwise fall back to a broad platform name filter (backward safety).
  const compatibleParts = useMemo(() => {
    if (parts.length === 0) return []

    if (socket) {
      // Guided / custom mode with resolved socket — strict filtering
      return parts.filter((p) => isPartCompatible(p, step.category!, socket))
    }

    // No socket resolved — broad platform filter as safety net
    return parts.filter((p) => {
      const name = p.name.toLowerCase()
      if (platform === 'amd') return name.includes('amd') || name.includes('ryzen') || name.includes('radeon')
      return name.includes('intel') || name.includes('core')
    })
  }, [parts, platform, socket, step.category])

  // If the strict filter eliminates everything, fall back to showing all
  // parts for the category (better empty state than a silent wall).
  const sourceParts = compatibleParts.length > 0 ? compatibleParts : parts

  const filters = usePartFilters(sourceParts, { priceByPartId, deduplicate: true })

  // Budget helper: extract numeric price from string like "₱12,345"
  const getPartPrice = (part: Part): number => {
    const raw = priceByPartId?.[part.id]
    if (!raw) return 0
    return parsePrice(raw, part.id) || 0
  }

  // Local sort state
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [removeConfirm, setRemoveConfirm] = useState(false)

  // Two-click remove: first click arms, second click confirms, auto-disarms after 3s
  const handleRemove = () => {
    if (!removeConfirm) {
      setRemoveConfirm(true)
      setTimeout(() => setRemoveConfirm(false), 3000)
      return
    }
    setRemoveConfirm(false)
    onRemove()
  }

  const sortedParts = useMemo(() => {
    const sorted = [...filters.filteredParts]
    const dir = sortDir === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
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
    return sorted
  }, [filters.filteredParts, sortField, sortDir, priceByPartId])

  // Budget-aware deprioritization: within-budget parts first, stretch next, way over last
  const finalSorted = useMemo(() => {
    if (!budgetLimit || budgetLimit.hard === Infinity) return sortedParts
    const getBucket = (p: Part): number => {
      const price = getPartPrice(p)
      if (price === 0) return 0
      if (price <= budgetLimit.hard) return 0
      if (price <= budgetLimit.stretch) return 1
      return 2
    }
    return [...sortedParts].sort((a, b) => {
      const ba = getBucket(a), bb = getBucket(b)
      if (ba !== bb) return ba - bb
      return 0
    })
  }, [sortedParts, budgetLimit])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Whether the strict filter returned 0 results (we're showing fallback)
  const isFallback = compatibleParts.length === 0 && parts.length > 0

  // Budget helper: is a part over-budget?
  const isOverBudget = (part: Part): boolean => {
    if (!budgetLimit || budgetLimit.hard === Infinity) return false
    const price = getPartPrice(part)
    return price > budgetLimit.hard && price <= budgetLimit.stretch
  }
  const isWayOverBudget = (part: Part): boolean => {
    if (!budgetLimit || budgetLimit.hard === Infinity) return false
    return getPartPrice(part) > budgetLimit.stretch
  }

  return (
    <div>
      {/* Header */}
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-8">
        ← BACK
      </button>

      <div className="flex flex-col gap-2 mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-1">
            STEP <span aria-hidden="true">{step.icon}</span> <span className="sr-only">{step.label}</span>
          </p>
          <h2 className="xai-heading text-xai-text">
            {step.label}
          </h2>
          <p className="text-xai-text-3 text-xs mt-1">{step.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="xai-tag">
            <span aria-hidden="true">{platform === 'amd' ? '🔴' : '🔵'}</span> {platform.toUpperCase()}
          </span>
          {socket && (
            <span className="xai-tag xai-tag-accent">{socket.label}</span>
          )}
        </div>
      </div>

      {/* Fallback notice — socket filter found nothing */}
      {isFallback && socket && (
        <div className="xai-card mb-4 border-xai-warn-border">
          <p className="font-mono text-xs" style={{ color: 'var(--color-xai-warn)' }}>
            No {socket.label}-compatible {step.label.toLowerCase()}s found — showing all available
          </p>
          <p className="font-mono text-[0.5625rem] text-xai-text-4 mt-1">
            Catalog data for {socket.label} parts is still being added
          </p>
        </div>
      )}

      {/* Selected part preview */}
      {selectedPart && (
        <div className="xai-card xai-card-active mb-6" role="status" aria-label={`${simplifyPartName(selectedPart.name, selectedPart.category)} selected`}>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
                Selected
              </p>
              <p className="font-mono text-sm text-xai-text mt-0.5">{simplifyPartName(selectedPart.name, selectedPart.category)}</p>
            </div>
            <div className="flex items-center gap-2">
              {priceByPartId?.[selectedPart.id] && (
                <span className="font-mono text-sm text-xai-text">
                  {priceByPartId[selectedPart.id]}
                </span>
              )}
              <button
                onClick={handleRemove}
                className={`xai-btn text-xs py-1.5 px-3 transition-colors ${removeConfirm ? 'xai-btn-ghost' : 'xai-btn-ghost'}`}
                style={removeConfirm ? { color: 'var(--color-xai-error)' } : undefined}
                aria-label={`Remove ${simplifyPartName(selectedPart.name, selectedPart.category)}`}
              >
                {removeConfirm ? 'CONFIRM REMOVE' : 'REMOVE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sort + Filter controls — single row */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <input
          type="search"
          placeholder="Search..."
          value={filters.filters.search}
          onChange={(e) => filters.setFilter('search', e.target.value)}
          className="xai-input !py-1 !px-2 !text-[0.5625rem] w-36"
          aria-label="Search parts"
        />
        {filters.options.brands.length > 1 && (
          <select
            value={filters.filters.brand}
            onChange={(e) => filters.setFilter('brand', e.target.value)}
            className="xai-input !py-1 !px-2 !text-[0.5625rem]"
          >
            <option value="">Brand</option>
            {filters.options.brands.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        {filters.options.sockets.length > 1 && (
          <select
            value={filters.filters.socket}
            onChange={(e) => filters.setFilter('socket', e.target.value)}
            className="xai-input !py-1 !px-2 !text-[0.5625rem]"
          >
            <option value="">Socket</option>
            {filters.options.sockets.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        {filters.options.coreCounts.length > 1 && (
          <select
            value={filters.filters.coreCount}
            onChange={(e) => filters.setFilter('coreCount', e.target.value)}
            className="xai-input !py-1 !px-2 !text-[0.5625rem]"
          >
            <option value="">Cores</option>
            {filters.options.coreCounts.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
              {label}{isActive && <span className="ml-0.5">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>}
            </button>
          )
        })}
        <span className="font-mono text-[0.5rem] text-xai-text-4 ml-auto">
          <span className="text-xai-accent">{filters.filteredCount}</span>/{filters.totalCount}
        </span>
        {filters.hasActiveFilters && (
          <button
            onClick={filters.clearFilters}
            className="font-mono text-[0.5rem] text-xai-accent uppercase tracking-wider hover:text-xai-text transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Parts list */}
      {finalSorted.length > 0 ? (
        <div className="divide-y divide-xai-border">
          {finalSorted.map((part) => {
            const isSelected = selectedPart?.id === part.id
            const overBudget = isOverBudget(part)
            const wayOver = isWayOverBudget(part)
            return (
              <button
                key={part.id}
                onClick={() => onSelect(part)}
                className={`flex w-full items-center gap-3 py-2.5 px-1 text-left transition-colors hover:bg-xai-hover ${isSelected ? 'bg-xai-hover' : ''}`}
                aria-label={`Select ${simplifyPartName(part.name, part.category)}${isSelected ? ', currently selected' : ''}${overBudget ? ', over budget' : ''}`}
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <span className="font-mono text-[0.5625rem] text-[var(--color-xai-accent)] uppercase tracking-wider shrink-0">
                    ✓
                  </span>
                )}
<p className={`text-sm font-normal truncate flex-1 ${wayOver ? 'text-xai-text-4' : 'text-xai-text'}`}>
          {simplifyPartName(part.name, part.category)}
        </p>
                <div className="flex items-center gap-2 shrink-0">
                  {overBudget && (
                    <span className="font-mono text-[0.5rem] uppercase tracking-wider" style={{ color: 'var(--color-xai-warn)' }}>
                      OVER BUDGET
                    </span>
                  )}
                  {wayOver && (
                    <span className="font-mono text-[0.5rem] uppercase tracking-wider text-xai-text-4">
                      WAY OVER
                    </span>
                  )}
                  {Object.entries(part.specs)
                    .filter(([k]) => !['brand', 'sku', 'availability'].includes(k))
                    .slice(0, 2)
                    .map(([k, v]) => (
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
      ) : filters.hasActiveFilters ? (
        <div className="xai-card text-center py-12">
          <p className="font-mono text-xs text-xai-text-4 uppercase tracking-wider">
            No parts match your filters
          </p>
          <button
            onClick={filters.clearFilters}
            className="font-mono text-[0.5625rem] text-xai-accent uppercase tracking-wider mt-2 hover:text-xai-text transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="xai-card text-center py-12">
          <p className="font-mono text-xs text-xai-text-4 uppercase tracking-wider">
            No compatible parts available yet
          </p>
          <p className="font-mono text-[0.5625rem] text-xai-text-3 mt-2">
            Catalog data for {socket?.label ?? 'this socket'} is still being added
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 border-t border-xai-border pt-6">
        <div />
        <div className="flex gap-3">
          {!step.required && (
            <button
              onClick={() => { onRemove(); onNext(); }}
              className="xai-btn xai-btn-ghost text-xs py-1.5 px-3"
            >
              SKIP THIS STEP
            </button>
          )}
          <button
            onClick={onNext}
            disabled={!selectedPart && step.required}
            className="xai-btn xai-btn-primary"
          >
            {isLast ? 'REVIEW BUILD →' : 'NEXT →'}
          </button>
        </div>
      </div>
    </div>
  )
}
