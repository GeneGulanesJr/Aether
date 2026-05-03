/**
 * Catalog data hook — static parts + snapshot prices.
 *
 * All data is bundled at build time from src/data/*.json — zero network calls.
 * Parts and prices are loaded asynchronously after first paint to keep the
 * initial bundle small.
 */

import { useState, useEffect } from 'react'
import { buildPriceMap } from '../lib/priceUtils'
import type { Part, PriceEntry } from '../lib/types'

// ── Dynamic catalog imports (deferred off critical path) ──
// These JSON files total ~many MB — loaded asynchronously after first paint.

async function loadStaticParts(): Promise<Part[]> {
  const [
    cpu, motherboard, gpu, ram, storage, psu, pcCase, cooler, monitor,
    laptop, desktop, keyboard, mouse, headset, speaker, tablet,
    printer, camera, network, ups, software, table, chair,
    projector, microphone, powerBank, externalStorage, cable, controller,
    fans, other
  ] = await Promise.all([
    import('../data/catalog_cpu.json'),
    import('../data/catalog_motherboard.json'),
    import('../data/catalog_gpu.json'),
    import('../data/catalog_ram.json'),
    import('../data/catalog_storage.json'),
    import('../data/catalog_psu.json'),
    import('../data/catalog_case.json'),
    import('../data/catalog_cpu_cooler.json'),
    import('../data/catalog_monitor.json'),
    import('../data/catalog_laptop.json'),
    import('../data/catalog_desktop.json'),
    import('../data/catalog_keyboard.json'),
    import('../data/catalog_mouse.json'),
    import('../data/catalog_headset.json'),
    import('../data/catalog_speaker.json'),
    import('../data/catalog_tablet.json'),
    import('../data/catalog_printer.json'),
    import('../data/catalog_camera.json'),
    import('../data/catalog_network.json'),
    import('../data/catalog_ups.json'),
    import('../data/catalog_software.json'),
    import('../data/catalog_table.json'),
    import('../data/catalog_chair.json'),
    import('../data/catalog_projector.json'),
    import('../data/catalog_microphone.json'),
    import('../data/catalog_power-bank.json'),
    import('../data/catalog_external-storage.json'),
    import('../data/catalog_cable.json'),
    import('../data/catalog_controller.json'),
    import('../data/catalog_fans.json'),
    import('../data/catalog_other.json'),
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
    ...(laptop as unknown as { items: Part[] }).items,
    ...(desktop as unknown as { items: Part[] }).items,
    ...(keyboard as unknown as { items: Part[] }).items,
    ...(mouse as unknown as { items: Part[] }).items,
    ...(headset as unknown as { items: Part[] }).items,
    ...(speaker as unknown as { items: Part[] }).items,
    ...(tablet as unknown as { items: Part[] }).items,
    ...(printer as unknown as { items: Part[] }).items,
    ...(camera as unknown as { items: Part[] }).items,
    ...(network as unknown as { items: Part[] }).items,
    ...(ups as unknown as { items: Part[] }).items,
    ...(software as unknown as { items: Part[] }).items,
    ...(table as unknown as { items: Part[] }).items,
    ...(chair as unknown as { items: Part[] }).items,
    ...(projector as unknown as { items: Part[] }).items,
    ...(microphone as unknown as { items: Part[] }).items,
    ...(powerBank as unknown as { items: Part[] }).items,
    ...(externalStorage as unknown as { items: Part[] }).items,
    ...(cable as unknown as { items: Part[] }).items,
    ...(controller as unknown as { items: Part[] }).items,
    ...(fans as unknown as { items: Part[] }).items,
    ...(other as unknown as { items: Part[] }).items,
  ]
}

async function loadSnapshotPrices(): Promise<{ entries: PriceEntry[]; map: Record<string, string> }> {
  const { default: priceSnapshot } = await import('../data/prices_snapshot.json')
  const entries = (priceSnapshot as { entries: PriceEntry[] }).entries
  return { entries, map: buildPriceMap({ schemaVersion: '1.0', entries }) }
}

// ── Types ──

export type LoadingState = 'idle' | 'loading' | 'error' | 'success'

export interface CatalogData {
  parts: Part[]
  /** Price map from bundled snapshot */
  priceByPartId: Record<string, string>
  /** Raw snapshot price entries */
  priceEntries: PriceEntry[]
  statusMessage: string
  loadingState: LoadingState
}

// ── Hook ──

export function useCatalogData(): CatalogData {
  const [data, setData] = useState<{
    parts: Part[]
    priceEntries: PriceEntry[]
    priceByPartId: Record<string, string>
    loadingState: LoadingState
  }>({ parts: [], priceEntries: [], priceByPartId: {}, loadingState: 'idle' })

  useEffect(() => {
    let cancelled = false

    Promise.all([loadStaticParts(), loadSnapshotPrices()])
      .then(([parts, snapshot]) => {
        if (!cancelled) {
          setData({
            parts,
            priceEntries: snapshot.entries,
            priceByPartId: snapshot.map,
            loadingState: 'success',
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(prev => ({ ...prev, loadingState: 'error' }))
        }
      })

    return () => { cancelled = true }
  }, [])

  if (data.loadingState !== 'success') {
    return {
      parts: [],
      priceByPartId: {},
      priceEntries: [],
      statusMessage: data.loadingState === 'loading' ? 'Loading catalog data…' : 'Error loading catalog data.',
      loadingState: data.loadingState,
    }
  }

  return {
    parts: data.parts,
    priceByPartId: data.priceByPartId,
    priceEntries: data.priceEntries,
    statusMessage: `${data.parts.length} parts, ${data.priceEntries.length} prices.`,
    loadingState: 'success' as const,
  }
}