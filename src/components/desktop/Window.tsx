/**
 * Window — Movable, resizable window with title bar.
 * 
 * Drag/resize attach document-level listeners directly in pointerDown handlers.
 * Cleanup happens in pointerUp — no React effect timing issues.
 */

import { useRef, useCallback, useEffect, type ReactNode } from 'react'
import { useWindowManager, type WindowState } from '../../lib/useWindowManager'

interface WindowProps {
  window: WindowState
  children: ReactNode
}

export function Window({ window: win, children }: WindowProps) {
  const { closeWindow, minimizeWindow, maximizeWindow, unmaximizeWindow, focusWindow, updatePosition, updateSize } = useWindowManager()
  const elRef = useRef<HTMLDivElement>(null)

  // ── Safety: clamp position/size on viewport resize ──
  useEffect(() => {
    if (win.maximized || win.minimized) return

    const clampToViewport = () => {
      const maxX = window.innerWidth - 80
      const maxY = window.innerHeight - 36
      const newX = Math.max(80 - win.width, Math.min(win.x, maxX))
      const newY = Math.max(0, Math.min(win.y, maxY))
      const newW = Math.min(win.width, window.innerWidth)
      const newH = Math.min(win.height, window.innerHeight)
      if (newX !== win.x || newY !== win.y) updatePosition(win.id, newX, newY)
      if (newW !== win.width || newH !== win.height) updateSize(win.id, newW, newH)
    }

    window.addEventListener('resize', clampToViewport)
    return () => window.removeEventListener('resize', clampToViewport)
  }, [win.id, win.x, win.y, win.width, win.height, win.maximized, win.minimized, updatePosition, updateSize])

  // ── Drag start (title bar) ──

  // Track last pointer-down timestamp to suppress drag during double-click
  const lastPointerDownRef = useRef(0)
  // Track whether the drag actually moved so we know if we overwrote el.style.transform
  const didMoveRef = useRef(false)

  const onDragStart = useCallback((e: React.PointerEvent) => {
    if (win.maximized) return

    // Suppress drag if this pointer-down is part of a rapid double-click
    // (the second click arrives within 300ms of the first)
    const now = e.timeStamp
    if (now - lastPointerDownRef.current < 300) {
      lastPointerDownRef.current = now
      return
    }
    lastPointerDownRef.current = now

    focusWindow(win.id)

    const el = elRef.current
    if (!el) return

    // Guard: prevent a second drag cycle from starting during double-click
    // while the first one's listeners are still active
    const wasDragging = el.dataset.dragging
    if (wasDragging) return
    el.dataset.dragging = '1'

    const startX = e.clientX
    const startY = e.clientY
    const origX = win.x
    const origY = win.y

    // Keep at least this much of the window visible
    const minVisibleX = 80
    const minVisibleY = 36 // title bar height

    didMoveRef.current = false
    el.style.willChange = 'transform'

    // Disable pointer events on body during drag
    const body = el.querySelector('[data-window-body]') as HTMLElement | null
    if (body) body.style.pointerEvents = 'none'

    const clamp = (x: number, y: number) => {
      const maxX = window.innerWidth - minVisibleX
      const maxY = window.innerHeight - minVisibleY
      return {
        x: Math.max(minVisibleX - win.width, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY)),
      }
    }

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const { x, y } = clamp(origX + dx, origY + dy)
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      didMoveRef.current = true
    }

    const onUp = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY

      // Only clear the inline transform if onMove actually overwrote it.
      // If the pointer never moved, the inline transform was set by React
      // and clearing it would remove the window's positioning for one frame.
      if (didMoveRef.current) {
        el.style.transform = ''
      }
      el.style.willChange = ''
      delete el.dataset.dragging
      if (body) body.style.pointerEvents = ''

      // Only update position if the window actually moved
      if (dx !== 0 || dy !== 0) {
        const { x, y } = clamp(origX + dx, origY + dy)
        updatePosition(win.id, x, y)
      }

      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [win.id, win.maximized, win.x, win.y, win.width, focusWindow, updatePosition])

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

    el.style.willChange = 'transform'
    // Use transform: scale() during drag to stay on compositor thread.
    // Final dimensions are committed to state only on pointerUp.
    const baseTx = win.x
    const baseTy = win.y
    el.style.transformOrigin = 'top left'

    const body = el.querySelector('[data-window-body]') as HTMLElement | null
    if (body) body.style.pointerEvents = 'none'

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const maxW = window.innerWidth - win.x
      const maxH = window.innerHeight - win.y
      const scaleX = Math.max(480 / origW, Math.min((origW + dx) / origW, maxW / origW))
      const scaleY = Math.max(320 / origH, Math.min((origH + dy) / origH, maxH / origH))
      el.style.transform = `translate3d(${baseTx}px, ${baseTy}px, 0) scale(${scaleX}, ${scaleY})`
    }

    const onUp = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const maxW = window.innerWidth - win.x
      const maxH = window.innerHeight - win.y
      const newW = Math.max(480, Math.min(origW + dx, maxW))
      const newH = Math.max(320, Math.min(origH + dy, maxH))

      updateSize(win.id, newW, newH)

      // Clear inline overrides — React re-renders with new state dimensions
      el.style.transform = ''
      el.style.transformOrigin = ''
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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
      className="flex flex-col border border-xai-border bg-xai-bg pointer-events-auto"
      onPointerDown={onFocus}
      role="dialog"
      aria-label={win.title}
      aria-roledescription="window"
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-xai-border cursor-default select-none shrink-0"
        onPointerDown={onDragStart}
        onDoubleClick={onMaximizeToggle}
      >
        <span className="font-mono text-[0.625rem] uppercase tracking-wider text-xai-text-4">
          {win.title}
        </span>
        <div className="flex items-center -mr-1">
          <button
            title-bar-btn
            onClick={() => minimizeWindow(win.id)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center border border-xai-border text-xai-text-4 hover:text-xai-text hover:border-xai-border-strong transition-colors text-[0.5rem]"
            aria-label="Minimize"
          >
            ─
          </button>
          <button
            title-bar-btn
            onClick={onMaximizeToggle}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center border border-xai-border text-xai-text-4 hover:text-xai-text hover:border-xai-border-strong transition-colors text-[0.5rem]"
            aria-label={win.maximized ? 'Restore' : 'Maximize'}
          >
            {win.maximized ? '❐' : '□'}
          </button>
          <button
            title-bar-btn
            onClick={() => closeWindow(win.id)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center border border-xai-border text-xai-text-4 hover:text-xai-error hover:border-xai-error-border transition-colors text-[0.625rem]"
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
          className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize"
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
