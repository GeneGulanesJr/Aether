/**
 * Formats a number as Philippine Peso (PHP) currency string.
 * Uses the en-PH locale for proper thousand separator formatting.
 */
export function formatPhp(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`
}