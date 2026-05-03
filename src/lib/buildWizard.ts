/**
 * Build Wizard — gamified Aether build engine.
 *
 * Types, constants, recommendation data, and state helpers
 * for the step-by-step guided build experience.
 */

import type { BuildSlotCategory, Part, BuildSlot } from './types'
import { getPartSocket } from './types'
import { checkBuildCompatibility } from './normalized/compatibility'

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
  | 'platform'
  | 'socket'
  // guided part steps
  | 'cpu'
  | 'motherboard'
  | 'ram'
  | 'gpu'
  | 'storage'
  | 'psu'
  | 'case'
  | 'review'

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
/**
 * Score a partially-filled build.
 *
 * Two components:
 *   1. Slot fill (0–70 pts): Required slots (cpu, motherboard, ram, storage, psu)
 *      count 2× each. Optional slots (gpu, case) count 1× each.
 *   2. Compatibility (0–30 pts): Full marks when there are zero errors.
 *      Each error severity issue costs 10 pts (capped at -30).
 *      Warnings don't penalize the score.
 *
 * Example — cpu + motherboard filled, no errors:
 *   fill = (4 / 12) * 70 = 23
 *   compat = 30
 *   score = 53
 */
export function buildScore(
  selectedParts: Partial<Record<BuildSlotCategory, Part>>,
  compatibilityErrors: number = 0,
): number {
  // Slot fill component (0–70 pts)
  let weightedFilled = 0
  for (let i = 0; i < PART_STEPS.length; i++) {
    const cat = PART_STEPS[i].category!
    if (selectedParts[cat]) {
      weightedFilled += STEP_WEIGHTS[i]
    }
  }
  const fillScore = Math.round((weightedFilled / WEIGHTED_TOTAL) * 70)

  // Compatibility component (0–30 pts)
  const compatPenalty = Math.min(compatibilityErrors * 10, 30)
  const compatScore = 30 - compatPenalty

  return fillScore + compatScore
}

// ─── Step Ordering ───────────────────────────────────────────────────────────

const GUIDED_STEPS: WizardStep[] = [
  'budget', 'usecase', 'platform', 'socket',
  'cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case',
  'review',
]

/**
 * Navigate forward through the unified build wizard.
 * Sequence: budget → usecase → platform → socket → [cpu, motherboard, ram, gpu, storage, psu, case] → review
 */
export function nextGuidedStep(current: WizardStep): WizardStep | null {
  const idx = GUIDED_STEPS.indexOf(current)
  return idx >= 0 && idx < GUIDED_STEPS.length - 1 ? GUIDED_STEPS[idx + 1] : null
}

/**
 * Navigate backward through the unified build wizard.
 */
export function prevGuidedStep(current: WizardStep): WizardStep | null {
  const idx = GUIDED_STEPS.indexOf(current)
  return idx > 0 ? GUIDED_STEPS[idx - 1] : null
}

// Backward compat — unified path uses these
export const nextStep = nextGuidedStep
export const prevStep = prevGuidedStep

export const INITIAL_STATE: WizardState = {
  step: 'mode',
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
 * Auto-pick the best default socket for a guided build.
 *
 * Logic:
 *   AMD low  → AM4   (budget-friendly DDR4)
 *   AMD mid+ → AM5   (modern platform, DDR5)
 *   Intel    → LGA 1851 (newest gen, DDR5)
 *
 * Returns null if no socket matches the platform.
 */
export function resolveSocketForGuided(
  platform: Platform,
  budget: BudgetTier,
): SocketOption | null {
  const sockets = getSocketsForPlatform(platform)

  if (platform === 'amd') {
    if (budget === 'low') {
      return sockets.find(s => s.id === 'am4') ?? null
    }
    return sockets.find(s => s.id === 'am5') ?? null
  }

  if (platform === 'intel') {
    return sockets.find(s => s.id === 'lga1851') ?? sockets[0] ?? null
  }

  return null
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

  // Unified socket source: enriched normalized data over raw specs
  const partSocket = getPartSocket(part)

  // CPU must match socket
  if (category === 'cpu') {
    const socketSpec = partSocket.toLowerCase().replace(/\s+/g, '')
    return socketSpec === socket.id.replace('_ddr5', '')
  }

  // Motherboard must match socket
  if (category === 'motherboard') {
    const socketSpec = partSocket.toLowerCase().replace(/\s+/g, '')
    const ramSpec = (part.specs.ram ?? part.specs.ram_type ?? '').toUpperCase()
    const socketMatch = socketSpec === socket.id.replace('_ddr5', '')
    const ramMatch = ramSpec === '' || ramSpec === socket.ramType
    return socketMatch && ramMatch
  }

  // RAM must match DDR type
  if (category === 'ram') {
    const typeSpec = (part.specs.type ?? '').toUpperCase()
    return typeSpec === '' || typeSpec === socket.ramType
  }

  return true
}

/**
 * Check compatibility of a wizard build (selectedParts format).
 * Returns a list of issues the review step can display.
 *
 * Delegates to the normalized compatibility engine after converting
 * the wizard's `Partial<Record<BuildSlotCategory, Part>>` format
 * to the desktop builder's `BuildSlot[]` format.
 */
export interface WizardCompatIssue {
  code: string
  message: string
  severity: 'warn' | 'error'
  categories: BuildSlotCategory[]
}

export function checkWizardCompatibility(
  selectedParts: Partial<Record<BuildSlotCategory, Part>>,
): WizardCompatIssue[] {
  // Convert to BuildSlot[] — filter out empty slots
  const slots: BuildSlot[] = (Object.entries(selectedParts) as [BuildSlotCategory, Part | undefined][])
    .filter(([, part]) => part != null)
    .map(([category, part]) => ({ category, part: part! }))

  // Use the normalized engine
  const normalizedIssues = checkBuildCompatibility(slots)

  // Map normalized issues (slots field) → wizard issues (categories field)
  return normalizedIssues.map((issue): WizardCompatIssue => ({
    ...issue,
    categories: issue.slots as BuildSlotCategory[],
  }))
}

/**
 * Estimate total system wattage from selected parts.
 * Returns estimated draw in watts, or null if not enough data.
 */
export function estimateWattage(
  selectedParts: Partial<Record<BuildSlotCategory, Part>>,
): { estimated: number; psuWattage: number | null } | null {
  const cpu = selectedParts.cpu
  const gpu = selectedParts.gpu
  const psu = selectedParts.psu

  if (!cpu && !gpu) return null

  const cpuTdp = parseFloat(cpu?.specs?.tdp ?? cpu?.specs?.tdp_w ?? '') || 0
  const gpuTdp = parseFloat(gpu?.specs?.tdp ?? gpu?.specs?.tdp_w ?? gpu?.specs?.power ?? '') || 0
  const psuWatt = parseFloat(psu?.specs?.wattage ?? '') || 0

  // CPU+GPU ≈ 60% of system total (disks, RAM, fans, motherboard make up the rest)
  const estimated = Math.round((cpuTdp + gpuTdp) / 0.6)

  return { estimated, psuWattage: psuWatt || null }
}
