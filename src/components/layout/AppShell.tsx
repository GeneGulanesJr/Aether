import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-xai-border bg-xai-bg/90 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="font-mono text-sm tracking-widest text-xai-text uppercase"
            >
              PC BUILDER
            </span>
            <span className="xai-tag">PH</span>
          </div>
          <span className="font-mono text-xs text-xai-text-4 tracking-wider">
            ₱ PHP
          </span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8">
        {children}
      </main>
    </div>
  )
}
