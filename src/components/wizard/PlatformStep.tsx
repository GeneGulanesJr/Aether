import type { Platform } from '../../lib/buildWizard'

interface PlatformStepProps {
  budget: 'low' | 'mid' | 'high' | null   // null when called from custom entry point
  useCase: 'gaming' | 'productivity' | null
  onSelect: (platform: Platform) => void
  onBack: () => void
}

export function PlatformStep({ budget, useCase, onSelect, onBack }: PlatformStepProps) {
  // Derive default socket labels per budget tier
  const defaultSocket = (platform: Platform) => {
    if (platform === 'amd') {
      if (budget === 'low') return 'AM4 \u00B7 DDR4'
      return 'AM5 \u00B7 DDR5'
    }
    return 'LGA 1851 \u00B7 DDR5'
  }

  return (
    <div>
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-8">\u2190 BACK</button>
      <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-1">
        {budget ? `Budget: ${budget.toUpperCase()} \u00B7 ${useCase}` : 'Custom Build \u00B7 Step 1'}
      </p>
      <h2 className="xai-heading text-xai-text">
        Pick your platform
      </h2>
      <p className="mt-2 text-xai-text-3 text-sm leading-[1.6] max-w-md">
        {budget
          ? 'AMD or Intel? Your budget tier suggests a default socket \u2014 you can always override in the next step.'
          : 'Choose your processor ecosystem.'}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* AMD card */}
        <button
          onClick={() => onSelect('amd')}
          className="xai-card-lg text-left platform-amd"
          aria-label="Select AMD platform"
        >
          <p className="font-mono text-lg text-amd">
            <span aria-hidden="true">\uD83D\uDD34</span> AMD
          </p>
          <p className="font-mono text-xs text-xai-text mt-1">Ryzen\u2122 Processors</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="xai-tag text-[0.5625rem]">{budget === 'low' ? 'AM4' : 'AM5'}</span>
            <span className="xai-tag text-[0.5625rem]">{budget === 'low' ? 'DDR4' : 'DDR5'}</span>
          </div>
          {budget && (
            <p className="font-mono text-[0.5625rem] text-xai-text-4 mt-3">
              Default: {defaultSocket('amd')}
            </p>
          )}
        </button>

        {/* Intel card */}
        <button
          onClick={() => onSelect('intel')}
          className="xai-card-lg text-left platform-intel"
          aria-label="Select Intel platform"
        >
          <p className="font-mono text-lg text-intel">
            <span aria-hidden="true">\uD83D\uDD35</span> Intel
          </p>
          <p className="font-mono text-xs text-xai-text mt-1">Core\u2122 Processors</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="xai-tag text-[0.5625rem]">LGA 1851</span>
            <span className="xai-tag text-[0.5625rem]">DDR5</span>
          </div>
          {budget && (
            <p className="font-mono text-[0.5625rem] text-xai-text-4 mt-3">
              Default: {defaultSocket('intel')}
            </p>
          )}
        </button>
      </div>
    </div>
  )
}