/**
 * Marketplace App — Price comparison across stores.
 *
 * Two modes:
 *   - Standalone (desktop icon): browse categories → parts → see all store offers
 *   - Companion (opened alongside My Rig): auto-navigates to highlighted part,
 *     shows price comparison. User can still browse freely.
 *
 * Each part card shows all store offers sorted cheapest-first.
 */

import { useState, useMemo, useEffect } from 'react'
import type { Part, PriceEntry, BuildSlotCategory } from '../../lib/types'
import type { UseBuildResult } from '../../hooks/useBuild'
import { usePartFilters, extractModelKey, simplifyPartName, type SortField } from '../../hooks/usePartFilters'
import { formatPhp } from '../../lib/format'

// ── Constants ──

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

// ── Types ──

/** Grouped store offers for a single part */
interface StoreOffer {
  retailer: string
  amountPhp: number
  productUrl?: string
  storeUrl?: string
  observedAt?: string
}

interface PartWithOffers {
  part: Part
  offers: StoreOffer[]
  lowestPrice: number | null
}

// ── Helpers ──

/** Derive store name from part ID prefix */
function retailerFromPartId(partId: string): string {
  const prefix = partId.split('-').slice(0, 3).join('-').toLowerCase()
  const storeMap: Record<string, string> = {
    'cpu-pc-express': 'PC Express',
    'cpu-easypc': 'EasyPC',
    'cpu-villman': 'Villman',
  }
  return storeMap[prefix] ?? storeMap[prefix.split('-').slice(0, 2).join('-')] ?? 'Unknown'
}

/** Store website URLs for "Visit store" links */
const STORE_URLS: Record<string, string> = {
  'PC Express': 'https://www.pcexpress.com.ph',
  'EasyPC': 'https://www.easypc.com.ph',
  'Villman': 'https://villman.com',
}

function groupByModelKey(parts: Part[], priceEntries: PriceEntry[]): Map<string, PartWithOffers> {
  // First, build a map of partId -> offers
  const offerMap = new Map<string, StoreOffer[]>()
  for (const entry of priceEntries) {
    const list = offerMap.get(entry.partId) ?? []
    const retailer = entry.retailer && entry.retailer !== 'Estimated' ? entry.retailer : retailerFromPartId(entry.partId)
    list.push({
      retailer,
      amountPhp: entry.amountPhp,
      productUrl: entry.productUrl,
      storeUrl: STORE_URLS[retailer],
      observedAt: entry.observedAt,
    })
    offerMap.set(entry.partId, list)
  }

  // Build a map of modelKey -> { parts, allOffers }
  const modelMap = new Map<string, { parts: Part[]; allOffers: StoreOffer[] }>()
  
  for (const part of parts) {
    const modelKey = `${part.category}:${extractModelKey(part)}`
    const entry = modelMap.get(modelKey) ?? { parts: [], allOffers: [] }
    
    entry.parts.push(part)
    const partOffers = offerMap.get(part.id) ?? []
    entry.allOffers.push(...partOffers)
    
    modelMap.set(modelKey, entry)
  }

  // Convert to PartWithOffers, picking the shortest name as the display name
  const result = new Map<string, PartWithOffers>()
  
  for (const [modelKey, { parts: modelParts, allOffers }] of modelMap) {
    // Sort offers by price (cheapest first)
    const sortedOffers = allOffers.sort((a, b) => a.amountPhp - b.amountPhp)
    
    // Pick the shortest/cleanest name as the display name
    let displayName = modelParts[0].name
    let displayPart = modelParts[0]
    
    for (const part of modelParts) {
      // Prefer names without suffixes like "(sample)", "(boxed)", etc.
      const name = part.name.replace(/\s*\(.*?\)\s*/g, '').trim()
      if (name.length < displayName.length) {
        displayName = name
        displayPart = part
      }
    }
    
    // Use the first part as the representative, but with the clean name
    const representativePart: Part = {
      ...displayPart,
      name: displayName,
    }
    
    result.set(modelKey, {
      part: representativePart,
      offers: sortedOffers,
      lowestPrice: sortedOffers.length > 0 ? sortedOffers[0].amountPhp : null,
    })
  }
  
  return result
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

// ── Props ──

interface MarketplaceAppProps {
  parts: Part[]
  priceByPartId: Record<string, string>
  priceEntries: PriceEntry[]
  build: UseBuildResult
  initialCategory?: string
  initialSearch?: string
  /** Companion mode: opened alongside My Rig */
  companion?: boolean
  /** Part ID to highlight (from My Rig click/add) */
  highlightPartId?: string | null
  /** Called when user picks a store offer to use for a part in their build */
  onSelectStoreOffer?: (partId: string, offer: StoreOffer) => void
}

// ── Component ──

export function MarketplaceApp({
  parts,
  priceByPartId,
  priceEntries,
  build,
  initialCategory,
  initialSearch,
  companion,
  highlightPartId,
  onSelectStoreOffer,
}: MarketplaceAppProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? null)
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)

  // Group all offers by model key
  const partsWithOffers = useMemo(
    () => groupByModelKey(parts, priceEntries),
    [parts, priceEntries]
  )

  // ── Companion: auto-navigate to highlighted part ──

  useEffect(() => {
    if (!highlightPartId) return
    // Find the part in the parts array
    const part = parts.find(p => p.id === highlightPartId)
    if (!part) return
    // Find the model key for this part
    const modelKey = `${part.category}:${extractModelKey(part)}`
    const pwo = partsWithOffers.get(modelKey)
    if (!pwo) return
    setSelectedCategory(pwo.part.category)
    setSelectedPartId(modelKey)
  }, [highlightPartId, partsWithOffers, parts])

  // ── Category parts ──

  const categoryParts = useMemo(() => {
    if (!selectedCategory) return []
    return parts.filter((p) => p.category === selectedCategory)
  }, [parts, selectedCategory])

  const filters = usePartFilters(categoryParts, { priceByPartId, deduplicate: true })

  const filteredParts = useMemo(() => {
    let result = filters.filteredParts
    if (initialSearch) {
      const q = initialSearch.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }
    return result
  }, [filters.filteredParts, initialSearch])

  // ── Selected part detail ──

  const selectedPartDetail = useMemo(() => {
    if (!selectedPartId) return null
    return partsWithOffers.get(selectedPartId) ?? null
  }, [selectedPartId, partsWithOffers])

  // ── Category grid (landing) ──

  if (!selectedCategory) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {companion && (
          <div className="px-4 py-2 border-b border-xai-border shrink-0">
            <p className="font-mono text-[0.5rem] text-xai-text-4 uppercase tracking-wider">
              Price comparison · pick a part in My Rig to see offers
            </p>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mb-3">
            Categories
          </p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const count = parts.filter((p) => p.category === cat.id).length
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    setSelectedPartId(null)
                  }}
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
      </div>
    )
  }

  // ── Part detail (price comparison view) ──

  if (selectedPartDetail) {
    const { part, offers } = selectedPartDetail
    const catInfo = CATEGORIES.find((c) => c.id === selectedCategory)
    const buildPart = build.getSelectedPart(part.category as BuildSlotCategory)
    const isInBuild = buildPart?.id === part.id

    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-xai-border shrink-0">
          <button
            onClick={() => setSelectedPartId(null)}
            className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider hover:text-xai-text transition-colors"
          >
            ← Back
          </button>
          <span className="text-base" aria-hidden="true">{catInfo?.icon}</span>
          <span className="font-mono text-[0.625rem] uppercase tracking-wider text-xai-text truncate">
            {simplifyPartName(part.name, part.category)}
          </span>
        </div>

        {/* Part specs */}
        <div className="px-4 py-3 border-b border-xai-border shrink-0">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(part.specs).map(([k, v]) => (
              <div key={k}>
                <span className="font-mono text-[0.5rem] text-xai-text-4 uppercase">{k}</span>
                <span className="font-mono text-[0.5625rem] text-xai-text-2 ml-1">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Store offers */}
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mb-2">
            {offers.length > 0
              ? `${offers.length} store${offers.length === 1 ? '' : 's'} with prices`
              : 'No store prices available'}
          </p>

          {offers.length > 0 ? (
            <div className="flex flex-col gap-2">
              {offers.map((offer, i) => {
                const isCheapest = i === 0
                const isCurrentlySelected =
                  isInBuild &&
                  buildPart?.priceEntry?.retailer === offer.retailer &&
                  buildPart?.priceEntry?.amountPhp === offer.amountPhp

                return (
                  <div
                    key={`${offer.retailer}-${offer.amountPhp}`}
                    className={[
                      'flex items-center gap-3 p-3 border',
                      isCurrentlySelected
                        ? 'border-xai-accent bg-xai-accent-surface'
                        : 'border-xai-border hover:border-xai-border-strong',
                      'transition-colors',
                    ].join(' ')}
                  >
                    {/* Rank badge */}
                    <div className="shrink-0 w-6 text-center">
                      {isCheapest ? (
                        <span className="text-[0.625rem]" aria-label="Cheapest">🏷️</span>
                      ) : (
                        <span className="font-mono text-[0.5rem] text-xai-text-4">#{i + 1}</span>
                      )}
                    </div>

                    {/* Store + price */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[0.625rem] text-xai-text uppercase tracking-wider truncate">
                          {offer.retailer}
                        </span>
                        {isCheapest && (
                          <span className="font-mono text-[0.4375rem] text-xai-accent uppercase tracking-wider border border-xai-accent/30 px-1 py-px">
                            Best
                          </span>
                        )}
                        {isCurrentlySelected && (
                          <span className="font-mono text-[0.4375rem] text-xai-accent uppercase tracking-wider border border-xai-accent/30 px-1 py-px">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-sm text-xai-text xai-price mt-0.5">
                        {formatPhp(offer.amountPhp)}
                      </p>
                      {offer.observedAt && (
                        <p className="font-mono text-[0.4375rem] text-xai-text-4 mt-0.5">
                          Updated {timeAgo(offer.observedAt)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex flex-col gap-1">
                      {offer.productUrl && (
                        <a
                          href={offer.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[0.4375rem] text-xai-text-4 uppercase tracking-wider hover:text-xai-text transition-colors text-center"
                        >
                          Visit product →
                        </a>
                      )}
                      {offer.storeUrl && (
                        <a
                          href={offer.storeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[0.4375rem] text-xai-text-4 uppercase tracking-wider hover:text-xai-text transition-colors text-center"
                        >
                          Visit store →
                        </a>
                      )}
                      {onSelectStoreOffer && !isCurrentlySelected && (
                        <button
                          onClick={() => onSelectStoreOffer(part.id, offer)}
                          className="font-mono text-[0.5rem] text-xai-accent uppercase tracking-wider hover:text-xai-text transition-colors"
                        >
                          Use this
                        </button>
                      )}
                      {isCurrentlySelected && (
                        <button
                          onClick={() => build.removePart(part.category as BuildSlotCategory)}
                          className="font-mono text-[0.5rem] text-red-400 uppercase tracking-wider hover:text-red-300 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="font-mono text-[0.5625rem] text-xai-text-4 italic">
              No pricing data yet for this part.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Parts list view ──

  const catInfo = CATEGORIES.find((c) => c.id === selectedCategory)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-xai-border shrink-0">
        <button
          onClick={() => {
            setSelectedCategory(null)
            setSelectedPartId(null)
          }}
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

      {/* Filters (includes sort) */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-1.5 border-b border-xai-border shrink-0">
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
        <select
          value={filters.filters.stock}
          onChange={(e) => filters.setFilter('stock', e.target.value)}
          className="xai-input !py-1 !px-2 !text-[0.5625rem]"
        >
          <option value="">Stock</option>
          <option value="in_stock">In Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <span className="font-mono text-[0.4375rem] text-xai-text-4 mx-1">|</span>
        {([
          ['name', 'Name'],
          ['price', 'Price'],
          ['cores', 'Cores'],
        ] as [SortField, string][]).map(([field, label]) => {
          const isActive = filters.sort.field === field
          return (
            <button
              key={field}
              onClick={() => filters.setSort(field)}
              className={[
                'font-mono text-[0.5rem] uppercase tracking-wider transition-colors',
                isActive ? 'text-xai-accent' : 'text-xai-text-4 hover:text-xai-text',
              ].join(' ')}
              aria-label={`Sort by ${label}`}
            >
              {label}{isActive && <span className="ml-0.5">{filters.sort.dir === 'asc' ? '↑' : '↓'}</span>}
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
            {filteredParts.map((part) => {
              const modelKey = `${part.category}:${extractModelKey(part)}`
              const pwo = partsWithOffers.get(modelKey)
              const offerCount = pwo?.offers?.length ?? 0
              const lowest = pwo?.lowestPrice
              const highest = pwo?.offers && pwo.offers.length > 0 
                ? pwo.offers[pwo.offers.length - 1].amountPhp 
                : null
              const priceRange = lowest != null && highest != null && lowest !== highest
              const isSelected = build.isSlotFilled(part.category as BuildSlotCategory)

              return (
                <button
                  key={modelKey}
                  onClick={() => setSelectedPartId(modelKey)}
                  className={[
                    'xai-card group text-left !p-2 cursor-pointer',
                    isSelected ? 'xai-card-active' : '',
                  ].join(' ')}
                  aria-label={`${pwo?.part.name ?? part.name} — ${offerCount} offers`}
                >
                  {/* Part info */}
                  <h3 className="font-mono text-[0.5625rem] text-xai-text uppercase tracking-wider leading-snug line-clamp-2">
                    {pwo?.part.name ?? part.name}
                  </h3>

                  {/* Top 2 specs */}
                  <dl className="mt-1 space-y-px">
                    {Object.entries(pwo?.part.specs ?? part.specs).slice(0, 2).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-1">
                        <dt className="font-mono text-[0.5rem] text-xai-text-4 truncate">{k}</dt>
                        <dd className="font-mono text-[0.5rem] text-xai-text-2 truncate text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {/* Price range + offer count row */}
                  <div className="flex items-center justify-between mt-2">
                    {lowest != null ? (
                      <p className="xai-price font-mono text-xs text-xai-text">
                        {priceRange 
                          ? `${formatPhp(lowest)} - ${formatPhp(highest)}`
                          : formatPhp(lowest)
                        }
                      </p>
                    ) : (
                      <span className="font-mono text-[0.5rem] text-xai-text-4 italic">
                        No prices
                      </span>
                    )}
                    <span className="font-mono text-[0.4375rem] text-xai-text-4 uppercase tracking-wider">
                      {offerCount > 0 ? `${offerCount} store${offerCount === 1 ? '' : 's'}` : ''}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
