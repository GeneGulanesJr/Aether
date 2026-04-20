import type { Part } from '../../lib/types'
import type { StepInfo, Platform } from '../../lib/buildWizard'

interface PartSelectStepProps {
  step: StepInfo
  platform: Platform
  parts: Part[]
  selectedPart: Part | null
  priceByPartId?: Record<string, string>
  onSelect: (part: Part) => void
  onRemove: () => void
  onNext: () => void
  onBack: () => void
  isLast: boolean
}

export function PartSelectStep({
  step,
  platform,
  parts,
  selectedPart,
  priceByPartId,
  onSelect,
  onRemove,
  onNext,
  onBack,
  isLast,
}: PartSelectStepProps) {
  // Filter parts by platform hint (name contains AMD/Intel, etc.)
  const platformParts = parts.length > 0
    ? parts.filter((p) => {
        const name = p.name.toLowerCase()
        if (platform === 'amd') return name.includes('amd') || name.includes('ryzen') || name.includes('radeon')
        return name.includes('intel') || name.includes('core')
      })
    : [] // If no real data, show empty (CompareStep already guided them)

  const displayParts = platformParts.length > 0 ? platformParts : parts

  return (
    <div>
      {/* Header */}
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-6">
        ← BACK
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-xai-text-3 uppercase tracking-wider mb-1">
            STEP {step.icon}
          </p>
          <h2 className="text-xai-text" style={{ fontSize: '1.5rem', fontWeight: 400 }}>
            {step.label}
          </h2>
          <p className="text-xai-text-3 mt-1">{step.subtitle}</p>
        </div>
        <div className="xai-tag">
          {platform === 'amd' ? '🔴' : '🔵'} {platform.toUpperCase()}
        </div>
      </div>

      {/* Selected part preview */}
      {selectedPart && (
        <div className="xai-card xai-card-active mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-xai-text-3 uppercase tracking-wider">
                Selected
              </p>
              <p className="font-mono text-sm text-xai-text mt-1">{selectedPart.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {priceByPartId?.[selectedPart.id] && (
                <span className="font-mono text-sm text-xai-text">
                  {priceByPartId[selectedPart.id]}
                </span>
              )}
              <button onClick={onRemove} className="xai-btn xai-btn-ghost text-xs py-1 px-2">
                REMOVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parts grid */}
      {displayParts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {displayParts.map((part) => {
            const isSelected = selectedPart?.id === part.id
            return (
              <button
                key={part.id}
                onClick={() => onSelect(part)}
                className={`xai-card text-left ${isSelected ? 'xai-card-active' : ''}`}
              >
                <p
                  className="text-xai-text"
                  style={{ fontWeight: 500, fontSize: '0.875rem' }}
                >
                  {part.name}
                </p>
                <div className="mt-2 space-y-0.5">
                  {Object.entries(part.specs).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="font-mono text-xs text-xai-text-4">{k}</span>
                      <span className="font-mono text-xs text-xai-text-2">{v}</span>
                    </div>
                  ))}
                </div>
                {priceByPartId?.[part.id] && (
                  <p className="font-mono text-sm text-xai-text mt-3">
                    {priceByPartId[part.id]}
                  </p>
                )}
                {isSelected && (
                  <p className="font-mono text-xs text-[var(--color-xai-accent)] mt-2 uppercase tracking-wider">
                    ✓ selected
                  </p>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="xai-card text-center py-12">
          <p className="font-mono text-xs text-xai-text-4 uppercase tracking-wider">
            No parts available for this category yet
          </p>
          <p className="font-mono text-xs text-xai-text-3 mt-2">
            Catalog data is still in development — check back soon
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 border-t border-xai-border pt-6">
        <div />
        <div className="flex gap-3">
          {!step.required && (
            <button onClick={onNext} className="xai-btn xai-btn-ghost">
              SKIP
            </button>
          )}
          <button
            onClick={onNext}
            disabled={!selectedPart && step.required}
            className="xai-btn xai-btn-primary"
          >
            {isLast ? 'REVIEW BUILD →' : 'NEXT →'}
          </button>
        </div>
      </div>
    </div>
  )
}
