/**
 * PSU Wattage Estimator
 * 
 * Estimates total system power draw from component specs and recommends
 * an appropriate PSU wattage with a safety margin.
 * 
 * Uses TDP (Thermal Design Power) values from specs where available,
 * otherwise falls back to heuristic estimates based on model names.
 */

import type { BuildSlot } from '../hooks/useBuild'
import { getSpec } from './types'

export interface WattageEstimate {
  /** Estimated total system power draw in watts */
  totalWatts: number
  /** Recommended PSU wattage (total + 20% headroom, rounded up to nearest 50W) */
  recommendedWatts: number
  /** Per-component wattage breakdown */
  breakdown: ComponentWattage[]
  /** Currently selected PSU wattage (if a PSU is picked) */
  selectedPsuWatts: number | null
  /** Whether the selected PSU is sufficient */
  psuSufficient: boolean | null  // null = no PSU selected
  /** How much headroom the selected PSU has (negative = insufficient) */
  psuHeadroom: number | null
  /** Status label */
  status: 'ok' | 'warning' | 'danger' | 'no_psu' | 'empty'
}

export interface ComponentWattage {
  category: string
  name: string
  watts: number
  /** 'spec' = read from specs, 'estimate' = heuristic guess */
  source: 'spec' | 'estimate'
}

// ── Component Wattage Estimators ──

function estimateCpuWatts(specs: Record<string, string>): number {
  // Try reading TDP directly from specs (supports both labeled & raw keys)
  const tdp = parseWatts(getSpec(specs, 'tdp'))
  if (tdp > 0) return tdp

  // Heuristic from model name
  const name = (specs.name ?? specs.model ?? '').toLowerCase()

  // Intel i9 / Ryzen 9 — high end
  if (name.includes('i9') || name.includes('ryzen 9')) {
    if (/1[3-5]\d{2}/.test(name)) return 250  // 13th-15th gen i9
    return 125
  }
  // Intel i7 / Ryzen 7
  if (name.includes('i7') || name.includes('ryzen 7')) {
    if (/1[3-5]\d{2}/.test(name)) return 200  // newer i7
    return 105
  }
  // Intel i5 / Ryzen 5
  if (name.includes('i5') || name.includes('ryzen 5')) {
    if (/1[3-5]\d{2}/.test(name)) return 150  // newer i5
    return 85
  }
  // Intel i3 / Ryzen 3
  if (name.includes('i3') || name.includes('ryzen 3')) return 65

  // Cores-based fallback (supports both labeled & raw keys)
  const cores = parseInt(getSpec(specs, 'cores')) || 4
  return cores * 18
}

function estimateGpuWatts(specs: Record<string, string>): number {
  // Try reading TDP from specs (supports both labeled & raw keys)
  const tdp = parseWatts(getSpec(specs, 'tdp'))
  if (tdp > 0) return tdp

  const name = (specs.name ?? specs.model ?? '').toLowerCase()

  // NVIDIA RTX 40 series
  if (name.includes('rtx 4090')) return 450
  if (name.includes('rtx 4080')) return 320
  if (name.includes('rtx 4070 ti')) return 285
  if (name.includes('rtx 4070')) return 220
  if (name.includes('rtx 4060 ti')) return 160
  if (name.includes('rtx 4060')) return 115

  // NVIDIA RTX 30 series
  if (name.includes('rtx 3090 ti')) return 450
  if (name.includes('rtx 3090')) return 350
  if (name.includes('rtx 3080 ti')) return 350
  if (name.includes('rtx 3080')) return 320
  if (name.includes('rtx 3070 ti')) return 290
  if (name.includes('rtx 3070')) return 220
  if (name.includes('rtx 3060 ti')) return 200
  if (name.includes('rtx 3060')) return 170
  if (name.includes('rtx 3050')) return 130

  // NVIDIA GTX series
  if (name.includes('gtx 1080 ti')) return 250
  if (name.includes('gtx 1080')) return 180
  if (name.includes('gtx 1070')) return 150
  if (name.includes('gtx 1060')) return 120
  if (name.includes('gtx 1650')) return 75
  if (name.includes('gtx 1050 ti')) return 75
  if (name.includes('gtx 1050')) return 75
  if (name.includes('gt 1030')) return 30

  // AMD RX 7000 series
  if (name.includes('rx 7900 xtx')) return 355
  if (name.includes('rx 7900 xt')) return 315
  if (name.includes('rx 7800 xt')) return 263
  if (name.includes('rx 7700 xt')) return 245
  if (name.includes('rx 7600')) return 165

  // AMD RX 6000 series
  if (name.includes('rx 6950 xt')) return 335
  if (name.includes('rx 6800 xt')) return 300
  if (name.includes('rx 6800')) return 250
  if (name.includes('rx 6700 xt')) return 230
  if (name.includes('rx 6600 xt')) return 160
  if (name.includes('rx 6600')) return 132

  // Integrated graphics — very low
  if (name.includes('integrated') || name.includes('uhd') || name.includes('vega') || name.includes('rdna')) {
    return 15
  }

  // VRAM-based fallback (supports both labeled & raw keys)
  const vram = parseInt(getSpec(specs, 'vram')) || 0
  if (vram >= 12) return 300
  if (vram >= 8) return 200
  if (vram >= 6) return 160
  if (vram >= 4) return 120
  return 75
}

function estimateMoboWatts(specs: Record<string, string>): number {
  // Motherboards typically draw 30-80W depending on VRM and features
  const name = (specs.name ?? specs.model ?? '').toLowerCase()
  if (name.includes('e-atx') || name.includes('eatx')) return 70
  if (name.includes('atx')) return 50
  if (name.includes('micro') || name.includes('m-atx') || name.includes('matx')) return 40
  if (name.includes('mini') || name.includes('m-itx') || name.includes('mitx')) return 35
  return 50
}

function estimateRamWatts(specs: Record<string, string>): number {
  // RAM: ~3W per 8GB stick for DDR4, ~4W for DDR5
  const gb = parseInt(specs.capacity ?? specs.size ?? specs['Total Capacity'] ?? '8') || 8
  const name = (specs.name ?? specs.model ?? '').toLowerCase()
  const wattsPer8gb = name.includes('ddr5') ? 4 : 3
  const sticks = Math.ceil(gb / 8) // estimate number of sticks
  return sticks * wattsPer8gb
}

function estimateStorageWatts(specs: Record<string, string>): number {
  // NVMe SSD: ~5-8W, SATA SSD: ~3-5W, HDD: ~6-10W
  const name = (specs.name ?? specs.model ?? '').toLowerCase()
  if (name.includes('nvme') || name.includes('pcie')) return 8
  if (name.includes('ssd') || name.includes('sata ssd')) return 5
  if (name.includes('hdd') || name.includes('hard')) return 10
  return 6 // assume SSD
}

function estimateCoolerWatts(specs: Record<string, string>): number {
  // AIO pumps: ~5-15W, air cooler fans: ~2-5W
  const name = (specs.name ?? specs.model ?? '').toLowerCase()
  if (name.includes('aio') || name.includes('liquid') || name.includes('water')) return 12
  return 5
}

function estimateFanWatts(specs: Record<string, string>): number {
  // Case fans: ~2-5W per fan
  const count = parseInt(specs.count ?? specs.quantity ?? '1') || 1
  return count * 3
}

// ── Parse wattage string ──

function parseWatts(str: string): number {
  if (!str) return 0
  const num = parseInt(str.replace(/[^\d]/g, ''))
  return num > 0 && num < 2000 ? num : 0
}

// ── Main Estimator ──

export function estimateWattage(slots: BuildSlot[]): WattageEstimate {
  const breakdown: ComponentWattage[] = []
  let totalWatts = 0
  let selectedPsuWatts: number | null = null

  for (const slot of slots) {
    if (!slot.part) continue

    const specs = slot.part.specs ?? {}
    let watts = 0
    const source: 'spec' | 'estimate' = 'estimate'

    switch (slot.category) {
      case 'cpu':
        watts = estimateCpuWatts(specs)
        break
      case 'gpu':
        watts = estimateGpuWatts(specs)
        break
      case 'motherboard':
        watts = estimateMoboWatts(specs)
        break
      case 'ram':
        watts = estimateRamWatts(specs)
        break
      case 'storage':
        watts = estimateStorageWatts(specs)
        break
      case 'cpu_cooler':
        watts = estimateCoolerWatts(specs)
        break
      case 'fans':
        watts = estimateFanWatts(specs)
        break
      case 'psu': {
        const psuW = parseWatts(specs.wattage ?? specs.watts ?? specs.power ?? specs['Wattage'] ?? '')
        if (psuW > 0) selectedPsuWatts = psuW
        watts = 0 // PSU doesn't consume from itself
        break
      }
      default:
        watts = 0
    }

    totalWatts += watts

    if (watts > 0) {
      breakdown.push({
        category: slot.category,
        name: slot.part.name,
        watts,
        source,
      })
    }
  }

  // Sort breakdown: highest wattage first
  breakdown.sort((a, b) => b.watts - a.watts)

  // Recommended = total + 20% headroom, round up to nearest 50W
  const recommendedWatts = Math.ceil((totalWatts * 1.2) / 50) * 50

  // PSU check
  let psuSufficient: boolean | null = null
  let psuHeadroom: number | null = null
  if (selectedPsuWatts !== null) {
    psuHeadroom = selectedPsuWatts - totalWatts
    psuSufficient = psuHeadroom >= 0
  }

  // Status
  let status: WattageEstimate['status']
  if (totalWatts === 0) {
    status = 'empty'
  } else if (selectedPsuWatts === null) {
    status = 'no_psu'
  } else if (psuSufficient === false) {
    status = 'danger'
  } else if ((psuHeadroom ?? 0) < totalWatts * 0.2) {
    status = 'warning' // tight headroom
  } else {
    status = 'ok'
  }

  return {
    totalWatts,
    recommendedWatts,
    breakdown,
    selectedPsuWatts,
    psuSufficient,
    psuHeadroom,
    status,
  }
}