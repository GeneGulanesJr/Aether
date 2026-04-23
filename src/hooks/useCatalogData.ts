/**
 * Catalog data hook — static parts + snapshot prices + optional live prices.
 *
 * Parts (CPU, Motherboard, GPU) are bundled at build time from src/data/*.json.
 * Prices default to a bundled snapshot (src/data/prices_snapshot.json) — zero network calls.
 * Live prices are fetched on demand from the Worker API (D1) via fetchLivePrices().
 */

import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPrices } from '../lib/apiClient'
import { buildPriceMap } from '../lib/priceUtils'
import { getDataSourceMode } from '../lib/env'
import { getErrorMessage } from '../lib/errors'
import type { Part, PriceEntry } from '../lib/types'

// ── Dynamic catalog imports (deferred off critical path) ──
// These JSON files total ~3 MB — loaded asynchronously after first paint.

async function loadStaticParts(): Promise<Part[]> {
  const [cpu, motherboard, gpu, ram, storage, psu, pcCase, cooler, monitor] = await Promise.all([
    import('../data/catalog_cpu.json'),
    import('../data/catalog_motherboard.json'),
    import('../data/catalog_gpu.json'),
    import('../data/catalog_ram.json'),
    import('../data/catalog_storage.json'),
    import('../data/catalog_psu.json'),
    import('../data/catalog_case.json'),
    import('../data/catalog_cpu_cooler.json'),
    import('../data/catalog_monitor.json'),
  ])
  return [
    ...(cpu as unknown as { items: Part[] }).items,
    ...(motherboard as unknown as { items: Part[] }).items,
    ...(gpu as unknown as { items: Part[] }).items,
    ...(ram as unknown as { items: Part[] }).items,
    ...(storage as unknown as { items: Part[] }).items,
    ...(psu as unknown as { items: Part[] }).items,
    ...(pcCase as unknown as { items: Part[] }).items,
    ...(cooler as unknown as { items: Part[] }).items,
    ...(monitor as unknown as { items: Part[] }).items,
  ]
}

async function loadSnapshotPrices(): Promise<{ entries: PriceEntry[]; map: Record<string, string> }> {
  const { default: priceSnapshot } = await import('../data/prices_snapshot.json')
  const entries = (priceSnapshot as { entries: PriceEntry[] }).entries
  return { entries, map: buildPriceMap({ schemaVersion: '1.0', entries }) }
}

// ── Types ──

export type DataSourceMode = 'fixture' | 'api'
export type LivePriceState = 'idle' | 'loading' | 'success' | 'error'

export interface CatalogData {
  parts: Part[]
  /** Snapshot prices (always available, estimated) */
  priceByPartId: Record<string, string>
  /** Raw snapshot price entries */
  priceEntries: PriceEntry[]
  /** Live prices from Worker API (undefined until fetchLivePrices is called) */
  livePriceByPartId: Record<string, string> | undefined
  /** Raw live price entries */
  livePriceEntries: PriceEntry[]
  /** Status of live price fetch */
  livePriceState: LivePriceState
  /** Error message if live fetch failed */
  livePriceError: string | undefined
  /** Trigger live price fetch */
  fetchLivePrices: () => void
  /** Whether live prices are being fetched */
  isLivePriceLoading: boolean
  statusMessage: string
  mode: DataSourceMode
  loadingState: 'idle' | 'loading' | 'error' | 'success'
}

// ── Hook ──

export function useCatalogData(): CatalogData {
  const mode = getDataSourceMode() === 'api' ? 'api' : 'fixture'
  const [liveEnabled, setLiveEnabled] = useState(false)

  // ── Async data state (populated after initial paint) ──
  const [staticParts, setStaticParts] = useState<Part[]>([])
  const [snapshotEntries, setSnapshotEntries] = useState<PriceEntry[]>([])
  const [snapshotPriceMap, setSnapshotPriceMap] = useState<Record<string, string>>({})
  const [dataLoading, setDataLoading] = useState(true)

  // Load JSON chunks asynchronously — keeps ~3 MB off the critical path
  useEffect(() => {
    let cancelled = false
    Promise.all([loadStaticParts(), loadSnapshotPrices()])
      .then(([parts, snapshot]) => {
        if (!cancelled) {
          setStaticParts(parts)
          setSnapshotEntries(snapshot.entries)
          setSnapshotPriceMap(snapshot.map)
          setDataLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const fetchLivePrices = useCallback(() => {
    setLiveEnabled(true)
  }, [])

  // ─── Fixture mode (offline / dev) ──────────────────────────────────────

  if (mode === 'fixture') {
    if (dataLoading) {
      return {
        parts: [],
        priceByPartId: {},
        priceEntries: [],
        livePriceByPartId: undefined,
        livePriceEntries: [],
        livePriceState: 'idle' as const,
        livePriceError: undefined,
        fetchLivePrices: () => {},
        isLivePriceLoading: false,
        statusMessage: 'Loading catalog data…',
        mode,
        loadingState: 'loading' as const,
      }
    }
    // Use loaded snapshot data, not parsePriceFixture() which uses old sample data
    return {
      parts: staticParts,
      priceByPartId: snapshotPriceMap,
      priceEntries: snapshotEntries,
      livePriceByPartId: undefined,
      livePriceEntries: [],
      livePriceState: 'idle' as const,
      livePriceError: undefined,
      fetchLivePrices: () => {},
      isLivePriceLoading: false,
      statusMessage:
        'Fixture mode — parts bundled, prices from spider data.',
      mode,
      loadingState: 'success' as const,
    }
  }

  // ─── API mode — snapshot prices by default, live on demand ─────────────

  const livePricesQuery = useQuery({
    queryKey: ['api', 'prices', 'live'],
    queryFn: async () => {
      const response = await fetchPrices()
      return response.entries
    },
    enabled: liveEnabled,
  })

  // Live price state
  let livePriceState: LivePriceState = 'idle'
  let livePriceByPartId: Record<string, string> | undefined = undefined
  let livePriceEntries: PriceEntry[] = []
  let livePriceError: string | undefined = undefined
  const isLivePriceLoading = livePricesQuery.isLoading

  if (liveEnabled) {
    if (livePricesQuery.isError) {
      livePriceState = 'error'
      livePriceError = getErrorMessage(livePricesQuery.error)
    } else if (livePricesQuery.data) {
      livePriceState = 'success'
      livePriceEntries = livePricesQuery.data
      livePriceByPartId = buildPriceMap({
        schemaVersion: '1.0',
        entries: livePriceEntries,
      })
    } else if (isLivePriceLoading) {
      livePriceState = 'loading'
    }
  }

  // Return loading state while JSON chunks are being fetched
  if (dataLoading) {
    return {
      parts: [],
      priceByPartId: {},
      priceEntries: [],
      livePriceByPartId: undefined,
      livePriceEntries: [],
      livePriceState: 'idle' as const,
      livePriceError: undefined,
      fetchLivePrices,
      isLivePriceLoading: false,
      statusMessage: 'Loading catalog data…',
      mode,
      loadingState: 'loading' as const,
    }
  }

  // Always return snapshot prices — never undefined in API mode
  return {
    parts: staticParts,
    priceByPartId: snapshotPriceMap,
    priceEntries: snapshotEntries,
    livePriceByPartId,
    livePriceEntries,
    livePriceState,
    livePriceError,
    fetchLivePrices,
    isLivePriceLoading,
    statusMessage: `${staticParts.length} parts (bundled), ${snapshotEntries.length} estimated prices.`,
    mode,
    loadingState: 'success' as const,
  }
}