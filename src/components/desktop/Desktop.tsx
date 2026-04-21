/**
 * Desktop — Full viewport container for the OS metaphor.
 * Renders: R3F background scene, desktop icons, windows, top bar, taskbar.
 */

import { Suspense, lazy, useCallback } from 'react'
import { WindowManagerProvider, useWindowManager } from '../../lib/windowManager'
import { DesktopIcon } from './DesktopIcon'
import { Window } from './Window'
import { WindowErrorBoundary } from './WindowErrorBoundary'
import { TopBar } from './TopBar'
import { Taskbar } from './Taskbar'
import type { Part, PriceEntry } from '../../lib/types'
import type { UseBuildResult } from '../../hooks/useBuild'

// Lazy-load app windows
const MarketplaceApp = lazy(() => import('../apps/MarketplaceApp').then(m => ({ default: m.MarketplaceApp })))
const MyRigApp = lazy(() => import('../apps/MyRigApp').then(m => ({ default: m.MyRigApp })))
const PartPropertiesApp = lazy(() => import('../apps/PartPropertiesApp').then(m => ({ default: m.PartPropertiesApp })))
const TerminalApp = lazy(() => import('../apps/TerminalApp').then(m => ({ default: m.TerminalApp })))

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

  // Open marketplace companion window, positioned to the right
  const openMarketplaceCompanion = useCallback(() => {
    const existing = getWindowByType('marketplace')
    if (existing) {
      closeWindow(existing.id)
    }
    const winId = openWindow('marketplace', 'Marketplace')
    // Position to right side of viewport
    const margin = 16
    const marketplaceWidth = Math.max(640, Math.round(window.innerWidth * 0.55))
    updatePosition(winId, window.innerWidth - marketplaceWidth - margin, 44)
  }, [openWindow, updatePosition, getWindowByType, closeWindow])

  // Close marketplace after part selection
  const closeMarketplace = useCallback(() => {
    const win = getWindowByType('marketplace')
    if (win) closeWindow(win.id)
  }, [getWindowByType, closeWindow])

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
            onPartAdded={closeMarketplace}
          />
        )
      case 'my-rig':
        return (
          <MyRigApp build={build} priceEntries={priceEntries} />
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
      default:
        return <div className="p-4 text-xai-text-4 font-mono text-xs">Unknown app</div>
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
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

      {/* Desktop content */}
      <div className="absolute inset-0 z-[2] pt-9 pb-10">
        {/* Desktop Icons — top-left column */}
        <div className="absolute top-12 left-2 flex flex-col gap-1">
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
        </div>

        {/* Windows */}
        {state.windows.map((win) => (
          <Window key={win.id} window={win}>
            <WindowErrorBoundary onClose={() => closeWindow(win.id)}>
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="xai-progress w-24"><div className="xai-progress-fill" style={{ width: '40%' }} /></div>
                </div>
              }>
                {renderWindowContent(win)}
              </Suspense>
            </WindowErrorBoundary>
          </Window>
        ))}
      </div>

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
