import { describe, it, expect } from 'vitest'
import { buildPriceMap, parsePrice, STORE_PRICE_REGEX } from '../priceUtils'
import type { PriceListFile } from '../types'

describe('priceUtils', () => {
  describe('buildPriceMap', () => {
    it('builds a map from partId to formatted price string', () => {
      const prices: PriceListFile = {
        schemaVersion: '1.0',
        entries: [
          { partId: 'cpu-1', amountPhp: 15000, retailer: 'pchub' },
          { partId: 'gpu-1', amountPhp: 45000, retailer: 'pcx' },
        ],
      }

      const map = buildPriceMap(prices)

      expect(map).toEqual({
        'cpu-1': '₱15,000',
        'gpu-1': '₱45,000',
      })
    })

    it('supports custom formatter', () => {
      const prices: PriceListFile = {
        schemaVersion: '1.0',
        entries: [{ partId: 'cpu-1', amountPhp: 15000 }],
      }

      const map = buildPriceMap(prices, (n) => `PHP${n.toFixed(2)}`)

      expect(map['cpu-1']).toBe('PHP15000.00')
    })

    it('handles empty price list', () => {
      const prices: PriceListFile = { schemaVersion: '1.0', entries: [] }
      const map = buildPriceMap(prices)
      expect(map).toEqual({})
    })
  })

  describe('parsePrice', () => {
    it('parses standard PHP price format', () => {
      expect(parsePrice('₱12,345')).toBe(12345)
      expect(parsePrice('₱12,345.67')).toBe(12345.67)
    })

    it('parses with thousands separator and decimals', () => {
      expect(parsePrice('₱150,000.50')).toBe(150000.5)
    })

    it('returns NaN for null/undefined/empty', () => {
      expect(parsePrice(null)).toBeNaN()
      expect(parsePrice(undefined)).toBeNaN()
      expect(parsePrice('')).toBeNaN()
    })

    it('returns NaN for unparseable strings', () => {
      expect(parsePrice('not a price')).toBeNaN()
    })

    it('uses retailer-specific regex when partId provided', () => {
      // All retailers currently use the same pattern, but this verifies the lookup works
      expect(parsePrice('₱27,000', 'cpu-pchub')).toBe(27000)
      expect(parsePrice('₱27,000', 'gpu-pcx')).toBe(27000)
    })

    it('falls back to default pattern when retailer unknown', () => {
      expect(parsePrice('₱99', 'unknown-part')).toBe(99)
    })
  })

  describe('STORE_PRICE_REGEX', () => {
    it('has an entry for every known retailer (using human-readable names)', () => {
      // Values from RETAILER_MAP are the store names used as keys
      const retailers = [
        'Ben Store',
        'Bermor Techzone',
        'DataBlitz',
        'EasyPC',
        'Electroworld',
        'Gigahertz',
        'iTech',
        'Octagon',
        'PCWORX',
        'Silicon Valley',
        'VillMan',
        'DynaQuest PC',
        'PC Express',
      ]
      for (const r of retailers) {
        expect(STORE_PRICE_REGEX[r]).toBeDefined()
      }
    })

    it('has a default pattern', () => {
      expect(STORE_PRICE_REGEX.default).toBeDefined()
      expect(typeof STORE_PRICE_REGEX.default).toBe('object') // RegExp
    })
  })
})
