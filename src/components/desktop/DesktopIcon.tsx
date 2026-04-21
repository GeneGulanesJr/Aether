/**
 * Desktop Icon — single-click to open a window.
 * Fixed grid, top-left column layout.
 */

import { useCallback } from 'react'
import { useWindowManager, type AppType } from '../../lib/windowManager'

interface DesktopIconProps {
  icon: string
  label: string
  appType: AppType
  windowTitle: string
  payload?: Record<string, unknown>
}

export function DesktopIcon({ icon, label, appType, windowTitle, payload }: DesktopIconProps) {
  const { openWindow } = useWindowManager()

  const handleClick = useCallback(() => {
    openWindow(appType, windowTitle, payload)
  }, [appType, windowTitle, payload, openWindow])

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center gap-1.5 p-3 group cursor-default select-none text-left"
      aria-label={`Open ${label}`}
    >
      <span
        className="text-2xl transition-transform group-active:scale-95"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-xai-text-3 group-hover:text-xai-text transition-colors">
        {label}
      </span>
    </button>
  )
}
