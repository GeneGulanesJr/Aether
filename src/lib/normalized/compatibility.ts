/**
 * Compatibility rule engine — reads normalized fields and returns
 * a list of compatibility issues for a build.
 */

import type { BuildSlot } from '../types'
import type { NormalizedData } from './types'
import type { CompatibilityIssue } from '../../components/builder/CompatibilityChecker'

/** Get the normalized data for a slot, if available. */
function getNormalized(slots: BuildSlot[], category: string): NormalizedData | null {
  const slot = slots.find(s => s.category === category)
  if (!slot?.part?.normalized) return null
  if (slot.part.normalized.category === 'other') return null
  return slot.part.normalized
}

/** Helper to get the .data field with type narrowing. */
function data<T>(norm: NormalizedData): T | null {
  return (norm as any).data as T
}

export function checkBuildCompatibility(slots: BuildSlot[]): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = []

  const cpu = getNormalized(slots, 'cpu')
  const mobo = getNormalized(slots, 'motherboard')
  const ram = getNormalized(slots, 'ram')
  const cooler = getNormalized(slots, 'cpu_cooler')
  const pcCase = getNormalized(slots, 'case')

  // ── Rule 1: CPU ↔ Motherboard socket ──────────────────────

  if (cpu && mobo) {
    const cpuData = data<any>(cpu)
    const moboData = data<any>(mobo)
    if (cpuData?.socket && moboData?.socket && cpuData.socket !== moboData.socket) {
      issues.push({
        code: 'socket_mismatch',
        message: `CPU socket (${cpuData.socket}) doesn't match motherboard (${moboData.socket})`,
        severity: 'error',
        slots: ['cpu', 'motherboard'],
      })
    }
  }

  // ── Rule 2: Motherboard ↔ RAM ─────────────────────────────

  if (mobo && ram) {
    const moboData = data<any>(mobo)
    const ramData = data<any>(ram)

    if (moboData?.memoryType && ramData?.memoryType && moboData.memoryType !== ramData.memoryType) {
      issues.push({
        code: 'ram_gen_mismatch',
        message: `Motherboard requires ${moboData.memoryType} but RAM is ${ramData.memoryType}`,
        severity: 'error',
        slots: ['motherboard', 'ram'],
      })
    }

    if (moboData?.memorySlots && ramData?.modules && ramData.modules > moboData.memorySlots) {
      issues.push({
        code: 'ram_slot_exceeded',
        message: `RAM kit has ${ramData.modules} modules but motherboard only has ${moboData.memorySlots} slots`,
        severity: 'error',
        slots: ['motherboard', 'ram'],
      })
    }

    if (moboData?.memoryType === 'DDR4' && ramData?.speedMtS && ramData.speedMtS > 3600) {
      issues.push({
        code: 'ram_speed_downclock',
        message: `DDR4 speed ${ramData.speedMtS}MHz may downclock — most DDR4 boards max at 3600MHz`,
        severity: 'warn',
        slots: ['motherboard', 'ram'],
      })
    }
  }

  // ── Rule 3: Motherboard ↔ Case form factor ────────────────

  if (mobo && pcCase) {
    const moboData = data<any>(mobo)
    const caseData = data<any>(pcCase)
    if (moboData?.formFactor && caseData?.supportedFormFactors) {
      if (!caseData.supportedFormFactors.includes(moboData.formFactor)) {
        issues.push({
          code: 'form_factor',
          message: `Motherboard (${moboData.formFactor}) doesn't fit case (supports ${caseData.supportedFormFactors.join(', ')})`,
          severity: 'error',
          slots: ['motherboard', 'case'],
        })
      }
    }
  }

  // ── Rule 4: GPU ↔ Case length (placeholder for when data available) ──
  // Activates when GPU normalized includes lengthMm

  // ── Rule 5: CPU Cooler ↔ CPU socket ───────────────────────

  if (cooler && cpu) {
    const coolerData = data<any>(cooler)
    const cpuData = data<any>(cpu)
    if (coolerData?.supportedSockets && cpuData?.socket) {
      if (!coolerData.supportedSockets.includes(cpuData.socket)) {
        issues.push({
          code: 'cooler_socket_mismatch',
          message: `Cooler doesn't support CPU socket ${cpuData.socket} (supports ${coolerData.supportedSockets.join(', ')})`,
          severity: 'error',
          slots: ['cpu_cooler', 'cpu'],
        })
      }
    }
  }

  // ── Rule 6: CPU Cooler ↔ Case height/radiator ─────────────

  if (cooler && pcCase) {
    const coolerData = data<any>(cooler)
    const caseData = data<any>(pcCase)
    if (coolerData?.type === 'air' && coolerData?.heightMm && caseData?.maxCoolerHeightMm) {
      if (coolerData.heightMm > caseData.maxCoolerHeightMm) {
        issues.push({
          code: 'cooler_height',
          message: `Cooler height (${coolerData.heightMm}mm) exceeds case max (${caseData.maxCoolerHeightMm}mm)`,
          severity: 'error',
          slots: ['cpu_cooler', 'case'],
        })
      } else if (coolerData.heightMm > caseData.maxCoolerHeightMm - 10) {
        issues.push({
          code: 'cooler_height_tight',
          message: `Cooler fits but only ${caseData.maxCoolerHeightMm - coolerData.heightMm}mm clearance`,
          severity: 'warn',
          slots: ['cpu_cooler', 'case'],
        })
      }
    }
  }

  // ── Rule 7: PSU wattage handled by getWattageIssues() in CompatibilityChecker.tsx ──

  return issues
}
