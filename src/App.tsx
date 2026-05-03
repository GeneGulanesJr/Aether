import { useSyncExternalStore, lazy, Suspense } from 'react'
import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BuilderPage } from './pages/BuilderPage'
import { useCatalogData } from './hooks/useCatalogData'
import { useBuild } from './hooks/useBuild'

// Lazy-load Desktop (includes R3F, only loaded on desktop viewport)
const Desktop = lazy(() => import('./components/desktop/Desktop').then(m => ({ default: m.Desktop })))

const DESKTOP_BREAKPOINT = 768

function useIsDesktop() {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
      mq.addEventListener('change', callback)
      return () => mq.removeEventListener('change', callback)
    },
    () => window.innerWidth >= DESKTOP_BREAKPOINT,
  )
}

export function App() {
  const isDesktop = useIsDesktop()
  const { parts, priceByPartId, priceEntries, loadingState } = useCatalogData()
  const build = useBuild(priceEntries)

  if (loadingState === 'loading') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-xai-bg">
        <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-6">
          Aether
        </p>
        <div className="w-40 h-0.5 bg-xai-border overflow-hidden relative">
          <div
            className="absolute top-0 left-0 h-full bg-xai-text"
            style={{
              width: '75%',
              animation: 'loader-slide 2s ease-in-out infinite',
            }}
          />
        </div>
        <p className="mt-4 font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
          Fetching catalog…
        </p>
      </div>
    )
  }

  // Even if data fails to load, render the UI with empty state
  // This lets us build/test the desktop shell without API data
  const safeParts = parts ?? []
  const safePriceByPartId = priceByPartId ?? {}
  const safePriceEntries = priceEntries ?? []

  // Desktop OS layout (>768px)
  if (isDesktop) {
    return (
      <div className="app-loaded">
        <ErrorBoundary>
        <Suspense fallback={
          <div className="flex min-h-dvh flex-col items-center justify-center bg-xai-bg">
            <p className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
              Loading desktop…
            </p>
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
      </div>
    )
  }

  // Mobile wizard layout (<768px) — existing flow
  return (
    <div className="app-loaded">
      <AppShell>
        <ErrorBoundary>
          <BuilderPage />
        </ErrorBoundary>
      </AppShell>
    </div>
  )
}