/**
 * Top Bar — compact header replacing AppShell.
 * Shows: "PC Builder PH" | search bar | clock
 */

import { useState, useCallback, useRef, type KeyboardEvent } from 'react'
import { useWindowManager } from '../../lib/windowManager'

interface TopBarProps {
  onSearch?: (query: string) => void
}

export function TopBar({ onSearch }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { openWindow } = useWindowManager()

  const handleSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      openWindow('marketplace', 'Marketplace', { search: searchQuery.trim() })
      setSearchQuery('')
    }
  }, [searchQuery, openWindow])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }, [handleSubmit])

  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')

  return (
    <div className="fixed top-0 left-0 right-0 h-9 bg-xai-bg border-b border-xai-border flex items-center px-3 z-50 gap-4">
      {/* Brand */}
      <span className="font-mono text-[0.625rem] uppercase tracking-wider text-xai-text-4 shrink-0">
        PC Builder PH
      </span>

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search parts..."
          className="w-full bg-transparent border border-xai-border px-2 py-1 font-mono text-[0.625rem] text-xai-text placeholder:text-xai-text-4 outline-none focus:border-xai-accent transition-colors"
        />
      </div>

      {/* Clock */}
      <span className="font-mono text-[0.625rem] text-xai-text-4 shrink-0">
        {h}:{m}
      </span>
    </div>
  )
}
