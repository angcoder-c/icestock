export type PortalTab = 'inicio' | 'ventas' | 'productos' | 'clientes' | 'proveedores' | 'reportes' | 'personal'
export type PortalReportSub = 'hoy' | 'top' | 'stock' | 'insights'

const TABS = new Set<PortalTab>(['inicio', 'ventas', 'productos', 'clientes', 'proveedores', 'reportes', 'personal'])
const REPORT_SUBS = new Set<PortalReportSub>(['hoy', 'top', 'stock', 'insights'])

export type PortalSearch = {
  tab?: PortalTab
  reportSub?: PortalReportSub
}

/** Búsqueda opcional en `/portal?tab=…` */
export function parsePortalSearch(raw: Record<string, unknown>): PortalSearch {
  const tab = raw.tab
  const reportSub = raw.reportSub
  return {
    tab: typeof tab === 'string' && TABS.has(tab as PortalTab) ? (tab as PortalTab) : undefined,
    reportSub:
      typeof reportSub === 'string' && REPORT_SUBS.has(reportSub as PortalReportSub)
        ? (reportSub as PortalReportSub)
        : undefined,
  }
}

/** Al volver de un modal anidado en `/portal` (misma pestaña o `productos` por defecto). */
export function portalModalReturnSearch(s: PortalSearch): PortalSearch {
  return { tab: s.tab ?? 'productos' }
}
