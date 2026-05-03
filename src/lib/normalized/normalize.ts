/**
 * Normalize raw specs → typed normalized fields.
 *
 * Strategy:
 *   - Read raw specs (case-insensitive key lookup)
 *   - Parse values into canonical enums and numbers
 *   - Return typed NormalizedData with parseMeta
 *
 * Falls back gracefully: if a field can't be parsed, it gets a
 * safe default and a warning is added to parseMeta.warnings.
 */

import type { Part, BuildSlotCategory } from '../types'
import type {
  NormalizedData, CpuNormalized, MotherboardNormalized, RamNormalized,
  GpuNormalized, PsuNormalized, CpuCoolerNormalized, CaseNormalized,
  StorageNormalized, ParseMeta,
} from './types'
import type { CpuSocket, MemoryType, GpuPowerConnector, CoolerType, StorageInterface, StorageProtocol, CaseFormFactor, PsuFormFactor } from './enums'
import { CPU_SOCKETS, MEMORY_TYPES, PSU_FORM_FACTORS } from './enums'
import type { MbFormFactor } from './enums'

const PARSER_VERSION = '1.0.0'

// ── Helpers ─────────────────────────────────────────────────────

type RawSpecs = Record<string, string>

/** Case-insensitive spec lookup. */
function raw(specs: RawSpecs, ...keys: string[]): string {
  for (const k of keys) {
    const lower = k.toLowerCase()
    for (const [sk, sv] of Object.entries(specs)) {
      if (sk.toLowerCase() === lower && sv) return sv
    }
  }
  return ''
}

/** Parse a number from a string, stripping non-numeric chars. */
function parseNum(val: string): number {
  if (!val) return 0
  const n = parseFloat(val.replace(/[^\d.-]/g, ''))
  return isNaN(n) ? 0 : Math.abs(n)
}

/** Parse watts: "65W" → 65, "125W TDP" → 125. */
function parseWatts(val: string): number {
  if (!val) return 0
  const n = parseInt(val.replace(/[^\d]/g, ''))
  return n > 0 && n < 2000 ? n : 0
}

/** Match a value against canonical enums, case-insensitive. */
function matchEnum<T extends readonly string[]>(val: string, enums: T): T[number] | null {
  if (!val) return null
  const clean = val.trim().toUpperCase().replace(/[\s\-_]/g, '')
  for (const e of enums) {
    if (e.toUpperCase().replace(/[\s\-_]/g, '') === clean) return e
  }
  return null
}

/** Match socket — special handling for LGA#### patterns. */
function matchSocket(val: string): CpuSocket | null {
  const m = matchEnum(val, CPU_SOCKETS)
  if (m) return m
  const lga = val.match(/LGA\s*(\d{3,5})/i)
  if (lga) {
    const exact = matchEnum(`LGA${lga[1]}`, CPU_SOCKETS)
    if (exact) return exact
    const num = parseInt(lga[1])
    if (num >= 100 && num <= 9999) return `LGA${lga[1]}` as CpuSocket
  }
  const am = val.match(/AM\s*(\d+)/i)
  if (am) {
    const exact = matchEnum(`AM${am[1]}`, CPU_SOCKETS)
    if (exact) return exact
  }
  return null
}

// ── CPU normalizer ──────────────────────────────────────────────

function normalizeCpu(specs: RawSpecs, name: string): { data: CpuNormalized; warnings: string[] } {
  const warnings: string[] = []

  const socketRaw = raw(specs, 'Socket', 'socket')
  const socket = matchSocket(socketRaw)
  if (!socket) warnings.push('cpu_socket_missing')

  const tdpRaw = raw(specs, 'TDP', 'tdp', 'Power', 'power')
  const tdpWatts = parseWatts(tdpRaw)
  if (tdpWatts === 0) warnings.push('cpu_tdp_missing')

  const memRaw = raw(specs, 'Memory Type', 'memory_type', 'memoryType', 'RAM')
  const memType = matchEnum(memRaw, MEMORY_TYPES) ?? 'DDR4'

  const igRaw = raw(specs, 'Integrated GPU', 'integratedGraphics', 'Graphics')
  const integratedGraphics = /none|no|n\/a/i.test(igRaw) ? false : !!igRaw

  const nameL = name.toLowerCase()
  let cpuSeries: string | undefined
  let generation: number | undefined

  const ryzenMatch = nameL.match(/ryzen\s*(\d)?\s*(\d{4})/i)
  if (ryzenMatch) {
    cpuSeries = `Ryzen ${ryzenMatch[1] || ''}`.trim() || 'Ryzen'
    generation = parseInt(ryzenMatch[2])
  }
  const intelMatch = nameL.match(/(?:core\s+)?(?:i[3579]|ultra)\s*(\d{4,5})/i)
  if (intelMatch) {
    const tier = nameL.match(/i([3579])/i)?.[1]
    if (nameL.includes('ultra')) {
      cpuSeries = 'Core Ultra'
      generation = parseInt(intelMatch[1].substring(0, 3))
    } else if (tier) {
      cpuSeries = `Core i${tier}`
      generation = parseInt(intelMatch[1].substring(0, 2))
    }
  }

  const memoryTypesSupported: MemoryType[] = [memType]
  if (socket === 'AM5' || socket === 'LGA1700' || socket === 'LGA1851') {
    if (!memoryTypesSupported.includes('DDR5')) memoryTypesSupported.push('DDR5')
  }

  return {
    data: {
      socket: socket ?? 'AM4',
      tdpWatts,
      memoryTypesSupported,
      integratedGraphics,
      cpuSeries,
      generation,
    },
    warnings,
  }
}

// ── Motherboard normalizer ──────────────────────────────────────

const CHIPSET_INFO: Record<string, { socket: CpuSocket; ram: MemoryType }> = {
  'A320': { socket: 'AM4', ram: 'DDR4' }, 'B350': { socket: 'AM4', ram: 'DDR4' },
  'B450': { socket: 'AM4', ram: 'DDR4' }, 'X370': { socket: 'AM4', ram: 'DDR4' },
  'X470': { socket: 'AM4', ram: 'DDR4' }, 'X570': { socket: 'AM4', ram: 'DDR4' },
  'A520': { socket: 'AM4', ram: 'DDR4' },
  'A620': { socket: 'AM5', ram: 'DDR5' }, 'B650': { socket: 'AM5', ram: 'DDR5' },
  'X670': { socket: 'AM5', ram: 'DDR5' }, 'X870': { socket: 'AM5', ram: 'DDR5' },
  'B840': { socket: 'AM5', ram: 'DDR5' }, 'B850': { socket: 'AM5', ram: 'DDR5' },
  'H310': { socket: 'LGA1151', ram: 'DDR4' }, 'B360': { socket: 'LGA1151', ram: 'DDR4' },
  'B365': { socket: 'LGA1151', ram: 'DDR4' }, 'Z370': { socket: 'LGA1151', ram: 'DDR4' },
  'Z390': { socket: 'LGA1151', ram: 'DDR4' },
  'H410': { socket: 'LGA1200', ram: 'DDR4' }, 'B460': { socket: 'LGA1200', ram: 'DDR4' },
  'H470': { socket: 'LGA1200', ram: 'DDR4' }, 'Z490': { socket: 'LGA1200', ram: 'DDR4' },
  'B560': { socket: 'LGA1200', ram: 'DDR4' }, 'H510': { socket: 'LGA1200', ram: 'DDR4' },
  'H570': { socket: 'LGA1200', ram: 'DDR4' }, 'Z590': { socket: 'LGA1200', ram: 'DDR4' },
  'H610': { socket: 'LGA1700', ram: 'DDR4' }, 'B660': { socket: 'LGA1700', ram: 'DDR4' },
  'H670': { socket: 'LGA1700', ram: 'DDR4' }, 'Z690': { socket: 'LGA1700', ram: 'DDR5' },
  'B760': { socket: 'LGA1700', ram: 'DDR5' }, 'H770': { socket: 'LGA1700', ram: 'DDR5' },
  'Z790': { socket: 'LGA1700', ram: 'DDR5' },
  'H810': { socket: 'LGA1851', ram: 'DDR5' }, 'B860': { socket: 'LGA1851', ram: 'DDR5' },
  'H870': { socket: 'LGA1851', ram: 'DDR5' }, 'Z890': { socket: 'LGA1851', ram: 'DDR5' },
}

function normalizeMotherboard(specs: RawSpecs, name: string): { data: MotherboardNormalized; warnings: string[] } {
  const warnings: string[] = []

  let chipset = raw(specs, 'Chipset', 'chipset')
  if (!chipset) {
    const sorted = Object.keys(CHIPSET_INFO).sort((a, b) => b.length - a.length)
    for (const ch of sorted) {
      if (new RegExp(`\\b${ch}[A-Z]*\\b`, 'i').test(name)) {
        chipset = ch
        break
      }
    }
  }
  if (!chipset) warnings.push('mb_chipset_missing')

  const info = chipset ? CHIPSET_INFO[chipset.toUpperCase()] : null
  const socket: CpuSocket = matchSocket(raw(specs, 'Socket', 'socket')) ?? info?.socket ?? 'AM4'
  const memoryType: MemoryType = matchEnum(raw(specs, 'RAM', 'ram', 'Memory Type'), MEMORY_TYPES) ?? info?.ram ?? 'DDR4'

  let formFactor: MbFormFactor = 'ATX' as MbFormFactor
  const nameL = name.toLowerCase()
  if (/mini.?itx|mitx/i.test(nameL)) formFactor = 'Mini-ITX'
  else if (/micro.?atx|m.?atx|matx/i.test(nameL)) formFactor = 'Micro-ATX'
  else if (/e.?atx|eatx/i.test(nameL)) formFactor = 'E-ATX'

  const memSlotsRaw = raw(specs, 'Memory Slots', 'memorySlots', 'DIMM Slots')
  const memorySlots = parseNum(memSlotsRaw) || (formFactor === 'Mini-ITX' ? 2 : 4)

  const maxMemRaw = raw(specs, 'Max Memory', 'maxMemory')
  const maxMemoryGb = parseNum(maxMemRaw) || (memorySlots * 48)

  const m2Slots = parseNum(raw(specs, 'M.2 Slots', 'm2Slots')) || (chipset && /^[XBZ]/i.test(chipset) ? 3 : 1)
  const sataPorts = parseNum(raw(specs, 'SATA Ports', 'sataPorts')) || 4
  const pcieX16Slots = parseNum(raw(specs, 'PCIe x16', 'pcieX16Slots')) || 1

  return {
    data: {
      socket, chipset: chipset ?? '', formFactor, memoryType,
      memorySlots, maxMemoryGb, m2Slots, sataPorts, pcieX16Slots,
    },
    warnings,
  }
}

// ── RAM normalizer ──────────────────────────────────────────────

function normalizeRam(specs: RawSpecs, name: string): { data: RamNormalized; warnings: string[] } {
  const warnings: string[] = []

  const memType = matchEnum(raw(specs, 'Type', 'type', 'Memory Type', 'RAM'), MEMORY_TYPES) ?? 'DDR4'

  let capacityGb = parseNum(raw(specs, 'Capacity', 'capacity', 'Size', 'size'))
  if (capacityGb === 0) {
    const capMatch = name.match(/(\d+)\s*GB/i)
    if (capMatch) capacityGb = parseInt(capMatch[1])
  }
  if (capacityGb === 0) warnings.push('ram_capacity_missing')

  const modulesMatch = name.match(/(\d+)\s*[x×]\s*\d+\s*GB/i)
  const modules = modulesMatch ? parseInt(modulesMatch[1]) : 1

  const speedRaw = raw(specs, 'Speed', 'speed', 'Clock')
  let speedMtS = parseNum(speedRaw)
  if (speedMtS === 0) {
    const speedMatch = name.match(/(\d{4,5})\s*MHz/i)
    if (speedMatch) speedMtS = parseInt(speedMatch[1])
  }

  const eccRaw = raw(specs, 'ECC', 'ecc')
  const ecc = /yes|true/i.test(eccRaw)

  return {
    data: { memoryType: memType, capacityGb, modules, speedMtS, ecc },
    warnings,
  }
}

// ── GPU normalizer ──────────────────────────────────────────────

function normalizeGpu(specs: RawSpecs, name: string): { data: GpuNormalized; warnings: string[] } {
  const warnings: string[] = []

  let vramGb = parseNum(raw(specs, 'VRAM', 'vram', 'Memory'))
  if (vramGb === 0) {
    const vramMatch = name.match(/(\d+)\s*GB/i)
    if (vramMatch) vramGb = parseInt(vramMatch[1])
  }
  if (vramGb === 0) warnings.push('gpu_vram_missing')

  let powerDrawWatts = parseWatts(raw(specs, 'TDP', 'tdp', 'Power', 'power'))
  if (powerDrawWatts === 0) {
    const nameL = name.toLowerCase()
    const gpuWattMap: Record<string, number> = {
      'rtx 4090': 450, 'rtx 4080': 320, 'rtx 4070 ti': 285, 'rtx 4070': 220,
      'rtx 4060 ti': 160, 'rtx 4060': 115,
      'rtx 3090': 350, 'rtx 3080': 320, 'rtx 3070': 220, 'rtx 3060': 170,
      'rx 7900 xtx': 355, 'rx 7900 xt': 315, 'rx 7800 xt': 263,
    }
    for (const [pattern, watts] of Object.entries(gpuWattMap)) {
      if (nameL.includes(pattern)) { powerDrawWatts = watts; break }
    }
    if (powerDrawWatts === 0) {
      if (vramGb >= 16) powerDrawWatts = 300
      else if (vramGb >= 12) powerDrawWatts = 250
      else if (vramGb >= 8) powerDrawWatts = 200
      else if (vramGb >= 6) powerDrawWatts = 160
      else powerDrawWatts = 120
      warnings.push('gpu_power_estimate')
    }
  }

  const powerConnectors: GpuPowerConnector[] = []
  if (name.toLowerCase().includes('4090') || name.toLowerCase().includes('4080') || /12vhpwr/i.test(name)) {
    powerConnectors.push('12VHPWR')
  } else {
    powerConnectors.push('8-pin')
  }

  return {
    data: { vramGb, powerDrawWatts, powerConnectors },
    warnings,
  }
}

// ── PSU normalizer ──────────────────────────────────────────────

function normalizePsu(specs: RawSpecs, name: string): { data: PsuNormalized; warnings: string[] } {
  const warnings: string[] = []

  const wattage = parseNum(raw(specs, 'Wattage', 'wattage', 'Power', 'power', 'Watts')) || parseWatts(name)
  if (wattage === 0) warnings.push('psu_wattage_missing')

  const formFactor: PsuFormFactor = matchEnum(raw(specs, 'Form Factor', 'formFactor'), PSU_FORM_FACTORS) ?? 'ATX'

  const pcie8Pin = parseNum(raw(specs, 'PCIe 8-pin', 'pcie8pin', '8-pin')) || (wattage >= 750 ? 3 : wattage >= 550 ? 2 : 1)
  const pcie16Pin12vhpwr = /12vhpwr|12v-2x6/i.test(name) ? 1 : (parseNum(raw(specs, '12VHPWR', 'pcie16Pin')) || 0)
  const eps8Pin = parseNum(raw(specs, 'EPS', 'eps8pin', 'CPU 8-pin')) || 1

  return {
    data: { wattage, formFactor, pcie8Pin, pcie16Pin12vhpwr, eps8Pin },
    warnings,
  }
}

// ── CPU Cooler normalizer ───────────────────────────────────────

function normalizeCpuCooler(specs: RawSpecs, name: string): { data: CpuCoolerNormalized; warnings: string[] } {
  const warnings: string[] = []
  const nameL = name.toLowerCase()

  const isAio = /aio|liquid|water|cooling/i.test(nameL)
  const type: CoolerType = isAio ? 'aio' : 'air'

  const socketsRaw = raw(specs, 'Sockets', 'socket', 'Supported Sockets')
  let supportedSockets: CpuSocket[] = []
  if (socketsRaw) {
    for (const s of socketsRaw.split(/[,/]/)) {
      const matched = matchSocket(s.trim())
      if (matched) supportedSockets.push(matched)
    }
  }
  if (supportedSockets.length === 0) {
    supportedSockets = ['AM4', 'AM5', 'LGA1700', 'LGA1851']
    warnings.push('cooler_sockets_defaulted')
  }

  const heightMm = isAio ? null : (parseNum(raw(specs, 'Height', 'height')) || null)
  const radMatch = nameL.match(/(\d{2,3})\s*mm/i)
  const radiatorSizeMm = isAio ? (radMatch ? parseInt(radMatch[1]) : 240) : null

  const tdpRatingWatts = parseNum(raw(specs, 'TDP', 'tdp', 'TDP Rating')) || 150

  return {
    data: { supportedSockets, heightMm, radiatorSizeMm, tdpRatingWatts, type },
    warnings,
  }
}

// ── Case normalizer ─────────────────────────────────────────────

function normalizeCase(specs: RawSpecs, name: string): { data: CaseNormalized; warnings: string[] } {
  const warnings: string[] = []
  const nameL = name.toLowerCase()

  const supportedFormFactors: CaseFormFactor[] = []
  const ffRaw = raw(specs, 'Form Factor', 'formFactor', 'Supported Form Factors')
  if (ffRaw) {
    if (/e-?atx/i.test(ffRaw)) supportedFormFactors.push('E-ATX')
    if (/atx/i.test(ffRaw) && !/micro|mini/i.test(ffRaw)) supportedFormFactors.push('ATX')
    if (/micro-?atx|m-?atx/i.test(ffRaw)) supportedFormFactors.push('Micro-ATX')
    if (/mini-?itx|m-?itx/i.test(ffRaw)) supportedFormFactors.push('Mini-ITX')
  }
  if (supportedFormFactors.length === 0) {
    if (/mini.?itx/i.test(nameL)) supportedFormFactors.push('Mini-ITX')
    if (/micro.?atx|m.?atx/i.test(nameL)) supportedFormFactors.push('Micro-ATX')
    supportedFormFactors.push('ATX')
  }

  const maxGpuLengthMm = parseNum(raw(specs, 'Max GPU Length', 'maxGpuLength', 'GPU Clearance')) || null
  const maxCoolerHeightMm = parseNum(raw(specs, 'Max Cooler Height', 'maxCoolerHeight', 'CPU Cooler Clearance')) || null
  const psuFormFactor: PsuFormFactor = matchEnum(raw(specs, 'PSU Form Factor', 'psuFormFactor'), PSU_FORM_FACTORS) ?? 'ATX'
  const expansionSlots = parseNum(raw(specs, 'Expansion Slots', 'expansionSlots')) || 7

  return {
    data: { supportedFormFactors, maxGpuLengthMm, maxCoolerHeightMm, psuFormFactor, expansionSlots },
    warnings,
  }
}

// ── Storage normalizer ──────────────────────────────────────────

function normalizeStorage(specs: RawSpecs, name: string): { data: StorageNormalized; warnings: string[] } {
  const warnings: string[] = []
  const nameL = name.toLowerCase()

  const isNvme = /nvme|pcie|m\.2/i.test(nameL)
  const interface_: StorageInterface = isNvme ? 'M.2' : 'SATA'
  const protocol: StorageProtocol = isNvme ? 'NVMe' : 'SATA'

  let formFactor = '2.5"'
  if (isNvme) {
    const m2Match = nameL.match(/(\d{4})/)
    formFactor = m2Match ? `M.2 ${m2Match[1]}` : 'M.2 2280'
  } else if (/3\.5/i.test(nameL)) {
    formFactor = '3.5"'
  }

  const capacityGb = parseNum(raw(specs, 'Capacity', 'capacity', 'Size', 'size')) || parseNum(name)

  return {
    data: { interface: interface_, protocol, formFactor, capacityGb },
    warnings,
  }
}

// ── Main entry point ────────────────────────────────────────────

export function normalizePart(part: Part): { normalized: NormalizedData; meta: ParseMeta } | null {
  const category = part.category as BuildSlotCategory
  const specs = part.specs ?? {}
  const name = part.name ?? ''

  const SKIP_CATEGORIES = new Set(['fans', 'monitor', 'other'])
  if (SKIP_CATEGORIES.has(category)) {
    return { normalized: { category: 'other', data: null }, meta: { parserVersion: PARSER_VERSION, confidence: 1, warnings: [] } }
  }

  let result: { data: NormalizedData['data']; warnings: string[] } | null = null

  switch (category) {
    case 'cpu':
      result = normalizeCpu(specs, name)
      return {
        normalized: { category, data: result.data as CpuNormalized },
        meta: { parserVersion: PARSER_VERSION, confidence: result.warnings.length === 0 ? 1 : 0.7, warnings: result.warnings },
      }
    case 'motherboard':
      result = normalizeMotherboard(specs, name)
      return {
        normalized: { category, data: result.data as MotherboardNormalized },
        meta: { parserVersion: PARSER_VERSION, confidence: result.warnings.length === 0 ? 1 : 0.7, warnings: result.warnings },
      }
    case 'ram':
      result = normalizeRam(specs, name)
      return {
        normalized: { category, data: result.data as RamNormalized },
        meta: { parserVersion: PARSER_VERSION, confidence: result.warnings.length === 0 ? 1 : 0.6, warnings: result.warnings },
      }
    case 'gpu':
      result = normalizeGpu(specs, name)
      return {
        normalized: { category, data: result.data as GpuNormalized },
        meta: { parserVersion: PARSER_VERSION, confidence: result.warnings.length === 0 ? 1 : 0.7, warnings: result.warnings },
      }
    case 'psu':
      result = normalizePsu(specs, name)
      return {
        normalized: { category, data: result.data as PsuNormalized },
        meta: { parserVersion: PARSER_VERSION, confidence: result.warnings.length === 0 ? 1 : 0.7, warnings: result.warnings },
      }
    case 'cpu_cooler':
      result = normalizeCpuCooler(specs, name)
      return {
        normalized: { category, data: result.data as CpuCoolerNormalized },
        meta: { parserVersion: PARSER_VERSION, confidence: result.warnings.length === 0 ? 1 : 0.6, warnings: result.warnings },
      }
    case 'case':
      result = normalizeCase(specs, name)
      return {
        normalized: { category, data: result.data as CaseNormalized },
        meta: { parserVersion: PARSER_VERSION, confidence: result.warnings.length === 0 ? 1 : 0.6, warnings: result.warnings },
      }
    case 'storage':
      result = normalizeStorage(specs, name)
      return {
        normalized: { category, data: result.data as StorageNormalized },
        meta: { parserVersion: PARSER_VERSION, confidence: result.warnings.length === 0 ? 1 : 0.6, warnings: result.warnings },
      }
    default:
      return { normalized: { category: 'other', data: null }, meta: { parserVersion: PARSER_VERSION, confidence: 0, warnings: ['unknown_category'] } }
  }
}
