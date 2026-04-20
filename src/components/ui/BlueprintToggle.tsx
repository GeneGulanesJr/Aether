import { useState } from 'react'
import type { ReactNode } from 'react'

type BlueprintProviderProps = {
  children: (blueprint: boolean) => ReactNode
}

/**
 * Blueprint Mode toggle.
 * When active: component images disappear, replaced by technical schematics.
 * Background switches to a subtle grid pattern.
 */
export function BlueprintToggle({ children }: BlueprintProviderProps) {
  const [blueprint, setBlueprint] = useState(false)

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setBlueprint((b) => !b)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 transition-all backdrop-blur-sm ${
          blueprint
            ? 'border-xai-accent text-xai-accent'
            : 'border-xai-border text-xai-text-4 hover:border-xai-border-strong hover:text-xai-text-3'
        }`}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.625rem',
          fontWeight: 510,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          border: '1px solid',
          background: blueprint ? 'rgba(59, 130, 246, 0.08)' : 'var(--color-xai-surface)',
        }}
        title={blueprint ? 'Switch to visual mode' : 'Switch to blueprint mode'}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          {blueprint ? (
            /* Eye icon — switch back to visual */
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          ) : (
            /* Grid icon — blueprint mode */
            <>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </>
          )}
        </svg>
        {blueprint ? 'Visual' : 'Blueprint'}
      </button>

      {/* Content with optional blueprint grid background */}
      <div className={blueprint ? 'blueprint-grid min-h-full' : ''}>
        {children(blueprint)}
      </div>
    </>
  )
}
