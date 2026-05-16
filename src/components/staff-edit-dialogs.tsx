import { type FormEvent, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'

import {
  useUpdateClienteMutation,
  useUpdateProductoMutation,
  type ClienteStaffDetailApi,
  type ProductoApi,
} from '#/hooks/use-icestock-api'

export type StaffEditTheme = 'light' | 'dark'

const tealBtn = 'rounded-xl bg-teal-800 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-900 disabled:pointer-events-none disabled:opacity-50'
const tealBtnDark =
  'rounded-xl bg-[#004d4f] px-4 py-2 text-sm font-bold text-white transition-colors hover:brightness-110 disabled:pointer-events-none disabled:opacity-50'

export function StaffProductEditDialog({
  theme,
  productId,
  product,
  isLoading,
  isError,
  onClose,
}: {
  theme: StaffEditTheme
  productId: string
  product: ProductoApi | undefined
  isLoading: boolean
  isError: boolean
  onClose: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('')
  const [activo, setActivo] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const updateProd = useUpdateProductoMutation()

  useEffect(() => {
    if (!product) return
    setNombre(product.nombre)
    setPrecio(product.precio)
    setStock(String(product.stock))
    setActivo(product.activo)
    setErr(null)
  }, [product])

  const isLight = theme === 'light'
  const backdrop = isLight ? 'bg-black/50' : 'bg-black/50'
  const panel = isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[var(--panel)]'
  const title = isLight ? 'text-teal-900' : 'text-[var(--text)]'
  const label = isLight ? 'text-slate-500' : 'text-[var(--text)]/55'
  const input = isLight
    ? 'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm'
    : 'mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2'
  const chkLabel = isLight ? 'text-sm text-slate-700' : 'text-sm text-[var(--text)]/85'
  const closeBtn = isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-[var(--text)]/45 hover:bg-white/10'
  const cancelBtn = isLight
    ? 'rounded-xl px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100'
    : 'rounded-xl px-4 py-2 text-sm text-[var(--text)]/75 transition-colors hover:bg-white/10 hover:text-[var(--text)]'

  const showForm = product && !isLoading

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    const p = Number(precio)
    const s = Number(stock)
    if (!nombre.trim()) {
      setErr('Nombre obligatorio')
      return
    }
    if (!Number.isFinite(p) || p <= 0) {
      setErr('Precio inválido')
      return
    }
    if (!Number.isFinite(s) || s < 0) {
      setErr('Stock inválido')
      return
    }
    void updateProd
      .mutateAsync({
        id: productId,
        nombre: nombre.trim(),
        precio: p,
        stock: s,
        activo,
      })
      .then(() => onClose())
      .catch((ex) => setErr(ex instanceof Error ? ex.message : 'Error'))
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${backdrop}`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !updateProd.isPending) onClose()
      }}
    >
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-xl ${panel}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !updateProd.isPending) onClose()
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className={`font-[family-name:var(--font-heading)] text-lg font-bold ${title}`}>Editar producto</h2>
          <button type="button" className={`rounded-full p-2 ${closeBtn}`} onClick={() => !updateProd.isPending && onClose()} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="mt-10 flex justify-center py-6">
            <Loader2 className={`h-8 w-8 animate-spin ${isLight ? 'text-teal-800' : 'text-[var(--accent)]'}`} />
          </div>
        ) : isError || !product ? (
          <p className={`mt-6 text-sm ${isLight ? 'text-red-600' : 'text-red-400'}`}>No se pudo cargar el producto.</p>
        ) : null}

        {showForm ? (
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <label className={`block text-xs font-bold uppercase ${label}`}>
              Nombre
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} />
            </label>
            <label className={`block text-xs font-bold uppercase ${label}`}>
              Precio
              <input value={precio} onChange={(e) => setPrecio(e.target.value)} type="number" step="0.01" className={input} />
            </label>
            <label className={`block text-xs font-bold uppercase ${label}`}>
              Stock
              <input value={stock} onChange={(e) => setStock(e.target.value)} type="number" min={0} className={input} />
            </label>
            <label className={`flex items-center gap-2 ${chkLabel}`}>
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              Activo
            </label>
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={cancelBtn} onClick={() => !updateProd.isPending && onClose()}>
                Cancelar
              </button>
              <button type="submit" disabled={updateProd.isPending} className={isLight ? tealBtn : tealBtnDark}>
                {updateProd.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}

export function StaffClienteEditDialog({
  theme,
  clienteId,
  cliente,
  isLoading,
  isError,
  onClose,
}: {
  theme: StaffEditTheme
  clienteId: string
  cliente: ClienteStaffDetailApi | undefined
  isLoading: boolean
  isError: boolean
  onClose: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const updateCli = useUpdateClienteMutation()

  useEffect(() => {
    if (!cliente) return
    setNombre(cliente.nombre)
    setEmail(cliente.email ?? '')
    setTelefono(cliente.telefono ?? '')
    setErr(null)
  }, [cliente])

  const isLight = theme === 'light'
  const backdrop = 'bg-black/50'
  const panel = isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[var(--panel)]'
  const title = isLight ? 'text-teal-900' : 'text-[var(--text)]'
  const label = isLight ? 'text-slate-500' : 'text-[var(--text)]/55'
  const input = isLight
    ? 'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm'
    : 'mt-1 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text)]/40 outline-none ring-[var(--accent)]/20 focus:ring-2'
  const closeBtn = isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-[var(--text)]/45 hover:bg-white/10'
  const cancelBtn = isLight
    ? 'rounded-xl px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100'
    : 'rounded-xl px-4 py-2 text-sm text-[var(--text)]/75 transition-colors hover:bg-white/10 hover:text-[var(--text)]'

  const showForm = cliente && !isLoading

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!nombre.trim()) {
      setErr('Nombre obligatorio')
      return
    }
    void updateCli
      .mutateAsync({
        id: clienteId,
        nombre: nombre.trim(),
        email: email.trim() || null,
        telefono: telefono.trim() || null,
      })
      .then(() => onClose())
      .catch((ex) => setErr(ex instanceof Error ? ex.message : 'Error'))
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${backdrop}`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !updateCli.isPending) onClose()
      }}
    >
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-xl ${panel}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !updateCli.isPending) onClose()
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className={`font-[family-name:var(--font-heading)] text-lg font-bold ${title}`}>Editar cliente</h2>
          <button type="button" className={`rounded-full p-2 ${closeBtn}`} onClick={() => !updateCli.isPending && onClose()} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="mt-10 flex justify-center py-6">
            <Loader2 className={`h-8 w-8 animate-spin ${isLight ? 'text-teal-800' : 'text-[var(--accent)]'}`} />
          </div>
        ) : isError || !cliente ? (
          <p className={`mt-6 text-sm ${isLight ? 'text-red-600' : 'text-red-400'}`}>No se pudo cargar el cliente.</p>
        ) : null}

        {showForm ? (
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <label className={`block text-xs font-bold uppercase ${label}`}>
              Nombre
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} />
            </label>
            <label className={`block text-xs font-bold uppercase ${label}`}>
              Correo
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            </label>
            <label className={`block text-xs font-bold uppercase ${label}`}>
              Teléfono
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={input} />
            </label>
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={cancelBtn} onClick={() => !updateCli.isPending && onClose()}>
                Cancelar
              </button>
              <button type="submit" disabled={updateCli.isPending} className={isLight ? tealBtn : tealBtnDark}>
                {updateCli.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
