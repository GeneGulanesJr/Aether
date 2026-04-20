/**
 * Public env for Vite. `VITE_R2_BASE_URL` is the origin serving R2 public/custom domain
 * (no trailing slash), e.g. `https://data.example.com`
 */
export function getR2BaseUrl(): string | undefined {
  const raw = import.meta.env.VITE_R2_BASE_URL
  if (typeof raw !== 'string' || raw.trim() === '') return undefined
  return raw.replace(/\/+$/, '')
}

export function getDataSourceMode(): 'r2' | 'fixture' {
  return getR2BaseUrl() ? 'r2' : 'fixture'
}
