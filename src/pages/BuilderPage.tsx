import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react'
import type { Part, BuildSlotCategory } from '../lib/types'
import type { WizardState, Platform, BudgetTier, UseCase, SocketOption } from '../lib/buildWizard'
import {
  INITIAL_STATE,
  PART_STEPS,
  BUDGET_OPTIONS,
  USECASE_OPTIONS,
  nextGuidedStep,
  prevGuidedStep,
  nextCustomStep,
  prevCustomStep,
  buildScore,
  getSocketsForPlatform,
} from '../lib/buildWizard'
import { useCatalogData } from '../hooks/useCatalogData'
import { useSound } from '../hooks/useSound'
import { PcScene } from '../components/scene/PcScene'
import { WizardModal } from '../components/wizard/WizardModal'
// Lazy-load wizard step components — only fetched when the wizard opens
const CompareStep = lazy(() => import('../components/wizard/CompareStep').then(m => ({ default: m.CompareStep })))
const PartSelectStep = lazy(() => import('../components/wizard/PartSelectStep').then(m => ({ default: m.PartSelectStep })))
const ReviewStep = lazy(() => import('../components/wizard/ReviewStep').then(m => ({ default: m.ReviewStep })))
const QuestLog = lazy(() => import('../components/wizard/QuestLog').then(m => ({ default: m.QuestLog })))
const CustomPlatformSelect = lazy(() => import('../components/wizard/CustomBuildFlow').then(m => ({ default: m.CustomPlatformSelect })))
const CustomSocketSelect = lazy(() => import('../components/wizard/CustomBuildFlow').then(m => ({ default: m.CustomSocketSelect })))
const CustomPartsSelect = lazy(() => import('../components/wizard/CustomBuildFlow').then(m => ({ default: m.CustomPartsSelect })))

export function BuilderPage() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [modalOpen, setModalOpen] = useState(true)
  const [mobileQuestOpen, setMobileQuestOpen] = useState(false)
  const {
    parts,
    priceByPartId,
    livePriceByPartId,
    livePriceState,
    livePriceError,
    fetchLivePrices,
  } = useCatalogData()
  const sound = useSound()

  // Resolve the active socket object when in custom mode
  const activeSocket = useMemo(() => {
    if (!state.socket || !state.platform) return null
    return getSocketsForPlatform(state.platform).find((s) => s.id === state.socket) ?? null
  }, [state.socket, state.platform])

  // ─── Modal open/close ───────────────────────────────────────────────────

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setMobileQuestOpen(false)
  }, [])

  const chooseGuided = useCallback(() => {
    sound.pop()
    setState((prev) => ({ ...prev, mode: 'guided', step: 'budget' }))
  }, [sound])

  const chooseCustom = useCallback(() => {
    sound.pop()
    setState((prev) => ({ ...prev, mode: 'custom', step: 'custom_platform' }))
  }, [sound])

  // ─── Guided: back / next ────────────────────────────────────────────────

  const guidedNext = useCallback(() => {
    setState((prev) => {
      const n = nextGuidedStep(prev.step)
      if (!n) return prev
      const completedAt = n === 'review' ? Date.now() : prev.completedAt
      return { ...prev, step: n, completedAt }
    })
  }, [])

  // ─── Custom: back / next ────────────────────────────────────────────────

  const customNext = useCallback(() => {
    setState((prev) => {
      const n = nextCustomStep(prev.step)
      if (!n) return prev
      const completedAt = n === 'review' ? Date.now() : prev.completedAt
      return { ...prev, step: n, completedAt }
    })
  }, [])

  // ─── Shared actions ─────────────────────────────────────────────────────

  const selectBudget = useCallback((budget: BudgetTier) => {
    sound.pop()
    setState((prev) => ({ ...prev, budget, step: 'usecase' }))
  }, [sound])

  const selectUseCase = useCallback((useCase: UseCase) => {
    sound.pop()
    setState((prev) => ({ ...prev, useCase, step: 'compare' }))
  }, [sound])

  const selectPlatform = useCallback((platform: Platform) => {
    sound.pop()
    setState((prev) => ({ ...prev, platform, step: 'cpu' }))
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

  // Custom-specific: platform + socket
  const selectCustomPlatform = useCallback((platform: Platform) => {
    sound.pop()
    setState((prev) => ({ ...prev, platform, step: 'custom_socket' }))
  }, [sound])

  const selectSocket = useCallback((socket: SocketOption) => {
    sound.pop()
    setState((prev) => ({ ...prev, socket: socket.id, step: 'custom_parts' }))
  }, [sound])

  const restart = useCallback(() => {
    setState(INITIAL_STATE)
    setModalOpen(true)
    setMobileQuestOpen(false)
  }, [])

  // ─── Back from first step of each mode goes to mode picker ──────────────

  const goBackFromModeOrFirstStep = useCallback(() => {
    setState((prev) => {
      // If on mode picker, reset to initial state
      if (prev.step === 'mode') {
        return { ...INITIAL_STATE }
      }
      // If on first step of guided/custom, go back to mode picker
      if (prev.step === 'budget' || prev.step === 'custom_platform') {
        return { ...prev, step: 'mode' }
      }
      // Otherwise use mode-appropriate back
      if (prev.mode === 'custom') {
        const p = prevCustomStep(prev.step)
        return p ? { ...prev, step: p } : prev
      }
      const p = prevGuidedStep(prev.step)
      return p ? { ...prev, step: p } : prev
    })
  }, [])

  // ─── Derived ────────────────────────────────────────────────────────────

  const currentPartStepIndex = useMemo(() => {
    if (!state.step || state.step === 'review' || state.step === 'compare') return -1
    return PART_STEPS.findIndex((s) => s.id === state.step)
  }, [state.step])

  const score = useMemo(() => buildScore(state.selectedParts), [state.selectedParts])
  const filledCount = useMemo(() => Object.keys(state.selectedParts).length, [state.selectedParts])

  // Budget-aware part filtering for guided mode
  const budgetFilter = useMemo(() => {
    const tier = state.budget
    if (tier === 'low') return 15000
    if (tier === 'mid') return 40000
    return Infinity // high = no filter
  }, [state.budget])

  const guidedParts = useMemo(() => {
    if (budgetFilter === Infinity) return parts
    return parts.filter((p) => {
      const raw = priceByPartId?.[p.id]
      if (!raw) return true // no price info — include by default
      const num = Number(raw.replace(/[^0-9.]/g, ''))
      return isNaN(num) || num <= budgetFilter
    })
  }, [parts, priceByPartId, budgetFilter])

  // Close mobile quest log when modal closes
  useEffect(() => {
    if (!modalOpen) setMobileQuestOpen(false)
  }, [modalOpen])

  // Auto-fetch live prices when reaching review step
  useEffect(() => {
    if (state.step === 'review') {
      fetchLivePrices()
    }
  }, [state.step, fetchLivePrices])

  return (
    <main className="relative flex flex-1 flex-col">
      {/* ══════════ 3D Scene Background ══════════ */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <PcScene selectedParts={state.selectedParts} />
      </div>

      {/* ══════════ Wizard Modal ══════════ */}
      <WizardModal isOpen={modalOpen} onClose={closeModal}>
        <Suspense fallback={<div className="flex min-h-[200px] items-center justify-center"><div className="xai-progress w-24"><div className="xai-progress-fill" style={{ transform: 'scaleX(0.4)' }} /></div></div>}>
        {/* Live region for step changes */}
        <div className="sr-only" aria-live="assertive" aria-atomic="true">
          {state.step === 'mode' && 'Choose your build mode'}
          {state.step === 'budget' && 'Select your budget'}
          {state.step === 'usecase' && 'Select your use case'}
          {state.step === 'compare' && 'Compare AMD vs Intel builds'}
          {state.step === 'custom_platform' && 'Choose your platform'}
          {state.step === 'custom_socket' && 'Choose your socket'}
          {state.step === 'custom_parts' && 'Select your parts'}
          {state.step === 'review' && 'Review your build'}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row h-full min-h-0">
          <div className="min-w-0 flex-1 flex flex-col min-h-0">

            {/* ── Mode Picker ── */}
            {state.step === 'mode' && (
              <ModePicker
                onGuided={chooseGuided}
                onCustom={chooseCustom}
                onBack={goBackFromModeOrFirstStep}
              />
            )}

            {/* ── Guided Path ── */}
            {state.step === 'budget' && (
              <BudgetStep onSelect={selectBudget} onBack={goBackFromModeOrFirstStep} />
            )}
            {state.step === 'usecase' && (
              <UseCaseStep onSelect={selectUseCase} onBack={goBackFromModeOrFirstStep} />
            )}
            {state.step === 'compare' && state.budget && state.useCase && (
              <CompareStep
                budget={state.budget}
                useCase={state.useCase}
                onSelect={selectPlatform}
                onBack={goBackFromModeOrFirstStep}
              />
            )}
            {currentPartStepIndex >= 0 && state.platform && (() => {
              const stepInfo = PART_STEPS[currentPartStepIndex]
              const category = stepInfo.category!
              return (
                <PartSelectStep
                  step={stepInfo}
                  platform={state.platform}
                  parts={state.mode === 'guided' ? guidedParts : parts}
                  selectedPart={state.selectedParts[category] ?? null}
                  priceByPartId={priceByPartId}
                  onSelect={(part) => selectPart(category, part)}
                  onRemove={() => removePart(category)}
                  onNext={guidedNext}
                  onBack={goBackFromModeOrFirstStep}
                  isLast={currentPartStepIndex === PART_STEPS.length - 1}
                />
              )
            })()}

            {/* ── Custom Path ── */}
            {state.step === 'custom_platform' && (
              <CustomPlatformSelect
                onSelect={selectCustomPlatform}
                onBack={goBackFromModeOrFirstStep}
              />
            )}
            {state.step === 'custom_socket' && state.platform && (
              <CustomSocketSelect
                platform={state.platform}
                onSelect={selectSocket}
                onBack={goBackFromModeOrFirstStep}
              />
            )}
            {state.step === 'custom_parts' && activeSocket && (
              <CustomPartsSelect
                state={state}
                socket={activeSocket}
                parts={parts}
                priceByPartId={priceByPartId}
                onSelectPart={selectPart}
                onRemovePart={removePart}
                onReview={customNext}
                onBack={goBackFromModeOrFirstStep}
              />
            )}

            {/* ── Shared Review ── */}
            {state.step === 'review' && (
              <ReviewStep
                state={state}
                onRestart={restart}
                priceByPartId={livePriceByPartId ?? priceByPartId}
                isEstimated={livePriceByPartId === undefined}
                livePriceState={livePriceState}
                livePriceError={livePriceError}
                onFetchLivePrices={fetchLivePrices}
              />
            )}
          </div>

          {/* Desktop sidebar */}
          <div className="hidden w-72 shrink-0 lg:flex lg:flex-col" aria-label="Build progress sidebar">
            <QuestLog state={state} priceByPartId={priceByPartId} />
          </div>
        </div>

        {/* Mobile QuestLog — floating button + collapsible drawer */}
        <div className="lg:hidden">
          <button
            onClick={() => setMobileQuestOpen((v) => !v)}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 border border-xai-border bg-xai-bg/90 px-3 py-2.5 backdrop-blur-sm font-mono text-[0.625rem] uppercase tracking-wider text-xai-text-3 transition-colors hover:border-xai-border-strong hover:text-xai-text focus-visible:outline-2 focus-visible:outline-xai-accent focus-visible:outline-offset-2 min-h-[44px]"
            aria-expanded={mobileQuestOpen}
            aria-controls="mobile-quest-drawer"
            aria-label="Toggle build progress panel"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {score}%
          </button>

          {/* Always mounted — CSS toggles visibility to avoid mount/unmount churn */}
          <div
            className={`fixed inset-0 z-40 bg-xai-bg/40 transition-opacity duration-200 ${mobileQuestOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setMobileQuestOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-quest-drawer"
            className={`fixed bottom-14 right-4 z-50 w-72 max-h-[60vh] overflow-y-auto border border-xai-border bg-xai-bg transition-all duration-200 ${mobileQuestOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}
            role="complementary"
            aria-label="Build progress"
          >
            <QuestLog state={state} priceByPartId={priceByPartId} />
          </aside>
        </div>
        </Suspense>
      </WizardModal>
    </main>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Mode Picker
// ═════════════════════════════════════════════════════════════════════════════

function ModePicker({
  onGuided,
  onCustom,
  onBack,
}: {
  onGuided: () => void
  onCustom: () => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-4">← BACK</button>

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
        {/* Guided */}
        <button
          onClick={onGuided}
          className="xai-card-lg text-left"
          aria-label="Guided build mode — answer questions and get recommendations"
        >
          <span className="text-2xl mb-2 block" aria-hidden="true">🗺️</span>
          <p className="font-mono text-sm text-xai-text uppercase tracking-wider">
            Guided Build
          </p>
          <p className="text-xai-text-3 text-xs mt-1.5 leading-snug">
            Answer a few questions — budget, use case — then compare
            AMD vs Intel side-by-side.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
            <span className="xai-tag text-[0.5625rem]">Budget Pick</span>
            <span className="xai-tag text-[0.5625rem]">AMD vs Intel</span>
            <span className="xai-tag text-[0.5625rem]">Step-by-step</span>
          </div>
        </button>

        {/* Custom */}
        <button
          onClick={onCustom}
          className="xai-card-lg text-left"
          aria-label="Custom build mode — pick your own platform and parts"
        >
          <span className="text-2xl mb-2 block" aria-hidden="true">🔧</span>
          <p className="font-mono text-sm text-xai-text uppercase tracking-wider">
            Custom Build
          </p>
          <p className="text-xai-text-3 text-xs mt-1.5 leading-snug">
            You know what you want. Pick your platform and socket,
            then select from only compatible parts.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
            <span className="xai-tag text-[0.5625rem]">AM4 / AM5</span>
            <span className="xai-tag text-[0.5625rem]">LGA 1700 / 1851</span>
            <span className="xai-tag text-[0.5625rem]">Compatibility Filter</span>
          </div>
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Guided inline steps
// ═════════════════════════════════════════════════════════════════════════════

function BudgetStep({ onSelect, onBack }: { onSelect: (b: BudgetTier) => void; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-8">← BACK</button>
      <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-1">Step 1</p>
      <h2 className="xai-heading-lg text-xai-text">
        What's your budget?
      </h2>
      <p className="mt-2 text-xai-text-3 text-sm leading-[1.6] max-w-md">
        Prices in Philippine Peso. We'll recommend parts for your range.
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

function UseCaseStep({ onSelect, onBack }: { onSelect: (u: UseCase) => void; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-8">← BACK</button>
      <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-1">Step 2</p>
      <h2 className="xai-heading-lg text-xai-text">
        What's this build for?
      </h2>
      <p className="mt-2 text-xai-text-3 text-sm leading-[1.6] max-w-md">
        We'll optimize recommendations for your primary use case.
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
