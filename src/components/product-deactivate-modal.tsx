import { Loader2, X } from 'lucide-react'

export type ProductDeactivateTarget = {
  id: number
  nombre: string
}

type ProductDeactivateModalProps = {
  product: ProductDeactivateTarget | null
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
  error?: string | null
  variant?: 'light' | 'dark'
}

export function productInventoryRowClass(activo: boolean, variant: 'light' | 'dark' = 'dark'): string {
  const base = variant === 'light' ? 'border-b border-slate-50 last:border-0' : 'border-b border-white/10'
  if (activo) return base
  return variant === 'light'
    ? `${base} bg-slate-100/90 opacity-80`
    : `${base} bg-[var(--secondary)]/8 opacity-75`
}

export function ProductInactiveBadge({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  const isLight = variant === 'light'
  return (
    <span
      className={
        isLight
          ? 'rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600'
          : 'rounded-full bg-[var(--secondary)]/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--secondary)]'
      }
    >
      Inactivo
    </span>
  )
}

export function ProductDeactivateModal({
  product,
  onClose,
  onConfirm,
  isPending,
  error,
  variant = 'dark',
}: ProductDeactivateModalProps) {
  if (!product) return null

  const isLight = variant === 'light'
  const panel = isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[var(--panel)]'
  const title = isLight ? 'text-slate-900' : 'text-[var(--text)]'
  const body = isLight ? 'text-slate-600' : 'text-[var(--text)]/75'
  const cancelBtn = isLight
    ? 'text-slate-600 hover:bg-slate-100'
    : 'text-[var(--text)]/75 hover:bg-white/10'
  const confirmBtn = isLight
    ? 'bg-red-600 text-white hover:bg-red-700'
    : 'bg-[var(--secondary)] text-white hover:brightness-110'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={() => !isPending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-product-title"
        className={`w-full max-w-md rounded-2xl border p-6 shadow-xl ${panel}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !isPending) onClose()
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="deactivate-product-title" className={`font-[family-name:var(--font-heading)] text-lg font-bold ${title}`}>
            ¿Desactivar producto?
          </h2>
          <button
            type="button"
            className={`rounded-full p-2 ${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-[var(--text)]/45 hover:bg-white/10'}`}
            onClick={onClose}
            disabled={isPending}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className={`mt-3 text-sm leading-relaxed ${body}`}>
          <span className="font-semibold">«{product.nombre}»</span> dejará de mostrarse en la tienda y en el POS. Podrás reactivarlo
          desde la edición del producto.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={`rounded-xl px-4 py-2 text-sm font-semibold ${cancelBtn}`} onClick={onClose} disabled={isPending}>
            Cancelar
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 ${confirmBtn}`}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Desactivar
          </button>
        </div>
      </div>
    </div>
  )
}
