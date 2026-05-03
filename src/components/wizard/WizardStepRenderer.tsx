import { useMemo, lazy } from 'react'
import { useWizard } from './WizardContext'
import { useSound } from '../../hooks/useSound'
import type { BuildSlotCategory } from '../../lib/types'
import type { Platform, BudgetTier, UseCase, SocketOption } from '../../lib/buildWizard'
import { PART_STEPS } from '../../lib/buildWizard'
import type { CatalogData } from '../../hooks/useCatalogData'

import { ModePicker } from './ModePicker'
import { BudgetStep } from './BudgetStep'
import { UseCaseStep } from './UseCaseStep'

// Lazy-loaded wizard step components — only fetched when the wizard opens
const PartSelectStep = lazy(() => import('./PartSelectStep').then(m => ({ default: m.PartSelectStep })))
const PlatformStep = lazy(() => import('./PlatformStep').then(m => ({ default: m.PlatformStep })))
const ReviewStep = lazy(() => import('./ReviewStep').then(m => ({ default: m.ReviewStep })))
const CustomSocketSelect = lazy(() => import('./CustomBuildFlow').then(m => ({ default: m.CustomSocketSelect })))

// ═════════════════════════════════════════════════════════════════════════════
// WizardStepRenderer
// ─────────────────────────────────────────────────────────────────────────────
// Maps the current wizard step (from WizardContext) to the correct UI
// component. This is the "switchboard" of the wizard.
//
// NOTE: Catalog data (parts, prices) is passed from BuilderPage because
//       it comes from useCatalogData() which lives outside the wizard.
//       If catalog fetching ever moves inside the wizard, absorb it here.
//
// NOTE: Sound effects are injected here for lazy-loaded step components
//       that don't have direct access to useSound().
//       ModePicker / BudgetStep / UseCaseStep receive pre-wrapped callbacks.
//
// NEXT: Extract the inline lazy imports into a step registry so new
//       steps can be added without editing this switch statement.
// ═════════════════════════════════════════════════════════════════════════════

export function WizardStepRenderer({ catalog }: { catalog: CatalogData }) {
  const {
    state,
    activeSocket,
    currentPartStepIndex,
    goBack,
    guidedNext,
    chooseGuided,
    chooseCustom,
    selectBudget,
    selectUseCase,
    selectPlatform,
    selectPart,
    removePart,
    selectSocket,
    restart,
  } = useWizard()
  const sound = useSound()

  // Budget-aware part filtering for guided mode.
  // Returns all parts — over-budget ones are tagged visually in PartSelectStep.
  const budgetFilter = useMemo(() => {
    const tier = state.budget
    if (tier === 'low') return { hard: 15000, stretch: 18000 }
    if (tier === 'mid') return { hard: 40000, stretch: 50000 }
    return { hard: Infinity, stretch: Infinity } // high = no filter
  }, [state.budget])

  // Wrap dispatchers with sound effects for imported step components.
  // Inline steps (ModePicker, BudgetStep, UseCaseStep) receive these
  // pre-wrapped callbacks directly.
  const handleChooseGuided = () => { sound.pop(); chooseGuided() }
  const handleChooseCustom = () => { sound.pop(); chooseCustom() }
  const handleSelectBudget = (b: BudgetTier) => { sound.pop(); selectBudget(b) }
  const handleSelectUseCase = (u: UseCase) => { sound.pop(); selectUseCase(u) }
  const handleSelectPlatform = (p: Platform) => { sound.pop(); selectPlatform(p) }
  const handleSelectPart = (c: BuildSlotCategory, p: { id: string; name: string; category: string; specs: Record<string, string> }) => { sound.pop(); selectPart(c, p) }
  const handleRemovePart = (c: BuildSlotCategory) => { sound.click(); removePart(c) }
  const handleSelectSocket = (s: SocketOption) => { sound.pop(); selectSocket(s) }
  const handleRestart = () => { sound.pop(); restart() }
  const handleGuidedNext = () => { sound.pop(); guidedNext() }
  const handleGoBack = () => { sound.click(); goBack() }

  return (
    <>
      {/* ── Mode Picker ── */}
      {state.step === 'mode' && (
        <ModePicker
          onGuided={handleChooseGuided}
          onCustom={handleChooseCustom}
          onBack={handleGoBack}
        />
      )}

      {/* ── Guided Path ── */}
      {state.step === 'budget' && (
        <BudgetStep onSelect={handleSelectBudget} onBack={handleGoBack} />
      )}
      {state.step === 'usecase' && (
        <UseCaseStep onSelect={handleSelectUseCase} onBack={handleGoBack} />
      )}
  {state.step === 'platform' && (
        <PlatformStep
          budget={state.budget}
          useCase={state.useCase}
          onSelect={handleSelectPlatform}
          onBack={handleGoBack}
        />
      )}
      {currentPartStepIndex >= 0 && state.platform && (() => {
        const stepInfo = PART_STEPS[currentPartStepIndex]
        const category = stepInfo.category!
        const guidedSocket = state.socket
          ? activeSocket
          : null
        return (
          <PartSelectStep
            step={stepInfo}
            platform={state.platform}
            socket={guidedSocket}
            parts={catalog.parts}
            selectedPart={state.selectedParts[category] ?? null}
            priceByPartId={catalog.priceByPartId}
            budgetLimit={state.budget ? budgetFilter : undefined}
            onSelect={(part) => handleSelectPart(category, part)}
            onRemove={() => handleRemovePart(category)}
            onNext={handleGuidedNext}
            onBack={handleGoBack}
            isLast={currentPartStepIndex === PART_STEPS.length - 1}
          />
        )
      })()}
      {state.step === 'socket' && state.platform && (
        <CustomSocketSelect
          platform={state.platform}
          onSelect={handleSelectSocket}
          onBack={handleGoBack}
        />
      )}

      {/* ── Shared Review ── */}
      {state.step === 'review' && (
        <ReviewStep
          state={state}
          onRestart={handleRestart}
          priceByPartId={catalog.priceByPartId}
          isEstimated={true}
          livePriceState={undefined}
          livePriceError={undefined}
          onFetchLivePrices={() => {}}
        />
      )}
    </>
  )
}
