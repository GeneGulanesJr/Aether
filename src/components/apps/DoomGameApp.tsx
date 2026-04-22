/**
 * DoomGameApp — Browser Doom game window for PC Builder.
 * 
 * Wraps doom-lite (https://github.com/benc-uk/doom-lite) inside an iframe.
 * The game's FPS, visual quality, lighting, and draw distance are all
 * throttled based on the user's PC build — demonstrating why component choice matters.
 * 
 * NOT YET WIRED to the Desktop layout. To wire up:
 *   1. Uncomment the desktop icon in Desktop.tsx
 *   2. Uncomment the render case in Desktop.tsx
 */

import { useMemo } from 'react'
import type { BuildSlot } from '../../hooks/useBuild'
import { computePerfProfile, type PerfProfile } from '../../lib/perfScore'

interface DoomGameAppProps {
  slots: BuildSlot[]
}

export function DoomGameApp({ slots }: DoomGameAppProps) {
  const perf: PerfProfile = useMemo(() => computePerfProfile(slots), [slots])

  // Build iframe URL with ALL performance params
  const gameUrl = useMemo(() => {
    const params = new URLSearchParams({
      fps: String(perf.targetFps),
      scale: String(perf.renderScale),
      drawdist: String(perf.drawDistance),
      label: perf.label,
      tier: String(perf.qualityTier),
    })
    return `/doom/index.html?${params.toString()}`
  }, [perf])

  return (
    <div className="flex flex-col h-full bg-black">
      {/* ── Top performance bar ── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-xai-bg border-b border-xai-border">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.5625rem] text-xai-text-4 uppercase tracking-wider">
            Build Benchmark
          </span>
          <span
            className={`font-mono text-xs font-bold ${
              perf.qualityTier >= 3
                ? 'text-green-400'
                : perf.qualityTier >= 2
                  ? 'text-yellow-400'
                  : perf.qualityTier >= 1
                    ? 'text-orange-400'
                    : 'text-red-400'
            }`}
          >
            {perf.label}
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[0.5625rem] text-xai-text-4">
          <span>Score: <strong className="text-xai-text">{perf.score}</strong>/100</span>
          <span>FPS: <strong className="text-xai-text">{perf.targetFps}</strong></span>
          <span>Quality: <strong className="text-xai-text">{perf.qualityName}</strong></span>
        </div>
      </div>

      {/* ── Quality detail chips ── */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1 bg-xai-bg/50 border-b border-xai-border overflow-x-auto">
        <QualityChip
          label="FPS Cap"
          value={String(perf.targetFps)}
          active={true}
          color={perf.targetFps >= 60 ? 'green' : perf.targetFps >= 30 ? 'yellow' : 'red'}
        />
        <QualityChip
          label="Resolution"
          value={`${Math.round(perf.renderScale * 100)}%`}
          active={perf.renderScale < 1}
          color={perf.renderScale >= 0.75 ? 'green' : perf.renderScale >= 0.5 ? 'yellow' : 'red'}
        />
        <QualityChip
          label="Draw Dist"
          value={String(perf.drawDistance)}
          active={perf.drawDistance < 20}
          color={perf.drawDistance >= 16 ? 'green' : perf.drawDistance >= 8 ? 'yellow' : 'red'}
        />
        <QualityChip
          label="Lights"
          value={String(perf.maxLights)}
          active={perf.maxLights < 16}
          color={perf.maxLights >= 10 ? 'green' : perf.maxLights >= 6 ? 'yellow' : 'red'}
        />
        <QualityChip
          label="Specular"
          value={perf.specularEnabled ? 'ON' : 'OFF'}
          active={!perf.specularEnabled}
          color={perf.specularEnabled ? 'green' : 'red'}
        />
        <QualityChip
          label="Textures"
          value={perf.smoothTextures ? 'Bilinear' : 'Nearest'}
          active={!perf.smoothTextures}
          color={perf.smoothTextures ? 'green' : 'yellow'}
        />
        <QualityChip
          label="Fog"
          value={perf.fogEnabled ? 'ON' : 'OFF'}
          active={perf.fogEnabled}
          color={perf.fogEnabled ? 'yellow' : 'green'}
        />
      </div>

      {/* ── Game iframe ── */}
      <div className="flex-1 relative min-h-0">
        <iframe
          src={gameUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="Doom Game Benchmark"
          allow="autoplay"
        />
      </div>

      {/* ── Controls hint ── */}
      <div className="shrink-0 px-3 py-1 bg-xai-bg border-t border-xai-border">
        <p className="font-mono text-[0.5rem] text-xai-text-4 uppercase tracking-wider text-center">
          WASD move · Q/E strafe · R/F look · 1/2 FOV · Better build = better FPS & quality
        </p>
      </div>
    </div>
  )
}

// ── Quality chip component ──

function QualityChip({ label, value, active, color }: {
  label: string
  value: string
  active: boolean  // whether this is downgraded from max
  color: 'green' | 'yellow' | 'red'
}) {
  const colorClass = {
    green: 'text-green-400 border-green-400/30',
    yellow: 'text-yellow-400 border-yellow-400/30',
    red: 'text-red-400 border-red-400/30',
  }[color]

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 border border-xai-border font-mono text-[0.5rem] uppercase tracking-wider ${
      active ? colorClass : 'text-xai-text-3 border-xai-border'
    }`}>
      <span className="text-xai-text-4">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}