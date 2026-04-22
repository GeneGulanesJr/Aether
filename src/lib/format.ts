/**
 * Formats a number as Philippine Peso (PHP) currency string.
 * Shows ₱ symbol, comma thousands separator, no decimal places (rounded to nearest peso).
 * Example: 62000 → "₱62,000"
 */
export function formatPhp(amount: number): string {
  return `₱${Math.round(amount).toLocaleString('en-PH')}`
}
