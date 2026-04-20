import slotsData from '../data/slots.json'
import type { BuildSlot, Part } from './types'

/**
 * Slot definition from JSON config.
 * Defines the schema for slots loaded from data/slots.json.
 */
export interface SlotDefinition {
  id: string
  category: string
  label: string
  required: boolean
  order: number
}

/**
 * Container for slot definitions loaded from JSON.
 */
export interface SlotDefinitionsFile {
  schemaVersion: string
  slots: SlotDefinition[]
}

/**
 * Build slot instance — a slot definition bound to a selected part.
 */
export interface BuildSlotInstance {
  definition: SlotDefinition
  part: Part | null
}

/** The raw slot definitions loaded from JSON. */
export const SLOT_DEFINITIONS = slotsData as SlotDefinitionsFile

/**
 * Get all slot definitions, sorted by display order.
 */
export function getSlotDefinitions(): SlotDefinition[] {
  return [...SLOT_DEFINITIONS.slots].sort((a, b) => a.order - b.order)
}

/**
 * Initialize build slots from the JSON definitions.
 * Each slot starts with no part selected.
 */
export function initializeBuildSlots(): BuildSlot[] {
  return getSlotDefinitions().map((def) => ({
    category: def.category as BuildSlot['category'],
    part: null,
  }))
}

/**
 * Default slots for backward compatibility.
 * Prefer initializeBuildSlots() for new code.
 */
export const DEFAULT_SLOTS = initializeBuildSlots()
