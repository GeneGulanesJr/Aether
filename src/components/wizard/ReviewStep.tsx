import type { WizardState } from '../../lib/buildWizard'
import { PART_STEPS, buildScore, BUDGET_OPTIONS, USECASE_OPTIONS } from '../../lib/buildWizard'

interface ReviewStepProps {
  state: WizardState
  onRestart: () => void
}

export function ReviewStep({ state, onRestart }: ReviewStepProps) {
  const score = buildScore(state.selectedParts)
  const filledCount = Object.keys(state.selectedParts).length
  const allFilled = filledCount === PART_STEPS.length
  const duration = state.startedAt && state.completedAt
    ? Math.round((state.completedAt - state.startedAt) / 1000)
    : null

  // Circle math for score ring
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div>
      <button onClick={onRestart} className="xai-btn xai-btn-ghost mb-8">
        ← START OVER
      </button>

      <div className="text-center mb-10">
        <h2 className="text-xai-text" style={{ fontSize: '1.875rem', fontWeight: 400 }}>
          Build Complete
        </h2>
        <p className="font-mono text-xs text-xai-text-3 uppercase tracking-wider mt-2">
          {BUDGET_OPTIONS.find((b) => b.id === state.budget)?.icon}{' '}
          {BUDGET_OPTIONS.find((b) => b.id === state.budget)?.label} ·{' '}
          {USECASE_OPTIONS.find((u) => u.id === state.useCase)?.icon}{' '}
          {USECASE_OPTIONS.find((u) => u.id === state.useCase)?.label} ·{' '}
          {state.platform === 'amd' ? '🔴' : '🔵'} {state.platform?.toUpperCase()}
        </p>
      </div>

      {/* Score + Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-8">
        <div className="xai-card flex flex-col items-center py-6">
          <svg width="80" height="80" className="score-ring">
            <circle cx="40" cy="40" r={radius / 2} className="score-ring-track" />
            <circle
              cx="40" cy="40" r={radius / 2}
              className="score-ring-value"
              strokeDasharray={Math.PI * radius}
              strokeDashoffset={offset / 2}
            />
          </svg>
          <p className="font-mono text-2xl text-xai-text mt-3" style={{ fontWeight: 300 }}>
            {score}
          </p>
          <p className="font-mono text-xs text-xai-text-4 uppercase">Build Score</p>
        </div>

        <div className="xai-card flex flex-col items-center justify-center py-6">
          <p className="font-mono text-3xl text-xai-text" style={{ fontWeight: 300 }}>
            {filledCount} / {PART_STEPS.length}
          </p>
          <p className="font-mono text-xs text-xai-text-4 uppercase mt-1">Components</p>
          {duration != null && (
            <p className="font-mono text-xs text-xai-text-3 mt-2">
              Built in {duration}s
            </p>
          )}
        </div>
      </div>

      {/* Full build list */}
      <div className="xai-card mb-8">
        <p className="font-mono text-xs text-xai-text-3 uppercase tracking-wider mb-4">
          Your Build
        </p>
        {PART_STEPS.map((step) => {
          const part = step.category ? state.selectedParts[step.category] : null
          return (
            <div key={step.id} className="flex items-center justify-between border-b border-xai-border py-3 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-sm">{step.icon}</span>
                <span className="font-mono text-xs text-xai-text-4 uppercase w-28">
                  {step.label}
                </span>
              </div>
              <span className={`font-mono text-sm ${part ? 'text-xai-text' : 'text-xai-text-4'}`}>
                {part ? part.name : 'Not selected'}
              </span>
            </div>
          )
        })}
      </div>

      {allFilled && (
        <div className="mt-8 text-center">
          <p className="font-mono text-xs text-xai-text-3 uppercase tracking-wider mb-4">
            🏆 Every slot filled — you are a true builder
          </p>
          <button onClick={onRestart} className="xai-btn xai-btn-ghost">
            BUILD ANOTHER
          </button>
        </div>
      )}
    </div>
  )
}
