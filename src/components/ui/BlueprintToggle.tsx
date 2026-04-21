import { useState } from 'react'

type BlueprintProviderProps = {
  children: (blueprint: boolean) => React.ReactNode
}

export function BlueprintToggle({ children }: BlueprintProviderProps) {
  const [blueprint, setBlueprint] = useState(false)

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setBlueprint((b) => !b)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 backdrop-blur-sm font-mono text-[0.625rem] font-medium uppercase tracking-[0.1em] border border-solid transition-all ${
          blueprint
            ? 'text-xai-accent bg-xai-accent-surface border-xai-accent'
            : 'text-xai-text-4 bg-xai-surface border-xai-border hover:border-xai-border-strong hover:text-xai-text-3'
        }`}
        title={blueprint ? 'Switch to visual mode' : 'Switch to blueprint mode'}
        aria-pressed={blueprint}
        aria-label={blueprint ? 'Switch to visual mode' : 'Switch to blueprint mode'}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
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
