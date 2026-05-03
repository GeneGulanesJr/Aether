/**
 * Retailer identification and metadata.
 *
 * Provides helpers to derive store names from part IDs and
 * maintain a registry of known retailers for per-store handling
 * of price formatting/parsing.
 */

/**
 * Derive store name from part ID prefix.
 *
 * Part IDs are constructed as: {category}-{retailerKey}-{unique-id}
 * where retailerKey may be:
 *   - 2 segments:    "cpu-easypc-..."        → key = "easypc"
 *   - 3 segments:    "cpu-pc-express-..."    → key = "pc-express"
 *                    "cpu-dynaquest-pc-..." → key = "dynaquest-pc"
 *
 * The function tries the 3-segment prefix first, then falls back to 2-segment.
 */
export function retailerFromPartId(partId: string): string {
  // Defensive guard: reject non-string input (e.g. undefined, number, object)
  if (typeof partId !== 'string') return 'Unknown'

  const parts = partId.split('-')
  if (parts.length < 2) return 'Unknown'

  // Try 3-segment key first: category-retailer-subkey
  if (parts.length >= 3) {
    const key3 = `${parts[1]}-${parts[2]}`.toLowerCase()
    if (RETAILER_MAP[key3]) return RETAILER_MAP[key3]
  }

   // Fall back to 2-segment key: retailer is always second-to-last segment
   //   3-seg ID:   [cat, retailer, ...]    → index 1  (length-2)
   //   4-seg ID:   [cat, subcat, retailer, ...] → index 2  (length-2)
   const key2 = parts[parts.length - 2].toLowerCase()
   return RETAILER_MAP[key2] || 'Unknown'
}

/**
 * Map of retailer ID (from part ID, lowercase) → human-readable name.
 * Extend this map when adding new retailers.
 */
export const RETAILER_MAP: Record<string, string> = {
  // 2-segment keys (single-word retailer in parts[1])
  benstore: 'Ben Store',
  bermor: 'Bermor Techzone',
  datablitz: 'DataBlitz',
  easypc: 'EasyPC',
  electroworld: 'Electroworld',
  gigahertz: 'Gigahertz',
  itech: 'iTech',
  octagon: 'Octagon',
  pcworx: 'PCWORX',
  silicon: 'Silicon Valley',
  villman: 'VillMan',

  // 3-segment keys (2-word retailer: parts[1]-parts[2])
  // These catch 4-segment IDs where retailer spans two segments
  'bermor-techzone': 'Bermor Techzone',
  'ben-store': 'Ben Store',
  'silicon-valley': 'Silicon Valley',

  // Explicit 3-segment keys
  'dynaquest-pc': 'DynaQuest PC',
  'pc-express': 'PC Express',
}

/**
 * Store website URLs for "Visit store" links.
 */
export const STORE_URLS: Record<string, string> = {
  'Bermor Techzone': 'https://bermorzone.com.ph',
  'EasyPC': 'https://www.easypc.com.ph',
  'PC Express': 'https://www.pcexpress.com.ph',
  'VillMan': 'https://villman.com',
  'PCWORX': 'https://pcworx.com.ph',
  'DataBlitz': 'https://datablitz.com.ph',
  'DynaQuest PC': 'https://dynaquestpc.com',
  'Silicon Valley': 'https://siliconvalley.com.ph',
  'Octagon': 'https://octagon.com.ph',
  'Electroworld': 'https://electroworld.com.ph',
  'Ben Store': 'https://benstore.com.ph',
  'Gigahertz': 'https://gigahertz.com.ph',
  'iTech': 'https://itech.com.ph',
}
