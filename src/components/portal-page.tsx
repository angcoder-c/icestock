import { useEffect, useState } from 'react'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Pencil,
  ShoppingCart,
  Trash2,
  Users,
} from 'lucide-react'

import { useIcestock } from '#/context/icestock-context'
import {
  useCategoriasQuery,
  useClientesQuery,
  useProductosQuery,
  useVentasDelDiaQuery,
} from '#/hooks/use-icestock-api'
import { portalModalReturnSearch } from '#/lib/portal-search'
import { PosSaleShell } from '#/components/pos-sale-view'
import {
  ProductInactiveBadge,
  productInventoryRowClass,
} from '#/components/product-deactivate-modal'
import { SiteLogo } from '#/components/site-logo'

const portalRouteApi = getRouteApi('/portal')

type PortalTab = 'inicio' | 'ventas' | 'productos' | 'clientes' | 'reportes'

export function PortalPage() {
  const navigate = useNavigate()
  const portalSearch = portalRouteApi.useSearch()
  const tab: PortalTab = portalSearch.tab ?? 'inicio'
  const { session, sessionPending, signOut } = useIcestock()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoriaId, setCategoriaId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (sessionPending) return
    if (!session) {
      void navigate({ to: '/login/empleado', search: { redirect: '/portal' } })
      return
    }
    if (session.user.rol !== 'admin') {
      void navigate({ to: session.user.rol === 'cajero' ? '/empleado' : '/tienda', replace: true })
      return
    }
  }, [session, sessionPending, navigate])

  const isAdmin = session?.user?.rol === 'admin'
  const reporteQ = useVentasDelDiaQuery(!!isAdmin)
  const productosStaffQ = useProductosQuery('', null, !!isAdmin, true)
  const categoriasQ = useCategoriasQuery(!!isAdmin)
  const productosQ = useProductosQuery(debouncedSearch, categoriaId, !!isAdmin)
  const clientesVentasQ = useClientesQuery(!!isAdmin && tab === 'ventas')
  const clientesListQ = useClientesQuery(!!isAdmin && tab === 'clientes')

  if (sessionPending || !session || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#faf7f2] text-slate-800">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-teal-800" />
          Cargando…
        </div>
      </div>
    )
  }

  const d = reporteQ.data
  const lowStock = (productosStaffQ.data ?? []).filter((p) => p.stock > 0 && p.stock <= 5).length

  const navBtn = (id: PortalTab, label: string, Icon: typeof Home) => (
    <button
      type="button"
      onClick={() => {
        void navigate({ to: '/portal', search: { tab: id }, replace: true })
      }}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
        tab === id ? 'bg-teal-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
      {label}
    </button>
  )

  return (
    <div className="flex min-h-screen bg-[#faf7f2] text-slate-800 antialiased">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-200/80 bg-white/95 px-3 py-6 shadow-sm">
        <Link to="/portal" search={{ tab: 'inicio' }} className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-teal-100 ring-1 ring-teal-200/80">
            <SiteLogo decorative className="h-6 w-6 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-heading)] text-sm font-bold text-teal-900">IceStock</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Portal</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {navBtn('inicio', 'Inicio', LayoutDashboard)}
          {navBtn('ventas', 'Ventas / POS', ShoppingCart)}
          {navBtn('productos', 'Productos', Package)}
          {navBtn('clientes', 'Clientes', Users)}
          {navBtn('reportes', 'Reportes', BarChart3)}
        </nav>

        <button
          type="button"
          onClick={() => void navigate({ to: '/portal', search: { tab: 'ventas' }, replace: true })}
          className="mt-4 w-full rounded-xl bg-[#ff726f] py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-105"
        >
          + Nueva venta
        </button>

        <div className="mt-auto space-y-1 border-t border-slate-100 pt-4">
          <Link to="/" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 hover:text-teal-800">
            <Home className="h-3.5 w-3.5" />
            Sitio público
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#faf7f2]/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sesión</p>
              <p className="truncate text-sm font-semibold text-teal-900">{session.user.name ?? session.user.email}</p>
              <p className="text-xs text-slate-500">Administración</p>
            </div>
          </div>
        </header>

        <div className="p-6">
          {tab === 'inicio' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-teal-900">Resumen</h1>
                <p className="text-sm text-slate-600">Métricas del día e inventario.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ventas hoy</p>
                  <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-bold text-teal-800">{d?.total_ventas ?? '—'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ingresos</p>
                  <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-bold text-slate-900">{d ? `Q${d.ingresos}` : '—'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stock bajo</p>
                  <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-bold text-[#ff726f]">{productosStaffQ.isLoading ? '…' : lowStock}</p>
                  <p className="mt-1 text-[10px] font-medium text-slate-400">≤ 5 unidades</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Productos activos</p>
                  <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-bold text-slate-900">{productosStaffQ.data?.length ?? '—'}</p>
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
              homeLink="/portal"
              compact
              roleHint="Admin"
              checkoutMode="staff"
              clientesQ={clientesVentasQ}
            />
          )}

          {tab === 'productos' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-teal-900">Inventario</h1>
                <p className="text-sm text-slate-600">Catálogo; las imágenes se gestionan al crear o editar un producto.</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(productosStaffQ.data ?? []).slice(0, 30).map((p) => (
                      <tr key={p.id} className={productInventoryRowClass(p.activo, 'light')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                              {p.imagen_url ? (
                                <img src={p.imagen_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-300">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={`font-semibold ${p.activo ? 'text-slate-900' : 'text-slate-500 line-through'}`}>{p.nombre}</p>
                                {!p.activo ? <ProductInactiveBadge variant="light" /> : null}
                              </div>
                              <p className="text-xs text-slate-400">ID {p.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900">{p.categoria.nombre}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">Q{p.precio}</td>
                        <td className="px-4 py-3 text-right">{p.stock}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            title="Editar"
                            className="inline-flex rounded-lg p-2 text-teal-800 hover:bg-teal-50"
                            onClick={() => {
                              void navigate({
                                to: '/portal/productos/editar/$productId',
                                params: { productId: p.id },
                                search: portalModalReturnSearch(portalSearch),
                              })
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {p.activo ? (
                            <button
                              type="button"
                              title="Desactivar"
                              className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                void navigate({
                                  to: '/portal/productos/desactivar/$productId',
                                  params: { productId: p.id },
                                  search: portalModalReturnSearch(portalSearch),
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
                <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                  Mostrando {Math.min(30, productosStaffQ.data?.length ?? 0)} de {productosStaffQ.data?.length ?? 0} productos
                </p>
              </div>
            </div>
          )}

          {tab === 'clientes' && (
            <div className="space-y-4">
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-teal-900">Clientes</h1>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Correo</th>
                      <th className="px-4 py-3">Teléfono</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(clientesListQ.data ?? []).map((c) => (
                      <tr key={c.id} className="border-b border-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{c.nombre}</td>
                        <td className="px-4 py-3 text-slate-600">{c.email ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{c.telefono ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="inline-flex rounded-lg p-2 text-teal-800 hover:bg-teal-50"
                            title="Editar"
                            onClick={() => {
                              void navigate({
                                to: '/portal/clientes/editar/$clienteId',
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

          {tab === 'reportes' && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 text-teal-800/40" />
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-teal-900">Reportes</h2>
              <p className="mt-2 text-sm text-slate-600">Consulta indicadores y exporta datos cuando lo necesites.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
