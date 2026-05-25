import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { useIcestock } from '#/context/icestock-context'
import { useCategoriasQuery, useProductosQuery } from '#/hooks/use-icestock-api'
import { PosSaleShell } from '#/components/pos-sale-view'

export function TiendaPage() {
  const navigate = useNavigate()
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
      void navigate({ to: '/login/cliente', search: { redirect: '/tienda' } })
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

  const ok = session?.user?.rol === 'cliente'
  const categoriasQ = useCategoriasQuery(ok)
  const productosQ = useProductosQuery(debouncedSearch, categoriaId, ok)

  const roleHint = useMemo(() => 'Cliente', [])

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

  return (
    <PosSaleShell
      session={session}
      signOut={signOut}
      search={search}
      setSearch={setSearch}
      categoriaId={categoriaId}
      setCategoriaId={setCategoriaId}
      categoriasQ={categoriasQ}
      productosQ={productosQ}
      homeLink="/"
      roleHint={roleHint}
      checkoutMode="cliente"
    />
  )
}
