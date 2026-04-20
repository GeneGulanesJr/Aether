interface PartCardProps {
  part: {
    id: string
    name: string
    category: string
    specs: Record<string, string>
    imageUrl?: string
  }
  priceLabel?: string
  blueprint?: boolean
  onAddToBuild?: (part: unknown) => void
  isSelected?: boolean
}

function PartCard({ part, priceLabel, blueprint, onAddToBuild, isSelected }: PartCardProps) {
  const specEntries = Object.entries(part.specs).slice(0, 4)

  return (
    <article
      className={[
        'xai-card group cursor-default',
        isSelected ? 'xai-card-active' : '',
        blueprint ? 'xai-card-active' : '',
      ].join(' ')}
    >
      {/* Image — flat, no rounded corners */}
      {part.imageUrl ? (
        <div className="w-full overflow-hidden bg-xai-bg-surface mb-3" style={{ aspectRatio: '16/9' }}>
          <img
            src={part.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : null}

      <div>
        <h3 className="font-mono text-sm text-xai-text uppercase tracking-wider leading-snug">
          {part.name}
        </h3>
        <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-wider mt-1">
          {part.category}
        </p>
      </div>

      {/* Specs — key/value grid matching SpecSheet style */}
      <dl className="mt-2 space-y-0.5">
        {specEntries.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="font-mono text-[0.625rem] text-xai-text-4">{k}</dt>
            <dd className="font-mono text-[0.625rem] text-xai-text-2">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Price */}
      {priceLabel ? (
        <p className="font-mono text-base text-xai-text mt-3" style={{ fontWeight: 300 }}>
          {priceLabel}
        </p>
      ) : null}

      {/* Add button */}
      {onAddToBuild && (
        <button
          className="xai-btn xai-btn-ghost mt-3 w-full justify-center"
          onClick={() => onAddToBuild(part)}
        >
          {isSelected ? '✓ SELECTED' : 'ADD TO BUILD'}
        </button>
      )}
    </article>
  )
}

export { PartCard }
export type { PartCardProps }
