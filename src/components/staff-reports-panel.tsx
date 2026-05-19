import {
  useClientesFrecuentesQuery,
  useProductosMasVendidosQuery,
  useStockDisponibleQuery,
  useVentasDelDiaQuery,
  useVentasPorCategoriaQuery,
} from '#/hooks/use-icestock-api'

export type ReportSub = 'hoy' | 'top' | 'stock' | 'insights'

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

type Props = {
  enabled: boolean
  reportSub: ReportSub
  onReportSub: (sub: ReportSub) => void
  variant?: 'dark' | 'light'
}

export function StaffReportsPanel({ enabled, reportSub, onReportSub, variant = 'dark' }: Props) {
  const isLight = variant === 'light'
  const reporteQ = useVentasDelDiaQuery(enabled)
  const topQ = useProductosMasVendidosQuery(enabled && reportSub === 'top')
  const stockQ = useStockDisponibleQuery(enabled && reportSub === 'stock')
  const freqQ = useClientesFrecuentesQuery(enabled && reportSub === 'insights')
  const porCatQ = useVentasPorCategoriaQuery(enabled && reportSub === 'insights')

  const d = reporteQ.data
  const panel = isLight ? 'rounded-2xl border border-slate-200 bg-white shadow-sm' : 'rounded-2xl border border-white/10 bg-[var(--panel)] shadow-lg shadow-black/25'
  const thead = isLight ? 'border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500' : 'bg-[var(--primary)]/30 text-xs font-semibold uppercase text-[var(--text)]/55'
  const subActive = isLight ? 'bg-teal-800 text-white' : 'bg-[#004d4f] text-white'
  const subIdle = isLight
    ? 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
    : 'bg-[var(--panel)] text-[var(--text)]/75 ring-1 ring-white/15'
  const titleCls = isLight ? 'text-teal-900' : 'text-[var(--accent)]'
  const mutedCls = isLight ? 'text-slate-600' : 'text-[var(--text)]/75'
  const accentCls = isLight ? 'text-teal-800' : 'text-[var(--accent)]'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={`font-[family-name:var(--font-heading)] text-2xl font-bold ${titleCls}`}>Informes</h1>
          <p className={`text-sm ${mutedCls}`}>Indicadores de ventas, stock y clientes habituales.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (reportSub === 'top' && topQ.data?.length)
              exportCsv(
                'productos-mas-vendidos.csv',
                topQ.data.map((r) => ({
                  rank: r.rank,
                  producto: r.producto,
                  categoria: r.categoria,
                  total_vendido: r.total_vendido,
                  ingresos: r.ingresos,
                })),
              )
            else if (reportSub === 'stock' && stockQ.data?.length)
              exportCsv(
                'stock.csv',
                stockQ.data.map((r) => ({ id: r.id, producto: r.producto, stock: r.stock, alerta: r.alerta })),
              )
            else if (reportSub === 'hoy' && d)
              exportCsv('ventas-del-dia.csv', [{ fecha: d.fecha, total_ventas: d.total_ventas, ingresos: d.ingresos }])
            else if (reportSub === 'insights' && freqQ.data?.length)
              exportCsv(
                'clientes-frecuentes.csv',
                freqQ.data.map((c) => ({
                  id: c.id,
                  nombre: c.nombre,
                  total_compras: c.total_compras,
                  monto_total: c.monto_total,
                })),
              )
          }}
          className={`inline-flex rounded-xl border px-4 py-2 text-sm font-bold ${isLight ? 'border-teal-800 text-teal-800 hover:bg-teal-50' : 'border-[#004d4f] text-[#004d4f] hover:bg-[#004d4f]/5'}`}
        >
          Exportar CSV
        </button>
      </div>
      <div className={`flex flex-wrap gap-2 border-b pb-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        {(
          [
            ['hoy', 'Ventas hoy'],
            ['top', 'Top productos'],
            ['stock', 'Estado stock'],
            ['insights', 'Clientes frecuentes'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => onReportSub(k)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${reportSub === k ? subActive : subIdle}`}
          >
            {label}
          </button>
        ))}
      </div>
      {reportSub === 'hoy' && (
        <div className={`${panel} p-6`}>
          <p className={`text-sm ${mutedCls}`}>Totales del día en curso.</p>
          <p className={`mt-4 text-3xl font-bold ${isLight ? 'text-slate-900' : 'text-[var(--text)]'}`}>{d?.total_ventas ?? '—'} ventas</p>
          <p className={`text-xl ${accentCls}`}>Q{d?.ingresos ?? '—'}</p>
        </div>
      )}
      {reportSub === 'top' && (
        <div className={`overflow-hidden ${panel}`}>
          <table className="w-full text-left text-sm">
            <thead className={thead}>
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {(topQ.data ?? []).map((r) => (
                <tr key={r.id_producto} className={isLight ? 'border-b border-slate-50' : 'border-b border-white/10'}>
                  <td className="px-4 py-3">{r.rank}</td>
                  <td className="px-4 py-3">{r.producto}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${accentCls}`}>Q{r.ingresos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {reportSub === 'stock' && (
        <div className={`overflow-hidden ${panel}`}>
          <table className="w-full text-left text-sm">
            <thead className={thead}>
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {(stockQ.data ?? []).map((r) => (
                <tr key={r.id} className={isLight ? 'border-b border-slate-50' : 'border-b border-white/10'}>
                  <td className="px-4 py-3">{r.producto}</td>
                  <td className="px-4 py-3 text-right">{r.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {reportSub === 'insights' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={`${panel} p-5`}>
            <h3 className={`font-bold ${isLight ? 'text-slate-900' : 'text-[var(--text)]'}`}>Clientes frecuentes</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {(freqQ.data ?? []).map((c) => (
                <li key={c.id} className={`flex justify-between border-b py-2 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
                  <span>{c.nombre}</span>
                  <span className={`font-semibold ${accentCls}`}>Q{c.monto_total}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={`${panel} p-5`}>
            <h3 className={`font-bold ${isLight ? 'text-slate-900' : 'text-[var(--text)]'}`}>Ventas por categoría</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {(porCatQ.data ?? []).slice(0, 8).map((r) => (
                <li key={r.categoria} className="flex justify-between">
                  <span>{r.categoria}</span>
                  <span>Q{r.ingresos}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}