import type {
  CpuSocket, MemoryType, Chipset, MbFormFactor,
  GpuPowerConnector, PsuFormFactor, CoolerType,
  StorageInterface, StorageProtocol, CaseFormFactor,
} from './enums'

// ── Base parse metadata ──────────────────────────────────────────

export interface ParseMeta {
  parserVersion: string
  confidence: number
  warnings: string[]
}

// ── CPU ──────────────────────────────────────────────────────────

export interface CpuNormalized {
  socket: CpuSocket
  tdpWatts: number
  memoryTypesSupported: MemoryType[]
  integratedGraphics: boolean
  cpuSeries?: string
  generation?: number
}

// ── Motherboard ──────────────────────────────────────────────────

export interface MotherboardNormalized {
  socket: CpuSocket
  chipset: Chipset
  formFactor: MbFormFactor
  memoryType: MemoryType
  memorySlots: number
  maxMemoryGb: number
  m2Slots: number
  sataPorts: number
  pcieX16Slots: number
}

// ── RAM ─────────────────────────────────────────────────────────

export interface RamNormalized {
  memoryType: MemoryType
  capacityGb: number
  modules: number
  speedMtS: number
  ecc: boolean
}

// ── GPU ─────────────────────────────────────────────────────────

export interface GpuNormalized {
  vramGb: number
  powerDrawWatts: number
  powerConnectors: GpuPowerConnector[]
  lengthMm?: number
}

// ── PSU ─────────────────────────────────────────────────────────

export interface PsuNormalized {
  wattage: number
  formFactor: PsuFormFactor
  pcie8Pin: number
  pcie16Pin12vhpwr: number
  eps8Pin: number
}

// ── CPU Cooler ──────────────────────────────────────────────────

export interface CpuCoolerNormalized {
  supportedSockets: CpuSocket[]
  heightMm: number | null
  radiatorSizeMm: number | null
  tdpRatingWatts: number
  type: CoolerType
}

// ── Case ────────────────────────────────────────────────────────

export interface CaseNormalized {
  supportedFormFactors: CaseFormFactor[]
  maxGpuLengthMm: number | null
  maxCoolerHeightMm: number | null
  psuFormFactor: PsuFormFactor
  expansionSlots: number
}

// ── Storage ─────────────────────────────────────────────────────

export interface StorageNormalized {
  interface: StorageInterface
  protocol: StorageProtocol
  formFactor: string
  capacityGb: number
}

// ── Discriminated union ─────────────────────────────────────────

export type NormalizedData =
  | { category: 'cpu'; data: CpuNormalized }
  | { category: 'motherboard'; data: MotherboardNormalized }
  | { category: 'ram'; data: RamNormalized }
  | { category: 'gpu'; data: GpuNormalized }
  | { category: 'psu'; data: PsuNormalized }
  | { category: 'cpu_cooler'; data: CpuCoolerNormalized }
  | { category: 'case'; data: CaseNormalized }
  | { category: 'storage'; data: StorageNormalized }
  | { category: 'other'; data: null }

// ── Compatibility issues ─────────────────────────────────────────────

export type CompatibilitySeverity = 'warn' | 'error'

export type CompatibilityCode =
  | 'socket_mismatch'
  | 'ram_gen_mismatch'
  | 'ram_slot_exceeded'
  | 'ram_speed_downclock'
  | 'form_factor'
  | 'gpu_case_length'
  | 'cooler_socket_mismatch'
  | 'cooler_height'
  | 'cooler_height_tight'
  | 'wattage_exceeded'
  | 'wattage_tight'
  | 'no_psu'
  | 'generic'

export interface CompatibilityIssue {
  code: CompatibilityCode
  message: string
  severity: CompatibilitySeverity
  slots: string[]
}


// ── Type guards ──────────────────────────────────────────────────────

export function isCpuNormalized(
  n: NormalizedData
): n is { category: 'cpu'; data: CpuNormalized } {
  return n.category === 'cpu'
}

export function isMotherboardNormalized(
  n: NormalizedData
): n is { category: 'motherboard'; data: MotherboardNormalized } {
  return n.category === 'motherboard'
}

