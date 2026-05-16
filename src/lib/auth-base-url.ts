/** URL pública de la app para Better Auth (siempre con protocolo, sin barra final). */
export function getAuthBaseUrl(): string {
  const fromEnv = process.env.BETTER_AUTH_URL?.trim()
  if (fromEnv) return normalizeBaseUrl(fromEnv)

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return normalizeBaseUrl(vercel)

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercelProd) return normalizeBaseUrl(vercelProd)

  return 'http://localhost:3000'
}

function normalizeBaseUrl(raw: string): string {
  let url = raw.replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  return url
}

/** Base URL del cliente Better Auth: en el navegador usa el origen actual (no localhost del build). */
export function getAuthClientBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return getAuthBaseUrl()
}
