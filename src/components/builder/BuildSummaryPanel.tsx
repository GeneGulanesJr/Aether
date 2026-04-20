import type { BuildSlot } from '../../lib/types'

type BuildSummaryPanelProps = {
  slots: BuildSlot[]
}

export function BuildSummaryPanel({ slots }: BuildSummaryPanelProps) {
  const filled = slots.filter((s) => s.part !== null).length

  return (
    <aside className="xai-card flex flex-col gap-4">
      <p className="font-mono text-xs text-xai-text-3 uppercase tracking-wider">
        Build summary
      </p>
      <p className="font-mono text-2xl text-xai-text" style={{ fontWeight: 300 }}>
        {filled}{' '}
        <span className="font-mono text-sm text-xai-text-3" style={{ fontWeight: 400 }}>
          / {slots.length} slots
        </span>
      </p>
      <ul className="flex flex-col gap-2">
        {slots.map((slot) => (
          <li
            key={slot.category}
            className="flex justify-between gap-2 border-b border-xai-border py-2 last:border-0"
          >
            <span className="font-mono text-xs text-xai-text-3 capitalize">{slot.category}</span>
            <span className="font-mono text-xs text-xai-text truncate text-right max-w-[200px]">
              {slot.part?.name ?? '—'}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1 border border-xai-border bg-xai-bg-surface p-3">
        <p className="text-sm text-xai-text-3">
          Total{' '}
          <span className="font-mono text-lg text-xai-text" style={{ fontWeight: 300 }}>
            ₱0
          </span>
        </p>
      </div>
      <p className="font-mono text-[0.625rem] text-xai-text-4">
        Compatibility & totals ship in a later phase.
      </p>
    </aside>
  )
}
