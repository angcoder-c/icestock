import { useCallback, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  Home,
  IceCream2,
  Loader2,
  LogOut,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react'

import { ClienteCompraSuccessModal, type ClienteCompraSuccess } from '#/components/cliente-compra-success-modal'
import { SiteLogo } from '#/components/site-logo'
import { useIcestock } from '#/context/icestock-context'
import { isUuid } from '#/lib/is-uuid'
import {
  useCategoriasQuery,
  useClienteMeQuery,
  useCreateVentaMutation,
  useProductosQuery,
  useVentasDelDiaQuery,
  type ClienteListApi,
  type ProductoApi,
} from '#/hooks/use-icestock-api'

const TAX_RATE = 0.08

export type PosSaleShellProps = {
  session: NonNullable<ReturnType<typeof useIcestock>['session']>
  signOut: () => Promise<void>
  search: string
  setSearch: (v: string) => void
  categoriaId: string | null
  setCategoriaId: (v: string | null) => void
  categoriasQ: ReturnType<typeof useCategoriasQuery>
  productosQ: ReturnType<typeof useProductosQuery>
  reporteQ?: ReturnType<typeof useVentasDelDiaQuery>
  homeLink: '/' | '/portal' | '/caja' | '/empleado' | '/superadmin'
  /** Texto corto junto al título (ej. Cliente / Caja) */
  roleHint?: string | null
  /** Sin barra superior (cuando ya hay layout de portal) */
  compact?: boolean
  /** Cliente logueado: venta vinculada a su ficha sin repetir datos */
  checkoutMode?: 'staff' | 'cliente'
  /** Listado para POS de personal (opcional en tienda) */
  clientesQ?: { data?: ClienteListApi[]; isLoading: boolean; isError: boolean; error?: unknown }
}

export function PosSaleShell({
  session,
  signOut,
  search,
  setSearch,
  categoriaId,
  setCategoriaId,
  categoriasQ,
  productosQ,
  reporteQ,
  homeLink,
  compact = false,
  roleHint = null,
  checkoutMode = 'staff',
  clientesQ,
}: PosSaleShellProps) {
  const { cart, toggleCart, openCart, addToCart, removeFromCart, setLineQty, clearCart, cartItemCount, cartSubtotal } = useIcestock()
  const impuesto = cartSubtotal * TAX_RATE
  const totalConImpuesto = cartSubtotal + impuesto
  const gridProducts = productosQ.data ?? []
  const clienteMeQ = useClienteMeQuery(checkoutMode === 'cliente')

  return (
    <div className="min-h-full bg-[var(--bg)] font-[family-name:var(--font-body)] text-[var(--text)] antialiased">
      {!compact && (
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--panel)]/95 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
            <Link to={homeLink} className="flex shrink-0 items-center gap-2 rounded-xl outline-none ring-[var(--accent)]/30 focus-visible:ring-2">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-transparent ring-1 ring-[var(--accent)]/25">
                <SiteLogo decorative className="h-5 w-5 object-contain" />
              </div>
              <span className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight text-[var(--text)]">IceStock</span>
            </Link>
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos…"
              className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-3 text-sm text-[var(--text)] placeholder:text-white/40 outline-none ring-[var(--accent)]/25 focus:border-[var(--accent)]/50 focus:ring-2"
            />
          </div>
          <div className="ml-auto flex items-center gap-1">
            {checkoutMode === 'cliente' && (
              <Link
                to="/tienda/compras"
                className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:inline-flex"
              >
                <Receipt className="h-4 w-4" />
                Mis compras
              </Link>
            )}
            <div className="relative lg:hidden">
              <button type="button" className="rounded-full p-2 text-white/70 hover:bg-white/10" onClick={openCart} aria-label="Pedido">
                <ShoppingBag className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[var(--bg)]">
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--accent)]">
                {session.user.name?.slice(0, 1).toUpperCase() ?? '?'}
              </div>
              <span className="max-w-[120px] truncate text-sm text-white/80">{session.user.name}</span>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </header>
      )}

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 lg:pb-10">
        {compact && (
          <div className="relative mb-6">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos…"
              className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-3 text-sm text-[var(--text)] placeholder:text-white/40 outline-none ring-[var(--accent)]/25 focus:border-[var(--accent)]/50 focus:ring-2"
            />
          </div>
        )}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text)]">Nueva venta</h1>
                  {roleHint ? (
                    <span className="rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--accent)]">
                      {roleHint}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-white/55">Catálogo en vivo · {session.user.email}</p>
              </div>
            </div>

            {reporteQ ? <ReporteDelDiaBlock query={reporteQ} variant="dark" /> : null}

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoriaId(null)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  categoriaId == null
                    ? 'bg-[var(--accent)] text-[var(--bg)] ring-2 ring-[var(--accent)]/50'
                    : 'bg-[var(--panel)] text-white/80 ring-1 ring-white/10 hover:bg-white/10'
                }`}
              >
                Todas
              </button>
              {(categoriasQ.data ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoriaId(c.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    categoriaId === c.id
                      ? 'bg-[var(--primary)] text-[var(--accent)] shadow ring-1 ring-[var(--accent)]/30'
                      : 'bg-[var(--panel)] text-white/80 ring-1 ring-white/10 hover:bg-white/10'
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>

            {productosQ.isError && (
              <div className="mb-4 rounded-xl border border-[var(--secondary)]/40 bg-[var(--secondary)]/10 px-4 py-3 text-sm text-[var(--secondary)]">
                {(productosQ.error as Error)?.message ?? 'No se pudieron cargar los productos.'}
              </div>
            )}

            {productosQ.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
              </div>
            ) : (
              <div className="grid min-h-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {gridProducts.map((p) => (
                  <ProductPosCard
                    key={p.id}
                    product={p}
                    onAdd={() =>
                      addToCart({ id: p.id, nombre: p.nombre, precio: Number(p.precio), imagen_url: p.imagen_url }, 1)
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="hidden w-full shrink-0 lg:block lg:w-[380px]">
            <div className="sticky top-24 rounded-2xl border border-white/10 bg-[var(--panel)] p-5 shadow-xl">
              <PedidoPanel
                variant="dark"
                checkoutMode={checkoutMode}
                clientesQ={clientesQ}
                clienteMeQ={clienteMeQ}
                lines={cart.lines}
                onRemove={removeFromCart}
                setLineQty={setLineQty}
                subtotal={cartSubtotal}
                impuesto={impuesto}
                total={totalConImpuesto}
                onClear={clearCart}
              />
            </div>
          </aside>
        </div>
      </main>

      <CartOverlay
        open={cart.drawerOpen}
        onClose={toggleCart}
        checkoutMode={checkoutMode}
        clientesQ={clientesQ}
        clienteMeQ={clienteMeQ}
        lines={cart.lines}
        onRemove={removeFromCart}
        setLineQty={setLineQty}
        subtotal={cartSubtotal}
        impuesto={impuesto}
        total={totalConImpuesto}
        onClear={clearCart}
        theme="dark"
      />

      <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 gap-2 rounded-full border border-white/10 bg-[var(--panel)]/95 px-2 py-2 shadow-lg backdrop-blur lg:hidden">
        <button type="button" className="rounded-full bg-[var(--primary)] p-2.5 text-[var(--accent)]" aria-current="page">
          <Home className="h-5 w-5" />
        </button>
        <button type="button" onClick={openCart} className="relative rounded-full p-2.5 text-white/70">
          <ShoppingBag className="h-5 w-5" />
          {cartItemCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[var(--bg)]">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

function ReporteDelDiaBlock({ query, variant = 'dark' }: { query: ReturnType<typeof useVentasDelDiaQuery>; variant?: 'dark' | 'light' }) {
  const isLight = variant === 'light'
  if (query.isLoading)
    return (
      <section
        className={`mb-6 rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-white' : 'mb-8 rounded-3xl border-white/10 bg-[var(--panel)] p-6'}`}
      >
        <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Cargando reporte del día…</p>
      </section>
    )
  if (query.isError)
    return (
      <section
        className={`mb-6 rounded-2xl border p-4 text-sm ${isLight ? 'border-red-200 bg-red-50 text-red-800' : 'mb-8 rounded-3xl border-[var(--secondary)]/30 bg-[var(--secondary)]/10 text-[var(--secondary)]'}`}
      >
        Reporte no disponible: {(query.error as Error)?.message}
      </section>
    )
  const d = query.data
  if (!d) return null
  if (isLight) {
    return (
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-[family-name:var(--font-heading)] text-sm font-bold text-slate-900">Hoy — {d.fecha}</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Ventas</p>
            <p className="font-[family-name:var(--font-heading)] text-lg font-bold text-teal-800">{d.total_ventas}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Ingresos</p>
            <p className="font-[family-name:var(--font-heading)] text-lg font-bold text-slate-900">Q{d.ingresos}</p>
          </div>
        </div>
      </section>
    )
  }
  return null
}

export function ProductPosCard({
  product,
  onAdd,
  catalogLoginRedirect,
}: {
  product: ProductoApi
  onAdd?: () => void
  /** Catálogo público: muestra enlace a login en lugar de comprar */
  catalogLoginRedirect?: string
}) {
  const dairyFree = product.categoria.nombre.toLowerCase().includes('sorbete')
  return (
    <article className="@container flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-[var(--panel)] shadow-lg transition hover:border-[var(--accent)]/30">
      <div className="aspect-[4/3] shrink-0 overflow-hidden rounded-t-2xl bg-black/30">
        {product.imagen_url ? (
          <img src={product.imagen_url} alt={product.nombre} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <IceCream2 className="h-14 w-14 text-white/20" />
          </div>
        )}
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 font-[family-name:var(--font-heading)] text-base font-bold text-[var(--text)]">{product.nombre}</h3>
        <div className="flex flex-wrap gap-1.5">
          {dairyFree && (
            <span className="rounded-md bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">Sin lácteos</span>
          )}
          <span className="rounded-md bg-[var(--primary)]/80 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
            {product.stock > 0 ? 'Disponible' : 'Agotado'}
          </span>
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/70">{product.categoria.nombre}</span>
        </div>
        <div className="mt-auto flex w-full min-w-0 flex-col gap-2 @min-[15.5rem]:flex-row @min-[15.5rem]:flex-wrap @min-[15.5rem]:items-center @min-[15.5rem]:justify-between">
          <p className="shrink-0 text-lg font-bold text-[var(--text)]">Q{product.precio}</p>
          {catalogLoginRedirect != null ? (
            <Link
              to="/login"
              search={{ redirect: catalogLoginRedirect }}
              className="inline-flex w-full min-w-0 items-center justify-center rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/15 px-3 py-2.5 text-center text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent)]/25 @min-[15.5rem]:w-auto @min-[15.5rem]:shrink-0"
            >
              Iniciar sesión
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              disabled={product.stock < 1}
              className="inline-flex w-full min-w-0 items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold whitespace-nowrap text-[var(--bg)] shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 @min-[15.5rem]:w-auto @min-[15.5rem]:shrink-0"
            >
              + Agregar
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function PedidoPanel({
  variant,
  checkoutMode,
  clientesQ,
  clienteMeQ,
  lines,
  onRemove,
  setLineQty,
  subtotal,
  impuesto,
  total,
  onClear,
}: {
  variant: 'light' | 'dark'
  checkoutMode: 'staff' | 'cliente'
  clientesQ?: PosSaleShellProps['clientesQ']
  clienteMeQ: ReturnType<typeof useClienteMeQuery>
  lines: { productId: string; name: string; unitPrice: number; qty: number; imagen_url?: string | null }[]
  onRemove: (id: string) => void
  setLineQty: (id: string, qty: number) => void
  subtotal: number
  impuesto: number
  total: number
  onClear: () => void
}) {
  const isLight = variant === 'light'
  const mutation = useCreateVentaMutation()
  const [staffClienteId, setStaffClienteId] = useState<string>('')
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const [compraSuccess, setCompraSuccess] = useState<ClienteCompraSuccess | null>(null)

  const handleConfirm = useCallback(async () => {
    setSubmitMsg(null)
    if (lines.length === 0) {
      setSubmitMsg('Tu lista está vacía.')
      return
    }
    let id_cliente: string | null = null
    if (checkoutMode === 'cliente') {
      if (clienteMeQ.isLoading) {
        setSubmitMsg('Cargando tu cuenta…')
        return
      }
      const id = clienteMeQ.data?.id
      if (clienteMeQ.isError || id == null) {
        setSubmitMsg('No se pudo vincular tu perfil de cliente. Recarga o contacta soporte.')
        return
      }
      id_cliente = id
    } else {
      id_cliente = staffClienteId === '' ? null : staffClienteId
      if (staffClienteId !== '' && !isUuid(id_cliente)) {
        setSubmitMsg('Cliente inválido.')
        return
      }
    }
    try {
      const result = await mutation.mutateAsync({
        id_cliente,
        items: lines.map((l) => ({ id_producto: l.productId, cantidad: l.qty })),
      })
      onClear()
      if (checkoutMode === 'cliente') {
        setCompraSuccess({ id: result.id, total: result.total, fecha: result.fecha })
        setSubmitMsg(null)
      } else {
        setSubmitMsg('¡Pedido registrado! Gracias por tu compra.')
      }
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : 'No se pudo completar el pedido.')
    }
  }, [checkoutMode, clienteMeQ.data?.id, clienteMeQ.isError, clienteMeQ.isLoading, lines, mutation, onClear, staffClienteId])

  const label = isLight ? 'text-slate-600' : 'text-white/70'
  const input = isLight
    ? 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/30'
    : 'mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[var(--accent)]/50'

  return (
    <>
      <ClienteCompraSuccessModal venta={compraSuccess} onClose={() => setCompraSuccess(null)} />
      <div className="mb-4 flex items-center gap-2">
        <ShoppingBag className={`h-5 w-5 ${isLight ? 'text-teal-800' : 'text-[var(--accent)]'}`} />
        <h2 className={`font-[family-name:var(--font-heading)] text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Pedido actual</h2>
      </div>

      {checkoutMode === 'cliente' ? (
        <div
          className={`mb-4 rounded-xl border px-3 py-2.5 text-sm ${isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-white/10 bg-black/20 text-white/85'}`}
        >
          {clienteMeQ.isLoading && <p>Sincronizando tu cuenta…</p>}
          {clienteMeQ.isError && <p className="text-[var(--secondary)]">No se pudo cargar tu ficha de cliente.</p>}
          {clienteMeQ.data && (
            <p>
              Compras como <span className="font-semibold text-[var(--accent)]">{clienteMeQ.data.nombre}</span>
              {clienteMeQ.data.email ? <span className="text-white/60"> · {clienteMeQ.data.email}</span> : null}
            </p>
          )}
        </div>
      ) : (
        <label className={`mb-3 block text-sm ${label}`}>
          Cliente en venta
          <select
            className={`${input} mt-1`}
            value={staffClienteId}
            onChange={(e) => setStaffClienteId(e.target.value)}
            disabled={!clientesQ || clientesQ.isLoading}
          >
            <option value="">Mostrador (sin cuenta)</option>
            {(clientesQ?.data ?? []).map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nombre}
                {c.email ? ` (${c.email})` : ''}
              </option>
            ))}
          </select>
          {clientesQ?.isError && (
            <span className={`mt-1 block text-xs ${isLight ? 'text-red-600' : 'text-[var(--secondary)]'}`}>
              No se pudo cargar el listado de clientes.
            </span>
          )}
        </label>
      )}

      <ul className="max-h-52 space-y-2 overflow-y-auto">
        {lines.length === 0 ? (
          <li className={`text-center text-sm ${isLight ? 'text-slate-400' : 'text-white/45'}`}>Sin productos</li>
        ) : (
          lines.map((l) => (
            <li
              key={l.productId}
              className={`flex gap-3 rounded-xl border p-2 ${isLight ? 'border-slate-100 bg-slate-50' : 'border-white/8 bg-black/20'}`}
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                {l.imagen_url ? (
                  <img src={l.imagen_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <IceCream2 className={`h-6 w-6 ${isLight ? 'text-slate-400' : 'text-white/30'}`} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>{l.name}</p>
                <p className={`text-xs ${isLight ? 'text-teal-800' : 'text-[var(--accent)]'}`}>Q{l.unitPrice.toFixed(2)}</p>
                <div className="mt-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLineQty(l.productId, l.qty - 1)}
                    className={`rounded-md p-1 ${isLight ? 'bg-white text-slate-700 ring-1 ring-slate-200' : 'bg-white/10 text-white'}`}
                    aria-label="Menos"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className={`min-w-[1.5rem] text-center text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{l.qty}</span>
                  <button
                    type="button"
                    onClick={() => setLineQty(l.productId, l.qty + 1)}
                    className={`rounded-md p-1 ${isLight ? 'bg-white text-slate-700 ring-1 ring-slate-200' : 'bg-white/10 text-white'}`}
                    aria-label="Más"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(l.productId)}
                className={`self-start rounded p-1 ${isLight ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-white/40 hover:text-[var(--secondary)]'}`}
                aria-label="Quitar"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))
        )}
      </ul>
      <div className={`mt-4 space-y-2 border-t pt-4 text-sm ${isLight ? 'border-slate-100 text-slate-700' : 'border-white/10 text-white/70'}`}>
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-medium">Q{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>IVA (8%)</span>
          <span className="font-medium">Q{impuesto.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span className={isLight ? 'text-slate-900' : 'text-white'}>Total</span>
          <span className={isLight ? 'text-teal-800' : 'text-[var(--accent)]'}>Q{total.toFixed(2)}</span>
        </div>
      </div>
      {submitMsg && (
        <p
          className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            submitMsg.startsWith('¡') ? (isLight ? 'bg-emerald-50 text-emerald-900' : 'text-[var(--accent)]') : isLight ? 'bg-red-50 text-red-800' : 'text-[var(--secondary)]'
          }`}
        >
          {submitMsg.startsWith('¡') && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {submitMsg}
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleConfirm()}
        disabled={
          mutation.isPending ||
          lines.length === 0 ||
          (checkoutMode === 'cliente' && (clienteMeQ.isLoading || clienteMeQ.isError || clienteMeQ.data?.id == null))
        }
        className={`mt-4 w-full rounded-xl py-3 text-sm font-bold shadow transition disabled:opacity-40 ${
          isLight ? 'bg-[var(--secondary)] text-white hover:brightness-105' : 'bg-[var(--secondary)] text-white hover:brightness-110'
        }`}
      >
        {mutation.isPending ? 'Procesando…' : checkoutMode === 'cliente' ? 'Completar compra' : 'Completar venta'}
      </button>
    </>
  )
}

function CartOverlay({
  open,
  onClose,
  checkoutMode,
  clientesQ,
  clienteMeQ,
  lines,
  onRemove,
  setLineQty,
  subtotal,
  impuesto,
  total,
  onClear,
  theme = 'dark',
}: {
  open: boolean
  onClose: () => void
  checkoutMode: 'staff' | 'cliente'
  clientesQ?: PosSaleShellProps['clientesQ']
  clienteMeQ: ReturnType<typeof useClienteMeQuery>
  lines: { productId: string; name: string; unitPrice: number; qty: number; imagen_url?: string | null }[]
  onRemove: (id: string) => void
  setLineQty: (id: string, qty: number) => void
  subtotal: number
  impuesto: number
  total: number
  onClear: () => void
  theme?: 'dark' | 'light'
}) {
  if (!open) return null
  const isLight = theme === 'light'
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end p-4 backdrop-blur-sm ${isLight ? 'bg-slate-900/35' : 'bg-black/60'}`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`flex h-full max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[var(--panel)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
          <h2 className={`font-[family-name:var(--font-heading)] text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {isLight ? 'Pedido' : 'Lista de compra'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 ${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <PedidoPanel
            variant={isLight ? 'light' : 'dark'}
            checkoutMode={checkoutMode}
            clientesQ={clientesQ}
            clienteMeQ={clienteMeQ}
            lines={lines}
            onRemove={onRemove}
            setLineQty={setLineQty}
            subtotal={subtotal}
            impuesto={impuesto}
            total={total}
            onClear={onClear}
          />
        </div>
      </div>
    </div>
  )
}
