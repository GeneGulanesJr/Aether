import type { PriceListFile } from './types'
import { formatPhp } from './format'

/**
 * Builds a lookup map of partId -> formatted price string.
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
