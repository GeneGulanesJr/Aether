/**
 * API client for the PC Builder Worker API (backed by D1).
 * Replaces the former R2-based dataClient.
 *
 * The Worker serves:
 *   GET /api/catalog          — all parts
 *   GET /api/catalog/:cat     — parts for one category
 *   GET /api/prices           — price entries (optional ?category=&retailer=)
 *   GET /api/manifest         — available categories and retailers
 */

import { z } from 'zod'
import { getApiBaseUrl } from './env'

/** Discriminated error kinds for granular error handling. */
export class ApiClientError extends Error {
  readonly kind: 'network' | 'parse' | 'http' | 'validation'
  readonly status?: number
  readonly url: string

  constructor(
    message: string,
    kind: ApiClientError['kind'],
    url: string,
    status?: number,
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.kind = kind
    this.url = url
    this.status = status
  }

  static network(message: string, url: string): ApiClientError {
    return new ApiClientError(message, 'network', url)
  }

  static parse(message: string, url: string): ApiClientError {
    return new ApiClientError(message, 'parse', url)
  }

  static http(url: string, status: number, statusText: string): ApiClientError {
    return new ApiClientError(
      `HTTP ${status} ${statusText}: ${url}`,
      'http',
      url,
      status,
    )
  }

  static validation(message: string, url: string): ApiClientError {
    return new ApiClientError(message, 'validation', url)
  }
}

/**
 * Joins base URL and path, handling trailing/leading slashes.
 */
function joinUrl(base: string, path: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base
  const p = path.startsWith('/') ? path.slice(1) : path
  return `${b}/${p}`
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const partSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  specs: z.record(z.string()),
  imageUrl: z.string().nullable().optional(),
})

const catalogResponseSchema = z.object({
  schemaVersion: z.string(),
  items: z.array(partSchema),
  category: z.string().optional(),
})

const priceEntrySchema = z.object({
  partId: z.string().min(1),
  amountPhp: z.number().min(0),
  originalAmountPhp: z.number().min(0).optional(),
  retailer: z.string().optional(),
  productUrl: z.string().optional(),
  observedAt: z.string().optional(),
})

const priceResponseSchema = z.object({
  schemaVersion: z.string(),
  entries: z.array(priceEntrySchema),
})

const manifestSchema = z.object({
  categories: z.array(z.string()),
  retailers: z.array(z.string()),
  updatedAt: z.string(),
})

// ─── Generic Fetcher ─────────────────────────────────────────────────────────

/**
 * Generic JSON fetcher with typed error discrimination and Zod validation.
 */
async function fetchJson<T>(path: string, schema: z.ZodSchema<T>): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw ApiClientError.network(
      'API fetch requested but VITE_API_URL is unset. Use fixture mode or set the env var.',
      path,
    )
  }

  const url = joinUrl(base, path)

  let response: Response
  try {
    response = await fetch(url)
  } catch (cause) {
    throw ApiClientError.network(
      `Network request failed for ${url}: ${(cause as Error).message}`,
      url,
    )
  }

  if (!response.ok) {
    throw ApiClientError.http(url, response.status, response.statusText)
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw ApiClientError.parse(`Failed to parse JSON from ${url}`, url)
  }

  const result = schema.safeParse(json)
  if (!result.success) {
    const issues = result.error.issues.map((i) => i.message).join('; ')
    throw ApiClientError.validation(
      `Response validation failed (${issues}): ${url}`,
      url,
    )
  }

  return result.data
}

// ─── Exported API ────────────────────────────────────────────────────────────

/** Fetch catalog — all parts across categories. */
export async function fetchCatalog() {
  return fetchJson('/api/catalog', catalogResponseSchema)
}

/** Fetch catalog for a single category. */
export async function fetchCatalogByCategory(category: string) {
  return fetchJson(`/api/catalog/${encodeURIComponent(category)}`, catalogResponseSchema)
}

/** Fetch prices, optionally filtered by category and/or retailer. */
export async function fetchPrices(category?: string, retailer?: string) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (retailer) params.set('retailer', retailer)
  const qs = params.toString()
  const path = `/api/prices${qs ? `?${qs}` : ''}`
  return fetchJson(path, priceResponseSchema)
}

/** Fetch manifest — available categories and retailers. */
export async function fetchManifest() {
  return fetchJson('/api/manifest', manifestSchema)
}