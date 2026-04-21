import { useState, useEffect, lazy, Suspense } from 'react'
import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BuilderPage } from './pages/BuilderPage'
import { useCatalogData } from './hooks/useCatalogData'
import { useBuild } from './hooks/useBuild'

// Lazy-load Desktop (includes R3F, only loaded on desktop viewport)
const Desktop = lazy(() => import('./components/desktop/Desktop').then(m => ({ default: m.Desktop })))

const DESKTOP_BREAKPOINT = 768

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= DESKTOP_BREAKPOINT)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    setIsDesktop(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}

export function App() {
  const isDesktop = useIsDesktop()
  const { parts, priceByPartId, priceEntries, loadingState } = useCatalogData()
  const build = useBuild(priceEntries)

  if (loadingState === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-xai-bg">
        <div className="xai-progress w-32"><div className="xai-progress-fill" style={{ width: '60%' }} /></div>
      </div>
    )
  }

  // Even if data fails to load, render the UI with empty state
  // This lets us build/test the desktop shell without R2 data
  const safeParts = parts ?? []
  const safePriceByPartId = priceByPartId ?? {}
  const safePriceEntries = priceEntries ?? []

  // Desktop OS layout (>768px)
  if (isDesktop) {
    return (
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex min-h-dvh items-center justify-center bg-xai-bg">
            <div className="xai-progress w-32"><div className="xai-progress-fill" style={{ width: '60%' }} /></div>
          </div>
        }>
          <Desktop
            parts={safeParts}
            priceByPartId={safePriceByPartId}
            priceEntries={safePriceEntries}
            build={build}
          />
          {loadingState === 'error' && (
            <div className="fixed top-9 left-0 right-0 z-[60] bg-xai-error/10 border-b border-xai-error-border px-3 py-1.5">
              <p className="font-mono text-[0.5625rem] text-xai-error uppercase tracking-wider text-center">
                Catalog data unavailable — running with empty state
              </p>
            </div>
          )}
        </Suspense>
      </ErrorBoundary>
    )
  }

  // Mobile wizard layout (<768px) — existing flow
  return (
    <AppShell>
      <ErrorBoundary>
        <BuilderPage />
      </ErrorBoundary>
    </AppShell>
  )
}
