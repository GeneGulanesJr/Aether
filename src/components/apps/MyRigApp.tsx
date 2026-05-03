/**
 * My Rig App — Build manager window.
 * Shows slots, compatibility warnings, total price, save button.
 * For socket-dependent categories (CPU, Motherboard, RAM), clicking "Browse"
 * transitions inline to: Vendor → Platform → Parts grid, all within this window.
 */

import { useState, useMemo, useCallback } from 'react'
import type { Part, PriceEntry, BuildSlotCategory } from '../../lib/types'
import { getPartSocket, getSpec } from '../../lib/types'
import type { UseBuildResult } from '../../hooks/useBuild'
import type { Platform } from '../../lib/buildWizard'
import { SOCKET_OPTIONS, type SocketOption } from '../../lib/buildWizard'
import { CompatibilityChecker, getWattageIssues } from '../builder/CompatibilityChecker'
import { estimateWattage, type WattageEstimate } from '../../lib/wattageEstimator'
import { usePartFilters, simplifyPartName, type SortField } from '../../hooks/usePartFilters'
import { useWindowManager } from '../../lib/useWindowManager'
import { formatPhp } from '../../lib/format'

// ── Constants ──

/** Categories that need vendor→socket→parts flow instead of Marketplace */
const SOCKET_DEPENDENT_CATEGORIES = new Set<string>(['cpu', 'motherboard', 'ram'])

const VENDORS: { id: Platform; label: string; icon: string; description: string }[] = [
  { id: 'amd',   label: 'AMD',   icon: '🔴', description: 'Ryzen — AM4, AM5' },
  { id: 'intel', label: 'Intel', icon: '🔵', description: 'Core — LGA 1700, LGA 1851' },
]

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

// ── Inline selector state ──

type InlineView =
  | { kind: 'slots' }
  | { kind: 'vendor'; category: BuildSlotCategory }
  | { kind: 'socket'; category: BuildSlotCategory; vendor: Platform }
  | { kind: 'parts'; category: BuildSlotCategory; vendor: Platform; socket: SocketOption }

// ── Props ──

interface MyRigAppProps {
  build: UseBuildResult
  parts: Part[]
  priceByPartId: Record<string, string>
  priceEntries: PriceEntry[]
  /** Called when user clicks a part to preview it (signals marketplace companion) */
  onPreviewPart?: (partId: string | null) => void
}

// ── Component ──

export function MyRigApp({ build, parts, priceByPartId, priceEntries, onPreviewPart }: MyRigAppProps) {
  const { openWindow } = useWindowManager()
  const [view, setView] = useState<InlineView>({ kind: 'slots' })

  // ── Navigate to browse flow ──

  const handleBrowseCategory = useCallback((category: string) => {
    if (SOCKET_DEPENDENT_CATEGORIES.has(category)) {
      setView({ kind: 'vendor', category: category as BuildSlotCategory })
    } else {
      openWindow('marketplace', 'Marketplace', { category })
    }
  }, [openWindow])

  // ── Back to slot list ──

  const handleBackToSlots = useCallback(() => {
    setView({ kind: 'slots' })
  }, [])

  // ── Part added — return to slot list ──

  const handlePartAdded = useCallback(() => {
    setView({ kind: 'slots' })
  }, [])

  // ── Render ──

  const wattage = useMemo(() => estimateWattage(build.slots), [build.slots])

  if (view.kind === 'slots') {
    return <SlotListView build={build} onBrowse={handleBrowseCategory} wattage={wattage} />
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Breadcrumb header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-xai-border shrink-0">
        <button
          onClick={handleBackToSlots}
          className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider hover:text-xai-text transition-colors"
        >
          ← My Rig
        </button>
        <span className="font-mono text-[0.5rem] text-xai-text-4">|</span>
        <Breadcrumb view={view} />
      </div>

      {/* Inline content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {view.kind === 'vendor' && (
          <VendorStep
            category={view.category}
            parts={parts}
            onSelect={(vendor) =>
              setView({ kind: 'socket', category: view.category, vendor })
            }
          />
        )}

        {view.kind === 'socket' && (
          <SocketStep
            category={view.category}
            vendor={view.vendor}
            parts={parts}
            onBack={() =>
              setView({ kind: 'vendor', category: view.category })
            }
            onSelect={(socket) =>
              setView({
                kind: 'parts',
                category: view.category,
                vendor: view.vendor,
                socket,
              })
            }
          />
        )}

        {view.kind === 'parts' && (
          <PartsStep
            category={view.category}
            vendor={view.vendor}
            socket={view.socket}
            parts={parts}
            priceByPartId={priceByPartId}
            priceEntries={priceEntries}
            build={build}
            onBack={() =>
              setView({ kind: 'socket', category: view.category, vendor: view.vendor })
            }
            onPartAdded={handlePartAdded}
            onPreviewPart={onPreviewPart}
          />
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

// ── Breadcrumb ──

function Breadcrumb({ view }: { view: Exclude<InlineView, { kind: 'slots' }> }) {
  const categoryLabel = view.category.replace('_', ' ').toUpperCase()
  const steps = [
    { label: 'VENDOR', active: view.kind === 'vendor' },
    { label: 'PLATFORM', active: view.kind === 'socket' },
    { label: categoryLabel, active: view.kind === 'parts' },
  ]

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          {i > 0 && (
            <span className="font-mono text-[0.5rem] text-xai-text-4">›</span>
          )}
          <span
            className={`font-mono text-[0.5rem] uppercase tracking-wider ${
              s.active
                ? 'text-xai-accent'
                : i < steps.findIndex((x) => x.active)
                  ? 'text-xai-text-2'
                  : 'text-xai-text-4'
            }`}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Slot List (default view) ──

function SlotListView({
  build,
  onBrowse,
  wattage,
}: {
  build: UseBuildResult
  onBrowse: (category: string) => void
  wattage: WattageEstimate
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Compatibility warnings */}
      <div className="shrink-0">
        <CompatibilityChecker slots={build.slots} />
        {/* Wattage issues */}
        {wattage.totalWatts > 0 && getWattageIssues(wattage).map((issue, i) => (
          <div
            key={`wattage-${i}`}
            className={`xai-card mt-2 border ${issue.severity === 'error' ? 'border-xai-error-border' : 'border-xai-warn-border'}`}
          >
            <div className="flex items-start gap-2">
              <svg
                viewBox="0 0 24 24"
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                  issue.severity === 'error' ? 'text-xai-error' : 'text-xai-warn'
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className={`font-mono text-xs ${
                issue.severity === 'error' ? 'text-xai-error' : 'text-xai-warn'
              }`}>
                {issue.message}
              </p>
            </div>
          </div>
        ))}
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
              <span className="text-base shrink-0" aria-hidden="true">
                {icon}
              </span>

              {isFilled ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
                      {slot.category.replace('_', ' ')}
                    </p>
                    <p className="font-mono text-xs text-xai-text truncate">
                      {simplifyPartName(slot.part!.name, slot.part!.category)}
                    </p>
                    {/* Show key spec badges inline for filled slots */}
                    {slot.category === 'cpu' && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {[getSpec(slot.part!.specs, 'cores'), getSpec(slot.part!.specs, 'threads'), getSpec(slot.part!.specs, 'tdp')]
                          .filter(Boolean)
                          .map((v, i) => (
                            <span key={i} className="font-mono text-[0.4375rem] text-xai-text-4 bg-xai-bg px-1 py-px">
                              {i === 0 ? `${v}C` : i === 1 ? `${v}T` : v}
                            </span>
                          ))
                        }
                        {slot.part && getPartSocket(slot.part) && (
                          <span className="font-mono text-[0.4375rem] text-xai-text-4 bg-xai-bg px-1 py-px">
                            {slot.part ? getPartSocket(slot.part) : ''}
                          </span>
                        )}
                      </div>
                    )}
                    {slot.category === 'gpu' && getSpec(slot.part!.specs, 'vram') && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[0.4375rem] text-xai-text-4 bg-xai-bg px-1 py-px">
                          {getSpec(slot.part!.specs, 'vram')}GB
                        </span>
                      </div>
                    )}
                    {slot.category === 'motherboard' && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {slot.part && getPartSocket(slot.part) && (
                          <span className="font-mono text-[0.4375rem] text-xai-text-4 bg-xai-bg px-1 py-px">
                            {slot.part ? getPartSocket(slot.part) : ''}
                          </span>
                        )}
                        {getSpec(slot.part!.specs, 'ram') && (
                          <span className="font-mono text-[0.4375rem] text-xai-text-4 bg-xai-bg px-1 py-px">
                            {getSpec(slot.part!.specs, 'ram')}
                          </span>
                        )}
                      </div>
                    )}
                    {slot.part!.priceEntry && (
                      <p className="font-mono text-[0.5625rem] text-xai-text-3 xai-price">
                        {formatPhp(slot.part!.priceEntry.amountPhp)}
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
                    onClick={() => onBrowse(slot.category)}
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
        {/* Wattage estimator */}
        {wattage.totalWatts > 0 && (
          <div className="mb-3 pb-3 border-b border-xai-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
                ⚡ Power Draw
              </span>
              <span className={`font-mono text-xs font-bold ${
                wattage.status === 'danger' ? 'text-xai-error' :
                wattage.status === 'warning' ? 'text-xai-warn' :
                wattage.status === 'ok' ? 'text-xai-success' :
                'text-xai-text'
              }`}>
                {wattage.totalWatts}W
              </span>
            </div>

            {/* Power bar */}
            <div className="relative h-2 bg-xai-border overflow-hidden mb-1.5">
              <div
                className={`h-full transition-all ${
                  wattage.status === 'danger' ? 'bg-xai-error' :
                  wattage.status === 'warning' ? 'bg-xai-warn' :
                  'bg-xai-success'
                }`}
                style={{
                  width: wattage.selectedPsuWatts
                    ? `${Math.min(100, (wattage.totalWatts / wattage.selectedPsuWatts) * 100)}%`
                    : `${Math.min(100, (wattage.totalWatts / wattage.recommendedWatts) * 100)}%`,
                }}
              />
              {/* PSU capacity marker */}
              {wattage.selectedPsuWatts && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-xai-text"
                  style={{ left: '100%' }}
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.5rem] text-xai-text-4">
                Recommended: {wattage.recommendedWatts}W
              </span>
              {wattage.selectedPsuWatts !== null && (
                <span className={`font-mono text-[0.5rem] ${
                  wattage.status === 'ok' ? 'text-xai-success' :
                  wattage.status === 'danger' ? 'text-xai-error' :
                  'text-xai-warn'
                }`}>
                  PSU: {wattage.selectedPsuWatts}W {
                    wattage.status === 'ok' ? '✓' :
                    wattage.status === 'danger' ? '✗' :
                    '⚠'
                  }
                </span>
              )}
            </div>

            {/* Breakdown */}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
              {wattage.breakdown.map((comp) => (
                <span
                  key={comp.category}
                  className="font-mono text-[0.4375rem] text-xai-text-4"
                >
                  {CATEGORY_ICONS[comp.category] ?? '📦'} {comp.watts}W
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
            {build.selectedCount} parts
          </span>
          <span className="font-mono text-sm text-xai-text xai-price">
            {formatPhp(build.totalPrice)}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const data = JSON.stringify(
                build.slots.map((s) => ({
                  category: s.category,
                  partId: s.part?.id,
                })),
                null,
                2
              )
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

// ── Step 1: Vendor ──

function VendorStep({
  category,
  parts,
  onSelect,
}: {
  category: BuildSlotCategory
  parts: Part[]
  onSelect: (vendor: Platform) => void
}) {
  const categoryLabel = category.replace('_', ' ').toUpperCase()

  return (
    <div className="p-4">
      <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mb-1">
        Select {categoryLabel}
      </p>
      <p className="font-mono text-[0.5rem] text-xai-text-3 mb-4">
        Choose a CPU vendor to see compatible {categoryLabel.toLowerCase()}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {VENDORS.map((v) => {
          const socketsForVendor = SOCKET_OPTIONS.filter(
            (s) => s.platform === v.id
          )
          const compatibleCount = parts.filter((p) => {
            if (p.category !== category) return false
            if (category === 'cpu') {
              const spec = getPartSocket(p).toLowerCase().replace(/\s+/g, '')
              return socketsForVendor.some(
                (s) => spec === s.id.replace('_ddr5', '')
              )
            }
            return true
          }).length

          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              className="xai-card text-left flex flex-col gap-2 p-4 group"
            >
              <span className="text-2xl" aria-hidden="true">
                {v.icon}
              </span>
              <span className="font-mono text-sm uppercase tracking-wider text-xai-text group-hover:text-xai-accent transition-colors">
                {v.label}
              </span>
              <span className="font-mono text-[0.5rem] text-xai-text-4">
                {v.description}
              </span>
              {compatibleCount > 0 && (
                <span className="font-mono text-[0.5rem] text-xai-text-3 mt-1">
                  {compatibleCount} {categoryLabel.toLowerCase()} available
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 2: Socket / Platform ──

function SocketStep({
  category,
  vendor,
  parts,
  onBack,
  onSelect,
}: {
  category: BuildSlotCategory
  vendor: Platform
  parts: Part[]
  onBack: () => void
  onSelect: (socket: SocketOption) => void
}) {
  const sockets = useMemo(
    () => SOCKET_OPTIONS.filter((s) => s.platform === vendor),
    [vendor]
  )

  const vendorInfo = VENDORS.find((v) => v.id === vendor)

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider hover:text-xai-text transition-colors"
        >
          ← Back
        </button>
        <span className="text-base" aria-hidden="true">
          {vendorInfo?.icon}
        </span>
        <span className="font-mono text-[0.625rem] uppercase tracking-wider text-xai-text">
          {vendorInfo?.label} Platform
        </span>
      </div>

      <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mb-1">
        Select Platform
      </p>
      <p className="font-mono text-[0.5rem] text-xai-text-3 mb-3">
        Choose a socket / platform generation
      </p>

      <div className="flex flex-col gap-2">
        {sockets.map((s) => {
          const count = parts.filter((p) => {
            if (p.category !== category) return false
            if (category === 'cpu') {
              const spec = getPartSocket(p).toLowerCase().replace(/\s+/g, '')
              return spec === s.id.replace('_ddr5', '')
            }
            if (category === 'motherboard') {
              const spec = getPartSocket(p).toLowerCase().replace(/\s+/g, '')
              return spec === s.id.replace('_ddr5', '')
            }
            if (category === 'ram') {
              const t = getSpec(p.specs, 'type').toUpperCase()
              return t === '' || t === s.ramType
            }
            return true
          }).length

          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="xai-card text-left flex items-start gap-4 p-3 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-xai-text group-hover:text-xai-accent transition-colors">
                    {s.label}
                  </span>
                  <span className="font-mono text-[0.5rem] text-xai-text-4">
                    {s.ramType}
                  </span>
                </div>
                <p className="font-mono text-[0.5rem] text-xai-text-3 mt-0.5">
                  {s.generation}
                </p>
                {s.chipsets.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {s.chipsets.map((c) => (
                      <span
                        key={c.id}
                        className="font-mono text-[0.4375rem] text-xai-text-4 border border-xai-border px-1.5 py-0.5"
                      >
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className="font-mono text-[0.5rem] text-xai-text-3">
                  {count} {count === 1 ? 'part' : 'parts'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 3: Parts Grid ──

function PartsStep({
  category,
  vendor,
  socket,
  parts,
  priceByPartId,
  priceEntries,
  build,
  onBack,
  onPartAdded,
  onPreviewPart,
}: {
  category: BuildSlotCategory
  vendor: Platform
  socket: SocketOption
  parts: Part[]
  priceByPartId: Record<string, string>
  priceEntries: PriceEntry[]
  build: UseBuildResult
  onBack: () => void
  onPartAdded: () => void
  onPreviewPart?: (partId: string | null) => void
}) {
  const categoryLabel = category.replace('_', ' ').toUpperCase()

  const categoryParts = useMemo(() => {
    return parts.filter((p) => {
      if (p.category !== category) return false
      if (category === 'cpu') {
         const s = getPartSocket(p).toLowerCase().replace(/\s+/g, '')
        return s === socket.id.replace('_ddr5', '')
      }
      if (category === 'motherboard') {
         const s = getPartSocket(p).toLowerCase().replace(/\s+/g, '')
        const ram = getSpec(p.specs, 'ram').toUpperCase()
        return (
          s === socket.id.replace('_ddr5', '') &&
          (ram === '' || ram === socket.ramType)
        )
      }
      if (category === 'ram') {
        const t = getSpec(p.specs, 'type').toUpperCase()
        return t === '' || t === socket.ramType
      }
      return true
    })
  }, [parts, category, socket])

  const filters = usePartFilters(categoryParts, {
    priceByPartId,
    deduplicate: true,
  })

  return (
    <>
      {/* Back + filter context */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-xai-border shrink-0">
        <button
          onClick={onBack}
          className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider hover:text-xai-text transition-colors"
        >
          ← Back
        </button>
        <span className="font-mono text-[0.5rem] text-xai-text-4">|</span>
        <span className="font-mono text-[0.5rem] text-xai-text-4 uppercase tracking-wider">
          {VENDORS.find((v) => v.id === vendor)?.label}
        </span>
        <span className="font-mono text-[0.5rem] text-xai-text-4">›</span>
        <span className="font-mono text-[0.5rem] text-xai-text-3 uppercase tracking-wider">
          {socket.label}
        </span>
        <span className="font-mono text-[0.5rem] text-xai-text-4">›</span>
        <span className="font-mono text-[0.5rem] text-xai-accent uppercase tracking-wider">
          {categoryLabel}
        </span>
        <span className="font-mono text-[0.5rem] text-xai-text-4 ml-auto">
          {filters.filteredParts.length} items
        </span>
      </div>

      {/* Sort + filter controls */}
      <div className="flex items-center gap-2 flex-wrap px-4 py-1.5 border-b border-xai-border shrink-0">
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
          const isActive = filters.sort.field === field
          return (
            <button
              key={field}
              onClick={() => filters.setSort(field)}
              className={[
                'font-mono text-[0.5rem] uppercase tracking-wider transition-colors',
                isActive ? 'text-xai-accent' : 'text-xai-text-4 hover:text-xai-text',
              ].join(' ')}
            >
              {label}{isActive && <span className="ml-0.5">{filters.sort.dir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          )
        })}
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
      <div className="flex-1 min-h-0 overflow-auto">
        {filters.filteredParts.length === 0 && filters.hasActiveFilters ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
            <p className="font-mono text-xs text-xai-text-4 uppercase tracking-wider">
              No {categoryLabel.toLowerCase()} match your filters
            </p>
            <button
              onClick={filters.clearFilters}
              className="font-mono text-[0.5rem] text-xai-accent uppercase tracking-wider hover:text-xai-text transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : filters.filteredParts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
            <p className="font-mono text-xs text-xai-text-4 uppercase tracking-wider">
              No {categoryLabel.toLowerCase()} found
            </p>
            <p className="font-mono text-[0.5rem] text-xai-text-4">
              {socket.label} · {socket.ramType}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-xai-border">
            {filters.filteredParts.map((part) => {
              const isSelected = build.isSlotFilled(part.category as BuildSlotCategory)
              // For CPUs: show Cores/Threads/TDP badges; others: first 2 specs
              const techSpecs = category === 'cpu'
                ? [
                    getSpec(part.specs, 'cores') ? `${getSpec(part.specs, 'cores')}C` : null,
                    getSpec(part.specs, 'threads') ? `${getSpec(part.specs, 'threads')}T` : null,
                    getSpec(part.specs, 'tdp') || null,
                  ].filter(Boolean).map((v, i) => [`spec-${i}`, v] as [string, string])
                : Object.entries(part.specs)
                    .filter(([k]) => !['Brand', 'brand', 'SKU', 'sku', 'Availability', 'availability'].includes(k))
                    .slice(0, 2)
              return (
                <div
                  key={part.id}
                  className={`flex items-center gap-3 py-2.5 px-4 group ${isSelected ? 'bg-xai-hover' : ''}`}
                >
                  <p
                    className="text-xai-text text-sm font-normal truncate flex-1 cursor-pointer"
                    onClick={() => onPreviewPart?.(part.id)}
                  >
                    {simplifyPartName(part.name, part.category)}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {techSpecs.map(([k, v]) => (
                      <span key={k} className="font-mono text-[0.5rem] text-xai-text-4 bg-xai-bg px-1.5 py-0.5">
                        {v}
                      </span>
                    ))}
                  </div>
                  {priceByPartId[part.id] && (
                    <span className="font-mono text-sm text-xai-text shrink-0 ml-2">
                      {priceByPartId[part.id]}
                    </span>
                  )}
                  <button
                    className="shrink-0 font-mono text-[0.5rem] text-xai-text-4 uppercase tracking-wider hover:text-xai-text transition-colors px-2 py-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      build.addPart(
                        part,
                        priceEntries.find((e) => e.partId === part.id)
                      )
                      onPreviewPart?.(part.id)
                      onPartAdded()
                    }}
                    aria-label={isSelected ? `${simplifyPartName(part.name, part.category)} selected` : `Add ${simplifyPartName(part.name, part.category)} to build`}
                    aria-pressed={isSelected}
                  >
                    {isSelected ? '✓' : 'ADD'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
