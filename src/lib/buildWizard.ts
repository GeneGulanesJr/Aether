/**
 * Build Wizard — gamified PC builder engine.
 *
 * Types, constants, recommendation data, and state helpers
 * for the step-by-step guided build experience.
 */

import type { BuildSlotCategory, Part } from './types'

// ─── Build Mode ──────────────────────────────────────────────────────────────

export type BuildMode = 'guided' | 'custom'

// ─── Core Types ──────────────────────────────────────────────────────────────

export type Platform = 'amd' | 'intel'
export type BudgetTier = 'low' | 'mid' | 'high'
export type UseCase = 'gaming' | 'productivity'

export type WizardStep =
  | 'welcome'
  | 'mode'
  | 'budget'
  | 'usecase'
  | 'compare'
  // guided part steps
  | 'cpu'
  | 'motherboard'
  | 'ram'
  | 'gpu'
  | 'storage'
  | 'psu'
  | 'case'
  | 'review'
  // custom steps
  | 'custom_platform'
  | 'custom_socket'
  | 'custom_parts'

export interface WizardState {
  step: WizardStep
  mode: BuildMode | null
  platform: Platform | null
  budget: BudgetTier | null
  useCase: UseCase | null
  socket: string | null
  selectedParts: Partial<Record<BuildSlotCategory, Part>>
  startedAt: number | null
  completedAt: number | null
}

// ─── Step Definitions ────────────────────────────────────────────────────────

export interface StepInfo {
  id: WizardStep
  label: string
  subtitle: string
  icon: string
  required: boolean
  category?: BuildSlotCategory
}

export const BUILD_STEPS: StepInfo[] = [
  { id: 'cpu',         label: 'CPU',          subtitle: 'The brain of your build',    icon: '🧠', required: true,  category: 'cpu' },
  { id: 'motherboard', label: 'Motherboard',  subtitle: 'The backbone',               icon: '🔌', required: true,  category: 'motherboard' },
  { id: 'ram',         label: 'Memory',       subtitle: 'Smooth multitasking',         icon: '💾', required: true,  category: 'ram' },
  { id: 'gpu',         label: 'Graphics',     subtitle: 'Visual horsepower',           icon: '🎮', required: false, category: 'gpu' },
  { id: 'storage',     label: 'Storage',      subtitle: 'Room for everything',         icon: '💿', required: true,  category: 'storage' },
  { id: 'psu',         label: 'Power',        subtitle: 'Keep the juice flowing',      icon: '⚡', required: true,  category: 'psu' },
  { id: 'case',        label: 'Case',         subtitle: 'House your components',       icon: '🏠', required: false, category: 'case' },
]

/** Steps the user walks through after choosing a platform. */
export const PART_STEPS = BUILD_STEPS.filter((s) => s.category != null)

// ─── Budget Definitions ──────────────────────────────────────────────────────

export interface BudgetOption {
  id: BudgetTier
  label: string
  range: string
  description: string
  icon: string
}

export const BUDGET_OPTIONS: BudgetOption[] = [
  {
    id: 'low',
    label: 'ENTRY LEVEL',
    range: '₱25K – ₱40K',
    description: '1080p gaming, everyday tasks, solid starter build',
    icon: '🥉',
  },
  {
    id: 'mid',
    label: 'MID TIER',
    range: '₱40K – ₱80K',
    description: '1440p gaming, content creation, balanced performance',
    icon: '🥈',
  },
  {
    id: 'high',
    label: 'HIGH END',
    range: '₱80K+',
    description: '4K gaming, heavy workloads, no compromises',
    icon: '🥇',
  },
]

// ─── Use-Case Definitions ────────────────────────────────────────────────────

export interface UseCaseOption {
  id: UseCase
  label: string
  description: string
  icon: string
  emphasis: string[]
}

export const USECASE_OPTIONS: UseCaseOption[] = [
  {
    id: 'gaming',
    label: 'GAMING',
    description: 'Maximize FPS and visual fidelity for your games',
    icon: '🎮',
    emphasis: ['GPU Priority', 'High Refresh Rate', 'Low Latency'],
  },
  {
    id: 'productivity',
    label: 'PRODUCTIVITY',
    description: 'Power through rendering, compiling, and multitasking',
    icon: '⚡',
    emphasis: ['CPU Cores', 'RAM Capacity', 'Fast Storage'],
  },
]

// ─── Recommended Builds (static comparison data) ─────────────────────────────

export interface RecPart {
  name: string
  specs: Record<string, string>
}

export interface RecommendedBuild {
  platform: Platform
  label: string
  tagline: string
  parts: Record<string, RecPart>
  estimatedTotal: string
  score: number
  highlights: string[]
  bestFor: UseCase[]
}

const AMD_BUILDS: Record<BudgetTier, RecommendedBuild> = {
  low: {
    platform: 'amd',
    label: 'AMD Entry',
    tagline: 'Budget king — punch above your weight',
    parts: {
      cpu:          { name: 'Ryzen 5 5600',         specs: { cores: '6C/12T', boost: '4.4 GHz', socket: 'AM4', tdp: '65W' } },
      motherboard:  { name: 'B550M',                 specs: { socket: 'AM4', ram: 'DDR4', form: 'Micro-ATX', pcie: 'Gen 4' } },
      ram:          { name: '16 GB DDR4-3200',       specs: { capacity: '16 GB', speed: '3200 MHz', type: 'DDR4', sticks: '2 × 8' } },
      gpu:          { name: 'RX 6600',               specs: { vram: '8 GB', tdp: '132W', clocks: '2491 MHz', bus: '128-bit' } },
      storage:      { name: '500 GB NVMe SSD',      specs: { capacity: '500 GB', interface: 'NVMe', seq_read: '~3 500 MB/s', form: 'M.2' } },
      psu:          { name: '550W 80+ Bronze',       specs: { wattage: '550W', rating: '80+ Bronze', modular: 'Non-modular' } },
      case:         { name: 'ATX Mid Tower',         specs: { form: 'Mid Tower', fans: '2 included', glass: 'Tempered side' } },
    },
    estimatedTotal: '≈ ₱32 000',
    score: 72,
    highlights: ['Great value 1080p gaming', 'AM4 upgrade path', 'Low power draw'],
    bestFor: ['gaming', 'productivity'],
  },
  mid: {
    platform: 'amd',
    label: 'AMD Mid-Range',
    tagline: 'The sweet spot — performance meets value',
    parts: {
      cpu:          { name: 'Ryzen 7 7700X',         specs: { cores: '8C/16T', boost: '5.4 GHz', socket: 'AM5', tdp: '105W' } },
      motherboard:  { name: 'B650',                   specs: { socket: 'AM5', ram: 'DDR5', form: 'ATX', pcie: 'Gen 4' } },
      ram:          { name: '32 GB DDR5-6000',        specs: { capacity: '32 GB', speed: '6000 MHz', type: 'DDR5', sticks: '2 × 16' } },
      gpu:          { name: 'RX 7800 XT',             specs: { vram: '16 GB', tdp: '263W', clocks: '2430 MHz', bus: '256-bit' } },
      storage:      { name: '1 TB NVMe Gen4',         specs: { capacity: '1 TB', interface: 'NVMe Gen4', seq_read: '~7 000 MB/s', form: 'M.2' } },
      psu:          { name: '750W 80+ Gold',          specs: { wattage: '750W', rating: '80+ Gold', modular: 'Semi-modular' } },
      case:         { name: 'ATX Mid Tower',          specs: { form: 'Mid Tower', fans: '4 included', glass: 'Tempered side' } },
    },
    estimatedTotal: '≈ ₱62 000',
    score: 88,
    highlights: ['Excellent 1440p gaming', 'AM5 future-proof', 'Great multi-core'],
    bestFor: ['gaming', 'productivity'],
  },
  high: {
    platform: 'amd',
    label: 'AMD Flagship',
    tagline: 'No limits — raw power unleashed',
    parts: {
      cpu:          { name: 'Ryzen 9 7950X3D',       specs: { cores: '16C/32T', boost: '5.7 GHz', socket: 'AM5', tdp: '120W' } },
      motherboard:  { name: 'X670E',                  specs: { socket: 'AM5', ram: 'DDR5', form: 'ATX', pcie: 'Gen 5' } },
      ram:          { name: '32 GB DDR5-6000 CL30',   specs: { capacity: '32 GB', speed: '6000 MHz', type: 'DDR5', sticks: '2 × 16' } },
      gpu:          { name: 'RX 7900 XTX',            specs: { vram: '24 GB', tdp: '355W', clocks: '2500 MHz', bus: '384-bit' } },
      storage:      { name: '2 TB NVMe Gen4',         specs: { capacity: '2 TB', interface: 'NVMe Gen4', seq_read: '~7 300 MB/s', form: 'M.2' } },
      psu:          { name: '850W 80+ Gold',          specs: { wattage: '850W', rating: '80+ Gold', modular: 'Fully modular' } },
      case:         { name: 'Premium ATX Tower',      specs: { form: 'Full Tower', fans: '6 included', glass: 'Tempered side' } },
    },
    estimatedTotal: '≈ ₱135 000',
    score: 96,
    highlights: ['Top-tier 4K gaming', '3D V-Cache dominance', '24 GB VRAM'],
    bestFor: ['gaming'],
  },
}

const INTEL_BUILDS: Record<BudgetTier, RecommendedBuild> = {
  low: {
    platform: 'intel',
    label: 'Intel Entry',
    tagline: 'Reliable all-rounder at a great price',
    parts: {
      cpu:          { name: 'Core i5-12400F',         specs: { cores: '6C/12T', boost: '4.4 GHz', socket: 'LGA 1700', tdp: '65W' } },
      motherboard:  { name: 'B660M',                   specs: { socket: 'LGA 1700', ram: 'DDR4', form: 'Micro-ATX', pcie: 'Gen 4' } },
      ram:          { name: '16 GB DDR4-3200',         specs: { capacity: '16 GB', speed: '3200 MHz', type: 'DDR4', sticks: '2 × 8' } },
      gpu:          { name: 'RTX 3060',                specs: { vram: '12 GB', tdp: '170W', clocks: '1777 MHz', bus: '192-bit' } },
      storage:      { name: '500 GB NVMe SSD',        specs: { capacity: '500 GB', interface: 'NVMe', seq_read: '~3 500 MB/s', form: 'M.2' } },
      psu:          { name: '550W 80+ Bronze',         specs: { wattage: '550W', rating: '80+ Bronze', modular: 'Non-modular' } },
      case:         { name: 'ATX Mid Tower',           specs: { form: 'Mid Tower', fans: '2 included', glass: 'Tempered side' } },
    },
    estimatedTotal: '≈ ₱35 000',
    score: 74,
    highlights: ['DLSS & Ray Tracing support', '12 GB VRAM', 'Quick Sync video'],
    bestFor: ['gaming', 'productivity'],
  },
  mid: {
    platform: 'intel',
    label: 'Intel Mid-Range',
    tagline: 'Versatile powerhouse for work & play',
    parts: {
      cpu:          { name: 'Core i5-13600K',         specs: { cores: '14C/20T', boost: '5.1 GHz', socket: 'LGA 1700', tdp: '125W' } },
      motherboard:  { name: 'Z790',                    specs: { socket: 'LGA 1700', ram: 'DDR5', form: 'ATX', pcie: 'Gen 5' } },
      ram:          { name: '32 GB DDR5-6000',         specs: { capacity: '32 GB', speed: '6000 MHz', type: 'DDR5', sticks: '2 × 16' } },
      gpu:          { name: 'RTX 4070',                specs: { vram: '12 GB', tdp: '200W', clocks: '2475 MHz', bus: '192-bit' } },
      storage:      { name: '1 TB NVMe Gen4',          specs: { capacity: '1 TB', interface: 'NVMe Gen4', seq_read: '~7 000 MB/s', form: 'M.2' } },
      psu:          { name: '750W 80+ Gold',            specs: { wattage: '750W', rating: '80+ Gold', modular: 'Semi-modular' } },
      case:         { name: 'ATX Mid Tower',            specs: { form: 'Mid Tower', fans: '4 included', glass: 'Tempered side' } },
    },
    estimatedTotal: '≈ ₱68 000',
    score: 90,
    highlights: ['DLSS 3 Frame Gen', 'Excellent single-thread', 'Great encoding'],
    bestFor: ['productivity', 'gaming'],
  },
  high: {
    platform: 'intel',
    label: 'Intel Flagship',
    tagline: 'Maximum compute — no apologies',
    parts: {
      cpu:          { name: 'Core i9-14900K',         specs: { cores: '24C/32T', boost: '6.0 GHz', socket: 'LGA 1700', tdp: '125W' } },
      motherboard:  { name: 'Z790',                    specs: { socket: 'LGA 1700', ram: 'DDR5', form: 'ATX', pcie: 'Gen 5' } },
      ram:          { name: '32 GB DDR5-6400',         specs: { capacity: '32 GB', speed: '6400 MHz', type: 'DDR5', sticks: '2 × 16' } },
      gpu:          { name: 'RTX 4090',                specs: { vram: '24 GB', tdp: '450W', clocks: '2520 MHz', bus: '384-bit' } },
      storage:      { name: '2 TB NVMe Gen4',          specs: { capacity: '2 TB', interface: 'NVMe Gen4', seq_read: '~7 300 MB/s', form: 'M.2' } },
      psu:          { name: '1000W 80+ Platinum',      specs: { wattage: '1000W', rating: '80+ Platinum', modular: 'Fully modular' } },
      case:         { name: 'Premium ATX Tower',        specs: { form: 'Full Tower', fans: '6 included', glass: 'Tempered side' } },
    },
    estimatedTotal: '≈ ₱155 000',
    score: 98,
    highlights: ['DLSS 3 + Ray Tracing king', '24C/32T brute force', 'Best encoding perf'],
    bestFor: ['productivity'],
  },
}

export function getRecommendations(
  budget: BudgetTier,
  _useCase: UseCase,
): { amd: RecommendedBuild; intel: RecommendedBuild } {
  return { amd: AMD_BUILDS[budget], intel: INTEL_BUILDS[budget] }
}

// ─── Achievements ────────────────────────────────────────────────────────────

// ─── Scoring ─────────────────────────────────────────────────────────────────

const WEIGHT_REQUIRED = 2
const WEIGHT_OPTIONAL = 1

/** Pre-compute weight per step so scoring stays O(n). */
const STEP_WEIGHTS: number[] = PART_STEPS.map((s) =>
  s.required ? WEIGHT_REQUIRED : WEIGHT_OPTIONAL,
)

const WEIGHTED_TOTAL = STEP_WEIGHTS.reduce((a, b) => a + b, 0) // 12

/**
 * Score a partially-filled build.
 *
 * Required slots (cpu, motherboard, ram, storage, psu) count 2× each.
 * Optional slots (gpu, case) count 1× each.
 *
 * Example — only cpu + motherboard filled:
 *   weighted_filled = 2 + 2 = 4
 *   score = Math.round((4 / 12) * 100) = 33
 */
export function buildScore(
  selectedParts: Partial<Record<BuildSlotCategory, Part>>,
): number {
  let weightedFilled = 0
  for (let i = 0; i < PART_STEPS.length; i++) {
    const cat = PART_STEPS[i].category!
    if (selectedParts[cat]) {
      weightedFilled += STEP_WEIGHTS[i]
    }
  }
  return Math.round((weightedFilled / WEIGHTED_TOTAL) * 100)
}

// ─── Step Ordering ───────────────────────────────────────────────────────────

const GUIDED_STEPS: WizardStep[] = [
  'budget', 'usecase', 'compare',
  'cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case',
  'review',
]

const CUSTOM_STEPS: WizardStep[] = [
  'custom_platform', 'custom_socket', 'custom_parts',
  'review',
]

export function nextGuidedStep(current: WizardStep): WizardStep | null {
  const idx = GUIDED_STEPS.indexOf(current)
  return idx >= 0 && idx < GUIDED_STEPS.length - 1 ? GUIDED_STEPS[idx + 1] : null
}

export function prevGuidedStep(current: WizardStep): WizardStep | null {
  const idx = GUIDED_STEPS.indexOf(current)
  return idx > 0 ? GUIDED_STEPS[idx - 1] : null
}

export function nextCustomStep(current: WizardStep): WizardStep | null {
  const idx = CUSTOM_STEPS.indexOf(current)
  return idx >= 0 && idx < CUSTOM_STEPS.length - 1 ? CUSTOM_STEPS[idx + 1] : null
}

export function prevCustomStep(current: WizardStep): WizardStep | null {
  const idx = CUSTOM_STEPS.indexOf(current)
  return idx > 0 ? CUSTOM_STEPS[idx - 1] : null
}

// Backward compat — guided path uses these
export const nextStep = nextGuidedStep
export const prevStep = prevGuidedStep

export const INITIAL_STATE: WizardState = {
  step: 'welcome',
  mode: null,
  platform: null,
  budget: null,
  useCase: null,
  socket: null,
  selectedParts: {},
  startedAt: null,
  completedAt: null,
}

// ═══════════════════════════════════════════════════════════════════════════
// Socket / Compatibility Data
// ═══════════════════════════════════════════════════════════════════════════

export interface SocketOption {
  id: string
  label: string
  platform: Platform
  generation: string
  ramType: 'DDR4' | 'DDR5'
  chipsets: ChipsetOption[]
}

export interface ChipsetOption {
  id: string
  label: string
  features: string[]
}

export const SOCKET_OPTIONS: SocketOption[] = [
  // AMD
  {
    id: 'am4', label: 'AM4', platform: 'amd', generation: 'Zen 2 / Zen 3', ramType: 'DDR4',
    chipsets: [
      { id: 'a320', label: 'A320', features: ['Entry', 'Basic'] },
      { id: 'b450', label: 'B450', features: ['Mid-range', 'Overclocking'] },
      { id: 'b550', label: 'B550', features: ['PCIe 4.0', 'Mid-range'] },
      { id: 'x570', label: 'X570', features: ['PCIe 4.0', 'High-end'] },
    ],
  },
  {
    id: 'am5', label: 'AM5', platform: 'amd', generation: 'Zen 4 / Zen 5', ramType: 'DDR5',
    chipsets: [
      { id: 'a620', label: 'A620', features: ['Entry', 'DDR5'] },
      { id: 'b650', label: 'B650', features: ['PCIe 5.0 SSD', 'Mid-range'] },
      { id: 'x670', label: 'X670', features: ['PCIe 5.0', 'High-end'] },
      { id: 'x670e', label: 'X670E', features: ['PCIe 5.0 x16', 'Flagship'] },
    ],
  },
  // Intel
  {
    id: 'lga1700', label: 'LGA 1700', platform: 'intel', generation: '12th / 13th / 14th Gen', ramType: 'DDR4',
    chipsets: [
      { id: 'b660', label: 'B660', features: ['Mid-range', 'DDR4'] },
      { id: 'h610', label: 'H610', features: ['Entry', 'Basic'] },
      { id: 'z690', label: 'Z690', features: ['Overclocking', 'PCIe 5.0'] },
    ],
  },
  {
    id: 'lga1700_ddr5', label: 'LGA 1700 (DDR5)', platform: 'intel', generation: '12th / 13th / 14th Gen', ramType: 'DDR5',
    chipsets: [
      { id: 'b760', label: 'B760', features: ['Mid-range', 'DDR5'] },
      { id: 'z790', label: 'Z790', features: ['Overclocking', 'PCIe 5.0', 'DDR5'] },
    ],
  },
  {
    id: 'lga1851', label: 'LGA 1851', platform: 'intel', generation: 'Core Ultra 200', ramType: 'DDR5',
    chipsets: [
      { id: 'b860', label: 'B860', features: ['Arrow Lake', 'Mid-range'] },
      { id: 'z890', label: 'Z890', features: ['Arrow Lake', 'Flagship', 'PCIe 5.0'] },
    ],
  },
]

export function getSocketsForPlatform(platform: Platform): SocketOption[] {
  return SOCKET_OPTIONS.filter((s) => s.platform === platform)
}

/**
 * Compatibility filter for parts based on selected socket.
 * Uses spec fields (socket, ram_type) to determine compatibility.
 */
export function isPartCompatible(
  part: Part,
  category: BuildSlotCategory,
  socket: SocketOption,
): boolean {
  // Categories not affected by socket
  if (category === 'gpu' || category === 'storage' || category === 'psu' || category === 'case') {
    return true
  }

  const specs = part.specs

  // CPU must match socket
  if (category === 'cpu') {
    const socketSpec = (specs.socket ?? '').toLowerCase().replace(/\s+/g, '')
    return socketSpec === socket.id.replace('_ddr5', '')
  }

  // Motherboard must match socket
  if (category === 'motherboard') {
    const socketSpec = (specs.socket ?? '').toLowerCase().replace(/\s+/g, '')
    const ramSpec = (specs.ram ?? specs.ram_type ?? '').toUpperCase()
    const socketMatch = socketSpec === socket.id.replace('_ddr5', '')
    const ramMatch = ramSpec === '' || ramSpec === socket.ramType
    return socketMatch && ramMatch
  }

  // RAM must match DDR type
  if (category === 'ram') {
    const typeSpec = (specs.type ?? '').toUpperCase()
    return typeSpec === '' || typeSpec === socket.ramType
  }

  return true
}
