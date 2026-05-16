import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogOut, Receipt, ShoppingBag } from 'lucide-react'

import { SiteLogo } from '#/components/site-logo'
import { useIcestock } from '#/context/icestock-context'
import { useMisComprasQuery } from '#/hooks/use-icestock-api'

function formatVentaFecha(fecha: string) {
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return fecha
  return d.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
}

function estadoLabel(estado: string) {
  if (estado === 'completada') return 'Completada'
  if (estado === 'anulada') return 'Anulada'
  return estado
}

function estadoClass(estado: string) {
  if (estado === 'completada') return 'bg-[var(--accent)]/20 text-[var(--accent)]'
  if (estado === 'anulada') return 'bg-[var(--secondary)]/20 text-[var(--secondary)]'
  return 'bg-white/10 text-white/70'
}

export function ClienteComprasPage() {
  const navigate = useNavigate()
  const { session, sessionPending, signOut } = useIcestock()
  const ok = session?.user?.rol === 'cliente'
  const comprasQ = useMisComprasQuery(ok)

  useEffect(() => {
    if (sessionPending) return
    if (!session) {
      void navigate({ to: '/login/cliente', search: { redirect: '/tienda/compras' } })
      return
    }
    const rol = session.user.rol
    if (rol === 'cajero') {
      void navigate({ to: '/empleado', replace: true })
      return
    }
    if (rol === 'admin') {
      void navigate({ to: '/portal', replace: true })
      return
    }
    if (rol !== 'cliente') {
      void navigate({ to: '/login', replace: true })
    }
  }, [session, sessionPending, navigate])

  if (sessionPending || !session || !ok) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--text)]">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--panel)] px-6 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          Cargando…
        </div>
      </div>
    )
  }

  const compras = comprasQ.data ?? []

  return (
    <div className="min-h-full bg-[var(--bg)] font-[family-name:var(--font-body)] text-[var(--text)] antialiased">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--panel)]/95 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-2 rounded-xl outline-none ring-[var(--accent)]/30 focus-visible:ring-2">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)] ring-1 ring-[var(--accent)]/25">
              <SiteLogo decorative className="h-5 w-5 object-contain" />
            </div>
            <span className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight text-[var(--text)]">IceStock</span>
          </Link>
          <nav className="flex flex-wrap gap-2" aria-label="Tienda">
            <Link
              to="/tienda"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              <ShoppingBag className="h-4 w-4" />
              Tienda
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-bold text-[var(--bg)]">
              <Receipt className="h-4 w-4" />
              Mis compras
            </span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[140px] truncate text-sm text-white/80 sm:inline">{session.user.name}</span>
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

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--text)]">Mis compras</h1>
        <p className="mt-1 text-sm text-white/55">Historial de pedidos asociados a tu cuenta</p>

        {comprasQ.isLoading && (
          <div className="mt-8 flex items-center justify-center gap-2 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
            Cargando compras…
          </div>
        )}

        {comprasQ.isError && (
          <p className="mt-8 rounded-xl border border-[var(--secondary)]/30 bg-[var(--secondary)]/10 px-4 py-3 text-sm text-[var(--secondary)]">
            {comprasQ.error instanceof Error ? comprasQ.error.message : 'No se pudieron cargar tus compras.'}
          </p>
        )}

        {!comprasQ.isLoading && !comprasQ.isError && compras.length === 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[var(--panel)] px-6 py-10 text-center">
            <Receipt className="mx-auto h-10 w-10 text-white/25" />
            <p className="mt-3 font-medium text-white/80">Aún no tienes compras registradas</p>
            <p className="mt-1 text-sm text-white/50">Cuando completes un pedido en la tienda, aparecerá aquí.</p>
            <Link
              to="/tienda"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--bg)] transition hover:brightness-110"
            >
              Ir a la tienda
            </Link>
          </div>
        )}

        {compras.length > 0 && (
          <ul className="mt-6 space-y-3">
            {compras.map((v) => {
              const total = Number(v.total)
              return (
                <li
                  key={v.id}
                  className="rounded-2xl border border-white/10 bg-[var(--panel)] px-4 py-4 shadow-sm transition hover:border-white/15"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{formatVentaFecha(v.fecha)}</p>
                      <p className="mt-0.5 text-xs text-white/50">
                        {v.lineas} {v.lineas === 1 ? 'producto' : 'productos'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--accent)]">
                        Q{Number.isFinite(total) ? total.toFixed(2) : v.total}
                      </p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${estadoClass(v.estado)}`}>
                        {estadoLabel(v.estado)}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
