/**
 * Terminal App — CLI interface for power users.
 */

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react'
import type { Part, PriceEntry } from '../../lib/types'
import type { UseBuildResult } from '../../hooks/useBuild'
import { formatPhp } from '../../lib/format'

interface TerminalAppProps {
  parts: Part[]
  priceByPartId: Record<string, string>
  priceEntries: PriceEntry[]
  build: UseBuildResult
}

interface TerminalLine {
  type: 'input' | 'output' | 'error'
  text: string
}

export function TerminalApp({ parts, priceByPartId, priceEntries, build }: TerminalAppProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'output', text: 'Aether Terminal v1.0' },,
    { type: 'output', text: 'Type "help" for available commands.' },
    { type: 'output', text: '' },
  ])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  // Focus input on click
  const handleContainerClick = () => {
    inputRef.current?.focus()
  }

  const addLine = useCallback((type: TerminalLine['type'], text: string) => {
    setLines(prev => [...prev, { type, text }])
  }, [])

  const executeCommand = useCallback((raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return

    addLine('input', `$ ${trimmed}`)

    const [cmd, ...args] = trimmed.toLowerCase().split(/\s+/)
    const query = args.join(' ')

    switch (cmd) {
      case 'help':
        addLine('output', 'Available commands:')
        addLine('output', '  search <query>  — search catalog')
        addLine('output', '  prices <part>   — show prices for a part')
        addLine('output', '  add <part-id>   — add part to build')
        addLine('output', '  build           — show current build')
        addLine('output', '  clear           — clear terminal')
        break

      case 'search': {
        if (!query) {
          addLine('error', 'Usage: search <query>')
          break
        }
        const results = parts.filter(p => p.name.toLowerCase().includes(query)).slice(0, 8)
        if (results.length === 0) {
          addLine('output', `No parts found for "${query}"`)
        } else {
          results.forEach(p => {
            const priceStr = priceByPartId[p.id] ? ` — ${priceByPartId[p.id]}` : ''
            addLine('output', `  [${p.id}] ${p.name}${priceStr}`)
          })
        }
        break
      }

      case 'prices': {
        if (!query) {
          addLine('error', 'Usage: prices <part-name>')
          break
        }
        const matched = parts.filter(p => p.name.toLowerCase().includes(query)).slice(0, 5)
        if (matched.length === 0) {
          addLine('output', `No parts found for "${query}"`)
        } else {
          matched.forEach(p => {
            const priceStr = priceByPartId[p.id] ?? 'no price data'
            const entry = priceEntries.find(e => e.partId === p.id)
            const retailerStr = entry?.retailer ? ` @ ${entry.retailer}` : ''
            addLine('output', `  ${p.name}: ${priceStr}${retailerStr}`)
          })
        }
        break
      }

      case 'add': {
        const partId = args[0]
        if (!partId) {
          addLine('error', 'Usage: add <part-id>')
          break
        }
        const part = parts.find(p => p.id === partId)
        if (!part) {
          addLine('error', `Part not found: ${partId}`)
          break
        }
        build.addPart(part, priceEntries.find(e => e.partId === part.id))
        addLine('output', `Added: ${part.name}`)
        break
      }

      case 'build': {
        if (build.selectedCount === 0) {
          addLine('output', 'Build is empty. Use "add <part-id>" to add parts.')
        } else {
          build.slots.forEach(slot => {
            if (slot.part) {
              const priceStr = slot.part.priceEntry
                ? ` — ${formatPhp(slot.part.priceEntry.amountPhp)}`
                : ''
              addLine('output', `  ${slot.category}: ${slot.part.name}${priceStr}`)
            }
          })
          addLine('output', `  ─────────────────────────`)
          addLine('output', `  Total: ${formatPhp(build.totalPrice)} (${build.selectedCount} parts)`)
        }
        break
      }

      case 'clear':
        setLines([])
        break

      default:
        addLine('error', `Unknown command: ${cmd}. Type "help" for available commands.`)
    }

    addLine('output', '')
  }, [parts, priceByPartId, priceEntries, build, addLine])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input)
      setInput('')
    }
  }, [input, executeCommand])

  return (
    <div
      className="flex flex-col h-full min-h-0 bg-xai-bg font-mono cursor-text"
      onClick={handleContainerClick}
    >
      {/* Output */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto p-3">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`text-[0.625rem] leading-relaxed whitespace-pre-wrap ${
              line.type === 'input' ? 'text-xai-text' :
              line.type === 'error' ? 'text-xai-error' :
              'text-xai-text-3'
            }`}
          >
            {line.text}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-xai-border shrink-0">
        <span className="text-[0.625rem] text-xai-text-4">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[0.625rem] text-xai-text outline-none placeholder:text-xai-text-4"
          placeholder="Type a command..."
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  )
}
