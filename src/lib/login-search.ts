export type LoginSearch = {
  redirect?: string
}

export function parseLoginRedirect(raw: Record<string, unknown>): LoginSearch {
  const r = raw.redirect
  const redirect =
    typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') && !r.includes('\\') ? r : undefined
  return { redirect }
}
