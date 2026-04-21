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
  /** Called after opening the primary window (e.g. to open a companion window) */
  onOpen?: () => void
}

export function DesktopIcon({ icon, label, appType, windowTitle, payload, onOpen }: DesktopIconProps) {
  const { openWindow } = useWindowManager()

  const handleClick = useCallback(() => {
    openWindow(appType, windowTitle, payload)
    onOpen?.()
  }, [appType, windowTitle, payload, openWindow, onOpen])

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
