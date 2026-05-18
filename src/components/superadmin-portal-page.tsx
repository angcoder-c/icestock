import { useEffect, useState } from 'react'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  Building2,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Pencil,
  ShoppingCart,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react'

import { PosSaleShell } from '#/components/pos-sale-view'
import {
  ProductInactiveBadge,
  productInventoryRowClass,
} from '#/components/product-deactivate-modal'
import { StaffProveedoresPanel } from '#/components/staff-proveedores-panel'
import { StaffReportsPanel, type ReportSub } from '#/components/staff-reports-panel'
import { StaffTeamPanel } from '#/components/staff-team-panel'
import { SiteLogo } from '#/components/site-logo'
import { useRequireRoles } from '#/hooks/use-role-access'
import {
  useCategoriasQuery,
  useClientesQuery,
  useProductosQuery,
  useVentasDelDiaQuery,
} from '#/hooks/use-icestock-api'
import { superadminModalReturnSearch, type SuperadminTab } from '#/lib/superadmin-search'
import { useIcestock } from '#/context/icestock-context'

const superadminRouteApi = getRouteApi('/superadmin')

export function SuperadminPortalPage() {
  const navigate = useNavigate()
  const portalSearch = superadminRouteApi.useSearch()
  const tab: SuperadminTab = portalSearch.tab ?? 'inicio'
  const reportSub: ReportSub = portalSearch.reportSub ?? 'hoy'
  const { signOut } = useIcestock()
  const { session, ready } = useRequireRoles(['superadmin'], { loginPath: '/superadmin' })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoriaId, setCategoriaId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const enabled = ready
  const reporteQ = useVentasDelDiaQuery(enabled)
  const productosStaffQ = useProductosQuery('', null, enabled, true)
  const categoriasQ = useCategoriasQuery(enabled)
  const productosQ = useProductosQuery(debouncedSearch, categoriaId, enabled && tab === 'ventas')
  const clientesVentasQ = useClientesQuery(enabled && tab === 'ventas')
  const clientesListQ = useClientesQuery(enabled && tab === 'clientes')
  if (!ready || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        <div className="flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-slate-900 px-6 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
          Cargando…
        </div>
      </div>
    )
  }

  const d = reporteQ.data
  const lowStock = (productosStaffQ.data ?? []).filter((p) => p.stock > 0 && p.stock <= 5).length

  const goTab = (id: SuperadminTab) => {
    void navigate({
      to: '/superadmin',
      search: () => (id === 'reportes' ? { tab: id, reportSub } : { tab: id }),
      replace: true,
    })
  }

  const goReportSub = (sub: ReportSub) => {
    void navigate({ to: '/superadmin', search: { tab: 'reportes', reportSub: sub }, replace: true })
  }

  const navBtn = (id: SuperadminTab, label: string, Icon: typeof Home) => (
    <button
      type="button"
      onClick={() => goTab(id)}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
        tab === id ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
      {label}
    </button>
  )

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 px-3 py-6">
        <Link to="/superadmin" search={{ tab: 'inicio' }} className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-violet-600/20 ring-1 ring-violet-500/40">
            <SiteLogo decorative className="h-6 w-6 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-heading)] text-sm font-bold text-white">IceStock</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-violet-400">Superadmin</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {navBtn('inicio', 'Inicio', LayoutDashboard)}
          {navBtn('ventas', 'Ventas / POS', ShoppingCart)}
          {navBtn('productos', 'Productos', Package)}
          {navBtn('clientes', 'Clientes', Users)}
          {navBtn('proveedores', 'Proveedores', Building2)}
          {navBtn('reportes', 'Reportes', BarChart3)}
          {navBtn('personal', 'Personal', UserCog)}
        </nav>

        <button
          type="button"
          onClick={() => goTab('ventas')}
          className="mt-4 w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-violet-500"
        >
          + Nueva venta
        </button>

        <div className="mt-auto space-y-1 border-t border-slate-800 pt-4">
          <Link to="/" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-500 hover:text-violet-300">
            <Home className="h-3.5 w-3.5" />
            Sitio público
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Sesión</p>
              <p className="truncate text-sm font-semibold text-white">{session.user.name ?? session.user.email}</p>
              <p className="text-xs text-slate-500">Gestión completa del sistema</p>
            </div>
          </div>
        </header>

        <div className="p-6">
          {tab === 'inicio' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white">Resumen global</h1>
                <p className="text-sm text-slate-400">Métricas del día, inventario y acceso rápido a entidades.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase text-slate-500">Ventas hoy</p>
                  <p className="mt-1 text-2xl font-bold text-violet-300">{d?.total_ventas ?? '—'}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase text-slate-500">Ingresos</p>
                  <p className="mt-1 text-2xl font-bold text-white">{d ? `Q${d.ingresos}` : '—'}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase text-slate-500">Stock bajo</p>
                  <p className="mt-1 text-2xl font-bold text-amber-400">{productosStaffQ.isLoading ? '…' : lowStock}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase text-slate-500">Productos</p>
                  <p className="mt-1 text-2xl font-bold text-white">{productosStaffQ.data?.length ?? '—'}</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'ventas' && (
            <PosSaleShell
              session={session}
              signOut={signOut}
              search={search}
              setSearch={setSearch}
              categoriaId={categoriaId}
              setCategoriaId={setCategoriaId}
              categoriasQ={categoriasQ}
              productosQ={productosQ}
              reporteQ={reporteQ}
              homeLink="/superadmin"
              compact
              roleHint="Superadmin"
              checkoutMode="staff"
              clientesQ={clientesVentasQ}
            />
          )}

          {tab === 'productos' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white">Inventario</h1>
                <p className="text-sm text-slate-400">Catálogo completo con edición y bajas.</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-800/80 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(productosStaffQ.data ?? []).slice(0, 50).map((p) => (
                      <tr key={p.id} className={productInventoryRowClass(p.activo, 'dark')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${p.activo ? 'text-white' : 'text-slate-500 line-through'}`}>{p.nombre}</span>
                            {!p.activo ? <ProductInactiveBadge variant="dark" /> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{p.categoria.nombre}</td>
                        <td className="px-4 py-3 text-right">Q{p.precio}</td>
                        <td className="px-4 py-3 text-right">{p.stock}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            title="Editar"
                            className="inline-flex rounded-lg p-2 text-violet-400 hover:bg-violet-500/10"
                            onClick={() => {
                              void navigate({
                                to: '/superadmin/productos/editar/$productId',
                                params: { productId: p.id },
                                search: superadminModalReturnSearch(portalSearch),
                              })
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {p.activo ? (
                            <button
                              type="button"
                              title="Desactivar"
                              className="inline-flex rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                              onClick={() => {
                                void navigate({
                                  to: '/superadmin/productos/desactivar/$productId',
                                  params: { productId: p.id },
                                  search: superadminModalReturnSearch(portalSearch),
                                })
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
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
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white">Clientes</h1>
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Correo</th>
                      <th className="px-4 py-3">Teléfono</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(clientesListQ.data ?? []).map((c) => (
                      <tr key={c.id} className="border-t border-slate-800">
                        <td className="px-4 py-3 font-medium text-white">{c.nombre}</td>
                        <td className="px-4 py-3 text-slate-400">{c.email ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{c.telefono ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="inline-flex rounded-lg p-2 text-violet-400 hover:bg-violet-500/10"
                            onClick={() => {
                              void navigate({
                                to: '/superadmin/clientes/editar/$clienteId',
                                params: { clienteId: c.id },
                                search: { tab: 'clientes' },
                              })
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'proveedores' && (
            <StaffProveedoresPanel session={session.user} enabled={enabled} variant="dark" />
          )}

          {tab === 'reportes' && (
            <StaffReportsPanel enabled={enabled} reportSub={reportSub} onReportSub={goReportSub} variant="dark" />
          )}

          {tab === 'personal' && <StaffTeamPanel session={session.user} enabled={enabled} variant="dark" />}
        </div>
      </div>
    </div>
  )
}
