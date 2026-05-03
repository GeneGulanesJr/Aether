/**
 * useWindowManager hook — extracted to separate file for React Fast Refresh.
 * WindowManagerProvider must be mounted in the React tree before use.
 */

import { useContext } from 'react'
import { WindowManagerContext } from './windowManager'

// Re-export provider for consumers
export { WindowManagerProvider } from './windowManager'

// Re-export types used by consumers
export type { AppType, WindowState } from './windowManager'

export function useWindowManager() {
  const ctx = useContext(WindowManagerContext)
  if (!ctx) {
    throw new Error('useWindowManager must be used within WindowManagerProvider')
  }
  return ctx
}
