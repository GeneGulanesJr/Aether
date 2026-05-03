import { useWizard } from './WizardContext'
import { QuestLog } from './QuestLog'

// ═════════════════════════════════════════════════════════════════════════════
// MobileQuestPanel
// ─────────────────────────────────────────────────────────────────────────────
// Floating button + collapsible drawer for the build progress on mobile.
// Desktop uses a static sidebar instead (rendered by BuilderPage).
//
// NOTE: This component reads wizard state from WizardContext and receives
//       priceByPartId from BuilderPage since it comes from useCatalogData().
//
// NEXT: If quest log design diverges between mobile/desktop, split QuestLog
//       into QuestLogContent (pure) + QuestLogMobileShell / QuestLogDesktopShell.
// ═════════════════════════════════════════════════════════════════════════════

interface MobileQuestPanelProps {
  priceByPartId: Record<string, string> | undefined
}

export function MobileQuestPanel({ priceByPartId }: MobileQuestPanelProps) {
  const { state, score, mobileQuestOpen, setMobileQuestOpen } = useWizard()

  return (
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
  )
}
