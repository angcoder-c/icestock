import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Pencil,
  Search,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react'

import { PosSaleShell } from '#/components/pos-sale-view'
import {
  ProductInactiveBadge,
  productInventoryRowClass,
} from '#/components/product-deactivate-modal'
import { SiteLogo } from '#/components/site-logo'
import { useIcestock } from '#/context/icestock-context'
import { type EmpleadoTab } from '#/lib/empleado-search'
import { useRequireRoles } from '#/hooks/use-role-access'
import {
  useCategoriasQuery,
  useClientesQuery,
  useCreateClienteMutation,
  useProductosQuery,
  useProductosStockBajoQuery,
  useVentasListQuery,
} from '#/hooks/use-icestock-api'

const teal = 'text-[#004d4f]'
const tealBg = 'bg-[#004d4f]'
const coral = 'bg-[#ff6b6b]'

function statusPill(estado: string) {
  const e = estado.toLowerCase()
  if (e.includes('complet')) return 'bg-[var(--accent)]/20 text-[var(--accent)]'
  if (e.includes('pend')) return 'bg-amber-500/20 text-amber-200'
  if (e.includes('anul') || e.includes('refund')) return 'bg-[var(--secondary)]/20 text-[var(--secondary)]'
  return 'bg-white/10 text-[var(--text)]/80'
}

const empleadoRouteApi = getRouteApi('/empleado')

export function EmpleadoPortalPage() {
  const navigate = useNavigate()
  const search = empleadoRouteApi.useSearch()
  const tab: EmpleadoTab = search.tab ?? 'inicio'

  const goTab = (t: EmpleadoTab) => {
    void navigate({ to: '/empleado', search: { tab: t }, replace: true })
  }

  const { signOut } = useIcestock()
  const { session, ready } = useRequireRoles(['cajero'], { loginPath: '/empleado' })
  const [headerSearch, setHeaderSearch] = useState('')
  const [posSearch, setPosSearch] = useState('')
  const [posCat, setPosCat] = useState<string | null>(null)
  const [debouncedPos, setDebouncedPos] = useState('')

  const [drawerCliente, setDrawerCliente] = useState(false)
  const [ncNombre, setNcNombre] = useState('')
  const [ncEmail, setNcEmail] = useState('')
  const [ncTel, setNcTel] = useState('')
  const [ncErr, setNcErr] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPos(posSearch), 300)
    return () => clearTimeout(t)
  }, [posSearch])

  const ok = ready
  const productosInvQ = useProductosQuery('', null, ok && tab === 'productos', false)
  const productosPosQ = useProductosQuery(debouncedPos, posCat, ok && tab === 'ventas', false)
  const categoriasQ = useCategoriasQuery(ok && (tab === 'ventas' || tab === 'productos'))
  const clientesQ = useClientesQuery(ok && (tab === 'clientes' || tab === 'inicio' || tab === 'ventas'))
  const ventasListQ = useVentasListQuery(ok && tab === 'inicio')
  const stockBajoQ = useProductosStockBajoQuery(ok && tab === 'inicio')
  const createCli = useCreateClienteMutation()

  const clientesFiltrados = useMemo(() => {
    const q = headerSearch.trim().toLowerCase()
    const rows = clientesQ.data ?? []
    if (!q) return rows
    return rows.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.telefono?.toLowerCase().includes(q) ?? false),
    )
  }, [clientesQ.data, headerSearch])

  const productosFiltrados = useMemo(() => {
    const q = headerSearch.trim().toLowerCase()
    const rows = productosInvQ.data ?? []
    if (tab !== 'productos' || !q) return rows
    return rows.filter((p) => p.nombre.toLowerCase().includes(q) || p.categoria.nombre.toLowerCase().includes(q))
  }, [productosInvQ.data, headerSearch, tab])

  const ventasHoy = useMemo(() => {
    const today = new Date().toDateString()
    return (ventasListQ.data ?? []).filter((v) => new Date(v.fecha).toDateString() === today)
  }, [ventasListQ.data])

  const ingresosHoy = useMemo(
    () => ventasHoy.reduce((sum, v) => sum + (parseFloat(String(v.total)) || 0), 0).toFixed(2),
    [ventasHoy],
  )

  const onNuevoCliente = async (e: FormEvent) => {
    e.preventDefault()
    setNcErr(null)
    if (!ncNombre.trim()) {
      setNcErr('El nombre es obligatorio.')
      return
    }
    try {
      await createCli.mutateAsync({
        nombre: ncNombre.trim(),
        email: ncEmail.trim() || null,
        telefono: ncTel.trim() || null,
      })
      setDrawerCliente(false)
      setNcNombre('')
      setNcEmail('')
      setNcTel('')
    } catch (err) {
      setNcErr(err instanceof Error ? err.message : 'No se pudo registrar')
    }
  }

  if (!ready || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--text)]">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--panel)] px-6 py-4 shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin text-[#004d4f]" />
          Cargando…
        </div>
      </div>
    )
  }

  const alertas = (stockBajoQ.data ?? []).length
  const clientesTotal = clientesQ.data?.length ?? 0
  const ventasMuestra = (ventasListQ.data ?? []).slice(0, 8)

  const navBtn = (id: EmpleadoTab, label: string, Icon: typeof LayoutDashboard) => (
    <button
      type="button"
      onClick={() => goTab(id)}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
        tab === id ? `${tealBg} text-white shadow` : 'text-white/75 hover:bg-white/10'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
      {label}
    </button>
  )

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased font-[family-name:var(--font-body)]">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-[var(--panel)] px-3 py-6 shadow-xl shadow-black/30">
        <Link to="/empleado" search={{ tab: 'inicio' }} className="mb-6 flex items-center gap-2 px-2">
          <div className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-transparent ring-1 ring-white/20`}>
            <SiteLogo decorative className="h-6 w-6 object-contain" />
          </div>
          <div className="min-w-0">
            <p className={`truncate font-[family-name:var(--font-heading)] text-[#20B2AA] text-sm font-bold ${teal}`}>IceStock</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text)]/50">Portal empleado</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {navBtn('inicio', 'Inicio', LayoutDashboard)}
          {navBtn('productos', 'Productos', Package)}
          {navBtn('ventas', 'Ventas', ShoppingCart)}
          {navBtn('clientes', 'Clientes', Users)}
        </nav>

        <button
          type="button"
          onClick={() => goTab('ventas')}
          className={`mt-4 w-full rounded-xl ${coral} py-3 text-sm font-bold text-white shadow transition hover:brightness-105`}
        >
          + Nueva venta
        </button>

        <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-[var(--text)]/80 hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--bg)]/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
            <div className="relative min-w-[200px] flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder={
                  tab === 'clientes' ? 'Buscar clientes…' : tab === 'productos' ? 'Buscar en inventario…' : 'Buscar…'
                }
                className="w-full rounded-full border border-white/10 bg-black/25 py-2.5 pl-10 pr-4 text-sm text-[var(--text)] placeholder:text-white/40 outline-none ring-[var(--accent)]/25 focus:border-[var(--accent)]/40 focus:ring-2"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 sm:flex">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${tealBg} text-xs font-bold text-white`}>
                  {session.user.name?.slice(0, 1).toUpperCase() ?? '?'}
                </div>
                <span className="max-w-[140px] truncate text-sm font-medium text-[var(--text)]/90">{session.user.name}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {tab === 'inicio' && (
            <div className="space-y-8">
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#004d4f]">Resumen del día</h1>
                <p className="text-sm text-[var(--text)]/75">Resumen del día con ventas e ingresos.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-[var(--panel)] p-5 shadow-lg shadow-black/25">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">Ventas hoy</p>
                    <ShoppingCart className="h-5 w-5 text-[#004d4f]" />
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--text)]">{ventasHoy.length}</p>
                  <p className="mt-1 text-xs text-emerald-300">Ventas registradas hoy</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[var(--panel)] p-5 shadow-lg shadow-black/25">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">Ingresos</p>
                    <span className="text-[#004d4f]">Q</span>
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--text)]">
                    {ventasListQ.isLoading ? '—' : `Q${ingresosHoy}`}
                  </p>
                  <p className="mt-1 text-xs text-emerald-300">Total de tus ventas hoy</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[var(--panel)] p-5 shadow-lg shadow-black/25">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">Alertas stock</p>
                    <Package className="h-5 w-5 text-[#ff6b6b]" />
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold text-[#ff6b6b]">{stockBajoQ.isLoading ? '…' : alertas}</p>
                  <p className="mt-1 text-xs text-red-600">Productos con stock bajo</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[var(--panel)] p-5 shadow-lg shadow-black/25">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">Clientes</p>
                    <Users className="h-5 w-5 text-[#004d4f]" />
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--text)]">{clientesQ.isLoading ? '…' : clientesTotal}</p>
                  <p className="mt-1 text-xs text-[var(--text)]/55">Registrados en el sistema</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[var(--panel)] p-5 shadow-lg shadow-black/25 lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--text)]">Ventas por categoría</h2>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-[var(--text)]/75">Esta semana</span>
                  </div>
                  <p className="text-sm text-[var(--text)]/55">Los reportes por categoría están en el portal de analista.</p>
                </div>
                <div className={`rounded-2xl ${tealBg} p-6 text-white shadow-lg`}>
                  <p className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90">Destacado</p>
                  <p className="mt-4 font-[family-name:var(--font-heading)] text-xl font-bold">Top categoría</p>
                  <p className="mt-2 text-sm text-white/85">Consulta el catálogo en la pestaña Productos (solo lectura).</p>
                  <button
                    type="button"
                    onClick={() => goTab('productos')}
                    className="mt-6 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-bold text-[var(--bg)] shadow transition hover:brightness-110"
                  >
                    Ver inventario
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[var(--panel)] p-5 shadow-lg shadow-black/25">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--text)]">Transacciones recientes</h2>
                  <button type="button" onClick={() => goTab('ventas')} className={`text-sm font-semibold ${teal}`}>
                    Ver ventas
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">
                        <th className="py-2 pr-4">ID</th>
                        <th className="py-2 pr-4">Hora</th>
                        <th className="py-2 pr-4">Monto</th>
                        <th className="py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasListQ.isLoading ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-[var(--text)]/55">
                            Cargando ventas…
                          </td>
                        </tr>
                      ) : (
                        ventasMuestra.map((v) => {
                          const t = new Date(v.fecha)
                          return (
                            <tr key={v.id} className="border-b border-white/10">
                              <td className="py-3 font-semibold text-[var(--text)]">#{v.id}</td>
                              <td className="py-3 text-[var(--text)]/75">{t.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-3 font-semibold text-[var(--text)]">Q{v.total}</td>
                              <td className="py-3">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPill(v.estado)}`}>{v.estado}</span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'productos' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#004d4f]">Inventario de productos</h1>
                  <p className="text-sm text-[var(--text)]/75">Consulta precios y stock disponibles para la venta.</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--panel)] shadow-lg shadow-black/25">
                <p className="border-b border-white/10 px-4 py-2 text-xs text-[var(--text)]/55">
                  Mostrando {productosFiltrados.length} de {productosInvQ.data?.length ?? 0} productos
                </p>
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--primary)]/30 text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.slice(0, 40).map((p) => (
                      <tr key={p.id} className={productInventoryRowClass(p.activo, 'dark')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/10 ${!p.activo ? 'grayscale opacity-60' : ''}`}>
                              {p.imagen_url ? (
                                <img src={p.imagen_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[var(--text)]/35">
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
                          <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">{p.categoria.nombre}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">Q{p.precio}</td>
                        <td className="px-4 py-3 text-right">{p.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'ventas' && (
            <div className="space-y-4">
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#004d4f]">Nueva venta</h1>
              <p className="text-sm text-[var(--text)]/75">Catálogo y carrito para registrar una venta.</p>
              <div className="overflow-x-hidden rounded-2xl border border-white/10 bg-[var(--panel)] shadow-lg shadow-black/25">
                <PosSaleShell
                  session={session}
                  signOut={signOut}
                  search={posSearch}
                  setSearch={setPosSearch}
                  categoriaId={posCat}
                  setCategoriaId={setPosCat}
                  categoriasQ={categoriasQ}
                  productosQ={productosPosQ}
                  homeLink="/empleado"
                  compact
                  roleHint="Caja"
                  checkoutMode="staff"
                  clientesQ={clientesQ}
                />
              </div>
            </div>
          )}

          {tab === 'clientes' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#004d4f]">Cartera de clientes</h1>
                  <p className="text-sm text-[var(--text)]/75">Alta y datos de contacto de tus clientes.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerCliente(true)
                    setNcErr(null)
                  }}
                  className={`rounded-xl ${coral} px-5 py-2.5 text-sm font-bold text-white shadow`}
                >
                  + Registrar cliente
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--panel)] shadow-lg shadow-black/25">
                <p className="border-b border-white/10 px-4 py-2 text-xs text-[var(--text)]/55">
                  {clientesFiltrados.length} cliente(s) mostrado(s)
                </p>
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--primary)]/30 text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Correo</th>
                      <th className="px-4 py-3">Teléfono</th>
                      <th className="px-4 py-3">Alta</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.map((c) => (
                      <tr key={c.id} className="border-b border-white/10">
                        <td className="px-4 py-3 font-medium text-[var(--text)]">{c.nombre}</td>
                        <td className="px-4 py-3 text-[var(--text)]/75">{c.email ?? '—'}</td>
                        <td className="px-4 py-3 text-[var(--text)]/75">{c.telefono ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text)]/55">{new Date(c.creado_en).toLocaleDateString('es-GT')}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="inline-flex rounded-lg p-2 text-[#004d4f] hover:bg-[var(--accent)]/15"
                            title="Editar"
                            onClick={() => {
                              void navigate({
                                to: '/empleado/clientes/editar/$clienteId',
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

        </main>
      </div>

      {drawerCliente && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !createCli.isPending) setDrawerCliente(false)
          }}
        >
          <div
            className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[var(--panel)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-nuevo-cliente-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 id="drawer-nuevo-cliente-title" className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--text)]">
                  Registrar cliente
                </h2>
              </div>
              <button type="button" className="rounded-full p-2 text-[var(--text)]/45 hover:bg-white/10" onClick={() => setDrawerCliente(false)} aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="flex flex-1 flex-col gap-4 p-5" onSubmit={(e) => void onNuevoCliente(e)}>
              <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text)]/55">
                Nombre
                <input value={ncNombre} onChange={(e) => setNcNombre(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2" />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text)]/55">
                Correo
                <input value={ncEmail} onChange={(e) => setNcEmail(e.target.value)} type="email" className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2" />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text)]/55">
                Teléfono
                <input value={ncTel} onChange={(e) => setNcTel(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2" />
              </label>
              {ncErr && <p className="text-sm text-red-600">{ncErr}</p>}
              <div className="mt-auto flex justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--text)]/75 transition-colors hover:bg-white/10 hover:text-[var(--text)]"
                  onClick={() => setDrawerCliente(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createCli.isPending}
                  className={`rounded-xl ${tealBg} px-5 py-2 text-sm font-bold text-white transition-colors hover:brightness-110 disabled:pointer-events-none disabled:opacity-50`}
                >
                  {createCli.isPending ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
