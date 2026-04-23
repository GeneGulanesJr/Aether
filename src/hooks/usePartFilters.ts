/**
 * Part filtering hook with local state.
 * Provides filter controls and filtered part lists.
 */

import { useState, useMemo, useCallback } from 'react'
import type { Part } from '../lib/types'
import { getSpec } from '../lib/types'

/**
 * Strip descriptive suffixes from scraped part names to show only the
 * clean product name. E.g.
 * "AMD Ryzen 7 5700X3D 3.0GHz AM4"
 *   → "Ryzen 7 5700X3D"
 * "Intel® Core™ i7-14700 Processor 33M Cache, up to 5.40 GHz"
 *   → "Core i7-14700"
 */
export function simplifyPartName(name: string, category: string = ''): string {
  const clean = name.replace(/[™®©]|Â®|\u00c3\u0082\u00c2\u00ae/g, '')
  const cat = category.toLowerCase()

  if (cat === 'cpu') {
    // ── AMD Ryzen (Pro variant) ──
    let m = clean.match(
      /\b(Ryzen\s+[3579]\s+Pro\s+\d{4}[A-Za-z\d]*)(?=\s|$)/i
    )
    if (m) return m[1].trim()

    // ── AMD Ryzen (standard) ──
    m = clean.match(
      /\b(Ryzen\s+[3579]\s+\d{4}[A-Za-z\d]*)(?=\s|$)/i
    )
    if (m) return m[1].trim()

    // ── AMD Athlon ──
    m = clean.match(/\b(Athlon\s+\d{3,4}[A-Za-z\d]*)(?=\s|$)/i)
    if (m) return m[1].trim()

    // ── Threadripper ──
    m = clean.match(/\b(Threadripper\s+\d{4,5}[A-Za-z\d]*)(?=\s|$)/i)
    if (m) return m[1].trim()

    // ── Intel Core Ultra ──
    m = clean.match(
      /\b(Core\s+Ultra\s+[579]\s+\d{3,4}[A-Z\d]*)(?=\s|$)/i
    )
    if (m) return m[1].trim()

    // ── Intel Core i3/i5/i7/i9 (with hyphen or space) ──
    m = clean.match(
      /\b(Core\s+i[3579][\s-]\d{4,5}[A-Za-z\d]*)(?=\s|$)/i
    )
    if (m) return m[1].trim()

    // ── Intel with "Generation" prefix: extract iX-XXXX ──
    m = clean.match(/\b(i[3579][\s-]\d{4,5}[A-Za-z\d]*)(?=\s|$)/i)
    if (m) return `Core ${m[1].trim()}`

    // ── AMD A-series / Pentium ──
    m = clean.match(/\b([AP]\d{1,3}\s+\d{4}[A-Za-z\d]*)(?=\s|$)/i)
    if (m) return m[1].trim()
    m = clean.match(/\b(Pentium\s+[A-Z]?\d{4}[A-Za-z\d]*)(?=\s|$)/i)
    if (m) return m[1].trim()

    // ── Socket/LGA fallback ──
    const si = clean.search(/\b[Ss]ocket\b|\bLGA\b/)
    if (si > 3) return clean.slice(0, si).replace(/,\s*$/, '').trim()
  }

  return clean.trim()
}

export function extractBrand(part: Part): string {
  const name = part.name.toLowerCase()
  const cat = part.category.toLowerCase()

  if (cat === 'cpu' || cat === 'motherboard') {
    if (name.includes('intel') || /\bi[3579]\b/.test(name) || name.includes('lga')) return 'Intel'
    if (name.includes('amd') || name.includes('ryzen') || name.includes('athlon') || name.includes('am4') || name.includes('am5')) return 'AMD'
  }
  if (cat === 'gpu') {
    if (name.includes('nvidia') || name.includes('geforce') || name.includes('rtx') || name.includes('gtx')) return 'NVIDIA'
    if (name.includes('amd') || name.includes('radeon') || name.includes('rx ')) return 'AMD'
    if (name.includes('intel') || name.includes('arc ')) return 'Intel'
  }
  if (cat === 'ram') {
    if (name.includes('corsair')) return 'Corsair'
    if (name.includes('g.skill') || name.includes('gskill')) return 'G.Skill'
    if (name.includes('kingston')) return 'Kingston'
    if (name.includes('crucial')) return 'Crucial'
    if (name.includes('teamgroup') || name.includes('team group') || name.includes('t-force')) return 'TeamGroup'
    if (name.includes('adata') || name.includes('xpg')) return 'Adata/XPG'
  }
  if (cat === 'storage') {
    if (name.includes('samsung')) return 'Samsung'
    if (name.includes('western digital') || name.includes('wd ')) return 'WD'
    if (name.includes('kingston')) return 'Kingston'
    if (name.includes('crucial')) return 'Crucial'
    if (name.includes('seagate')) return 'Seagate'
  }
  if (cat === 'psu') {
    if (name.includes('corsair')) return 'Corsair'
    if (name.includes('seasonic')) return 'Seasonic'
    if (name.includes('evga')) return 'EVGA'
    if (name.includes('coolermaster') || name.includes('cooler master')) return 'Cooler Master'
    if (name.includes('thermaltake')) return 'Thermaltake'
  }
  if (cat === 'case') {
    if (name.includes('nzxt')) return 'NZXT'
    if (name.includes('corsair')) return 'Corsair'
    if (name.includes('lian li') || name.includes('lian-li')) return 'Lian Li'
    if (name.includes('coolermaster') || name.includes('cooler master')) return 'Cooler Master'
    if (name.includes('phanteks')) return 'Phanteks'
    if (name.includes('fractal')) return 'Fractal'
  }
  if (cat === 'cpu_cooler') {
    if (name.includes('noctua')) return 'Noctua'
    if (name.includes('corsair')) return 'Corsair'
    if (name.includes('coolermaster') || name.includes('cooler master')) return 'Cooler Master'
    if (name.includes('nzxt')) return 'NZXT'
    if (name.includes('deepcool')) return 'Deepcool'
    if (name.includes('arctic')) return 'Arctic'
    if (name.includes('be quiet') || name.includes('bequiet')) return 'be quiet!'
  }

  return 'Other'
}

/** Deduplicate parts by simplified name, preferring parts with richer specs, then lowest price */
export function deduplicateByName(
  parts: Part[],
  priceByPartId: Record<string, string>
): Part[] {
  const seen = new Map<string, Part>()
  const priceToNum = (s: string | undefined): number => {
    if (!s) return Infinity
    return parseFloat(s.replace(/[₱,\s]/g, '')) || Infinity
  }
  const specCount = (p: Part): number =>
    Object.values(p.specs).filter(v => v && v !== '' && v !== 'unknown').length

  for (const part of parts) {
    const key = simplifyPartName(part.name, part.category).toLowerCase()
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, part)
    } else {
      const existingSpecs = specCount(existing)
      const newSpecs = specCount(part)
      // Prefer parts with richer spec data (real store data vs estimated)
      if (newSpecs > existingSpecs) {
        seen.set(key, part)
      } else if (newSpecs === existingSpecs) {
        // Same spec richness → keep lower price
        const existingPrice = priceToNum(priceByPartId[existing.id])
        const newPrice = priceToNum(priceByPartId[part.id])
        if (newPrice < existingPrice) {
          seen.set(key, part)
        }
      }
    }
  }
  return Array.from(seen.values())
}

/**
 * Extract a normalized model key from a part name for product deduplication.
 * Returns lowercase, trimmed identifier or empty string if no pattern matches.
 */
export function extractModelKey(part: Part): string {
  const raw = part.name
  const lower = raw.toLowerCase()
  const cat = part.category.toLowerCase()

  if (cat === 'cpu') {
    // AMD Ryzen: "Ryzen X XXXX(G/U/X/HS/H)"
    const ryzenMatch = lower.match(
      /ryzen\s+(\d)\s+(\d{4}[a-z]{0,3})/
    )
    if (ryzenMatch) {
      return `ryzen ${ryzenMatch[1]} ${ryzenMatch[2]}`.trim()
    }
    // Intel Core: "iX-XXXX" or "iX XXXX"
    const coreMatch = lower.match(
      /core\s+i([3579])[\s-](\d{4,5}[a-z]{0,3})/
    )
    if (coreMatch) {
      return `i${coreMatch[1]}-${coreMatch[2]}`.trim()
    }
    // Fallback: simple i3/i5/i7/i9 without "Core"
    const simpleIntel = lower.match(/i([3579])[\s-](\d{4,5}[a-z]{0,3})/)
    if (simpleIntel) {
      return `i${simpleIntel[1]}-${simpleIntel[2]}`.trim()
    }
  }

  if (cat === 'gpu') {
    // NVIDIA RTX/GTX: "RTX 4070 TI SUPER", "GTX 1650", etc.
    const nvidiaMatch = lower.match(
      /(rtx|gtx)\s+(\d{4})\s*(ti)?\s*(super)?/
    )
    if (nvidiaMatch) {
      const parts = [nvidiaMatch[1], nvidiaMatch[2]]
      if (nvidiaMatch[3]) parts.push('ti')
      if (nvidiaMatch[4]) parts.push('super')
      return parts.join(' ').trim()
    }
    // AMD RX: "RX 9060 XT", "RX 7600 XT", etc.
    const rxMatch = lower.match(/rx\s+(\d{4})\s*(xt)?/)
    if (rxMatch) {
      const parts = ['rx', rxMatch[1]]
      if (rxMatch[2]) parts.push('xt')
      return parts.join(' ').trim()
    }
    // Intel Arc: "Arc A770", "Arc B580"
    const arcMatch = lower.match(/arc\s+([ab]\d{3})/)
    if (arcMatch) {
      return `arc ${arcMatch[1]}`
    }
  }

  if (cat === 'motherboard') {
    // Extract chipset: X670, B550, B450, H610, Z790, A520, X570, etc.
    const chipsetMatch = lower.match(
      /\b([a]\d{2,3}|[bhz]\d{2,3}|x\d{2,3})\b/
    )
    // Extract form factor
    let formFactor = ''
    if (/\bitx\b/.test(lower)) formFactor = 'itx'
    else if (/\bmatx\b|micro.?atx|µatx/.test(lower)) formFactor = 'matx'
    else if (/\batx\b/.test(lower)) formFactor = 'atx'
    else if (/\beatx\b/.test(lower)) formFactor = 'eatx'

    if (chipsetMatch) {
      const chipset = chipsetMatch[1].toUpperCase()
      if (formFactor) {
        return `${chipset} ${formFactor}`
      }
      return chipset
    }
  }

  // Other: first 40 chars, stripped of special chars, normalized
  const stripped = lower
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return stripped.slice(0, 40)
}

/**
 * Deduplicate parts by model key, keeping the lowest-priced part per key.
 */
export function deduplicateByModelKey(
  parts: Part[],
  priceByPartId: Record<string, string>
): Part[] {
  const seen = new Map<string, Part>()
  const priceToNum = (s: string | undefined): number => {
    if (!s) return Infinity
    return parseFloat(s.replace(/[₱,\s]/g, '')) || Infinity
  }

  for (const part of parts) {
    const key = extractModelKey(part)
    if (!key) continue
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, part)
    } else {
      const existingPrice = priceToNum(priceByPartId[existing.id])
      const newPrice = priceToNum(priceByPartId[part.id])
      if (newPrice < existingPrice) {
        seen.set(key, part)
      }
    }
  }
  return Array.from(seen.values())
}

export interface PartFilters {
  search: string
  category: string
  brand: string
  socket: string
  priceMin: string
  priceMax: string
  coreCount: string
  stock: string
}

export type SortField = 'name' | 'price' | 'cores'
export type SortDir = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  dir: SortDir
}

export interface FilterOption {
  value: string
  label: string
  count: number
}

export interface FilterOptions {
  categories: FilterOption[]
  brands: FilterOption[]
  sockets: FilterOption[]
  coreCounts: FilterOption[]
}

export interface UsePartFiltersResult {
  /** Current filter state */
  filters: PartFilters
  /** Update a single filter value */
  setFilter: (key: keyof PartFilters, value: string) => void
  /** Clear all filters */
  clearFilters: () => void
  /** Whether any filters are active */
  hasActiveFilters: boolean
  /** Filtered parts derived from source parts + filters */
  filteredParts: Part[]
  /** Available filter options derived from parts */
  options: FilterOptions
  /** Filtered parts count out of total */
  filteredCount: number
  totalCount: number
  /** Current sort config */
  sort: SortConfig
  /** Set sort field and direction */
  setSort: (field: SortField) => void
}

/** Options for the hook */
export interface UsePartFiltersOptions {
  /** Price map for filtering and deduplication */
  priceByPartId?: Record<string, string>
  /** Whether to deduplicate parts by name (default false) */
  deduplicate?: boolean
  /** Callback to parse price for a part (returns NaN if no price) */
  getPrice?: (part: Part) => number
}

const EMPTY_FILTERS: PartFilters = {
  search: '',
  category: '',
  brand: '',
  socket: '',
  priceMin: '',
  priceMax: '',
  coreCount: '',
  stock: '',
}

const DEFAULT_SORT: SortConfig = { field: 'name', dir: 'asc' }

/**
 * Hook for managing part filters with local state.
 * Returns filtered parts and filter controls.
 *
 * @example
 * ```tsx
 * const { filters, setFilter, filteredParts } = usePartFilters(parts)
 * ```
 */
export function usePartFilters(parts: Part[], opts?: UsePartFiltersOptions): UsePartFiltersResult {
  const priceByPartId = opts?.priceByPartId
  const shouldDedup = opts?.deduplicate ?? false
  const getPrice = opts?.getPrice

  // Deduplicate source parts if requested
  const sourceParts = useMemo(() => {
    if (!shouldDedup || !priceByPartId) return parts
    return deduplicateByName(parts, priceByPartId)
  }, [parts, shouldDedup, priceByPartId])

  const [filters, setFilters] = useState<PartFilters>({ ...EMPTY_FILTERS })

  // Helper: parse formatted price to number
  const priceToNum = useCallback((s: string | undefined): number => {
    if (!s) return NaN
    return parseFloat(s.replace(/[₱,\s]/g, '')) || NaN
  }, [])

  // Sort state
  const [sort, setSortState] = useState<SortConfig>({ ...DEFAULT_SORT })

  const setSort = useCallback((field: SortField) => {
    setSortState((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  // Extract available options from source parts
  const options: FilterOptions = useMemo(() => {
    const categoryCounts = new Map<string, number>()
    const brandCounts = new Map<string, number>()
    const socketCounts = new Map<string, number>()
    const coreCounts = new Map<string, number>()

    for (const part of sourceParts) {
      const cat = part.category || 'Unknown'
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1)

      const brand = extractBrand(part)
      brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1)

      const socket = getSpec(part.specs, 'socket')
      if (socket) {
        socketCounts.set(socket, (socketCounts.get(socket) ?? 0) + 1)
      }

      const cores = getSpec(part.specs, 'cores')
      if (cores) {
        coreCounts.set(cores, (coreCounts.get(cores) ?? 0) + 1)
      }
    }

    return {
      categories: Array.from(categoryCounts.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      brands: Array.from(brandCounts.entries())
        .filter(([v]) => v !== 'Other')
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      sockets: Array.from(socketCounts.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      coreCounts: Array.from(coreCounts.entries())
        .map(([value, count]) => ({ value, label: `${value} cores`, count }))
        .sort((a, b) => parseInt(a.value) - parseInt(b.value)),
    }
  }, [sourceParts])

  // Apply filters to source parts
  const filteredParts = useMemo(() => {
    const minPrice = filters.priceMin ? parseFloat(filters.priceMin) : NaN
    const maxPrice = filters.priceMax ? parseFloat(filters.priceMax) : NaN

    return sourceParts.filter((part) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!part.name.toLowerCase().includes(searchLower) &&
            !part.category.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Category filter
      if (filters.category && part.category !== filters.category) {
        return false
      }

      // Brand filter
      if (filters.brand && extractBrand(part) !== filters.brand) {
        return false
      }

      // Socket filter
      if (filters.socket && getSpec(part.specs, 'socket') !== filters.socket) {
        return false
      }

      // Price range filter
      if (priceByPartId && (!isNaN(minPrice) || !isNaN(maxPrice))) {
        const price = priceToNum(priceByPartId[part.id])
        if (!isNaN(price)) {
          if (!isNaN(minPrice) && price < minPrice) return false
          if (!isNaN(maxPrice) && price > maxPrice) return false
        }
      }

      // Core count filter
      if (filters.coreCount && getSpec(part.specs, 'cores') !== filters.coreCount) {
        return false
      }

      // Stock filter
      if (filters.stock) {
        const availability = (getSpec(part.specs, 'availability') || getSpec(part.specs, 'Availability') || '').toLowerCase()
        if (filters.stock === 'in_stock' && availability !== 'in_stock') return false
        if (filters.stock === 'out_of_stock' && availability !== 'out_of_stock') return false
      }

      return true
    })
  }, [sourceParts, filters, priceByPartId, priceToNum])

  // Sort filtered parts
  const sortedParts = useMemo(() => {
    const sorted = [...filteredParts]
    const dir = sort.dir === 'asc' ? 1 : -1

    sorted.sort((a, b) => {
      switch (sort.field) {
        case 'name':
          return dir * a.name.localeCompare(b.name)
        case 'price': {
          const pa = getPrice ? getPrice(a) : priceToNum(priceByPartId?.[a.id])
          const pb = getPrice ? getPrice(b) : priceToNum(priceByPartId?.[b.id])
          const aVal = isNaN(pa) ? Infinity : pa
          const bVal = isNaN(pb) ? Infinity : pb
          return dir * (aVal - bVal)
        }
        case 'cores': {
          const ca = parseInt(getSpec(a.specs, 'cores')) || 0
          const cb = parseInt(getSpec(b.specs, 'cores')) || 0
          return dir * (ca - cb)
        }
        default:
          return 0
      }
    })
    return sorted
  }, [filteredParts, sort, getPrice, priceByPartId, priceToNum])

  const setFilter = useCallback((key: keyof PartFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS })
  }, [])

  const hasActiveFilters = Boolean(
    filters.search || filters.category || filters.brand || filters.socket || filters.priceMin || filters.priceMax || filters.coreCount || filters.stock
  )

  return {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    filteredParts: sortedParts,
    options,
    filteredCount: filteredParts.length,
    totalCount: sourceParts.length,
    sort,
    setSort,
  }
}