import type { BuildSlotCategory } from '../../lib/types'
import type { WizardState } from '../../lib/buildWizard'
import { PART_STEPS } from '../../lib/buildWizard'

interface PcSceneProps {
  state: WizardState
}

/**
 * Pure CSS 3D isometric PC build scene.
 *
 * Each component is a styled <div> positioned in 3D space.
 * Parts "fly in" and assemble when selected in the wizard.
 * Uses CSS perspective + isometric rotation for the 3D effect.
 */
export function PcScene({ state }: PcSceneProps) {
  const filled = new Set<BuildSlotCategory>(
    Object.keys(state.selectedParts) as BuildSlotCategory[]
  )

  return (
    <div className="pc-scene">
      {/* Ambient floating particles */}
      <div className="pc-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="pc-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      {/* 3D isometric viewport */}
      <div className="pc-viewport">
        <div className="pc-isometric">
          {/* ── Grid floor ── */}
          <div className="pc-floor" />

          {/* ── Case frame ── */}
          <div className={`pc-case-frame ${filled.has('case') ? 'assembled' : ''}`}>
            <div className="pc-case-panel pc-case-left" />
            <div className="pc-case-panel pc-case-right" />
            <div className="pc-case-panel pc-case-back" />
            <div className="pc-case-panel pc-case-bottom" />
            <div className="pc-case-led" />
          </div>

          {/* ── Motherboard ── */}
          <div className={`pc-part pc-motherboard ${filled.has('motherboard') ? 'assembled' : ''}`}>
            <div className="pc-mobo-pcb" />
            <div className="pc-mobo-slot" />
            <div className="pc-mobo-slot pc-mobo-slot-2" />
            <div className="pc-mobo-chipset" />
          </div>

          {/* ── CPU ── */}
          <div className={`pc-part pc-cpu ${filled.has('cpu') ? 'assembled' : ''}`}>
            <div className="pc-cpu-die" />
            <div className="pc-cpu-ihs" />
          </div>

          {/* ── CPU Cooler ── */}
          <div className={`pc-part pc-cooler ${filled.has('cpu_cooler') ? 'assembled' : ''}`}>
            <div className="pc-fan-blade" />
            <div className="pc-fan-ring" />
          </div>

          {/* ── RAM sticks ── */}
          <div className={`pc-part pc-ram ${filled.has('ram') ? 'assembled' : ''}`}>
            <div className="pc-ram-stick" />
            <div className="pc-ram-stick pc-ram-stick-2" />
            <div className="pc-ram-led" />
            <div className="pc-ram-led pc-ram-led-2" />
          </div>

          {/* ── GPU ── */}
          <div className={`pc-part pc-gpu ${filled.has('gpu') ? 'assembled' : ''}`}>
            <div className="pc-gpu-body" />
            <div className="pc-gpu-fan" />
            <div className="pc-gpu-fan pc-gpu-fan-2" />
            <div className="pc-gpu-led" />
          </div>

          {/* ── Storage ── */}
          <div className={`pc-part pc-storage ${filled.has('storage') ? 'assembled' : ''}`}>
            <div className="pc-ssd-body" />
            <div className="pc-ssd-label" />
          </div>

          {/* ── PSU ── */}
          <div className={`pc-part pc-psu ${filled.has('psu') ? 'assembled' : ''}`}>
            <div className="pc-psu-body" />
            <div className="pc-psu-fan" />
            <div className="pc-psu-label" />
          </div>

          {/* ── Cable hints ── */}
          {filled.size >= 3 && (
            <div className="pc-cables">
              <div className="pc-cable pc-cable-1" />
              <div className="pc-cable pc-cable-2" />
              <div className="pc-cable pc-cable-3" />
            </div>
          )}

          {/* ── Power-on glow ── */}
          {filled.size >= 5 && (
            <div className="pc-power-glow" />
          )}
        </div>
      </div>

      {/* ── Status text overlay ── */}
      <div className="pc-status">
        <p className="font-mono text-xs text-xai-text-3 uppercase tracking-widest">
          {filled.size === 0
            ? 'awaiting components…'
            : filled.size === PART_STEPS.length
              ? '⚡ system powered on'
              : `${filled.size}/${PART_STEPS.length} components installed`}
        </p>
      </div>
    </div>
  )
}
