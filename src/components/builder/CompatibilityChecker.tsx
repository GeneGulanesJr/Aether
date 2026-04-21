/**
 * Compatibility checker — warns about build conflicts.
 * xAI theme: warn/error with semantic functional tokens.
 */

import type { BuildSlot } from '../../lib/types'

export type CompatibilityIssue = {
  /** Machine-readable issue code */
  code: 'socket_mismatch' | 'form_factor' | 'wattage_exceeded' | 'ram_gen_mismatch' | 'generic'
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
 *
 * Scaffold: currently returns placeholder issues for demo purposes.
 * Real implementation would check sockets, form factors, wattage, etc.
 */
function checkCompatibility(slots: BuildSlot[]): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = []
  const getPart = (cat: string) =>
    slots.find((s) => s.category === cat)?.part

  // Example: if both CPU and Mobo are selected, check socket match
  const cpu = getPart('cpu')
  const mobo = getPart('motherboard')

  if (cpu && mobo) {
    const cpuSocket = cpu.specs?.socket
    const moboSocket = mobo.specs?.socket
    if (cpuSocket && moboSocket && cpuSocket !== moboSocket) {
      issues.push({
        code: 'socket_mismatch',
        message: `CPU socket (${cpuSocket}) doesn't match motherboard (${moboSocket})`,
        severity: 'error',
        slots: ['cpu', 'motherboard'],
      })
    }
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
          className="xai-card"
          style={{
            borderColor: issue.severity === 'error' ? 'var(--color-xai-error-border)' : 'var(--color-xai-warn-border)',
          }}
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
