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

  // Circle math for score ring — radius matches the actual SVG r attribute
  const radius = 27
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div>
      <button onClick={onRestart} className="xai-btn xai-btn-ghost mb-10">
        ← START OVER
      </button>

      <div className="text-center mb-12">
        <h2 className="xai-heading-lg text-xai-text">
          Build Complete
        </h2>
        <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-[0.15em] mt-3">
          <span aria-hidden="true">
            {BUDGET_OPTIONS.find((b) => b.id === state.budget)?.icon}{' '}
          </span>
          {BUDGET_OPTIONS.find((b) => b.id === state.budget)?.label} ·{' '}
          <span aria-hidden="true">
            {USECASE_OPTIONS.find((u) => u.id === state.useCase)?.icon}{' '}
          </span>
          {USECASE_OPTIONS.find((u) => u.id === state.useCase)?.label} ·{' '}
          <span aria-hidden="true">
            {state.platform === 'amd' ? '🔴' : '🔵'}{' '}
          </span>
          {state.platform?.toUpperCase()}
        </p>
      </div>

      {/* Score + Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-10">
        <div className="xai-card flex flex-col items-center py-8">
          <svg
            width="80"
            height="80"
            className="score-ring"
            role="img"
            aria-label={`Build score: ${score} out of 100`}
          >
            <circle cx="40" cy="40" r={radius} className="score-ring-track" />
            <circle
              cx="40" cy="40" r={radius}
              className="score-ring-value"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <p className="xai-price font-mono text-2xl text-xai-text mt-3">
            {score}
          </p>
          <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mt-1">Build Score</p>
        </div>

        <div className="xai-card flex flex-col items-center justify-center py-8">
          <p className="xai-price font-mono text-2xl text-xai-text">
            {filledCount} / {PART_STEPS.length}
          </p>
          <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mt-1">Components</p>
          {duration != null && (
            <p className="font-mono text-xs text-xai-text-3 mt-2">
              Built in {duration}s
            </p>
          )}
        </div>
      </div>

      {/* Full build list */}
      <div className="xai-card mb-10">
        <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-[0.15em] mb-3">
          Your Build
        </p>
        <ul className="list-none p-0 m-0">
          {PART_STEPS.map((step) => {
            const part = step.category ? state.selectedParts[step.category] : null
            return (
              <li key={step.id} className="flex flex-col gap-0.5 border-b border-xai-border py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm" aria-hidden="true">{step.icon}</span>
                  <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
                    {step.label}
                  </span>
                </div>
                <span className={`font-mono text-sm truncate min-w-0 ${part ? 'text-xai-text' : 'text-xai-text-4'}`}>
                  {part ? part.name : 'Not selected'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {allFilled && (
        <div className="mt-10 text-center">
          <p className="font-mono text-[0.5625rem] text-xai-text-3 uppercase tracking-[0.15em] mb-4">
            <span aria-hidden="true">🏆 </span>Every slot filled — you are a true builder
          </p>
          <button onClick={onRestart} className="xai-btn xai-btn-ghost">
            BUILD ANOTHER
          </button>
        </div>
      )}
    </div>
  )
}
