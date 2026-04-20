import { useState, useCallback, useMemo } from 'react'
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
import { PcScene } from '../components/scene/PcScene'
import { WizardModal } from '../components/wizard/WizardModal'
import { CompareStep } from '../components/wizard/CompareStep'
import { PartSelectStep } from '../components/wizard/PartSelectStep'
import { ReviewStep } from '../components/wizard/ReviewStep'
import { QuestLog } from '../components/wizard/QuestLog'
import {
  CustomPlatformSelect,
  CustomSocketSelect,
  CustomPartsSelect,
} from '../components/wizard/CustomBuildFlow'

export function BuilderPage() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [modalOpen, setModalOpen] = useState(false)
  const { parts, priceByPartId } = useCatalogData()

  const isWizardActive = state.step !== 'welcome'

  // Resolve the active socket object when in custom mode
  const activeSocket = useMemo(() => {
    if (!state.socket || !state.platform) return null
    return getSocketsForPlatform(state.platform).find((s) => s.id === state.socket) ?? null
  }, [state.socket, state.platform])

  // ─── Modal open/close ───────────────────────────────────────────────────

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])

  // ─── Mode selection ─────────────────────────────────────────────────────

  const startBuild = useCallback(() => {
    setState({ ...INITIAL_STATE, step: 'mode', startedAt: Date.now() })
    openModal()
  }, [openModal])

  const chooseGuided = useCallback(() => {
    setState((prev) => ({ ...prev, mode: 'guided', step: 'budget' }))
  }, [])

  const chooseCustom = useCallback(() => {
    setState((prev) => ({ ...prev, mode: 'custom', step: 'custom_platform' }))
  }, [])

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
    setState((prev) => ({ ...prev, budget, step: 'usecase' }))
  }, [])

  const selectUseCase = useCallback((useCase: UseCase) => {
    setState((prev) => ({ ...prev, useCase, step: 'compare' }))
  }, [])

  const selectPlatform = useCallback((platform: Platform) => {
    setState((prev) => ({ ...prev, platform, step: 'cpu' }))
  }, [])

  const selectPart = useCallback((category: BuildSlotCategory, part: Part) => {
    setState((prev) => {
      const selectedParts = { ...prev.selectedParts, [category]: part }
      return { ...prev, selectedParts }
    })
  }, [])

  const removePart = useCallback((category: BuildSlotCategory) => {
    setState((prev) => {
      const selectedParts = { ...prev.selectedParts }
      delete selectedParts[category]
      return { ...prev, selectedParts }
    })
  }, [])

  // Custom-specific: platform + socket
  const selectCustomPlatform = useCallback((platform: Platform) => {
    setState((prev) => ({ ...prev, platform, step: 'custom_socket' }))
  }, [])

  const selectSocket = useCallback((socket: SocketOption) => {
    setState((prev) => ({ ...prev, socket: socket.id, step: 'custom_parts' }))
  }, [])

  const restart = useCallback(() => {
    setState(INITIAL_STATE)
    setModalOpen(false)
  }, [])

  // ─── Back from first step of each mode goes to mode picker ──────────────

  const goBackFromModeOrFirstStep = useCallback(() => {
    setState((prev) => {
      // If on mode picker, close modal
      if (prev.step === 'mode') {
        setModalOpen(false)
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

  const score = buildScore(state.selectedParts)
  const filledCount = Object.keys(state.selectedParts).length

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* ══════════ 3D Scene Background ══════════ */}
      <div className="absolute inset-0 z-0">
        <PcScene state={state} />
      </div>

      {/* ══════════ Landing ══════════ */}
      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-xs text-xai-text-3 uppercase tracking-[0.3em] mb-6">
            Philippines · ₱ PHP
          </p>
          <h1
            className="text-xai-text leading-none"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              fontWeight: 300,
              letterSpacing: '-0.04em',
            }}
          >
            BUILD
          </h1>
          <h1
            className="text-xai-text leading-none"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              fontWeight: 300,
              letterSpacing: '-0.04em',
            }}
          >
            YOUR RIG
          </h1>
          <p className="mt-6 text-xai-text-2 max-w-lg mx-auto" style={{ lineHeight: 1.7 }}>
            Let us guide you through the perfect build — or go freestyle
            and pick exactly what you want.
          </p>

          <button onClick={startBuild} className="xai-btn xai-btn-primary mt-10">
            START BUILD
          </button>
        </div>

        {isWizardActive && (
          <div className="mt-12 flex items-center gap-6">
            <button onClick={openModal} className="xai-btn xai-btn-ghost">
              CONTINUE BUILD →
            </button>
            <span className="font-mono text-xs text-xai-text-3">
              {filledCount}/{PART_STEPS.length} parts · {score}%
            </span>
          </div>
        )}
      </div>

      {/* ══════════ Wizard Modal ══════════ */}
      <WizardModal isOpen={modalOpen} onClose={closeModal}>
        <div className="flex gap-6">
          <div className="min-w-0 flex-1">

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
                  parts={parts}
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
              <ReviewStep state={state} onRestart={restart} />
            )}
          </div>

          <div className="hidden w-64 shrink-0 lg:block">
            <QuestLog state={state} />
          </div>
        </div>
      </WizardModal>
    </div>
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
    <div>
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-6">← BACK</button>
      <p className="font-mono text-xs text-xai-text-3 uppercase tracking-widest mb-2">
        Choose your path
      </p>
      <h2 className="text-xai-text" style={{ fontSize: '1.5rem', fontWeight: 400 }}>
        How do you want to build?
      </h2>
      <p className="mt-1 text-xai-text-2 text-sm" style={{ lineHeight: 1.6 }}>
        Two ways to get to your perfect rig. Pick your style.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Guided */}
        <button onClick={onGuided} className="xai-card text-left">
          <span className="text-3xl mb-4 block">🗺️</span>
          <p className="font-mono text-sm text-xai-text uppercase tracking-wider">
            Guided Build
          </p>
          <p className="text-xai-text-3 text-xs mt-2 leading-snug">
            Answer a few questions — budget, use case — then compare
            AMD vs Intel side-by-side. We recommend the best build for you.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="xai-tag text-[0.5625rem]">Budget Pick</span>
            <span className="xai-tag text-[0.5625rem]">AMD vs Intel</span>
            <span className="xai-tag text-[0.5625rem]">Step-by-step</span>
          </div>
        </button>

        {/* Custom */}
        <button onClick={onCustom} className="xai-card text-left">
          <span className="text-3xl mb-4 block">🔧</span>
          <p className="font-mono text-sm text-xai-text uppercase tracking-wider">
            Custom Build
          </p>
          <p className="text-xai-text-3 text-xs mt-2 leading-snug">
            You know what you want. Pick your platform and socket,
            then select from only compatible parts. Full control.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
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
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-6">← BACK</button>
      <p className="font-mono text-xs text-xai-text-3 uppercase tracking-widest mb-2">Step 1</p>
      <h2 className="text-xai-text" style={{ fontSize: '1.5rem', fontWeight: 400 }}>
        What's your budget?
      </h2>
      <p className="mt-1 text-xai-text-2 text-sm" style={{ lineHeight: 1.6 }}>
        Prices in Philippine Peso. We'll recommend parts for your range.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {BUDGET_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className="xai-card text-left flex flex-col"
          >
            <span className="text-xl mb-2">{opt.icon}</span>
            <p className="font-mono text-xs text-xai-text uppercase tracking-wider">{opt.label}</p>
            <p className="font-mono text-base text-xai-text mt-0.5" style={{ fontWeight: 300 }}>{opt.range}</p>
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
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-6">← BACK</button>
      <p className="font-mono text-xs text-xai-text-3 uppercase tracking-widest mb-2">Step 2</p>
      <h2 className="text-xai-text" style={{ fontSize: '1.5rem', fontWeight: 400 }}>
        What's this build for?
      </h2>
      <p className="mt-1 text-xai-text-2 text-sm" style={{ lineHeight: 1.6 }}>
        We'll optimize recommendations for your primary use case.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {USECASE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className="xai-card text-left"
          >
            <span className="text-2xl mb-3 block">{opt.icon}</span>
            <p className="font-mono text-sm text-xai-text uppercase tracking-wider">{opt.label}</p>
            <p className="text-xai-text-3 text-xs mt-1.5 leading-snug">{opt.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
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
