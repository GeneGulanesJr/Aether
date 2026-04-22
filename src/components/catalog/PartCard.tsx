import type { Part } from '../../lib/types'

type PartCardProps = {
  part: Part
  priceLabel?: string
  blueprint?: boolean
  onAddToBuild?: (part: Part) => void
  onPreview?: () => void
  isSelected?: boolean
}

export function PartCard({ part, priceLabel, blueprint, onAddToBuild, onPreview, isSelected }: PartCardProps) {
  const specEntries = Object.entries(part.specs).slice(0, 2)

  return (
    <article
      className={[
        'xai-card group cursor-pointer !p-2',
        isSelected ? 'xai-card-active' : '',
        blueprint ? 'xai-card-active' : '',
      ].join(' ')}
      onClick={onPreview}
      aria-label={`${part.name} — ${part.category}`}
    >
      <div className="flex gap-2">
        {/* Thumbnail — small fixed size */}
        {part.imageUrl ? (
          <div className="shrink-0 w-12 h-12 overflow-hidden bg-xai-bg-surface">
            <img
              src={part.imageUrl}
              alt={part.name}
              className="h-full w-full object-cover transition-all duration-300 group-hover:opacity-75"
              loading="lazy"
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3 className="font-mono text-[0.5625rem] text-xai-text uppercase tracking-wider leading-snug line-clamp-2">
            {part.name}
          </h3>

          {/* Specs — compact key/value rows */}
          <dl className="mt-1 space-y-px">
            {specEntries.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-1">
                <dt className="font-mono text-[0.5rem] text-xai-text-4 truncate">{k}</dt>
                <dd className="font-mono text-[0.5rem] text-xai-text-2 truncate text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Price + action row */}
      <div className="flex items-center justify-between mt-2">
        {priceLabel ? (
          <p className="xai-price font-mono text-xs text-xai-text">
            {priceLabel}
          </p>
        ) : <span />}

        {onAddToBuild && (
          <button
            className="xai-btn xai-btn-ghost !text-[0.5rem] min-h-[1.75rem] !px-2"
            onClick={(e) => { e.stopPropagation(); onAddToBuild(part) }}
            aria-label={isSelected ? `${part.name} selected` : `Add ${part.name} to build`}
            aria-pressed={isSelected}
          >
            {isSelected ? '✓' : 'ADD'}
          </button>
        )}
      </div>
    </article>
  )
}
