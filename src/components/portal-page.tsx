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

import { StaffProveedoresPanel } from '#/components/staff-proveedores-panel'
import { StaffReportsPanel, type ReportSub } from '#/components/staff-reports-panel'
import { StaffTeamPanel } from '#/components/staff-team-panel'
import { useRequireRoles } from '#/hooks/use-role-access'
import { useIcestock } from '#/context/icestock-context'
import {
  useCategoriasQuery,
  useClientesQuery,
  useProductosQuery,
  useVentasDelDiaQuery,
} from '#/hooks/use-icestock-api'
import { portalModalReturnSearch, type PortalTab } from '#/lib/portal-search'
import { PosSaleShell } from '#/components/pos-sale-view'
import {
  ProductInactiveBadge,
  productInventoryRowClass,
} from '#/components/product-deactivate-modal'
import { SiteLogo } from '#/components/site-logo'
import {
  StaffPortalShell,
  staffCardClass,
  staffIconBtnClass,
  staffIconBtnDangerClass,
  staffNavButton,
  staffPageSubtitleClass,
  staffPageTitleClass,
  staffTableHeadClass,
  staffTableWrapClass,
} from '#/components/staff-portal-shell'

const portalRouteApi = getRouteApi('/portal')

export function PortalPage() {
  const navigate = useNavigate()
  const portalSearch = portalRouteApi.useSearch()
  const tab: PortalTab = portalSearch.tab ?? 'inicio'
  const reportSub: ReportSub = portalSearch.reportSub ?? 'hoy'
  const { signOut } = useIcestock()
  const { session, ready } = useRequireRoles(['admin'], { loginPath: '/portal' })
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

  const goReportSub = (sub: ReportSub) => {
    void navigate({ to: '/portal', search: { tab: 'reportes', reportSub: sub }, replace: true })
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
  const lowStock = (productosStaffQ.data ?? []).filter((p) => p.stock > 0 && p.stock <= 5).length

  const navBtn = (id: PortalTab, label: string, Icon: typeof Home) => (
    <button
      type="button"
      onClick={() => {
        void navigate({ to: '/portal', search: { tab: id }, replace: true })
      }}
      className={staffNavButton(tab === id)}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
      {label}
    </button>
  )

  return (
    <StaffPortalShell
      sidebarLogo={
        <Link to="/portal" search={{ tab: 'inicio' }} className="flex items-center gap-2 px-2">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)]/40 ring-1 ring-[var(--accent)]/30">
            <SiteLogo decorative className="h-6 w-6 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-heading)] text-sm font-bold text-[var(--accent)]">IceStock</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text)]/50">Portal</p>
          </div>
        </Link>
      }
      sidebarNav={
        <>
          {navBtn('inicio', 'Inicio', LayoutDashboard)}
          {navBtn('ventas', 'Ventas / POS', ShoppingCart)}
          {navBtn('productos', 'Productos', Package)}
          {navBtn('clientes', 'Clientes', Users)}
          {navBtn('proveedores', 'Proveedores', Building2)}
          {navBtn('reportes', 'Reportes', BarChart3)}
          {navBtn('personal', 'Personal', UserCog)}
        </>
      }
      sidebarActions={
        <button
          type="button"
          onClick={() => void navigate({ to: '/portal', search: { tab: 'ventas' }, replace: true })}
          className="w-full rounded-xl bg-[var(--secondary)] py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-105"
        >
          + Nueva venta
        </button>
      }
      sidebarFooter={
        <>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-[var(--text)]/55 hover:text-[var(--accent)]"
          >
            <Home className="h-3.5 w-3.5" />
            Sitio público
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-[var(--text)]/80 hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </>
      }
      header={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Sesión</p>
            <p className="truncate text-sm font-semibold text-[var(--text)]">
              {session.user.name ?? session.user.email}
            </p>
            <p className="text-xs text-[var(--text)]/55">Administración</p>
          </div>
        </div>
      }
    >
      <div className="p-6">
          {tab === 'inicio' && (
            <div className="space-y-6">
              <div>
                <h1 className={staffPageTitleClass}>Resumen</h1>
                <p className={staffPageSubtitleClass}>Métricas del día e inventario.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className={staffCardClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">Ventas hoy</p>
                  <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--accent)]">{d?.total_ventas ?? '—'}</p>
                </div>
                <div className={staffCardClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">Ingresos</p>
                  <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text)]">{d ? `Q${d.ingresos}` : '—'}</p>
                </div>
                <div className={staffCardClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">Stock bajo</p>
                  <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--secondary)]">{productosStaffQ.isLoading ? '…' : lowStock}</p>
                  <p className="mt-1 text-[10px] font-medium text-[var(--text)]/45">≤ 5 unidades</p>
                </div>
                <div className={staffCardClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">Productos activos</p>
                  <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text)]">{productosStaffQ.data?.length ?? '—'}</p>
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
                <h1 className={staffPageTitleClass}>Inventario</h1>
                <p className={staffPageSubtitleClass}>Catálogo; las imágenes se gestionan al crear o editar un producto.</p>
              </div>
              <div className={staffTableWrapClass}>
                <table className="w-full text-left text-sm">
                  <thead className={staffTableHeadClass}>
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
                      <tr key={p.id} className={productInventoryRowClass(p.activo, 'dark')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black/30 ring-1 ring-white/10">
                              {p.imagen_url ? (
                                <img src={p.imagen_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-white/30">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={`font-semibold ${p.activo ? 'text-[var(--text)]' : 'text-[var(--text)]/45 line-through'}`}>{p.nombre}</p>
                                {!p.activo ? <ProductInactiveBadge variant="dark" /> : null}
                              </div>
                              <p className="text-xs text-[var(--text)]/45">ID {p.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">{p.categoria.nombre}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">Q{p.precio}</td>
                        <td className="px-4 py-3 text-right">{p.stock}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            title="Editar"
                            className={staffIconBtnClass}
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
                              className={staffIconBtnDangerClass}
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
                <p className="border-t border-white/10 px-4 py-2 text-xs text-[var(--text)]/55">
                  Mostrando {Math.min(30, productosStaffQ.data?.length ?? 0)} de {productosStaffQ.data?.length ?? 0} productos
                </p>
              </div>
            </div>
          )}

          {tab === 'clientes' && (
            <div className="space-y-4">
              <h1 className={staffPageTitleClass}>Clientes</h1>
              <div className={staffTableWrapClass}>
                <table className="w-full text-left text-sm">
                  <thead className={staffTableHeadClass}>
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Correo</th>
                      <th className="px-4 py-3">Teléfono</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(clientesListQ.data ?? []).map((c) => (
                      <tr key={c.id} className="border-b border-white/10">
                        <td className="px-4 py-3 font-medium text-[var(--text)]">{c.nombre}</td>
                        <td className="px-4 py-3 text-[var(--text)]/75">{c.email ?? '—'}</td>
                        <td className="px-4 py-3 text-[var(--text)]/75">{c.telefono ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className={staffIconBtnClass}
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

          {tab === 'proveedores' && (
            <StaffProveedoresPanel session={session.user} enabled={enabled} variant="dark" />
          )}

          {tab === 'reportes' && (
            <StaffReportsPanel enabled={enabled} reportSub={reportSub} onReportSub={goReportSub} variant="dark" />
          )}

          {tab === 'personal' && <StaffTeamPanel session={session.user} enabled={enabled} variant="dark" />}
      </div>
    </StaffPortalShell>
  )
}
