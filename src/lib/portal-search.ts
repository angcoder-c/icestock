export type PortalTab = 'inicio' | 'ventas' | 'productos' | 'clientes' | 'reportes'

const TABS = new Set<PortalTab>(['inicio', 'ventas', 'productos', 'clientes', 'reportes'])

export type PortalSearch = {
  tab?: PortalTab
}

/** Búsqueda opcional en `/portal?tab=…` */
export function parsePortalSearch(raw: Record<string, unknown>): PortalSearch {
  const tab = raw.tab
  return {
    tab: typeof tab === 'string' && TABS.has(tab as PortalTab) ? (tab as PortalTab) : undefined,
  }
}

/** Al volver de un modal anidado en `/portal` (misma pestaña o `productos` por defecto). */
export function portalModalReturnSearch(s: PortalSearch): PortalSearch {
  return { tab: s.tab ?? 'productos' }
}
