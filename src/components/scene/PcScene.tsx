import { memo, useMemo } from 'react'
import type { BuildSlotCategory, Part } from '../../lib/types'
import { PART_STEPS } from '../../lib/buildWizard'

interface PcSceneProps {
  selectedParts: Partial<Record<BuildSlotCategory, Part>>
}

/**
 * Pure CSS 3D isometric PC build scene.
 *
 * Each component is a styled <div> positioned in 3D space.
 * Parts "fly in" and assemble when selected in the wizard.
 * Uses CSS perspective + isometric rotation for the 3D effect.
 */
export const PcScene = memo(function PcScene({ selectedParts }: PcSceneProps) {
  const filled = new Set<BuildSlotCategory>(
    Object.keys(selectedParts) as BuildSlotCategory[]
  )

  /* Pre-compute particle positions once — avoids Math.random() on every render */
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => (
        <span
          key={`p-${i}`}
          className="pc-particle"
          style={{
            left: `${((i * 37 + 13) % 100)}%`,
            top: `${((i * 53 + 7) % 100)}%`,
            animationDelay: `${((i * 3 + 1) % 4)}s`,
            animationDuration: `${3 + ((i * 5) % 4)}s`,
          }}
        />
      )),
    [],
  )

  return (
    <div className="pc-scene">
      {/* Ambient floating particles — positions memoised to avoid layout thrash on re-render */}
      <div className="pc-particles">
        {particles}
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
})
