import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Home, IceCream2, Loader2, Search } from 'lucide-react'

import { ProductPosCard } from '#/components/pos-sale-view'
import { useIcestock } from '#/context/icestock-context'
import { useCategoriasQuery, useProductosQuery } from '#/hooks/use-icestock-api'

export function HomePage() {
  const navigate = useNavigate()
  const { session, sessionPending } = useIcestock()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (sessionPending || !session) return
    if (session.user.rol === 'admin') {
      void navigate({ to: '/portal', replace: true })
    } else if (session.user.rol === 'cajero') {
      void navigate({ to: '/empleado', replace: true })
    } else {
      void navigate({ to: '/tienda', replace: true })
    }
  }, [session, sessionPending, navigate])

  const showCatalog = !sessionPending && !session
  const categoriasQ = useCategoriasQuery(showCatalog)
  const productosQ = useProductosQuery(debouncedSearch, categoriaId, showCatalog, false)
  const gridProducts = productosQ.data ?? []

  const spinner = useMemo(
    () => (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--panel)] px-6 py-4 font-[family-name:var(--font-body)] shadow-lg">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
        <span className="text-[var(--text)]/90">Cargando…</span>
      </div>
    ),
    [],
  )

  if (sessionPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--text)]">
        {spinner}
      </div>
    )
  }

  if (session) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--text)]">
        {spinner}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-[family-name:var(--font-body)]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--bg)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2 rounded-xl outline-none ring-[var(--accent)]/40 focus-visible:ring-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--accent)]">
              <IceCream2 className="h-5 w-5" />
            </div>
            <span className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight text-white">IceStock</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/"
              className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-[var(--accent)]"
              aria-label="Inicio"
            >
              <Home className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              search={{ redirect: '/tienda' }}
              className="ml-2 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/50 bg-[var(--accent)]/15 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/25"
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <section className="mb-8 rounded-3xl border border-white/10 bg-[var(--panel)]/80 p-6 shadow-xl sm:p-8">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white sm:text-3xl">Catálogo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
            Consulta precios y disponibilidad. Para comprar necesitas una cuenta: usa <span className="text-[var(--accent)]">Iniciar sesión</span> arriba.
          </p>
        </section>

        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos…"
            className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-3 text-sm text-[var(--text)] placeholder:text-white/40 outline-none ring-[var(--accent)]/25 focus:border-[var(--accent)]/50 focus:ring-2"
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoriaId(null)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              categoriaId == null
                ? 'bg-[var(--primary)] text-[var(--accent)] shadow ring-1 ring-[var(--accent)]/30'
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
              <ProductPosCard key={p.id} product={p} catalogLoginRedirect="/tienda" />
            ))}
          </div>
        )}

        {!productosQ.isLoading && gridProducts.length === 0 && (
          <p className="py-12 text-center text-sm text-white/50">No hay productos que coincidan con tu búsqueda.</p>
        )}

        <footer className="mt-16 border-t border-white/10 pt-8 text-center text-xs text-white/45">
          <p>
            ¿Personal de la tienda?{' '}
            <Link to="/login/empleado" search={{ redirect: '/empleado' }} className="text-[var(--accent)] underline-offset-2 hover:underline">
              Acceso caja
            </Link>
            {' · '}
            <Link to="/login/empleado" search={{ redirect: '/portal' }} className="text-[var(--secondary)] underline-offset-2 hover:underline">
              Administración
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
