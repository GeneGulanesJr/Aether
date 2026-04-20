/**
 * Simple build state management hook.
 * Makes PC building easy for non-technical users.
 */

import { useState, useCallback, useMemo } from 'react'
import type { Part, BuildSlotCategory, PriceEntry } from '../lib/types'
import { initializeBuildSlots } from '../lib/slots'

export type SelectedPart = Part & { priceEntry?: PriceEntry }

export interface BuildSlot {
  category: BuildSlotCategory
  part: SelectedPart | null
}

export interface UseBuildResult {
  /** Current slots with selected parts */
  slots: BuildSlot[]
  /** Add a part to its matching slot (replaces if exists) */
  addPart: (part: Part, priceEntry?: PriceEntry) => void
  /** Remove a part from a slot */
  removePart: (category: BuildSlotCategory) => void
  /** Check if a slot is filled */
  isSlotFilled: (category: BuildSlotCategory) => boolean
  /** Get the selected part for a category */
  getSelectedPart: (category: BuildSlotCategory) => SelectedPart | null
  /** Total number of selected parts */
  selectedCount: number
  /** Total price of all selected parts (in PHP) */
  totalPrice: number
  /** Clear entire build */
  clearBuild: () => void
}

/**
 * Simple hook for managing PC build selection.
 * 
 * Usage:
 * ```ts
 * const { slots, addPart, removePart, totalPrice } = useBuild()
 * 
 * // Add a part (automatically goes to correct slot)
 * addPart(cpuPart, priceInfo)
 * 
 * // Remove from a slot
 * removePart('cpu')
 * ```
 */
export function useBuild(priceEntries: PriceEntry[] = []): UseBuildResult {
  const [slots, setSlots] = useState<BuildSlot[]>(() => initializeBuildSlots())

  // Create price lookup map
  const priceByPartId = useMemo(() => {
    const map: Record<string, PriceEntry> = {}
    for (const entry of priceEntries) {
      map[entry.partId] = entry
    }
    return map
  }, [priceEntries])

  const addPart = useCallback((part: Part, priceEntry?: PriceEntry) => {
    const entry = priceEntry ?? priceByPartId[part.id]
    const partWithPrice: SelectedPart = { ...part, priceEntry: entry }

    setSlots((prev) =>
      prev.map((slot) =>
        slot.category === part.category
          ? { ...slot, part: partWithPrice }
          : slot
      )
    )
  }, [priceByPartId])

  const removePart = useCallback((category: BuildSlotCategory) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.category === category ? { ...slot, part: null } : slot
      )
    )
  }, [])

  const isSlotFilled = useCallback((category: BuildSlotCategory) => {
    return slots.some((s) => s.category === category && s.part !== null)
  }, [slots])

  const getSelectedPart = useCallback((category: BuildSlotCategory) => {
    return slots.find((s) => s.category === category)?.part ?? null
  }, [slots])

  const clearBuild = useCallback(() => {
    setSlots(initializeBuildSlots())
  }, [])

  const selectedCount = slots.filter((s) => s.part !== null).length

  const totalPrice = slots.reduce((sum, slot) => {
    const amount = slot.part?.priceEntry?.amountPhp ?? 0
    return sum + amount
  }, 0)

  return {
    slots,
    addPart,
    removePart,
    isSlotFilled,
    getSelectedPart,
    selectedCount,
    totalPrice,
    clearBuild,
  }
}