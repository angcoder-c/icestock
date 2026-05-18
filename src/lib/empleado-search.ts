export type EmpleadoTab = 'inicio' | 'productos' | 'ventas' | 'clientes'

const TABS = new Set<EmpleadoTab>(['inicio', 'productos', 'ventas', 'clientes'])

export type EmpleadoSearch = {
  tab?: EmpleadoTab
}

function parseTab(v: unknown): EmpleadoTab | undefined {
  return typeof v === 'string' && TABS.has(v as EmpleadoTab) ? (v as EmpleadoTab) : undefined
}

/** Búsqueda opcional en `/empleado?tab=…` */
export function parseEmpleadoSearch(raw: Record<string, unknown>): EmpleadoSearch {
  return {
    tab: parseTab(raw.tab),
  }
}

/** Al volver de un modal anidado bajo `/empleado`. */
export function empleadoModalReturnSearch(s: EmpleadoSearch): EmpleadoSearch {
  return { tab: s.tab ?? 'clientes' }
}
