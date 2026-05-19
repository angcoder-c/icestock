import { useEffect, useMemo, useState } from 'react'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Search,
  ShoppingCart,
  Users,
} from 'lucide-react'

import { StaffReportsPanel, type ReportSub } from '#/components/staff-reports-panel'
import {
  StaffPortalShell,
  staffCardClass,
  staffNavButton,
  staffStatusPill,
  staffTableHeadClass,
  staffTableWrapClass,
} from '#/components/staff-portal-shell'
import { SiteLogo } from '#/components/site-logo'
import { useRequireRoles } from '#/hooks/use-role-access'
import {
  useClientesQuery,
  useProductosQuery,
  useVentasDelDiaQuery,
  useVentasListQuery,
} from '#/hooks/use-icestock-api'
import { type AnalistaTab } from '#/lib/analista-search'
import { useIcestock } from '#/context/icestock-context'

const analistaRouteApi = getRouteApi('/analista')

export function AnalistaPortalPage() {
  const navigate = useNavigate()
  const search = analistaRouteApi.useSearch()
  const tab: AnalistaTab = search.tab ?? 'inicio'
  const reportSub: ReportSub = search.reportSub ?? 'hoy'
  const { signOut } = useIcestock()
  const { session, ready } = useRequireRoles(['analista'], { loginPath: '/analista' })
  const [headerSearch, setHeaderSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(headerSearch), 300)
    return () => clearTimeout(t)
  }, [headerSearch])

  const enabled = ready
  const reporteQ = useVentasDelDiaQuery(enabled && tab === 'inicio')
  const ventasQ = useVentasListQuery(enabled && (tab === 'ventas' || tab === 'inicio'))
  const productosQ = useProductosQuery(debounced, null, enabled && tab === 'catalogo', true)
  const clientesQ = useClientesQuery(enabled && tab === 'clientes')

  const clientesFiltrados = useMemo(() => {
    const q = headerSearch.trim().toLowerCase()
    const rows = clientesQ.data ?? []
    if (!q || tab !== 'clientes') return rows
    return rows.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.telefono?.toLowerCase().includes(q) ?? false),
    )
  }, [clientesQ.data, headerSearch, tab])

  const goTab = (t: AnalistaTab) => {
    void navigate({
      to: '/analista',
      search: () => (t === 'reportes' ? { tab: t, reportSub } : { tab: t }),
      replace: true,
    })
  }

  const goReportSub = (sub: ReportSub) => {
    void navigate({ to: '/analista', search: { tab: 'reportes', reportSub: sub }, replace: true })
  }

  if (!ready || !session) {
    return (
      <div className="grid h-dvh max-h-dvh place-items-center bg-[var(--bg)] text-[var(--text)]">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--panel)] px-6 py-4 shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          Cargando…
        </div>
      </div>
    )
  }

  const d = reporteQ.data
  const ventasMuestra = (ventasQ.data ?? []).slice(0, 12)

  const navBtn = (id: AnalistaTab, label: string, Icon: typeof LayoutDashboard) => (
    <button type="button" onClick={() => goTab(id)} className={staffNavButton(tab === id)}>
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
      {label}
    </button>
  )

  return (
    <StaffPortalShell
      sidebarLogo={
        <Link to="/analista" search={{ tab: 'inicio' }} className="flex items-center gap-2 px-2">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)]/40 ring-1 ring-[var(--accent)]/30">
            <SiteLogo decorative className="h-6 w-6 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-heading)] text-sm font-bold text-[var(--accent)]">
              IceStock
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text)]/50">Analista</p>
          </div>
        </Link>
      }
      sidebarNav={
        <>
          {navBtn('inicio', 'Inicio', LayoutDashboard)}
          {navBtn('reportes', 'Reportes', BarChart3)}
          {navBtn('ventas', 'Ventas', ShoppingCart)}
          {navBtn('clientes', 'Clientes', Users)}
          {navBtn('catalogo', 'Catálogo', Package)}
        </>
      }
      sidebarFooter={
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-[var(--text)]/80 hover:bg-white/10"
        >
          <LogOut className="h-3.5 w-3.5" />
          Salir
        </button>
      }
      header={
        <div className="flex flex-wrap items-center gap-4">
          {(tab === 'clientes' || tab === 'catalogo') && (
            <div className="relative min-w-[200px] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder={tab === 'clientes' ? 'Buscar clientes…' : 'Buscar productos…'}
                className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-3 text-sm text-[var(--text)] placeholder:text-white/40 outline-none focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/25"
              />
            </div>
          )}
          <div className="ml-auto text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Sesión</p>
            <p className="truncate text-sm font-semibold text-[var(--text)]">
              {session.user.name ?? session.user.email}
            </p>
            <p className="text-xs text-[var(--text)]/55">Solo lectura y reportes</p>
          </div>
        </div>
      }
    >
      <div className="p-6">
        {tab === 'inicio' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--accent)]">
                Panel analista
              </h1>
              <p className="text-sm text-[var(--text)]/70">Indicadores del día y actividad reciente (sin operación de caja).</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={staffCardClass}>
                <p className="text-xs font-semibold uppercase text-[var(--text)]/55">Ventas hoy</p>
                <p className="mt-2 text-3xl font-bold text-[var(--accent)]">{d?.total_ventas ?? '—'}</p>
              </div>
              <div className={staffCardClass}>
                <p className="text-xs font-semibold uppercase text-[var(--text)]/55">Ingresos hoy</p>
                <p className="mt-2 text-3xl font-bold text-[var(--text)]">{d ? `Q${d.ingresos}` : '—'}</p>
              </div>
            </div>
            <div className={staffTableWrapClass}>
              <h2 className="border-b border-white/10 px-4 py-3 font-semibold text-[var(--accent)]">Ventas recientes</h2>
              <table className="w-full text-left text-sm">
                <thead className={staffTableHeadClass}>
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasMuestra.map((v) => (
                    <tr key={v.id} className="border-t border-white/10">
                      <td className="px-4 py-2 font-mono text-xs text-[var(--text)]/70">{v.id.slice(0, 8)}…</td>
                      <td className="px-4 py-2">{new Date(v.fecha).toLocaleString('es-GT')}</td>
                      <td className="px-4 py-2">{v.cliente}</td>
                      <td className="px-4 py-2 text-right font-medium">Q{v.total}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${staffStatusPill(v.estado)}`}>
                          {v.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'reportes' && (
          <StaffReportsPanel enabled={enabled} reportSub={reportSub} onReportSub={goReportSub} variant="dark" />
        )}

        {tab === 'ventas' && (
          <div className="space-y-4">
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--accent)]">
              Historial de ventas
            </h1>
            <div className={staffTableWrapClass}>
              <table className="w-full text-left text-sm">
                <thead className={staffTableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Empleado</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(ventasQ.data ?? []).map((v) => (
                    <tr key={v.id} className="border-t border-white/10">
                      <td className="px-4 py-3">{new Date(v.fecha).toLocaleString('es-GT')}</td>
                      <td className="px-4 py-3">{v.cliente}</td>
                      <td className="px-4 py-3">{v.empleado}</td>
                      <td className="px-4 py-3 text-right font-medium">Q{v.total}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${staffStatusPill(v.estado)}`}>
                          {v.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'clientes' && (
          <div className="space-y-4">
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--accent)]">Clientes</h1>
            <div className={staffTableWrapClass}>
              <table className="w-full text-left text-sm">
                <thead className={staffTableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Correo</th>
                    <th className="px-4 py-3">Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((c) => (
                    <tr key={c.id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium">{c.nombre}</td>
                      <td className="px-4 py-3 text-[var(--text)]/75">{c.email ?? '—'}</td>
                      <td className="px-4 py-3 text-[var(--text)]/75">{c.telefono ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'catalogo' && (
          <div className="space-y-4">
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--accent)]">Catálogo</h1>
            <div className={staffTableWrapClass}>
              <table className="w-full text-left text-sm">
                <thead className={staffTableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {(productosQ.data ?? []).slice(0, 80).map((p) => (
                    <tr key={p.id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium">{p.nombre}</td>
                      <td className="px-4 py-3">{p.categoria.nombre}</td>
                      <td className="px-4 py-3 text-right">Q{p.precio}</td>
                      <td className="px-4 py-3 text-right">{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </StaffPortalShell>
  )
}
