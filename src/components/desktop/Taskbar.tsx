/**
 * Taskbar — bottom bar showing open windows and system tray.
 */

import { useCallback } from 'react'
import { useWindowManager } from '../../lib/useWindowManager'
import { useClock } from '../../hooks/useClock'

export function Taskbar() {
  const { state, restoreWindow, focusWindow } = useWindowManager()

  const handleWindowClick = useCallback((id: string, minimized: boolean) => {
    if (minimized) {
      restoreWindow(id)
    } else {
      focusWindow(id)
    }
  }, [restoreWindow, focusWindow])

  const visibleWindows = state.windows

  return (
    <div className="fixed bottom-0 left-0 right-0 h-10 bg-xai-bg border-t border-xai-border flex items-center px-2 z-50">
      {/* Open windows */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {visibleWindows.map((win) => (
          <button
            key={win.id}
            onClick={() => handleWindowClick(win.id, win.minimized)}
            aria-label={`${win.minimized ? 'Restore' : 'Focus'} ${win.title}`}
            className={`
              font-mono text-[0.5625rem] uppercase tracking-wider px-3 py-1.5 border transition-colors focus-visible:outline-2 focus-visible:outline-xai-accent focus-visible:outline-offset-2
              ${win.minimized
                ? 'border-xai-border text-xai-text-4 hover:text-xai-text hover:border-xai-border-strong'
                : 'border-xai-border-strong text-xai-text bg-xai-surface'
              }
            `}
          >
            {win.title}
          </button>
        ))}
      </div>

      {/* System tray */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
          <TaskbarClock />
        </span>
      </div>
    </div>
  )
}

function TaskbarClock() {
  return <>{useClock()}</>
}
