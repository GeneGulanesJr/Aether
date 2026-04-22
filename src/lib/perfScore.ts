/**
 * Performance Score Calculator
 * 
 * Maps PC build component specs to a Doom-game FPS target and visual quality tier.
 * Uses heuristic scoring based on CPU cores/GHz, GPU VRAM/model, RAM GB/speed.
 */

import type { BuildSlot } from '../hooks/useBuild'
import { getSpec } from './types'

export interface PerfProfile {
  /** Target FPS cap for the game engine */
  targetFps: number
  /** Visual quality tier 0-4 */
  qualityTier: number
  /** Canvas render scale (0.25–1.0), lower = pixelated retro look */
  renderScale: number
  /** Max ray-cast draw distance (map cells) */
  drawDistance: number
  /** 0-100 composite performance score */
  score: number
  /** Human-readable label */
  label: string
  /** Quality tier name */
  qualityName: string
  /** Number of dynamic lights allowed */
  maxLights: number
  /** Is specular lighting enabled? */
  specularEnabled: boolean
  /** Is distance fog enabled (hides pop-in at low draw dist)? */
  fogEnabled: boolean
  /** Are textures filtered (LINEAR) vs pixelated (NEAREST)? */
  smoothTextures: boolean
}

// ── Component Scoring ──

interface CpuScore { score: number; label: string }
interface GpuScore { score: number; label: string }
interface RamScore { score: number; label: string }

function scoreCpu(specs: Record<string, string>): CpuScore {
  const name = (specs.name ?? specs.model ?? '').toLowerCase()
  const cores = parseInt(getSpec(specs, 'cores')) || 4
  const ghz = parseFloat(getSpec(specs, 'baseClock').replace(/[^0-9.]/g, '')) || 3.0

  // Base score from cores × frequency
  let base = cores * ghz * 3

  // Brand/model bonuses
  if (name.includes('i9') || name.includes('ryzen 9')) base += 30
  else if (name.includes('i7') || name.includes('ryzen 7')) base += 20
  else if (name.includes('i5') || name.includes('ryzen 5')) base += 10
  else if (name.includes('i3') || name.includes('ryzen 3')) base += 0

  // Gen bonuses (rough heuristic)
  if (/1[3-5]\d{2}/.test(name)) base += 15 // 13th-15th gen Intel / Ryzen 7000-9000
  else if (/1[0-2]\d{2}/.test(name)) base += 10

  const score = Math.min(100, Math.max(5, base))

  let label = 'Basic CPU'
  if (score >= 70) label = 'High-End CPU'
  else if (score >= 40) label = 'Mid-Range CPU'
  else if (score >= 20) label = 'Budget CPU'

  return { score, label }
}

function scoreGpu(specs: Record<string, string>): GpuScore {
  const name = (specs.name ?? specs.model ?? '').toLowerCase()
  const vram = parseInt(getSpec(specs, 'vram')) || 4

  // Base from VRAM
  let base = vram * 4

  // GPU tier bonuses
  if (name.includes('rtx 4090')) base = 100
  else if (name.includes('rtx 4080')) base = 90
  else if (name.includes('rtx 4070')) base = 80
  else if (name.includes('rtx 4060')) base = 65
  else if (name.includes('rtx 3090')) base = 85
  else if (name.includes('rtx 3080')) base = 78
  else if (name.includes('rtx 3070')) base = 68
  else if (name.includes('rtx 3060')) base = 55
  else if (name.includes('rtx 3050')) base = 40
  else if (name.includes('gtx 1080')) base = 45
  else if (name.includes('gtx 1070')) base = 38
  else if (name.includes('gtx 1060')) base = 30
  else if (name.includes('gtx 1050')) base = 20
  else if (name.includes('gt 1030')) base = 10
  else if (name.includes('rx 7900')) base = 88
  else if (name.includes('rx 7800')) base = 75
  else if (name.includes('rx 6700')) base = 55
  else if (name.includes('rx 6600')) base = 45
  else if (name.includes('integrated') || name.includes('uhd') || name.includes('vega')) base = Math.min(base, 15)
  else if (name.includes('rdna')) base = Math.max(base, 25)

  const score = Math.min(100, Math.max(5, base))

  let label = 'Basic GPU'
  if (score >= 70) label = 'High-End GPU'
  else if (score >= 40) label = 'Mid-Range GPU'
  else if (score >= 20) label = 'Budget GPU'

  return { score, label }
}

function scoreRam(specs: Record<string, string>): RamScore {
  const name = (specs.name ?? specs.model ?? '').toLowerCase()
  const gb = parseInt(specs.capacity ?? specs.size ?? specs['Total Capacity'] ?? '8') || 8
  const speed = parseInt(specs.speed ?? specs.frequency ?? '') || 3200

  let base = gb * 1.5

  // Speed bonuses
  if (speed >= 6000) base += 20
  else if (speed >= 4800) base += 15
  else if (speed >= 3600) base += 10
  else if (speed >= 3200) base += 5

  // DDR5 bonus
  if (name.includes('ddr5')) base += 10

  const score = Math.min(100, Math.max(5, base))

  let label = 'Basic RAM'
  if (score >= 60) label = 'Plenty of RAM'
  else if (score >= 30) label = 'Adequate RAM'

  return { score, label }
}

// ── Composite Score ──

export function computePerfProfile(slots: BuildSlot[]): PerfProfile {
  const cpuSlot = slots.find(s => s.category === 'cpu')
  const gpuSlot = slots.find(s => s.category === 'gpu')
  const ramSlot = slots.find(s => s.category === 'ram')

  // If no parts selected at all, give a minimal score
  const cpu = cpuSlot?.part ? scoreCpu(cpuSlot.part.specs) : { score: 10, label: 'No CPU' }
  const gpu = gpuSlot?.part ? scoreGpu(gpuSlot.part.specs) : { score: 5, label: 'No GPU (Integrated)' }
  const ram = ramSlot?.part ? scoreRam(ramSlot.part.specs) : { score: 8, label: 'No RAM' }

  // Weighted composite: GPU matters most for gaming, then CPU, then RAM
  const composite = Math.round(cpu.score * 0.3 + gpu.score * 0.55 + ram.score * 0.15)

  // Map composite score to FPS
  // 5  → 8 fps   (unplayable slideshow)
  // 20 → 15 fps  (barely playable)
  // 40 → 30 fps  (console-like)
  // 60 → 45 fps  (good)
  // 80 → 60 fps  (smooth)
  // 95 → 75 fps  (buttery)
  const targetFps = Math.round(8 + (composite / 100) * 67)

  // Quality tier: 0=lowest, 4=ultra
  let qualityTier = 0
  if (composite >= 80) qualityTier = 4
  else if (composite >= 60) qualityTier = 3
  else if (composite >= 40) qualityTier = 2
  else if (composite >= 20) qualityTier = 1

  // Render scale: low-end gets pixelated, high-end gets crisp
  const renderScale = qualityTier >= 4 ? 1.0
    : qualityTier >= 3 ? 0.75
    : qualityTier >= 2 ? 0.5
    : qualityTier >= 1 ? 0.35
    : 0.25

  // Draw distance
  const drawDistance = qualityTier >= 4 ? 20
    : qualityTier >= 3 ? 16
    : qualityTier >= 2 ? 12
    : qualityTier >= 1 ? 8
    : 6

  let label = 'Unplayable'
  if (targetFps >= 60) label = 'Ultra Smooth'
  else if (targetFps >= 45) label = 'Smooth'
  else if (targetFps >= 30) label = 'Playable'
  else if (targetFps >= 15) label = 'Choppy'

  // Quality settings per tier
  const QUALITY_NAMES = ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA']
  const qualityName = QUALITY_NAMES[qualityTier]
  const maxLights = [1, 3, 6, 10, 16][qualityTier]
  const specularEnabled = qualityTier >= 2
  const fogEnabled = qualityTier <= 2
  const smoothTextures = qualityTier >= 2

  return {
    targetFps,
    qualityTier,
    renderScale,
    drawDistance,
    score: composite,
    label,
    qualityName,
    maxLights,
    specularEnabled,
    fogEnabled,
    smoothTextures,
  }
}