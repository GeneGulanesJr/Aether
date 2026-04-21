import type { BudgetTier, UseCase, Platform, RecommendedBuild } from '../../lib/buildWizard'
import { getRecommendations, BUDGET_OPTIONS, USECASE_OPTIONS } from '../../lib/buildWizard'

interface CompareStepProps {
  budget: BudgetTier
  useCase: UseCase
  onSelect: (platform: Platform) => void
  onBack: () => void
}

export function CompareStep({ budget, useCase, onSelect, onBack }: CompareStepProps) {
  const { amd, intel } = getRecommendations(budget, useCase)
  const budgetLabel = BUDGET_OPTIONS.find((b) => b.id === budget)?.range ?? ''
  const useCaseLabel = USECASE_OPTIONS.find((u) => u.id === useCase)?.label ?? ''

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-10">
        <button
          onClick={onBack}
          className="xai-btn xai-btn-ghost mb-8"
        >
          ← BACK
        </button>
        <p className="font-mono text-[0.625rem] text-xai-text-4 tracking-[0.2em] uppercase mb-1">
          {budgetLabel} · {useCaseLabel}
        </p>
        <h2
          className="xai-heading-lg text-xai-text"
        >
          Choose your platform
        </h2>
        <p className="mt-2 text-xai-text-3 text-sm max-w-lg">
          Side-by-side recommended builds for your budget and use case.
          Pick the one that fits your style.
        </p>
      </div>

      {/* ── Comparison Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" role="group" aria-label="Platform comparison">
        <BuildColumn
          build={amd}
          useCase={useCase}
          onSelect={() => onSelect('amd')}
        />
        <BuildColumn
          build={intel}
          useCase={useCase}
          onSelect={() => onSelect('intel')}
        />
      </div>
    </div>
  )
}

// ─── Build Column ────────────────────────────────────────────────────────────

function BuildColumn({
  build,
  useCase,
  onSelect,
}: {
  build: RecommendedBuild
  useCase: UseCase
  onSelect: () => void
}) {
  const isBest = build.bestFor.includes(useCase)

  return (
    <div className={`xai-card-lg flex flex-col ${build.platform === 'amd' ? 'platform-amd' : 'platform-intel'}`} aria-label={`${build.platform.toUpperCase()} build: ${build.tagline}`}>
      {/* Platform header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-xs uppercase tracking-wider ${build.platform === 'amd' ? 'text-amd' : 'text-intel'}`}
          >
            <span aria-hidden="true">{build.platform === 'amd' ? '🔴' : '🔵'}</span> {' '}{build.platform.toUpperCase()}
          </span>
          <span className="xai-tag">{build.label}</span>
        </div>
        {isBest && (
          <span className="xai-tag xai-tag-accent whitespace-nowrap">
            ★ RECOMMENDED
          </span>
        )}
      </div>

      <p className="text-xai-text-3 text-xs mb-4 leading-snug">{build.tagline}</p>

      {/* Parts spec sheet */}
      <div className="flex-1 mb-4">
        <SpecSheet parts={build.parts} />
      </div>

      {/* Highlights */}
      <div className="mb-4">
        <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider mb-1.5">
          Highlights
        </p>
        <ul className="space-y-0.5">
          {build.highlights.map((h) => (
            <li key={h} className="font-mono text-xs text-xai-text-2 flex items-center gap-2">
              <span className="text-xai-text-4">→</span> {h}
            </li>
          ))}
        </ul>
      </div>

      {/* Score + Price + CTA */}
      <div className="flex flex-col gap-3 border-t border-xai-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="xai-price font-mono text-2xl text-xai-text">
            {build.estimatedTotal}
          </p>
          <p className="font-mono text-[0.5625rem] text-xai-text-4 mt-0.5 whitespace-nowrap">
            BUILD SCORE: {build.score}/100
          </p>
        </div>
        <button onClick={onSelect} className="xai-btn xai-btn-primary">
          CHOOSE {build.platform.toUpperCase()}
        </button>
      </div>
    </div>
  )
}

// ─── Spec Sheet (monospace key-value table) ──────────────────────────────────

function SpecSheet({ parts }: { parts: Record<string, { name: string; specs: Record<string, string> }> }) {
  const CATEGORY_LABELS: Record<string, string> = {
    cpu: 'CPU',
    motherboard: 'MOTHERBOARD',
    ram: 'MEMORY',
    gpu: 'GPU',
    storage: 'STORAGE',
    psu: 'PSU',
    case: 'CASE',
  }

  return (
    <div>
      {Object.entries(parts).map(([key, part]) => (
        <div key={key} className="border-b border-xai-border py-1.5 last:border-0">
          <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
            {CATEGORY_LABELS[key] ?? key.toUpperCase()}
          </p>
          <p className="font-mono text-xs text-xai-text mt-0">{part.name}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0 mt-0">
            {Object.entries(part.specs).map(([k, v]) => (
              <span key={k} className="font-mono text-[0.5625rem] text-xai-text-3 whitespace-nowrap">
                {k}: <span className="text-xai-text-2">{v}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
