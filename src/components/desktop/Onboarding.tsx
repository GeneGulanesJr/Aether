/**
 * Onboarding overlay — shown when desktop loads with an empty build.
 * Guides first-time users through the OS metaphor.
 */

import { useState, useEffect } from 'react'
import { useWindowManager } from '../../lib/useWindowManager'

const ONBOARDING_KEY = 'aether:onboarding:dismissed'

export function Onboarding() {
  const [visible, setVisible] = useState(false)
  const { openWindow } = useWindowManager()

  useEffect(() => {
    const dismissed = localStorage.getItem(ONBOARDING_KEY)
    if (!dismissed) {
      // Small delay so the desktop fade-in finishes first
      const t = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  if (!visible) return null

  const dismiss = (permanent = false) => {
    setVisible(false)
    if (permanent) localStorage.setItem(ONBOARDING_KEY, '1')
  }

  const startBuild = () => {
    openWindow('my-rig', 'My Rig')
    dismiss(true)
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="xai-card max-w-md w-full mx-4 p-6 relative">
        {/* Dismiss */}
        <button
          onClick={() => dismiss(true)}
          className="absolute top-3 right-3 font-mono text-[0.625rem] text-xai-text-4 hover:text-xai-text transition-colors"
          aria-label="Close onboarding"
        >
          ✕
        </button>

        <h2 className="font-mono text-sm text-xai-text uppercase tracking-wider mb-1">
          Aether
        </h2>
        <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mb-6">
          Desktop Edition
        </p>

        {/* Steps */}
        <div className="flex flex-col gap-4 mb-6">
          <Step
            icon="🖥️"
            title="My Rig"
            desc="Your build workspace. Pick parts, check compatibility, and see total price."
          />
          <Step
            icon="📦"
            title="Marketplace"
            desc="Browse all parts with price comparison across Philippine stores."
          />
          <Step
            icon="💻"
            title="Terminal"
            desc="Power-user CLI. Search, add, and inspect parts with commands."
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button onClick={startBuild} className="xai-btn w-full">
            Start Building
          </button>
          <button
            onClick={() => dismiss(false)}
            className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider hover:text-xai-text transition-colors text-center py-1"
          >
            I know my way around
          </button>
        </div>

        <p className="font-mono text-[0.4375rem] text-xai-text-4 uppercase tracking-wider text-center mt-4">
          Tip: double-click icons to open apps. Drag windows by their title bar.
        </p>
      </div>
    </div>
  )
}

function Step({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg shrink-0" aria-hidden="true">{icon}</span>
      <div>
        <p className="font-mono text-[0.625rem] text-xai-text uppercase tracking-wider">
          {title}
        </p>
        <p className="font-mono text-[0.5rem] text-xai-text-3 leading-relaxed mt-0.5">
          {desc}
        </p>
      </div>
    </div>
  )
}
