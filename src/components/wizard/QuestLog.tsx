import type { WizardState } from '../../lib/buildWizard'
import { PART_STEPS, buildScore } from '../../lib/buildWizard'

interface QuestLogProps {
  state: WizardState
}

export function QuestLog({ state }: QuestLogProps) {
  const score = buildScore(state.selectedParts)
  const filledCount = Object.keys(state.selectedParts).length

  return (
    <aside className="flex flex-col gap-6">
      {/* ── Build Progress ── */}
      <div className="xai-card">
        <p className="font-mono text-xs text-xai-text-3 tracking-wider uppercase">
          Progress
        </p>
        <p className="mt-1 font-mono text-3xl text-xai-text" style={{ fontWeight: 300 }}>
          {score}%
        </p>
        <div className="xai-progress mt-3">
          <div className="xai-progress-fill" style={{ width: `${score}%` }} />
        </div>
        <p className="mt-2 font-mono text-xs text-xai-text-4">
          {filledCount} / {PART_STEPS.length} components
        </p>
      </div>

      {/* ── Build Config ── */}
      <div className="xai-card">
        <p className="font-mono text-xs text-xai-text-3 tracking-wider uppercase mb-3">
          Config
        </p>
        {state.budget && (
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs text-xai-text-4 uppercase">TIER</span>
            <span className="font-mono text-xs text-xai-text uppercase">
              {state.budget === 'low' ? '🥉' : state.budget === 'mid' ? '🥈' : '🥇'}{' '}
              {state.budget.toUpperCase()}
            </span>
          </div>
        )}
        {state.useCase && (
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs text-xai-text-4 uppercase">USE</span>
            <span className="font-mono text-xs text-xai-text uppercase">
              {state.useCase === 'gaming' ? '🎮' : '⚡'} {state.useCase.toUpperCase()}
            </span>
          </div>
        )}
        {state.platform && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-xai-text-4 uppercase">CPU</span>
            <span className={`font-mono text-xs uppercase ${state.platform === 'amd' ? 'text-[var(--color-amd)]' : 'text-[var(--color-intel)]'}`}>
              {state.platform === 'amd' ? '🔴' : '🔵'} {state.platform.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* ── Equipped Parts ── */}
      <div className="xai-card">
        <p className="font-mono text-xs text-xai-text-3 tracking-wider uppercase mb-3">
          Equipped
        </p>
        {PART_STEPS.map((step) => {
          const part = step.category ? state.selectedParts[step.category] : null
          return (
            <div
              key={step.id}
              className="flex items-center justify-between border-b border-xai-border py-2 last:border-0"
            >
              <span className="font-mono text-xs text-xai-text-3">
                {step.icon} {step.label}
              </span>
              <span className="font-mono text-xs text-xai-text truncate max-w-[140px]">
                {part ? part.name : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
