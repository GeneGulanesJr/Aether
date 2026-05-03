/* eslint-disable react-refresh/only-export-components */
/**
 * Window Manager — React Context + useReducer for desktop window state.
 * 
 * Performance: drag/resize use refs (no React state updates during gesture).
 * Z-index normalizes when max exceeds 100.
 */

import { createContext, useReducer, useCallback, type ReactNode } from 'react'

// ── Types ──

export type AppType = 'marketplace' | 'my-rig' | 'part-properties' | 'terminal' | 'doom-game' | 'wizard'

export interface WindowState {
  id: string
  title: string
  appType: AppType
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  maximized: boolean
  zIndex: number
  payload?: Record<string, unknown>
}

export interface WindowManagerState {
  windows: WindowState[]
  nextZIndex: number
}

type Action =
  | { type: 'OPEN'; window: WindowState }
  | { type: 'CLOSE'; id: string }
  | { type: 'MINIMIZE'; id: string }
  | { type: 'RESTORE'; id: string }
  | { type: 'MAXIMIZE'; id: string }
  | { type: 'UNMAXIMIZE'; id: string; x: number; y: number; width: number; height: number }
  | { type: 'FOCUS'; id: string }
  | { type: 'UPDATE_POSITION'; id: string; x: number; y: number }
  | { type: 'UPDATE_SIZE'; id: string; width: number; height: number }
  | { type: 'NORMALIZE_Z' }

// ── Default sizes per app type (viewport-relative with min/max clamps) ──

function getDefaultSize(appType: AppType): { width: number; height: number } {
  // Available space: full viewport minus top bar (36px) and taskbar (40px)
  const availW = typeof window !== 'undefined' ? window.innerWidth : 1280
  const availH = typeof window !== 'undefined' ? window.innerHeight - 76 : 800

  const sizes: Record<AppType, { vw: number; vh: number; minW: number; minH: number }> = {
    marketplace:    { vw: 0.55, vh: 0.65, minW: 640, minH: 480 },
    'my-rig':       { vw: 0.35, vh: 0.70, minW: 420, minH: 520 },
    'part-properties': { vw: 0.40, vh: 0.60, minW: 500, minH: 450 },
    terminal:       { vw: 0.45, vh: 0.50, minW: 560, minH: 360 },
    'doom-game':    { vw: 0.75, vh: 0.80, minW: 640, minH: 480 },
    wizard:         { vw: 0.80, vh: 0.85, minW: 540, minH: 600 },
  }

  const s = sizes[appType]
  return {
    width: Math.max(s.minW, Math.round(availW * s.vw)),
    height: Math.max(s.minH, Math.round(availH * s.vh)),
  }
}

// ── Reducer ──

function windowReducer(state: WindowManagerState, action: Action): WindowManagerState {
  switch (action.type) {
    case 'OPEN': {
      // If an app of this type already exists, focus it instead
      const existing = state.windows.find(w => w.appType === action.window.appType)
      if (existing) {
        return {
          ...state,
          windows: state.windows.map(w =>
            w.id === existing.id
              ? { ...w, minimized: false, zIndex: state.nextZIndex }
              : w
          ),
          nextZIndex: state.nextZIndex + 1,
        }
      }
      return {
        windows: [...state.windows, action.window],
        nextZIndex: state.nextZIndex + 1,
      }
    }

    case 'CLOSE':
      return {
        ...state,
        windows: state.windows.filter(w => w.id !== action.id),
      }

    case 'MINIMIZE':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, minimized: true } : w
        ),
      }

    case 'RESTORE':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id
            ? { ...w, minimized: false, zIndex: state.nextZIndex }
            : w
        ),
        nextZIndex: state.nextZIndex + 1,
      }

    case 'MAXIMIZE':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, maximized: true } : w
        ),
      }

    case 'UNMAXIMIZE':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id
            ? { ...w, maximized: false, x: action.x, y: action.y, width: action.width, height: action.height }
            : w
        ),
      }

    case 'FOCUS': {
      const nextZ = state.nextZIndex
      // Normalize if threshold exceeded
      if (nextZ > 100) {
        const minZ = Math.min(...state.windows.map(w => w.zIndex))
        return {
          windows: state.windows.map(w =>
            w.id === action.id
              ? { ...w, zIndex: 100 - minZ, minimized: false }
              : { ...w, zIndex: w.zIndex - minZ + 1 }
          ),
          nextZIndex: 101,
        }
      }
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, zIndex: nextZ, minimized: false } : w
        ),
        nextZIndex: nextZ + 1,
      }
    }

    case 'UPDATE_POSITION':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, x: action.x, y: action.y } : w
        ),
      }

    case 'UPDATE_SIZE':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, width: action.width, height: action.height } : w
        ),
      }

    default:
      return state
  }
}

// ── Context ──

interface WindowManagerContextValue {
  state: WindowManagerState
  openWindow: (appType: AppType, title: string, payload?: Record<string, unknown>) => string
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  restoreWindow: (id: string) => void
  maximizeWindow: (id: string) => void
  unmaximizeWindow: (id: string, x: number, y: number, width: number, height: number) => void
  focusWindow: (id: string) => void
  updatePosition: (id: string, x: number, y: number) => void
  updateSize: (id: string, width: number, height: number) => void
  getWindow: (id: string) => WindowState | undefined
  getWindowByType: (appType: AppType) => WindowState | undefined
}

export const WindowManagerContext = createContext<WindowManagerContextValue | null>(null)

// ── Provider ──

let windowIdCounter = 0

function getNextWindowPosition(existingWindows: WindowState[]): { x: number; y: number } {
  const offset = existingWindows.length * 30
  return {
    x: 80 + offset,
    y: 60 + offset,
  }
}

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(windowReducer, { windows: [], nextZIndex: 1 })

  const openWindow = useCallback((appType: AppType, title: string, payload?: Record<string, unknown>): string => {
    const existing = state.windows.find(w => w.appType === appType)
    if (existing) {
      dispatch({ type: 'FOCUS', id: existing.id })
      return existing.id
    }

    const id = `win-${++windowIdCounter}`
    const size = getDefaultSize(appType)
    const pos = getNextWindowPosition(state.windows)

    dispatch({
      type: 'OPEN',
      window: {
        id,
        title,
        appType,
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
        minimized: false,
        maximized: false,
        zIndex: state.nextZIndex,
        payload,
      },
    })
    return id
  }, [state.windows, state.nextZIndex])

  const closeWindow = useCallback((id: string) => dispatch({ type: 'CLOSE', id }), [])
  const minimizeWindow = useCallback((id: string) => dispatch({ type: 'MINIMIZE', id }), [])
  const restoreWindow = useCallback((id: string) => dispatch({ type: 'RESTORE', id }), [])
  const maximizeWindow = useCallback((id: string) => dispatch({ type: 'MAXIMIZE', id }), [])
  const unmaximizeWindow = useCallback((id: string, x: number, y: number, width: number, height: number) =>
    dispatch({ type: 'UNMAXIMIZE', id, x, y, width, height }), [])
  const focusWindow = useCallback((id: string) => dispatch({ type: 'FOCUS', id }), [])
  const updatePosition = useCallback((id: string, x: number, y: number) =>
    dispatch({ type: 'UPDATE_POSITION', id, x, y }), [])
  const updateSize = useCallback((id: string, width: number, height: number) =>
    dispatch({ type: 'UPDATE_SIZE', id, width, height }), [])

  const getWindow = useCallback((id: string) => state.windows.find(w => w.id === id), [state.windows])
  const getWindowByType = useCallback((appType: AppType) => state.windows.find(w => w.appType === appType), [state.windows])

  return (
    <WindowManagerContext.Provider value={{
      state,
      openWindow,
      closeWindow,
      minimizeWindow,
      restoreWindow,
      maximizeWindow,
      unmaximizeWindow,
      focusWindow,
      updatePosition,
      updateSize,
      getWindow,
      getWindowByType,
    }}>
      {children}
    </WindowManagerContext.Provider>
  )
}

