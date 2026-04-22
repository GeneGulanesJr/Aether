import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Skip to content link — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-xai-accent focus:px-4 focus:py-2 focus:text-[#1f2228] focus:font-mono focus:text-sm focus:uppercase focus:tracking-wider"
      >
        Skip to content
      </a>

      {/* ── Header + Navigation landmarks ── */}
      <header className="border-b border-xai-border">
        <nav aria-label="Main navigation" className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3 sm:px-6">
          <p className="font-mono text-sm text-xai-text uppercase tracking-wider">
            PC Builder PH
          </p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-wider hidden sm:block">
              Philippine Peso · 2025
            </span>
          </div>
        </nav>
      </header>


      <main
        id="main-content"
        className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
      >
        {children}
      </main>
      <footer
        className="border-t border-xai-border"
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3 sm:px-6">
          <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-wider">
            PC Builder PH · {new Date().getFullYear()}
          </p>
          <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-wider hidden sm:block">
            Rotate or widen for desktop experience
          </p>
        </div>
      </footer>
    </div>
  )
}
