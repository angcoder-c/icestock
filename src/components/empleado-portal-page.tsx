import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  Bell,
  HelpCircle,
  IceCream2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Moon,
  Package,
  Pencil,
  Search,
  ShoppingCart,
  Trash2,
  Users,
  X,
} from 'lucide-react'

import { PosSaleShell } from '#/components/pos-sale-view'
import {
  ProductDeactivateModal,
  ProductInactiveBadge,
  productInventoryRowClass,
} from '#/components/product-deactivate-modal'
import { useIcestock } from '#/context/icestock-context'
import type { EmpleadoReportSub, EmpleadoTab } from '#/lib/empleado-search'
import {
  useCategoriasQuery,
  useClientesFrecuentesQuery,
  useClientesQuery,
  useCreateClienteMutation,
  useCreateProductoMutation,
  useDeleteProductoMutation,
  useProductosMasVendidosQuery,
  useProductosQuery,
  useProductosStockBajoQuery,
  useProveedoresQuery,
  useStockDisponibleQuery,
  useUpdateClienteMutation,
  useUpdateProductoMutation,
  useUploadProductImageMutation,
  useVentasDelDiaQuery,
  useVentasListQuery,
  useVentasPorCategoriaQuery,
  type ClienteListApi,
  type ProductoApi,
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

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

const empleadoRouteApi = getRouteApi('/empleado')

export function EmpleadoPortalPage() {
  const navigate = useNavigate()
  const search = empleadoRouteApi.useSearch()
  const tab: EmpleadoTab = search.tab ?? 'inicio'
  const reportSub: EmpleadoReportSub = search.reportSub ?? 'hoy'

  const goTab = (t: EmpleadoTab) => {
    void navigate({
      to: '/empleado',
      search: () => (t === 'reportes' ? { tab: t, reportSub: search.reportSub ?? 'hoy' } : { tab: t }),
      replace: true,
    })
  }

  const goReportSub = (k: EmpleadoReportSub) => {
    void navigate({
      to: '/empleado',
      search: { tab: 'reportes', reportSub: k },
      replace: true,
    })
  }

  const { session, sessionPending, signOut } = useIcestock()
  const [headerSearch, setHeaderSearch] = useState('')
  const [posSearch, setPosSearch] = useState('')
  const [posCat, setPosCat] = useState<number | null>(null)
  const [debouncedPos, setDebouncedPos] = useState('')

  const [drawerProducto, setDrawerProducto] = useState(false)
  const [drawerCliente, setDrawerCliente] = useState(false)
  const [npNombre, setNpNombre] = useState('')
  const [npDesc, setNpDesc] = useState('')
  const [npPrecio, setNpPrecio] = useState('')
  const [npStock, setNpStock] = useState('')
  const [npCat, setNpCat] = useState<number | ''>('')
  const [npProv, setNpProv] = useState<number | ''>('')
  const [npFile, setNpFile] = useState<File | null>(null)
  const [npErr, setNpErr] = useState<string | null>(null)

  const [ncNombre, setNcNombre] = useState('')
  const [ncEmail, setNcEmail] = useState('')
  const [ncTel, setNcTel] = useState('')
  const [ncErr, setNcErr] = useState<string | null>(null)

  const [prodEdit, setProdEdit] = useState<ProductoApi | null>(null)
  const [peNombre, setPeNombre] = useState('')
  const [pePrecio, setPePrecio] = useState('')
  const [peStock, setPeStock] = useState('')
  const [peActivo, setPeActivo] = useState(true)
  const [peErr, setPeErr] = useState<string | null>(null)

  const [prodDeactivate, setProdDeactivate] = useState<ProductoApi | null>(null)
  const [prodDeactivateErr, setProdDeactivateErr] = useState<string | null>(null)

  const [cliEdit, setCliEdit] = useState<ClienteListApi | null>(null)
  const [ceNombre, setCeNombre] = useState('')
  const [ceEmail, setCeEmail] = useState('')
  const [ceTel, setCeTel] = useState('')
  const [ceErr, setCeErr] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPos(posSearch), 300)
    return () => clearTimeout(t)
  }, [posSearch])

  useEffect(() => {
    if (sessionPending) return
    if (!session) {
      void navigate({ to: '/login/empleado', search: { redirect: '/empleado' } })
      return
    }
    if (session.user.rol === 'admin') {
      void navigate({ to: '/portal', replace: true })
      return
    }
    if (session.user.rol === 'cliente') {
      void navigate({ to: '/tienda', replace: true })
      return
    }
    if (session.user.rol !== 'cajero') {
      void navigate({ to: '/login', replace: true })
    }
  }, [session, sessionPending, navigate])

  const ok = session?.user?.rol === 'cajero'
  const reporteQ = useVentasDelDiaQuery(ok && tab === 'inicio')
  const reporteVentasQ = useVentasDelDiaQuery(ok && tab === 'ventas')
  const productosInvQ = useProductosQuery('', null, ok && tab === 'productos', true)
  const productosPosQ = useProductosQuery(debouncedPos, posCat, ok && tab === 'ventas', true)
  const categoriasQ = useCategoriasQuery(ok && (tab === 'ventas' || tab === 'productos'))
  const clientesQ = useClientesQuery(ok && (tab === 'clientes' || tab === 'inicio' || tab === 'ventas'))
  const ventasListQ = useVentasListQuery(ok && tab === 'inicio')
  const proveedoresQ = useProveedoresQuery(ok && tab === 'productos')
  const stockBajoQ = useProductosStockBajoQuery(ok && tab === 'inicio')
  const stockTabQ = useStockDisponibleQuery(ok && tab === 'reportes' && reportSub === 'stock')
  const topQ = useProductosMasVendidosQuery(ok && tab === 'reportes' && reportSub === 'top')
  const porCatQ = useVentasPorCategoriaQuery(ok && (tab === 'inicio' || (tab === 'reportes' && reportSub === 'insights')))
  const freqQ = useClientesFrecuentesQuery(ok && tab === 'reportes' && reportSub === 'insights')

  const createProd = useCreateProductoMutation()
  const uploadMut = useUploadProductImageMutation()
  const createCli = useCreateClienteMutation()
  const updateProd = useUpdateProductoMutation()
  const deleteProd = useDeleteProductoMutation()
  const updateCli = useUpdateClienteMutation()

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

  const maxCatIngreso = useMemo(() => {
    const rows = porCatQ.data ?? []
    return Math.max(1, ...rows.map((r) => parseFloat(String(r.ingresos)) || 0))
  }, [porCatQ.data])

  const onNuevoProducto = async (e: FormEvent) => {
    e.preventDefault()
    setNpErr(null)
    const precio = Number(npPrecio)
    const stock = Number(npStock)
    if (!npNombre.trim()) {
      setNpErr('El nombre es obligatorio.')
      return
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      setNpErr('Precio inválido.')
      return
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setNpErr('Stock inválido.')
      return
    }
    if (npCat === '' || npProv === '') {
      setNpErr('Selecciona categoría y proveedor.')
      return
    }
    try {
      const created = await createProd.mutateAsync({
        nombre: npNombre.trim(),
        descripcion: npDesc.trim() || null,
        precio,
        stock,
        id_categoria: Number(npCat),
        id_proveedor: Number(npProv),
      })
      if (npFile) {
        try {
          await uploadMut.mutateAsync({ file: npFile, id_producto: created.id })
        } catch (upErr) {
          setNpErr(upErr instanceof Error ? upErr.message : 'Producto creado; error al subir imagen.')
        }
      }
      setDrawerProducto(false)
      setNpNombre('')
      setNpDesc('')
      setNpPrecio('')
      setNpStock('')
      setNpCat('')
      setNpProv('')
      setNpFile(null)
    } catch (err) {
      setNpErr(err instanceof Error ? err.message : 'No se pudo crear')
    }
  }

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

  if (sessionPending || !session || !ok) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--text)]">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--panel)] px-6 py-4 shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin text-[#004d4f]" />
          Cargando…
        </div>
      </div>
    )
  }

  const d = reporteQ.data
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
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tealBg} text-white`}>
            <IceCream2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`truncate font-[family-name:var(--font-heading)] text-sm font-bold ${teal}`}>IceStock</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text)]/50">Portal empleado</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {navBtn('inicio', 'Inicio', LayoutDashboard)}
          {navBtn('productos', 'Productos', Package)}
          {navBtn('ventas', 'Ventas', ShoppingCart)}
          {navBtn('clientes', 'Clientes', Users)}
          {navBtn('reportes', 'Reportes', BarChart3)}
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
                  tab === 'clientes'
                    ? 'Buscar clientes…'
                    : tab === 'productos'
                      ? 'Buscar en inventario…'
                      : tab === 'reportes'
                        ? 'Buscar en reportes…'
                        : 'Buscar…'
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
                  <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--text)]">{d?.total_ventas ?? '—'}</p>
                  <p className="mt-1 text-xs text-emerald-300">Cabeceras del día</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[var(--panel)] p-5 shadow-lg shadow-black/25">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55">Ingresos</p>
                    <span className="text-[#004d4f]">Q</span>
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--text)]">{d ? `Q${d.ingresos}` : '—'}</p>
                  <p className="mt-1 text-xs text-emerald-300">Ingresos del día</p>
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
                  {porCatQ.isLoading ? (
                    <p className="text-sm text-[var(--text)]/55">Cargando…</p>
                  ) : porCatQ.isError ? (
                    <p className="text-sm text-red-600">{(porCatQ.error as Error)?.message}</p>
                  ) : (
                    <ul className="space-y-4">
                      {(porCatQ.data ?? []).map((row, i) => {
                        const pct = Math.round(((parseFloat(String(row.ingresos)) || 0) / maxCatIngreso) * 100)
                        const colors = ['bg-[#004d4f]', 'bg-[#ff6b6b]', 'bg-[#5ec4be]', 'bg-[#94d7d3]', 'bg-[#b8e0dd]']
                        return (
                          <li key={row.categoria}>
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-[var(--text)]/90">{row.categoria}</span>
                              <span className="font-semibold text-[#004d4f]">Q{row.ingresos}</span>
                            </div>
                            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
                              <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                <div className={`rounded-2xl ${tealBg} p-6 text-white shadow-lg`}>
                  <p className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90">Destacado</p>
                  <p className="mt-4 font-[family-name:var(--font-heading)] text-xl font-bold">Top categoría</p>
                  <p className="mt-2 text-sm text-white/85">
                    {(porCatQ.data ?? [])[0]?.categoria ?? 'Sin datos'} lidera ingresos reportados por categoría.
                  </p>
                  <button
                    type="button"
                    onClick={() => goTab('productos')}
                    className="mt-6 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-bold text-[var(--bg)] shadow transition hover:brightness-110"
                  >
                    Gestionar inventario
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
                  <p className="text-sm text-[var(--text)]/75">Gestiona el inventario; puedes adjuntar foto al crear o editar un producto.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerProducto(true)
                    setNpErr(null)
                  }}
                  className={`rounded-xl ${tealBg} px-5 py-2.5 text-sm font-bold text-white shadow`}
                >
                  + Nuevo producto
                </button>
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
                      <th className="px-4 py-3 text-right">Acciones</th>
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
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            title="Editar"
                            className="inline-flex rounded-lg p-2 text-[#004d4f] hover:bg-[var(--accent)]/15"
                            onClick={() => {
                              setProdEdit(p)
                              setPeNombre(p.nombre)
                              setPePrecio(p.precio)
                              setPeStock(String(p.stock))
                              setPeActivo(p.activo)
                              setPeErr(null)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {p.activo ? (
                            <button
                              type="button"
                              title="Desactivar"
                              className="inline-flex rounded-lg p-2 text-red-400 hover:bg-red-500/15"
                              onClick={() => {
                                setProdDeactivateErr(null)
                                setProdDeactivate(p)
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
                  reporteQ={reporteVentasQ}
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
                              setCliEdit(c)
                              setCeNombre(c.nombre)
                              setCeEmail(c.email ?? '')
                              setCeTel(c.telefono ?? '')
                              setCeErr(null)
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
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#004d4f]">Informes</h1>
                  <p className="text-sm text-[var(--text)]/75">Indicadores de ventas, stock y clientes habituales.</p>
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
                    else if (reportSub === 'stock' && stockTabQ.data?.length)
                      exportCsv(
                        'stock.csv',
                        stockTabQ.data.map((r) => ({ id: r.id, producto: r.producto, stock: r.stock, alerta: r.alerta })),
                      )
                    else if (reportSub === 'hoy' && d)
                      exportCsv('ventas-del-dia.csv', [{ fecha: d.fecha, total_ventas: d.total_ventas, ingresos: d.ingresos }])
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border border-[#004d4f] px-4 py-2 text-sm font-bold text-[#004d4f] hover:bg-[#004d4f]/5`}
                >
                  Exportar CSV
                </button>
              </div>
              <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
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
                    onClick={() => goReportSub(k)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      reportSub === k ? `${tealBg} text-white` : 'bg-[var(--panel)] text-[var(--text)]/75 ring-1 ring-white/15'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {reportSub === 'hoy' && (
                <div className="rounded-2xl border border-white/10 bg-[var(--panel)] p-6 shadow-lg shadow-black/25">
                  <p className="text-sm text-[var(--text)]/75">Totales del día en curso.</p>
                  <p className="mt-4 text-3xl font-bold text-[var(--text)]">{d?.total_ventas ?? '—'} ventas</p>
                  <p className="text-xl text-[#004d4f]">Q{d?.ingresos ?? '—'}</p>
                  <p className="mt-2 text-xs text-[var(--text)]/45">Fecha: {d?.fecha}</p>
                </div>
              )}
              {reportSub === 'top' && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--panel)] shadow-lg shadow-black/25">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--primary)]/30 text-xs font-semibold uppercase text-[var(--text)]/55">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3">Categoría</th>
                        <th className="px-4 py-3 text-right">Unidades</th>
                        <th className="px-4 py-3 text-right">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(topQ.data ?? []).map((r) => (
                        <tr key={r.id_producto} className="border-b border-white/10">
                          <td className="px-4 py-3">{r.rank}</td>
                          <td className="px-4 py-3 font-medium">{r.producto}</td>
                          <td className="px-4 py-3">{r.categoria}</td>
                          <td className="px-4 py-3 text-right">{r.total_vendido}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#004d4f]">Q{r.ingresos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {reportSub === 'stock' && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--panel)] shadow-lg shadow-black/25">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--primary)]/30 text-xs font-semibold uppercase text-[var(--text)]/55">
                      <tr>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3 text-right">Stock</th>
                        <th className="px-4 py-3">Alerta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stockTabQ.data ?? []).map((r) => (
                        <tr key={r.id} className="border-b border-white/10">
                          <td className="px-4 py-3 font-medium">{r.producto}</td>
                          <td className="px-4 py-3 text-right">{r.stock}</td>
                          <td className="px-4 py-3">
                            {r.alerta ? <span className="text-xs font-bold text-red-600">Crítico</span> : <span className="text-[var(--text)]/45">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {reportSub === 'insights' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[var(--panel)] p-5 shadow-lg shadow-black/25">
                    <h3 className="font-bold text-[var(--text)]">Clientes frecuentes</h3>
                    <p className="text-xs text-[var(--text)]/55">Quienes más compran y su gasto acumulado.</p>
                    <ul className="mt-4 space-y-2 text-sm">
                      {(freqQ.data ?? []).map((c) => (
                        <li key={c.id} className="flex justify-between border-b border-white/10 py-2">
                          <span>{c.nombre}</span>
                          <span className="font-semibold text-[#004d4f]">Q{c.monto_total}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[var(--panel)] p-5 shadow-lg shadow-black/25">
                    <h3 className="font-bold text-[var(--text)]">Ventas por categoría</h3>
                    <p className="text-xs text-[var(--text)]/55">Ingresos agrupados por categoría.</p>
                    <ul className="mt-4 space-y-2 text-sm">
                      {(porCatQ.data ?? []).slice(0, 6).map((r) => (
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
          )}
        </main>
      </div>

      {drawerProducto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[var(--panel)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--text)]">Nuevo producto</h2>
              </div>
              <button type="button" className="rounded-full p-2 text-[var(--text)]/45 hover:bg-white/10" onClick={() => setDrawerProducto(false)} aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="flex flex-1 flex-col gap-4 overflow-y-auto p-5" onSubmit={(e) => void onNuevoProducto(e)}>
              <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text)]/55">
                Nombre
                <input
                  value={npNombre}
                  onChange={(e) => setNpNombre(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2"
                  placeholder="ej. Paleta de maracuyá"
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text)]/55">
                Categoría
                <select
                  value={npCat}
                  onChange={(e) => setNpCat(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2"
                >
                  <option value="">Seleccionar…</option>
                  {(categoriasQ.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text)]/55">
                Proveedor
                <select
                  value={npProv}
                  onChange={(e) => setNpProv(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2"
                >
                  <option value="">Seleccionar…</option>
                  {(proveedoresQ.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text)]/55">
                Precio (Q)
                <input
                  value={npPrecio}
                  onChange={(e) => setNpPrecio(e.target.value)}
                  type="number"
                  step="0.01"
                  min={0}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2"
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text)]/55">
                Stock inicial
                <input
                  value={npStock}
                  onChange={(e) => setNpStock(e.target.value)}
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2"
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text)]/55">
                Descripción
                <textarea value={npDesc} onChange={(e) => setNpDesc(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2" rows={2} />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text)]/55">
                Imagen (opcional)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-1 w-full text-sm"
                  onChange={(e) => setNpFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {npErr && <p className="text-sm text-red-600">{npErr}</p>}
              <div className="mt-auto flex justify-end gap-2 border-t border-white/10 pt-4">
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--text)]/75" onClick={() => setDrawerProducto(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createProd.isPending}
                  className={`rounded-xl ${tealBg} px-5 py-2 text-sm font-bold text-white disabled:opacity-50`}
                >
                  {createProd.isPending ? 'Guardando…' : 'Guardar producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {drawerCliente && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[var(--panel)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--text)]">Registrar cliente</h2>
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
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--text)]/75" onClick={() => setDrawerCliente(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={createCli.isPending} className={`rounded-xl ${tealBg} px-5 py-2 text-sm font-bold text-white disabled:opacity-50`}>
                  {createCli.isPending ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {prodEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--panel)] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--text)]">Editar producto</h2>
              <button type="button" className="rounded-full p-2 text-[var(--text)]/45 hover:bg-white/10" onClick={() => setProdEdit(null)} aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                setPeErr(null)
                const precio = Number(pePrecio)
                const stock = Number(peStock)
                if (!peNombre.trim()) {
                  setPeErr('Nombre obligatorio')
                  return
                }
                if (!Number.isFinite(precio) || precio <= 0) {
                  setPeErr('Precio inválido')
                  return
                }
                if (!Number.isFinite(stock) || stock < 0) {
                  setPeErr('Stock inválido')
                  return
                }
                void updateProd
                  .mutateAsync({
                    id: prodEdit.id,
                    nombre: peNombre.trim(),
                    precio,
                    stock,
                    activo: peActivo,
                  })
                  .then(() => setProdEdit(null))
                  .catch((err) => setPeErr(err instanceof Error ? err.message : 'Error'))
              }}
            >
              <label className="block text-xs font-bold uppercase text-[var(--text)]/55">
                Nombre
                <input value={peNombre} onChange={(e) => setPeNombre(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2" />
              </label>
              <label className="block text-xs font-bold uppercase text-[var(--text)]/55">
                Precio
                <input value={pePrecio} onChange={(e) => setPePrecio(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2" />
              </label>
              <label className="block text-xs font-bold uppercase text-[var(--text)]/55">
                Stock
                <input value={peStock} onChange={(e) => setPeStock(e.target.value)} type="number" min={0} className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2" />
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--text)]/85">
                <input type="checkbox" checked={peActivo} onChange={(e) => setPeActivo(e.target.checked)} />
                Activo
              </label>
              {peErr && <p className="text-sm text-red-600">{peErr}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-sm text-[var(--text)]/75" onClick={() => setProdEdit(null)}>
                  Cancelar
                </button>
                <button type="submit" disabled={updateProd.isPending} className={`rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${tealBg}`}>
                  {updateProd.isPending ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cliEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--panel)] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--text)]">Editar cliente</h2>
              <button type="button" className="rounded-full p-2 text-[var(--text)]/45 hover:bg-white/10" onClick={() => setCliEdit(null)} aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                setCeErr(null)
                if (!ceNombre.trim()) {
                  setCeErr('Nombre obligatorio')
                  return
                }
                void updateCli
                  .mutateAsync({
                    id: cliEdit.id,
                    nombre: ceNombre.trim(),
                    email: ceEmail.trim() || null,
                    telefono: ceTel.trim() || null,
                  })
                  .then(() => setCliEdit(null))
                  .catch((err) => setCeErr(err instanceof Error ? err.message : 'Error'))
              }}
            >
              <label className="block text-xs font-bold uppercase text-[var(--text)]/55">
                Nombre
                <input value={ceNombre} onChange={(e) => setCeNombre(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2" />
              </label>
              <label className="block text-xs font-bold uppercase text-[var(--text)]/55">
                Correo
                <input value={ceEmail} onChange={(e) => setCeEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2" />
              </label>
              <label className="block text-xs font-bold uppercase text-[var(--text)]/55">
                Teléfono
                <input value={ceTel} onChange={(e) => setCeTel(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2" />
              </label>
              {ceErr && <p className="text-sm text-red-600">{ceErr}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-sm text-[var(--text)]/75" onClick={() => setCliEdit(null)}>
                  Cancelar
                </button>
                <button type="submit" disabled={updateCli.isPending} className={`rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${tealBg}`}>
                  {updateCli.isPending ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ProductDeactivateModal
        product={prodDeactivate}
        variant="dark"
        isPending={deleteProd.isPending}
        error={prodDeactivateErr}
        onClose={() => {
          if (!deleteProd.isPending) {
            setProdDeactivate(null)
            setProdDeactivateErr(null)
          }
        }}
        onConfirm={() => {
          if (!prodDeactivate) return
          setProdDeactivateErr(null)
          void deleteProd
            .mutateAsync(prodDeactivate.id)
            .then(() => setProdDeactivate(null))
            .catch((err) => setProdDeactivateErr(err instanceof Error ? err.message : 'No se pudo desactivar'))
        }}
      />
    </div>
  )
}
