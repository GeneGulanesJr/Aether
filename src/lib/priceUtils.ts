import type { PriceListFile } from './types'
import { formatPhp } from './format'
import { retailerFromPartId, RETAILER_MAP } from './retailer'

/**
 * Builds a lookup map of partId → formatted price string.
 */
export function buildPriceMap(
  prices: PriceListFile,
  formatter: (amount: number) => string = formatPhp
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const entry of prices.entries) {
    map[entry.partId] = formatter(entry.amountPhp)
  }
  return map
}

/**
 * All known retailer names (values from RETAILER_MAP).
 * Used to pre-populate STORE_PRICE_REGEX so every retailer has an explicit entry.
 */
const ALL_RETAILERS = new Set(Object.values(RETAILER_MAP))

/**
 * Per-store price cleaning patterns.
 * Maps retailer name → regex that strips non-numeric characters,
 * leaving only digits and decimal point.
 *
 * All current Philippine retailers format prices as "₱12,345" or
 * "₱12,345.67" (standard PHP locale formatting via formatPhp).
 * Therefore every retailer uses the same pattern: /[^0-9.]/g
 *
 * If a future retailer uses a different format, add an override here.
 */
export const STORE_PRICE_REGEX: Record<string, RegExp> = Object.fromEntries(
  Array.from(ALL_RETAILERS).map(retailer => [retailer, /[^0-9.]/g])
)

// Ensure default is always present
STORE_PRICE_REGEX.default = /[^0-9.]/g

/**
 * Parse a formatted price string to a number using store-specific rules.
 *
 * @param priceStr Formatted price string (e.g. "₱27,000").
 * @param partId Optional part ID to infer retailer; if omitted, uses default pattern.
 * @returns Numeric price, or NaN if parsing fails.
 */
export function parsePrice(priceStr: string | null | undefined, partId?: string): number {
  if (!priceStr) return NaN
  const retailer = partId ? retailerFromPartId(partId) : 'default'
  const pattern = STORE_PRICE_REGEX[retailer] || STORE_PRICE_REGEX.default
  const cleaned = priceStr.replace(pattern, '')
  const value = parseFloat(cleaned)
  return isNaN(value) ? NaN : value
}
