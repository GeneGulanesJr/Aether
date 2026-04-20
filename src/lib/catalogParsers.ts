import { z } from 'zod'
import cpusFixture from '../../data-fixtures/catalog/cpus.sample.json'
import entriesFixture from '../../data-fixtures/prices/entries.sample.json'

const partSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  specs: z.record(z.string()),
  imageUrl: z.string().url().nullable().optional(),
})

const catalogFixtureSchema = z.object({
  schemaVersion: z.string(),
  category: z.string().min(1),
  items: z.array(partSchema),
})

const priceEntrySchema = z.object({
  partId: z.string().min(1),
  amountPhp: z.number().min(0),
  retailer: z.string().optional(),
  productUrl: z.string().url().optional(),
  observedAt: z.string().optional(),
})

const priceListSchema = z.object({
  schemaVersion: z.string(),
  entries: z.array(priceEntrySchema),
})

/** Safely parse catalog fixture data with Zod at the boundary. */
export function parseCatalogFixture() {
  const result = catalogFixtureSchema.safeParse(cpusFixture)
  if (!result.success) {
    throw new Error(
      `Invalid catalog fixture: ${result.error.issues.map((i) => i.message).join('; ')}`,
    )
  }
  return result.data
}

/** Safely parse price fixture data with Zod at the boundary. */
export function parsePriceFixture() {
  const result = priceListSchema.safeParse(entriesFixture)
  if (!result.success) {
    throw new Error(
      `Invalid price fixture: ${result.error.issues.map((i) => i.message).join('; ')}`,
    )
  }
  return result.data
}
