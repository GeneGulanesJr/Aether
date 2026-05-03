import { USECASE_OPTIONS } from '../../lib/buildWizard'
import type { UseCase } from '../../lib/buildWizard'

// ═════════════════════════════════════════════════════════════════════════════
// UseCaseStep
// ─────────────────────────────────────────────────────────────────────────────
// Guided path — Step 2. Presents use-case options (gaming / productivity).
//
// NOTE: Sound effects are handled by the caller (WizardStepRenderer).
// ═════════════════════════════════════════════════════════════════════════════

interface UseCaseStepProps {
  onSelect: (useCase: UseCase) => void
  onBack: () => void
}

export function UseCaseStep({ onSelect, onBack }: UseCaseStepProps) {
  return (
    <div>
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-8">← BACK</button>
      <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-1">Step 2</p>
      <h2 className="xai-heading-lg text-xai-text">
        What&apos;s this build for?
      </h2>
      <p className="mt-2 text-xai-text-3 text-sm leading-[1.6] max-w-md">
        We&apos;ll optimize recommendations for your primary use case.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {USECASE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className="xai-card-lg text-left"
            aria-label={`${opt.label}: ${opt.description}`}
          >
            <span className="text-2xl mb-3 block" aria-hidden="true">{opt.icon}</span>
            <p className="font-mono text-sm text-xai-text uppercase tracking-wider">{opt.label}</p>
            <p className="text-xai-text-3 text-xs mt-1.5 leading-snug">{opt.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
              {opt.emphasis.map((e) => (
                <span key={e} className="xai-tag text-[0.5625rem]">{e}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
