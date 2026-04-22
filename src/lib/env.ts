/**
 * Public env for Vite.
 *
 * `VITE_API_URL` is the base URL of the Cloudflare Worker API serving D1 data.
 * When empty, the app runs in fixture mode (offline, using bundled sample data).
 *
 * Examples:
 *   Production:  VITE_API_URL=https://pcbuilderv2.your-account.workers.dev
 *   Local dev:   VITE_API_URL=http://localhost:8787
 *   Fixture:     VITE_API_URL=         (empty or unset)
 */
export function getApiBaseUrl(): string | undefined {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw !== 'string' || raw.trim() === '') return undefined
  return raw.replace(/\/+$/, '')
}

export function getDataSourceMode(): 'api' | 'fixture' {
  return getApiBaseUrl() ? 'api' : 'fixture'
}