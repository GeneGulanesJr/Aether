/**
 * Desktop — Full viewport container for the OS metaphor.
 * Renders: R3F background scene, desktop icons, windows, top bar, taskbar.
 */

import { Suspense, lazy, useCallback, useState } from 'react'
import { WindowManagerProvider, useWindowManager } from '../../lib/useWindowManager'
import { DesktopIcon } from './DesktopIcon'
import { Window } from './Window'
import { WindowErrorBoundary } from './WindowErrorBoundary'
import { TopBar } from './TopBar'
import { Taskbar } from './Taskbar'
import { Onboarding } from './Onboarding'
import type { Part, PriceEntry } from '../../lib/types'
import type { UseBuildResult } from '../../hooks/useBuild'

// Lazy-load app windows
const MarketplaceApp = lazy(() => import('../apps/MarketplaceApp').then(m => ({ default: m.MarketplaceApp })))
const MyRigApp = lazy(() => import('../apps/MyRigApp').then(m => ({ default: m.MyRigApp })))
const PartPropertiesApp = lazy(() => import('../apps/PartPropertiesApp').then(m => ({ default: m.PartPropertiesApp })))
const TerminalApp = lazy(() => import('../apps/TerminalApp').then(m => ({ default: m.TerminalApp })))
// Lazy-load Doom game window (not fully wired yet)
const DoomGameApp = lazy(() => {
  return import('../apps/DoomGameApp').then(m => ({ default: m.DoomGameApp }))
})
const WizardApp = lazy(() => import('../wizard/WizardApp').then(m => ({ default: m.WizardApp })))

// Lazy-load R3F scene (only on desktop)
const BuildScene = lazy(() => import('../scene/BuildScene').then(m => ({ default: m.BuildScene })))

interface DesktopProps {
  parts: Part[]
  priceByPartId: Record<string, string>
  priceEntries: PriceEntry[]
  build: UseBuildResult
}

function DesktopInner({ parts, priceByPartId, priceEntries, build }: DesktopProps) {
  const { state, closeWindow, openWindow, updatePosition, getWindowByType } = useWindowManager()

  // ── Shared state: which part the Marketplace should show prices for ──
  const [highlightPartId, setHighlightPartId] = useState<string | null>(null)

  // Open marketplace companion window, positioned to the right
  const openMarketplaceCompanion = useCallback(() => {
    const existing = getWindowByType('marketplace')
    if (existing) {
      closeWindow(existing.id)
    }
    const winId = openWindow('marketplace', 'Marketplace', { companion: true })
    // Position to right side of viewport
    const margin = 16
    const marketplaceWidth = Math.max(640, Math.round(window.innerWidth * 0.55))
    updatePosition(winId, window.innerWidth - marketplaceWidth - margin, 44)
  }, [openWindow, updatePosition, getWindowByType, closeWindow])


  const renderWindowContent = (win: typeof state.windows[0]) => {
    switch (win.appType) {
      case 'marketplace':
        return (
          <MarketplaceApp
            parts={parts}
            priceByPartId={priceByPartId}
            priceEntries={priceEntries}
            build={build}
            initialCategory={win.payload?.category as string | undefined}
            initialSearch={win.payload?.search as string | undefined}
            companion={win.payload?.companion === true}
            highlightPartId={highlightPartId}
            onSelectStoreOffer={(partId, offer) => {
              // Find the part and add to build with the selected store offer
              const part = parts.find((p) => p.id === partId)
              if (part) {
                build.addPart(part, {
                  partId: part.id,
                  amountPhp: offer.amountPhp,
                  retailer: offer.retailer,
                  productUrl: offer.productUrl,
                  observedAt: offer.observedAt,
                })
              }
            }}
          />
        )
      case 'my-rig':
        return (
          <MyRigApp
            build={build}
            parts={parts}
            priceByPartId={priceByPartId}
            priceEntries={priceEntries}
            onPreviewPart={setHighlightPartId}
          />
        )
      case 'part-properties':
        return (
          <PartPropertiesApp
            part={win.payload?.part as Part}
            priceByPartId={priceByPartId}
            priceEntries={priceEntries}
            build={build}
          />
        )
      case 'terminal':
        return (
          <TerminalApp parts={parts} priceByPartId={priceByPartId} priceEntries={priceEntries} build={build} />
        )
      case 'doom-game':
        return <DoomGameApp slots={build.slots} />
      case 'wizard':
        return <WizardApp />
      default:
        return <div className="p-4 text-xai-text-4 font-mono text-xs">Unknown app</div>
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Skip to content — accessibility */}
      <a
        href="#desktop-icons"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-12 focus:z-[100] focus:bg-xai-accent focus:px-4 focus:py-2 focus:text-[#1f2228] focus:font-mono focus:text-sm focus:uppercase focus:tracking-wider"
      >
        Skip to desktop
      </a>

      {/* R3F 3D background scene */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={null}>
          <BuildScene build={build} />
        </Suspense>
      </div>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 z-[1] bg-xai-bg/85" aria-hidden="true" />

      {/* Top Bar */}
      <TopBar />

      {/* Desktop icons (low z, below TopBar & windows) */}
      <div id="desktop-icons" tabIndex={-1} className="absolute inset-0 z-[2] pt-9 pb-10">
        {/* Desktop Icons — top-left column */}
        <div className="absolute top-12 left-2 flex flex-col gap-1">
          <DesktopIcon
            icon="🧙"
            label="Build Wizard"
            appType="wizard"
            windowTitle="Build Wizard"
          />
          <DesktopIcon
            icon="🖥️"
            label="New Build"
            appType="my-rig"
            windowTitle="My Rig"
            onOpen={openMarketplaceCompanion}
          />
          <DesktopIcon
            icon="📦"
            label="Marketplace"
            appType="marketplace"
            windowTitle="Marketplace"
          />
          <DesktopIcon
            icon="💻"
            label="Terminal"
            appType="terminal"
            windowTitle="Terminal"
          />
          {/* Doom benchmark — only shows when required build slots are filled */}
          {build.selectedCount >= 5 && (
            <DesktopIcon
              icon="🎮"
              label="Doom Benchmark"
              appType="doom-game"
              windowTitle="Doom Benchmark"
            />
          )}
        </div>
      </div>

      {/* Windows — sibling of TopBar so its own z-index competes globally (not trapped in a parent stacking context). pointer-events-none so icons remain clickable. */}
      <div className="absolute inset-0 pt-9 pb-10 pointer-events-none" style={{ zIndex: 51 }}>
        {state.windows.map((win) => (
          <Window key={win.id} window={win}>
            <WindowErrorBoundary onClose={() => closeWindow(win.id)}>
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="xai-progress w-24"><div className="xai-progress-fill" style={{ transform: 'scaleX(0.4)' }} /></div>
                </div>
              }>
                {renderWindowContent(win)}
              </Suspense>
            </WindowErrorBoundary>
          </Window>
        ))}
      </div>

      {/* Onboarding — shown on first visit with empty build */}
      {build.selectedCount === 0 && <Onboarding />}

      {/* Taskbar */}
      <Taskbar />
    </div>
  )
}

export function Desktop(props: DesktopProps) {
  return (
    <WindowManagerProvider>
      <DesktopInner {...props} />
    </WindowManagerProvider>
  )
}
