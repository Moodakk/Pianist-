export function normalizeApiBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export function getApiBaseUrl(settingsUrl?: string): string {
  const fromSettings = settingsUrl?.trim()
  if (fromSettings) return normalizeApiBaseUrl(fromSettings)

  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim()
  if (fromEnv) return normalizeApiBaseUrl(fromEnv)

  return 'http://localhost:8000'
}
