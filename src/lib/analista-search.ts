export type AnalistaTab = 'inicio' | 'reportes' | 'ventas' | 'clientes' | 'catalogo'
export type AnalistaReportSub = 'hoy' | 'top' | 'stock' | 'insights'

const TABS = new Set<AnalistaTab>(['inicio', 'reportes', 'ventas', 'clientes', 'catalogo'])
const REPORT_SUBS = new Set<AnalistaReportSub>(['hoy', 'top', 'stock', 'insights'])

export type AnalistaSearch = {
  tab?: AnalistaTab
  reportSub?: AnalistaReportSub
}

export function parseAnalistaSearch(raw: Record<string, unknown>): AnalistaSearch {
  const tab = raw.tab
  const reportSub = raw.reportSub
  return {
    tab: typeof tab === 'string' && TABS.has(tab as AnalistaTab) ? (tab as AnalistaTab) : undefined,
    reportSub:
      typeof reportSub === 'string' && REPORT_SUBS.has(reportSub as AnalistaReportSub)
        ? (reportSub as AnalistaReportSub)
        : undefined,
  }
}
