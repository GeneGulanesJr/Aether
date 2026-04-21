/**
 * useSceneBuild — Maps useBuild slots to scene-friendly data.
 * Decouples the scene from build state internals.
 */

import { useMemo } from 'react'
import type { UseBuildResult } from '../../hooks/useBuild'

export interface SceneSlot {
  category: string
  partName: string
  filled: boolean
}

// Distinct colors per category for the procedural models
const CATEGORY_COLORS: Record<string, string> = {
  cpu: '#d4a039',
  motherboard: '#1a5c1a',
  ram: '#2563eb',
  gpu: '#7c3aed',
  storage: '#6b7280',
  psu: '#374151',
  case: '#1f2937',
  cpu_cooler: '#9ca3af',
  fans: '#60a5fa',
  monitor: '#4b5563',
}

export function useSceneBuild(build: UseBuildResult) {
  const sceneSlots = useMemo((): SceneSlot[] => {
    return build.slots.map(slot => ({
      category: slot.category,
      partName: slot.part?.name ?? '',
      filled: slot.part !== null,
    }))
  }, [build.slots])

  const filledCount = sceneSlots.filter(s => s.filled).length
  const isEmpty = filledCount === 0

  return { sceneSlots, filledCount, isEmpty, categoryColors: CATEGORY_COLORS }
}
