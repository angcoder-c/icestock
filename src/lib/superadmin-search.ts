export type SuperadminTab =
  | 'inicio'
  | 'ventas'
  | 'productos'
  | 'clientes'
  | 'proveedores'
  | 'reportes'
  | 'personal'

export type SuperadminReportSub = 'hoy' | 'top' | 'stock' | 'insights'

const TABS = new Set<SuperadminTab>(['inicio', 'ventas', 'productos', 'clientes', 'proveedores', 'reportes', 'personal'])
const REPORT_SUBS = new Set<SuperadminReportSub>(['hoy', 'top', 'stock', 'insights'])

export type SuperadminSearch = {
  tab?: SuperadminTab
  reportSub?: SuperadminReportSub
}

export function parseSuperadminSearch(raw: Record<string, unknown>): SuperadminSearch {
  const tab = raw.tab
  const reportSub = raw.reportSub
  return {
    tab: typeof tab === 'string' && TABS.has(tab as SuperadminTab) ? (tab as SuperadminTab) : undefined,
    reportSub:
      typeof reportSub === 'string' && REPORT_SUBS.has(reportSub as SuperadminReportSub)
        ? (reportSub as SuperadminReportSub)
        : undefined,
  }
}

export function superadminModalReturnSearch(s: SuperadminSearch): SuperadminSearch {
  if (s.tab === 'reportes') return { tab: 'reportes', reportSub: s.reportSub ?? 'hoy' }
  return { tab: s.tab ?? 'productos' }
}
