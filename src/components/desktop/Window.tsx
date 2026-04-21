/**
 * Window — Movable, resizable window with title bar.
 * 
 * Drag/resize attach document-level listeners directly in pointerDown handlers.
 * Cleanup happens in pointerUp — no React effect timing issues.
 */

import { useRef, useCallback, type ReactNode } from 'react'
import { useWindowManager, type WindowState } from '../../lib/windowManager'

interface WindowProps {
  window: WindowState
  children: ReactNode
}

export function Window({ window: win, children }: WindowProps) {
  const { closeWindow, minimizeWindow, maximizeWindow, unmaximizeWindow, focusWindow, updatePosition, updateSize } = useWindowManager()
  const elRef = useRef<HTMLDivElement>(null)

  // ── Drag start (title bar) ──

  const onDragStart = useCallback((e: React.PointerEvent) => {
    if (win.maximized) return

    focusWindow(win.id)

    const el = elRef.current
    if (!el) return

    const startX = e.clientX
    const startY = e.clientY
    const origX = win.x
    const origY = win.y

    el.style.willChange = 'transform'

    // Disable pointer events on body during drag
    const body = el.querySelector('[data-window-body]') as HTMLElement | null
    if (body) body.style.pointerEvents = 'none'

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      el.style.transform = `translate3d(${origX + dx}px, ${origY + dy}px, 0)`
    }

    const onUp = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const newX = Math.max(0, origX + dx)
      const newY = Math.max(0, origY + dy)

      updatePosition(win.id, newX, newY)

      el.style.transform = ''
      el.style.willChange = ''
      if (body) body.style.pointerEvents = ''

      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [win.id, win.maximized, win.x, win.y, focusWindow, updatePosition])

  // ── Resize start (bottom-right corner) ──

  const onResizeStart = useCallback((e: React.PointerEvent) => {
    if (win.maximized) return
    e.stopPropagation()

    focusWindow(win.id)

    const el = elRef.current
    if (!el) return

    const startX = e.clientX
    const startY = e.clientY
    const origW = win.width
    const origH = win.height

    el.style.willChange = 'width, height'

    const body = el.querySelector('[data-window-body]') as HTMLElement | null
    if (body) body.style.pointerEvents = 'none'

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      el.style.width = `${Math.max(480, origW + dx)}px`
      el.style.height = `${Math.max(320, origH + dy)}px`
    }

    const onUp = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const newW = Math.max(480, origW + dx)
      const newH = Math.max(320, origH + dy)

      updateSize(win.id, newW, newH)

      el.style.width = ''
      el.style.height = ''
      el.style.willChange = ''
      if (body) body.style.pointerEvents = ''

      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [win.id, win.maximized, win.width, win.height, focusWindow, updateSize])

  // ── Focus on click ──

  const onFocus = useCallback(() => {
    focusWindow(win.id)
  }, [win.id, focusWindow])

  // ── Maximize toggle ──

  const onMaximizeToggle = useCallback(() => {
    if (win.maximized) {
      unmaximizeWindow(win.id, win.x, win.y, win.width, win.height)
    } else {
      maximizeWindow(win.id)
    }
  }, [win.id, win.maximized, win.x, win.y, win.width, win.height, maximizeWindow, unmaximizeWindow])

  // ── Render ──

  const style: React.CSSProperties = win.maximized
    ? {
        position: 'fixed',
        top: 36,
        left: 0,
        right: 0,
        bottom: 40,
        width: 'auto',
        height: 'auto',
        zIndex: win.zIndex,
      }
    : {
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate3d(${win.x}px, ${win.y}px, 0)`,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }

  if (win.minimized) return null

  return (
    <div
      ref={elRef}
      style={style}
      className="flex flex-col border border-xai-border bg-xai-bg"
      onPointerDown={onFocus}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-xai-border cursor-default select-none shrink-0"
        onPointerDown={onDragStart}
      >
        <span className="font-mono text-[0.625rem] uppercase tracking-wider text-xai-text-4">
          {win.title}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => minimizeWindow(win.id)}
            className="w-5 h-5 flex items-center justify-center border border-xai-border text-xai-text-4 hover:text-xai-text hover:border-xai-border-strong transition-colors text-[0.5rem]"
            aria-label="Minimize"
          >
            ─
          </button>
          <button
            onClick={onMaximizeToggle}
            className="w-5 h-5 flex items-center justify-center border border-xai-border text-xai-text-4 hover:text-xai-text hover:border-xai-border-strong transition-colors text-[0.5rem]"
            aria-label={win.maximized ? 'Restore' : 'Maximize'}
          >
            {win.maximized ? '❐' : '□'}
          </button>
          <button
            onClick={() => closeWindow(win.id)}
            className="w-5 h-5 flex items-center justify-center border border-xai-border text-xai-text-4 hover:text-xai-error hover:border-xai-error-border transition-colors text-[0.625rem]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div data-window-body className="flex-1 min-h-0 overflow-auto">
        {children}
      </div>

      {/* Resize handle */}
      {!win.maximized && (
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize"
          onPointerDown={onResizeStart}
        >
          <svg viewBox="0 0 16 16" className="w-full h-full text-xai-text-4 opacity-60">
            <path d="M14 14L8 14M14 14L14 8M14 14L6 6" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </div>
      )}
    </div>
  )
}
