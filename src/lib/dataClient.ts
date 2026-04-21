/**
 * Data fetching client for R2-backed catalog and price data.
 * Provides typed API with proper error handling.
 */

import { z } from 'zod'
import { getR2BaseUrl } from './env'

/** Discriminated error kinds for granular error handling. */
export class DataClientError extends Error {
  readonly kind: 'network' | 'parse' | 'http' | 'validation'
  readonly status?: number
  readonly url: string

  constructor(
    message: string,
    kind: DataClientError['kind'],
    url: string,
    status?: number,
  ) {
    super(message)
    this.name = 'DataClientError'
    this.kind = kind
    this.url = url
    this.status = status
  }

  static network(message: string, url: string): DataClientError {
    return new DataClientError(message, 'network', url)
  }

  static parse(message: string, url: string): DataClientError {
    return new DataClientError(message, 'parse', url)
  }

  static http(url: string, status: number, statusText: string): DataClientError {
    return new DataClientError(
      `HTTP ${status} ${statusText}: ${url}`,
      'http',
      url,
      status,
    )
  }

  static validation(message: string, url: string): DataClientError {
    return new DataClientError(message, 'validation', url)
  }
}

/**
 * Joins base URL and path, handling trailing/leading slashes.
 * Ensures exactly one slash between segments.
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
  imageUrl: z.string().url().nullable().optional(),
})

const catalogShardSchema = z.object({
  schemaVersion: z.string(),
  category: z.string().min(1),
  items: z.array(partSchema),
})

const shardRefSchema = z.object({
  key: z.string().min(1),
  sha256: z.string().optional(),
  updatedAt: z.string().optional(),
})

const priceManifestSchema = z.object({
  version: z.string().min(1),
  updatedAt: z.string().min(1),
  shards: z.array(shardRefSchema).min(1),
})

const priceEntrySchema = z.object({
  partId: z.string().min(1),
  amountPhp: z.number().min(0),
  retailer: z.string().optional(),
  productUrl: z.string().url().optional(),
  observedAt: z.string().optional(),
})

const priceShardSchema = z.object({
  schemaVersion: z.string(),
  entries: z.array(priceEntrySchema),
})

// ─── Generic Fetcher ─────────────────────────────────────────────────────────

/**
 * Generic JSON fetcher with typed error discrimination and Zod validation.
 */
async function fetchJson<T>(path: string, schema: z.ZodSchema<T>): Promise<T> {
  const base = getR2BaseUrl()
  if (!base) {
    throw DataClientError.network(
      'R2 fetch requested but VITE_R2_BASE_URL is unset. Use fixture mode or set the env var.',
      path,
    )
  }

  const url = joinUrl(base, path)

  let response: Response
  try {
    response = await fetch(url)
  } catch (cause) {
    throw DataClientError.network(
      `Network request failed for ${url}: ${(cause as Error).message}`,
      url,
    )
  }

  if (!response.ok) {
    throw DataClientError.http(url, response.status, response.statusText)
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw DataClientError.parse(`Failed to parse JSON from ${url}`, url)
  }

  const result = schema.safeParse(json)
  if (!result.success) {
    const issues = result.error.issues.map((i) => i.message).join('; ')
    throw DataClientError.validation(
      `Response validation failed (${issues}): ${url}`,
      url,
    )
  }

  return result.data
}

// ─── Exported API ────────────────────────────────────────────────────────────

/** Loads `manifest.json` from R2 public origin. */
export async function fetchPriceManifest() {
  return fetchJson('manifest.json', priceManifestSchema)
}

/** Loads a catalog shard by object key, e.g. `catalog/cpus.json`. */
export async function fetchCatalogShard(key: string) {
  return fetchJson(key, catalogShardSchema)
}

/** Loads a price shard by object key, e.g. `prices/entries.json`. */
export async function fetchPriceShard(key: string) {
  return fetchJson(key, priceShardSchema)
}
