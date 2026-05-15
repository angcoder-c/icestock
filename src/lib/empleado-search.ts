export type EmpleadoTab = 'inicio' | 'productos' | 'ventas' | 'clientes' | 'reportes'
export type EmpleadoReportSub = 'hoy' | 'top' | 'stock' | 'insights'

const TABS = new Set<EmpleadoTab>(['inicio', 'productos', 'ventas', 'clientes', 'reportes'])
const REPORT_SUBS = new Set<EmpleadoReportSub>(['hoy', 'top', 'stock', 'insights'])

export type EmpleadoSearch = {
  tab?: EmpleadoTab
  reportSub?: EmpleadoReportSub
}

function parseTab(v: unknown): EmpleadoTab | undefined {
  return typeof v === 'string' && TABS.has(v as EmpleadoTab) ? (v as EmpleadoTab) : undefined
}

function parseReportSub(v: unknown): EmpleadoReportSub | undefined {
  return typeof v === 'string' && REPORT_SUBS.has(v as EmpleadoReportSub) ? (v as EmpleadoReportSub) : undefined
}

/** Búsqueda opcional en `/empleado?tab=…&reportSub=…` */
export function parseEmpleadoSearch(raw: Record<string, unknown>): EmpleadoSearch {
  return {
    tab: parseTab(raw.tab),
    reportSub: parseReportSub(raw.reportSub),
  }
}
