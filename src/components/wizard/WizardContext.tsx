/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
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

// ═════════════════════════════════════════════════════════════════════════════
// WizardStateProvider
// ─────────────────────────────────────────────────────────────────────────────
// Holds the entire wizard state machine: current step, selected build mode,
// budget, use-case, platform, socket, and chosen parts.
//
// NOTE: This context does NOT handle sound effects or catalog data.
//       - Sound: Step components should call useSound() before dispatching.
//       - Catalog: Pass parts/prices as props to the step renderer.
//
// NEXT: If this page grows more complex (e.g. saved builds, shareable URLs),
//       move WizardState persistence (localStorage / query params) here.
// ═════════════════════════════════════════════════════════════════════════════

export interface WizardContextValue {
  // Core state
  state: WizardState
  modalOpen: boolean
  mobileQuestOpen: boolean

  // Derived read-only values
  activeSocket: SocketOption | null
  currentPartStepIndex: number
  score: number

  // Modal controls
  closeModal: () => void

  // Mobile drawer
  setMobileQuestOpen: (v: boolean | ((prev: boolean) => boolean)) => void

  // Navigation
  goBack: () => void
  guidedNext: () => void

  // State transitions
  chooseGuided: () => void
  chooseCustom: () => void
  selectBudget: (budget: BudgetTier) => void
  selectUseCase: (useCase: UseCase) => void
  selectPlatform: (platform: Platform) => void
  selectPart: (category: BuildSlotCategory, part: Part) => void
  removePart: (category: BuildSlotCategory) => void
  selectSocket: (socket: SocketOption) => void
  restart: () => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside <WizardProvider>')
  return ctx
}

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [modalOpen, setModalOpen] = useState(true)
  const [mobileQuestOpen, setMobileQuestOpen] = useState(false)

  // ── Derived values ───────────────────────────────────────────────────────

  const activeSocket = useMemo(() => {
    if (!state.socket || !state.platform) return null
    return getSocketsForPlatform(state.platform).find((s) => s.id === state.socket) ?? null
  }, [state.socket, state.platform])

  const currentPartStepIndex = useMemo(() => {
    if (!state.step || state.step === 'review' || state.step === 'platform' || state.step === 'socket') return -1
    return PART_STEPS.findIndex((s) => s.id === state.step)
  }, [state.step])

  const score = useMemo(() => buildScore(state.selectedParts), [state.selectedParts])

  // ── Modal controls ───────────────────────────────────────────────────────

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setMobileQuestOpen(false)
  }, [])

  // ── Navigation ───────────────────────────────────────────────────────────

  const guidedNext = useCallback(() => {
    setState((prev) => {
      const n = nextGuidedStep(prev.step)
      if (!n) return prev
      const completedAt = n === 'review' ? Date.now() : prev.completedAt
      return { ...prev, step: n, completedAt }
    })
  }, [])

  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.step === 'mode') {
        return { ...INITIAL_STATE }
      }
      if (prev.step === 'budget') return { ...prev, step: 'mode' }
      if (prev.step === 'usecase') return { ...prev, step: 'budget' }
      if (prev.step === 'platform') return { ...prev, step: prev.budget ? 'usecase' : 'mode' }
      if (prev.step === 'socket') return { ...prev, step: 'platform' }
      const p = prevGuidedStep(prev.step)
      return p ? { ...prev, step: p } : prev
    })
  }, [])

  // ── State transitions ────────────────────────────────────────────────────

  const chooseGuided = useCallback(() => {
    setState((prev) => ({ ...prev, mode: 'guided', step: 'budget' }))
  }, [])

  const chooseCustom = useCallback(() => {
    setState((prev) => ({ ...prev, mode: 'guided', step: 'platform', budget: null, useCase: null }))
  }, [])

  const selectBudget = useCallback((budget: BudgetTier) => {
    setState((prev) => ({ ...prev, budget, step: 'usecase' }))
  }, [])

  const selectUseCase = useCallback((useCase: UseCase) => {
    setState((prev) => ({ ...prev, useCase, step: 'platform' }))
  }, [])

  const selectPlatform = useCallback((platform: Platform) => {
    setState((prev) => {
      const socket = resolveSocketForGuided(platform, prev.budget ?? 'mid')
      return { ...prev, platform, socket: socket?.id ?? null, step: 'socket' }
    })
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

  const selectSocket = useCallback((socket: SocketOption) => {
    setState((prev) => ({ ...prev, socket: socket.id, step: 'cpu' }))
  }, [])

  const restart = useCallback(() => {
    setState(INITIAL_STATE)
    setModalOpen(true)
    setMobileQuestOpen(false)
  }, [])

  // ── Side effects ─────────────────────────────────────────────────────────

  // Close mobile quest drawer when modal closes
  useEffect(() => {
    if (!modalOpen) setMobileQuestOpen(false) // eslint-disable-line react-hooks/set-state-in-effect
  }, [modalOpen])

  // ═════════════════════════════════════════════════════════════════════════
  // NOTE: Live price fetching on review step is intentionally LEFT OUT.
  // It needs catalog data (useCatalogData) which lives in BuilderPage.
  // BuilderPageContent composes wizard state + catalog data to trigger it.
  // ═════════════════════════════════════════════════════════════════════════

  const value = useMemo(
    () => ({
      state,
      modalOpen,
      mobileQuestOpen,
      activeSocket,
      currentPartStepIndex,
      score,
      closeModal,
      setMobileQuestOpen,
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
    }),
     
    [
      state,
      modalOpen,
      mobileQuestOpen,
      activeSocket,
      currentPartStepIndex,
      score,
      closeModal,
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
    ]
  )

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}
