import type { WizardState } from '../../lib/buildWizard'
import { PART_STEPS, buildScore } from '../../lib/buildWizard'

type QuestLogProps = {
  state: WizardState
}

export function QuestLog({ state }: QuestLogProps) {
  const score = buildScore(state.selectedParts)
  const filledCount = Object.keys(state.selectedParts).length

  return (
    <aside className="flex flex-col gap-4" aria-label="Build progress log">
      {/* ── Build Progress ── */}
      <div className="xai-card">
        <p className="font-mono text-[0.5625rem] text-xai-text-4 tracking-wider uppercase">
          Progress
        </p>
        <p className="mt-1 xai-price font-mono text-2xl text-xai-text">
          <span aria-label={`${score} percent complete`}>{score}%</span>
        </p>
        <div
          className="xai-progress mt-2"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Build progress: ${score}%`}
        >
          <div className="xai-progress-fill" style={{ width: `${score}%` }} />
        </div>
        <p className="mt-1.5 font-mono text-[0.5625rem] text-xai-text-4">
          {filledCount} / {PART_STEPS.length} components
        </p>
      </div>

      {/* ── Build Config ── */}
      <div className="xai-card">
        <p className="font-mono text-[0.5625rem] text-xai-text-4 tracking-wider uppercase mb-2">
          Config
        </p>
        {state.budget && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase">TIER</span>
            <span className="font-mono text-[0.5625rem] text-xai-text uppercase">
              <span aria-hidden="true">
                {state.budget === 'low' ? '🥉' : state.budget === 'mid' ? '🥈' : '🥇'}{' '}
              </span>
              <span className="sr-only">
                {state.budget === 'low' ? 'Bronze' : state.budget === 'mid' ? 'Silver' : 'Gold'}
              </span>
              {state.budget.toUpperCase()}
            </span>
          </div>
        )}
        {state.useCase && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase">USE</span>
            <span className="font-mono text-[0.5625rem] text-xai-text uppercase">
              <span aria-hidden="true">
                {state.useCase === 'gaming' ? '🎮' : '⚡'}{' '}
              </span>
              <span className="sr-only">
                {state.useCase === 'gaming' ? 'Gaming' : 'Productivity'}
              </span>
              {state.useCase.toUpperCase()}
            </span>
          </div>
        )}
        {state.platform && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase">CPU</span>
            <span className={`font-mono text-[0.5625rem] uppercase ${state.platform === 'amd' ? 'text-[var(--color-amd)]' : 'text-[var(--color-intel)]'}`}>
              <span aria-hidden="true">
                {state.platform === 'amd' ? '🔴' : '🔵'}{' '}
              </span>
              <span className="sr-only">
                {state.platform === 'amd' ? 'AMD' : 'Intel'}
              </span>
              {state.platform.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* ── Equipped Parts ── */}
      <div className="xai-card">
        <p className="font-mono text-[0.5625rem] text-xai-text-4 tracking-wider uppercase mb-2">
          Equipped
        </p>
        <ul className="list-none p-0 m-0">
          {PART_STEPS.map((step) => {
            const part = step.category ? state.selectedParts[step.category] : null
            return (
              <li
                key={step.id}
                className="flex items-center justify-between border-b border-xai-border py-1.5 last:border-0"
              >
                <span className="font-mono text-[0.5625rem] text-xai-text-3">
                  <span aria-hidden="true">{step.icon} </span>
                  {step.label}
                </span>
                <span className="font-mono text-[0.5625rem] text-xai-text truncate max-w-[100px] sm:max-w-[120px] md:max-w-[160px] lg:max-w-[200px]">
                  {part ? part.name : '—'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}