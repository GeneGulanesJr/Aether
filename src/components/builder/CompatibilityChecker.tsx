/**
 * Compatibility checker — warns about build conflicts.
 * xAI theme: warn/error with semantic functional tokens.
 */

import { getSpec } from '../../lib/types'

import type { BuildSlot } from '../../lib/types'
import type { WattageEstimate } from '../../lib/wattageEstimator'

export type CompatibilityIssue = {
  /** Machine-readable issue code */
  code: 'socket_mismatch' | 'form_factor' | 'wattage_exceeded' | 'wattage_tight' | 'no_psu' | 'ram_gen_mismatch' | 'generic'
  /** Human-readable description */
  message: string
  /** Severity level */
  severity: 'warn' | 'error'
  /** The slots involved in this issue */
  slots: string[]
}

type CompatibilityCheckerProps = {
  slots: BuildSlot[]
}

/**
 * Check compatibility between selected parts.
 * Returns a list of issues found.
 */
function checkCompatibility(slots: BuildSlot[]): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = []
  const getPart = (cat: string) =>
    slots.find((s) => s.category === cat)?.part

  // Socket match
  const cpu = getPart('cpu')
  const mobo = getPart('motherboard')

  if (cpu && mobo) {
    const cpuSocket = getSpec(cpu.specs ?? {}, 'socket')
    const moboSocket = getSpec(mobo.specs ?? {}, 'socket')
    if (cpuSocket && moboSocket && cpuSocket !== moboSocket) {
      issues.push({
        code: 'socket_mismatch',
        message: `CPU socket (${cpuSocket}) doesn't match motherboard (${moboSocket})`,
        severity: 'error',
        slots: ['cpu', 'motherboard'],
      })
    }
  }

  // PSU wattage check
  // Import is done at the component level to avoid circular deps

  return issues
}

/**
 * Add wattage issues to the compatibility list.
 * Called separately because it needs the WattageEstimate result.
 */
export function getWattageIssues(estimate: WattageEstimate): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = []

  if (estimate.status === 'danger') {
    issues.push({
      code: 'wattage_exceeded',
      message: `PSU (${estimate.selectedPsuWatts}W) can't handle estimated load (${estimate.totalWatts}W). Need ${estimate.recommendedWatts}W+`,
      severity: 'error',
      slots: ['psu'],
    })
  } else if (estimate.status === 'warning') {
    issues.push({
      code: 'wattage_tight',
      message: `PSU (${estimate.selectedPsuWatts}W) is running tight. Estimated load ${estimate.totalWatts}W, recommended ${estimate.recommendedWatts}W`,
      severity: 'warn',
      slots: ['psu'],
    })
  } else if (estimate.status === 'no_psu' && estimate.totalWatts > 0) {
    issues.push({
      code: 'no_psu',
      message: `No PSU selected. Estimated load: ${estimate.totalWatts}W — recommend ${estimate.recommendedWatts}W+`,
      severity: 'warn',
      slots: ['psu'],
    })
  }

  return issues
}

export function CompatibilityChecker({ slots }: CompatibilityCheckerProps) {
  const issues = checkCompatibility(slots)

  if (issues.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[0.625rem] text-xai-text-3 uppercase tracking-wider">
        Compatibility
      </p>
      {issues.map((issue, i) => (
        <div
          key={i}
          className={`xai-card ${issue.severity === 'error' ? 'border-xai-error-border' : 'border-xai-warn-border'}`}
        >
          <div className="flex items-start gap-2">
            {/* Icon */}
            <svg
              viewBox="0 0 24 24"
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                issue.severity === 'error' ? 'text-xai-error' : 'text-xai-warn'
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p
                className={`font-mono text-xs ${
                  issue.severity === 'error' ? 'text-xai-error' : 'text-xai-warn'
                }`}
              >
                {issue.message}
              </p>
              <p className="font-mono text-[0.625rem] text-xai-text-4 mt-0.5">
                {issue.slots.join(' ↔ ')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
