import { useMemo } from 'react'
import type { WizardState } from '../../lib/buildWizard'
import {
  PART_STEPS,
  buildScore,
  BUDGET_OPTIONS,
  USECASE_OPTIONS,
  checkWizardCompatibility,
  estimateWattage,
  type WizardCompatIssue,
} from '../../lib/buildWizard'
import { formatPhp } from '../../lib/format'
import { parsePrice } from '../../lib/priceUtils'

interface ReviewStepProps {
  state: WizardState
  onRestart: () => void
  priceByPartId?: Record<string, string>
  isEstimated?: boolean
  livePriceState?: unknown
  livePriceError?: string | undefined
  onFetchLivePrices?: () => void
}

export function ReviewStep({
  state,
  onRestart,
  priceByPartId,
  isEstimated,

}: ReviewStepProps) {
  // ── Compatibility check ──────────────────────────────────────────────────
  const issues = useMemo(() => checkWizardCompatibility(state.selectedParts), [state.selectedParts])
  const errorCount = issues.filter(i => i.severity === 'error').length
  const warnCount = issues.filter(i => i.severity === 'warn').length
  const wattage = useMemo(() => estimateWattage(state.selectedParts), [state.selectedParts])

  // ── Score (now includes compatibility) ────────────────────────────────────
  const score = buildScore(state.selectedParts, errorCount)
  const filledCount = Object.keys(state.selectedParts).length
  const allFilled = filledCount === PART_STEPS.length
  const duration = state.startedAt && state.completedAt
    ? Math.round((state.completedAt - state.startedAt) / 1000)
    : null

  // ── Total build price ────────────────────────────────────────────────────
  const totalBuildPrice = priceByPartId
    ? Object.values(state.selectedParts).reduce((sum, part) => {
        const priceStr = priceByPartId[part.id]
        if (priceStr) {
          const numeric = parsePrice(priceStr, part.id)
          return sum + (isNaN(numeric) ? 0 : numeric)
        }
        return sum
      }, 0)
    : 0

  // ── Circle math for score ring ───────────────────────────────────────────
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
        {totalBuildPrice > 0 && (
          <div className="mt-4">
            <p className="xai-price font-mono text-3xl text-xai-text">
              {formatPhp(totalBuildPrice)}
            </p>
            {/* Price source indicator */}
            {isEstimated ? (
              <div className="mt-2">
                <p className="font-mono text-[0.5rem] text-xai-text-4 uppercase tracking-wider">
                  Estimated prices
                </p>
              </div>
            ) : (
              <p className="font-mono text-[0.5rem] text-xai-accent uppercase tracking-wider mt-2">
                ✓ Live prices
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Compatibility Warnings ───────────────────────────────────────── */}
      {issues.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-[0.15em]">
              Compatibility Check
            </span>
            {errorCount > 0 && (
              <span className="xai-tag" style={{ color: 'var(--color-xai-error)', borderColor: 'var(--color-xai-error)' }}>
                {errorCount} {errorCount === 1 ? 'ERROR' : 'ERRORS'}
              </span>
            )}
            {warnCount > 0 && (
              <span className="xai-tag" style={{ color: 'var(--color-xai-warn)', borderColor: 'var(--color-xai-warn-border)' }}>
                {warnCount} {warnCount === 1 ? 'WARNING' : 'WARNINGS'}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {issues.map((issue) => (
              <IssueRow key={issue.code} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* ── Score + Stats + Wattage ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-10">
        {/* Score */}
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
              className={`score-ring-value ${errorCount > 0 ? 'score-ring-error' : ''}`}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <p className="xai-price font-mono text-2xl text-xai-text mt-3">
            {score}
          </p>
          <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mt-1">
            Build Score
          </p>
          {errorCount > 0 && (
            <p className="font-mono text-[0.5rem] mt-1" style={{ color: 'var(--color-xai-error)' }}>
              -{errorCount * 10} compatibility
            </p>
          )}
        </div>

        {/* Components */}
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

        {/* Wattage estimate */}
        <div className="xai-card flex flex-col items-center justify-center py-8">
          {wattage ? (
            <>
              <p className="xai-price font-mono text-2xl text-xai-text">
                ~{wattage.estimated}W
              </p>
              <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mt-1">
                Est. Power Draw
              </p>
              {wattage.psuWattage ? (
                <p className={`font-mono text-[0.625rem] mt-2 ${
                  wattage.estimated > wattage.psuWattage
                    ? ''
                    : wattage.estimated > wattage.psuWattage * 0.85
                      ? 'text-xai-text-2'
                      : 'text-xai-accent'
                }`}
                  style={wattage.estimated > wattage.psuWattage ? { color: 'var(--color-xai-error)' } : undefined}
                >
                  PSU: {wattage.psuWattage}W
                  {wattage.estimated > wattage.psuWattage
                    ? ' ⚠ INSUFFICIENT'
                    : wattage.estimated > wattage.psuWattage * 0.85
                      ? ' — tight margin'
                      : ' ✓ healthy headroom'
                  }
                </p>
              ) : (
                <p className="font-mono text-[0.5625rem] text-xai-text-4 mt-2">
                  No PSU selected
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-mono text-2xl text-xai-text-4">—</p>
              <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mt-1">
                Power Draw
              </p>
              <p className="font-mono text-xs text-xai-text-4 mt-2">
                Add CPU/GPU to estimate
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Full build list ─────────────────────────────────────────────── */}
      <div className="xai-card mb-10">
        <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-[0.15em] mb-3">
          Your Build
        </p>
        <ul className="list-none p-0 m-0">
          {PART_STEPS.map((step) => {
            const part = step.category ? state.selectedParts[step.category] : null
            const priceStr = part && priceByPartId ? priceByPartId[part.id] : undefined
            // Highlight parts that have compatibility issues
            const hasIssue = part && step.category && issues.some(i => i.categories.includes(step.category!))
            return (
              <li key={step.id} className={`flex flex-col gap-0.5 border-b border-xai-border py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${hasIssue ? 'pl-2 border-l-2' : ''}`}
                style={hasIssue ? { borderLeftColor: issues.find(i => i.categories.includes(step.category!))?.severity === 'error' ? 'var(--color-xai-error)' : 'var(--color-xai-warn)' } : undefined}
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm" aria-hidden="true">{step.icon}</span>
                  <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
                    {step.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-mono text-sm truncate min-w-0 ${part ? 'text-xai-text' : 'text-xai-text-4'}`}>
                    {part ? part.name : 'Not selected'}
                  </span>
                  {priceStr && (
                    <span className="font-mono text-[0.5625rem] text-xai-text-3 shrink-0">
                      {priceStr}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {allFilled && errorCount === 0 && (
        <div className="mt-10 text-center">
          <p className="font-mono text-[0.5625rem] text-xai-text-3 uppercase tracking-[0.15em] mb-4">
            <span aria-hidden="true">🏆 </span>Every slot filled — no compatibility issues
          </p>
          <button onClick={onRestart} className="xai-btn xai-btn-ghost">
            BUILD ANOTHER
          </button>
        </div>
      )}
      {allFilled && errorCount > 0 && (
        <div className="mt-10 text-center">
          <p className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] mb-4" style={{ color: 'var(--color-xai-error)' }}>
            <span aria-hidden="true">⚠ </span>All slots filled but {errorCount} compatibility {errorCount === 1 ? 'issue' : 'issues'} found
          </p>
          <button onClick={onRestart} className="xai-btn xai-btn-ghost">
            FIX BUILD
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Issue Row ──────────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: WizardCompatIssue }) {
  const isError = issue.severity === 'error'
  return (
    <div
      className="xai-card flex items-start gap-2 py-2 px-3"
      style={{ borderColor: isError ? 'var(--color-xai-error)' : 'var(--color-xai-warn-border)' }}
      role="alert"
    >
      <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: isError ? 'var(--color-xai-error)' : 'var(--color-xai-warn)' }}>
        {isError ? '✕' : '⚠'}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-xs text-xai-text leading-snug">{issue.message}</p>
        <p className="font-mono text-[0.5rem] text-xai-text-4 mt-0.5 uppercase">
          {issue.categories.join(' + ')}
        </p>
      </div>
    </div>
  )
}
