import { BUDGET_OPTIONS } from '../../lib/buildWizard'
import type { BudgetTier } from '../../lib/buildWizard'

// ═════════════════════════════════════════════════════════════════════════════
// BudgetStep
// ─────────────────────────────────────────────────────────────────────────────
// Guided path — Step 1. Presents three budget tiers (low / mid / high).
//
// NOTE: Sound effects are handled by the caller (WizardStepRenderer).
// ═════════════════════════════════════════════════════════════════════════════

interface BudgetStepProps {
  onSelect: (budget: BudgetTier) => void
  onBack: () => void
}

export function BudgetStep({ onSelect, onBack }: BudgetStepProps) {
  return (
    <div>
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-8">← BACK</button>
      <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-1">Step 1</p>
      <h2 className="xai-heading-lg text-xai-text">
        What&apos;s your budget?
      </h2>
      <p className="mt-2 text-xai-text-3 text-sm leading-[1.6] max-w-md">
        Prices in Philippine Peso. We&apos;ll recommend parts for your range.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {BUDGET_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className="xai-card-lg text-left flex flex-col"
            aria-label={`${opt.label} budget: ${opt.range}. ${opt.description}`}
          >
            <span className="text-lg mb-2" aria-hidden="true">{opt.icon}</span>
            <p className="font-mono text-xs text-xai-text uppercase tracking-wider">{opt.label}</p>
            <p className="font-mono text-base text-xai-text mt-0.5 xai-price">{opt.range}</p>
            <p className="text-xai-text-3 text-xs mt-1.5 leading-snug">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
