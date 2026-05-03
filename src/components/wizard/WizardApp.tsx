/**
 * WizardApp — Standalone wizard for use inside a desktop Window.
 * Renders the full wizard flow (mode → guided/custom → review) without
 * the modal overlay, close button, or body scroll lock.
 *
 * Used by Desktop.tsx when opening the "Build Wizard" window.
 */

import { useState, useCallback, useMemo, lazy, Suspense } from 'react'
import type { Part, BuildSlotCategory } from '../../lib/types'
import type { WizardState, Platform, BudgetTier, UseCase, SocketOption } from '../../lib/buildWizard'
import {
  INITIAL_STATE,
  PART_STEPS,
  nextGuidedStep,
  prevGuidedStep,
  buildScore,
  getSocketsForPlatform,
  resolveSocketForGuided,
} from '../../lib/buildWizard'
import { useCatalogData } from '../../hooks/useCatalogData'
import { useSound } from '../../hooks/useSound'

// Lazy-load wizard step components
const BudgetStep = lazy(() => import('./BudgetStep').then(m => ({ default: m.BudgetStep })))
const UseCaseStep = lazy(() => import('./UseCaseStep').then(m => ({ default: m.UseCaseStep })))
const PartSelectStep = lazy(() => import('./PartSelectStep').then(m => ({ default: m.PartSelectStep })))
const PlatformStep = lazy(() => import('./PlatformStep').then(m => ({ default: m.PlatformStep })))
const ReviewStep = lazy(() => import('./ReviewStep').then(m => ({ default: m.ReviewStep })))
const QuestLog = lazy(() => import('./QuestLog').then(m => ({ default: m.QuestLog })))
const CustomSocketSelect = lazy(() => import('./CustomBuildFlow').then(m => ({ default: m.CustomSocketSelect })))

export function WizardApp() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const { parts, priceByPartId } = useCatalogData()
  const sound = useSound()

  const currentPartStepIndex = useMemo(() => {
    if (!state.step || state.step === 'review') return -1
    // 'platform' and 'socket' are not part-selection steps
    if (state.step === 'platform' || state.step === 'socket') return -1
    return PART_STEPS.findIndex((s) => s.id === state.step)
  }, [state.step])

  // Score — available for sidebar display
  useMemo(() => buildScore(state.selectedParts), [state.selectedParts])

  // Budget-aware part filtering for guided mode (stretch, not hard cutoff)
  const budgetFilter = useMemo(() => {
    const tier = state.budget
    if (tier === 'low') return { hard: 15000, stretch: 18000 }
    if (tier === 'mid') return { hard: 40000, stretch: 50000 }
    return { hard: Infinity, stretch: Infinity }
  }, [state.budget])



  // ── Navigation ────────────────────────────────────────────────────────────

  const goBack = useCallback(() => {
    sound.click()
    setState((prev) => {
      if (prev.step === 'mode') return { ...INITIAL_STATE }
      if (prev.step === 'budget') return { ...prev, step: 'mode' }
      if (prev.step === 'usecase') return { ...prev, step: 'budget' }
      if (prev.step === 'platform') return { ...prev, step: prev.budget ? 'usecase' : 'mode' }
      if (prev.step === 'socket') return { ...prev, step: 'platform' }
      const p = prevGuidedStep(prev.step)
      return p ? { ...prev, step: p } : prev
    })
  }, [sound])

  const guidedNext = useCallback(() => {
    sound.pop()
    setState((prev) => {
      const n = nextGuidedStep(prev.step)
      if (!n) return prev
      const completedAt = n === 'review' ? Date.now() : prev.completedAt
      return { ...prev, step: n, completedAt }
    })
  }, [sound])

  // ── State transitions ────────────────────────────────────────────────────

  const chooseGuided = useCallback(() => {
    sound.pop()
    setState((prev) => ({ ...prev, mode: 'guided', step: 'budget' }))
  }, [sound])

  const chooseCustom = useCallback(() => {
    sound.pop()
    setState((prev) => ({ ...prev, mode: 'guided', step: 'platform', budget: null, useCase: null }))
  }, [sound])

  const selectBudget = useCallback((budget: BudgetTier) => {
    sound.pop()
    setState((prev) => ({ ...prev, budget, step: 'usecase' }))
  }, [sound])

  const selectUseCase = useCallback((useCase: UseCase) => {
    sound.pop()
    setState((prev) => ({ ...prev, useCase, step: 'platform' }))
  }, [sound])

  const selectPlatform = useCallback((platform: Platform) => {
    sound.pop()
    setState((prev) => {
      const socket = resolveSocketForGuided(platform, prev.budget ?? 'mid')
      return { ...prev, platform, socket: socket?.id ?? null, step: 'socket' }
    })
  }, [sound])

  const selectPart = useCallback((category: BuildSlotCategory, part: Part) => {
    sound.pop()
    setState((prev) => {
      const selectedParts = { ...prev.selectedParts, [category]: part }
      return { ...prev, selectedParts }
    })
  }, [sound])

  const removePart = useCallback((category: BuildSlotCategory) => {
    sound.click()
    setState((prev) => {
      const selectedParts = { ...prev.selectedParts }
      delete selectedParts[category]
      return { ...prev, selectedParts }
    })
  }, [sound])

  const selectSocket = useCallback((socket: SocketOption) => {
    sound.pop()
    setState((prev) => ({ ...prev, socket: socket.id, step: 'cpu' }))
  }, [sound])

  const restart = useCallback(() => {
    sound.pop()
    setState(INITIAL_STATE)
  }, [sound])

  return (
    <div className="flex flex-col h-full bg-xai-bg text-xai-text">
      <Suspense fallback={<div className="flex items-center justify-center flex-1"><div className="xai-progress w-24"><div className="xai-progress-fill" style={{ transform: 'scaleX(0.4)' }} /></div></div>}>
        <div className="flex flex-col gap-6 lg:flex-row h-full min-h-0">
          <div className="min-w-0 flex-1 flex flex-col min-h-0">

            {/* ── Mode Picker ── */}
            {state.step === 'mode' && (
              <ModePicker onGuided={chooseGuided} onCustom={chooseCustom} />
            )}

            {/* ── Guided Path ── */}
            {state.step === 'budget' && (
              <BudgetStep onSelect={selectBudget} onBack={goBack} />
            )}
            {state.step === 'usecase' && (
              <UseCaseStep onSelect={selectUseCase} onBack={goBack} />
            )}
            {state.step === 'platform' && (
              <PlatformStep
                budget={state.budget}
                useCase={state.useCase}
                onSelect={selectPlatform}
                onBack={goBack}
              />
            )}
            {currentPartStepIndex >= 0 && state.platform && (() => {
              const stepInfo = PART_STEPS[currentPartStepIndex]
              const category = stepInfo.category!
              const guidedSocket = state.socket
                ? getSocketsForPlatform(state.platform).find(s => s.id === state.socket) ?? null
                : null
              return (
                <PartSelectStep
                  step={stepInfo}
                  platform={state.platform}
                  socket={guidedSocket}
                  parts={parts}
                  selectedPart={state.selectedParts[category] ?? null}
                  priceByPartId={priceByPartId}
                  budgetLimit={state.budget ? budgetFilter : undefined}
                  onSelect={(part) => selectPart(category, part)}
                  onRemove={() => removePart(category)}
                  onNext={guidedNext}
                  onBack={goBack}
                  isLast={currentPartStepIndex === PART_STEPS.length - 1}
                />
              )
            })()}
            {state.step === 'socket' && state.platform && (
              <CustomSocketSelect
                platform={state.platform}
                onSelect={selectSocket}
                onBack={goBack}
              />
            )}

            {/* ── Shared Review ── */}
            {state.step === 'review' && (
              <ReviewStep
                state={state}
                onRestart={restart}
                priceByPartId={priceByPartId}
                isEstimated={true}
                livePriceState={undefined}
                livePriceError={undefined}
                onFetchLivePrices={() => {}}
              />
            )}
          </div>

          {/* Sidebar (desktop window context) */}
          <div className="hidden w-72 shrink-0 lg:flex lg:flex-col border-l border-xai-border" aria-label="Build progress sidebar">
            <QuestLog state={state} priceByPartId={priceByPartId} />
          </div>
        </div>
      </Suspense>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Mode Picker (inline — no back button needed in window context)
// ═════════════════════════════════════════════════════════════════════════════

function ModePicker({ onGuided, onCustom }: { onGuided: () => void; onCustom: () => void }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-1">
        Step 0
      </p>
      <h2 className="xai-heading text-xai-text">
        How do you want to build?
      </h2>
      <p className="mt-1 text-xai-text-3 text-sm leading-[1.6]">
        Two ways to get to your perfect rig.
      </p>

      <div className="mt-6 flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2 content-center">
        <button onClick={onGuided} className="xai-card-lg text-left" aria-label="Guided build mode">
          <span className="text-2xl mb-2 block" aria-hidden="true">🗺️</span>
          <p className="font-mono text-sm text-xai-text uppercase tracking-wider">Guided Build</p>
          <p className="text-xai-text-3 text-xs mt-1.5 leading-snug">
            Answer a few questions — budget, use case — then pick your platform and parts.
          </p>
        </button>
        <button onClick={onCustom} className="xai-card-lg text-left" aria-label="Custom build mode">
          <span className="text-2xl mb-2 block" aria-hidden="true">🔧</span>
          <p className="font-mono text-sm text-xai-text uppercase tracking-wider">Custom Build</p>
          <p className="text-xai-text-3 text-xs mt-1.5 leading-snug">
            Pick your platform and socket, then hand-pick every component yourself.
          </p>
        </button>
      </div>
    </div>
  )
}
