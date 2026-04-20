/**
 * Shimmer skeleton components for loading states.
 * Uses xAI design tokens for consistent theming.
 */

function SkeletonCard() {
  return (
    <div className="xai-card">
      {/* Image placeholder */}
      <div className="mb-3 aspect-square w-full animate-pulse bg-xai-bg-surface" />
      {/* Title placeholder */}
      <div className="mb-2 h-5 w-3/4 animate-pulse bg-xai-bg-surface" />
      {/* Subtitle/category placeholder */}
      <div className="mb-3 h-4 w-1/2 animate-pulse bg-xai-bg-surface" />
      {/* Specs placeholders */}
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse bg-xai-bg-surface" />
        <div className="h-3 w-5/6 animate-pulse bg-xai-bg-surface" />
      </div>
      {/* Price placeholder */}
      <div className="mt-4 flex items-center justify-between">
        <div className="h-6 w-20 animate-pulse bg-xai-bg-surface" />
        <div className="h-8 w-24 animate-pulse bg-xai-bg-surface" />
      </div>
    </div>
  )
}

function SkeletonFilterBar() {
  return (
    <div className="xai-card flex animate-pulse gap-2">
      <div className="h-8 w-20 bg-xai-bg-surface" />
      <div className="h-8 w-24 bg-xai-bg-surface" />
      <div className="h-8 w-28 bg-xai-bg-surface" />
      <div className="ml-auto h-8 w-16 bg-xai-bg-surface" />
    </div>
  )
}

function SkeletonStatusBar() {
  return (
    <div className="xai-card h-12 animate-pulse">
      <div className="flex h-full items-center justify-center">
        <div className="h-4 w-48 bg-xai-bg-surface" />
      </div>
    </div>
  )
}

/**
 * Skeleton grid for catalog loading state.
 * Shows 6 placeholder cards in the same grid layout as PartGrid.
 */
export function CatalogSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

/**
 * Full loading skeleton for the catalog section.
 * Includes status bar, filter bar, and skeleton grid.
 */
export function CatalogLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonStatusBar />
      <SkeletonFilterBar />
      <div>
        <div className="mb-3 h-5 w-32 animate-pulse bg-xai-bg-surface" />
        <CatalogSkeleton />
      </div>
    </div>
  )
}

export { SkeletonFilterBar, SkeletonStatusBar }
