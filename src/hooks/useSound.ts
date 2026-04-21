import { useRef, useEffect, useMemo } from 'react'
import { TiksEngine } from '@rexa-developer/tiks'

/**
 * Singleton TiksEngine — shared across all components via ref.
 * Initialized on first user gesture (browser autoplay policy).
 */
let sharedEngine: TiksEngine | null = null

function getEngine(): TiksEngine {
  if (!sharedEngine) {
    sharedEngine = new TiksEngine()
  }
  return sharedEngine
}

/**
 * Hook for UI sounds. Returns sound methods + mute/volume controls.
 *
 * Usage:
 *   const sound = useSound()
 *   <button onClick={() => { sound.click(); doStuff() }}>...</button>
 */
export function useSound() {
  const engineRef = useRef(getEngine())
  const initialized = useRef(false)

  // Initialize on first mount (lazy — waits for user gesture)
  useEffect(() => {
    if (!initialized.current) {
      engineRef.current.init({ theme: 'soft', volume: 0.8 })
      initialized.current = true
    }
  }, [])

  return useMemo(() => {
    const e = engineRef.current
    return {
      click: () => e.click(),
      toggle: (on: boolean) => e.toggle(on),
      success: () => e.success(),
      error: () => e.error(),
      warning: () => e.warning(),
      hover: () => e.hover(),
      pop: () => e.pop(),
      swoosh: () => e.swoosh(),
      notify: () => e.notify(),
      mute: () => e.mute(),
      unmute: () => e.unmute(),
      setVolume: (v: number) => e.setVolume(v),
    }
  }, [])
}

/**
 * Non-hook version for use outside React components (e.g., in event handlers).
 */
export function playClick() { getEngine().click() }
export function playPop() { getEngine().pop() }
export function playSuccess() { getEngine().success() }
export function playToggle(on: boolean) { getEngine().toggle(on) }
