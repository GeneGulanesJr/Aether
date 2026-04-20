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
      <div className="mb-8">
        <button
          onClick={onBack}
          className="xai-btn xai-btn-ghost mb-6"
        >
          ← BACK
        </button>
        <p className="font-mono text-xs text-xai-text-3 tracking-wider uppercase mb-2">
          {budgetLabel} · {useCaseLabel}
        </p>
        <h2
          className="text-xai-text"
          style={{ fontSize: '1.875rem', fontWeight: 400, lineHeight: 1.2 }}
        >
          Choose your platform
        </h2>
        <p className="mt-2 text-xai-text-2" style={{ fontSize: '1rem', lineHeight: 1.5 }}>
          Side-by-side recommended builds for your budget and use case.
          Pick the one that fits your style.
        </p>
      </div>

      {/* ── Comparison Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
  const platformColor = build.platform === 'amd' ? 'var(--color-amd)' : 'var(--color-intel)'

  return (
    <div className={`xai-card flex flex-col ${build.platform === 'amd' ? 'platform-amd' : 'platform-intel'}`}>
      {/* Platform header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-xs uppercase tracking-wider"
            style={{ color: platformColor }}
          >
            {build.platform === 'amd' ? '🔴' : '🔵'} {build.platform.toUpperCase()}
          </span>
          <span className="xai-tag">{build.label}</span>
        </div>
        {isBest && (
          <span className="xai-tag xai-tag-accent">
            ★ RECOMMENDED
          </span>
        )}
      </div>

      <p className="text-xai-text-2 text-sm mb-4">{build.tagline}</p>

      {/* Parts spec sheet */}
      <div className="flex-1 mb-6">
        <SpecSheet parts={build.parts} />
      </div>

      {/* Highlights */}
      <div className="mb-6">
        <p className="font-mono text-xs text-xai-text-4 uppercase tracking-wider mb-2">
          Highlights
        </p>
        <ul className="space-y-1">
          {build.highlights.map((h) => (
            <li key={h} className="font-mono text-xs text-xai-text-2 flex items-center gap-2">
              <span className="text-xai-text-4">→</span> {h}
            </li>
          ))}
        </ul>
      </div>

      {/* Score + Price + CTA */}
      <div className="flex items-center justify-between border-t border-xai-border pt-4">
        <div>
          <p className="font-mono text-2xl text-xai-text" style={{ fontWeight: 300 }}>
            {build.estimatedTotal}
          </p>
          <p className="font-mono text-xs text-xai-text-4 mt-0.5">
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
        <div key={key} className="border-b border-xai-border py-2 last:border-0">
          <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-wider">
            {CATEGORY_LABELS[key] ?? key.toUpperCase()}
          </p>
          <p className="font-mono text-xs text-xai-text mt-0.5">{part.name}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0 mt-0.5">
            {Object.entries(part.specs).map(([k, v]) => (
              <span key={k} className="font-mono text-[0.625rem] text-xai-text-3">
                {k}: <span className="text-xai-text-2">{v}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
