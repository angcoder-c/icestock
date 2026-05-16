import { CheckCircle2, X } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export type ClienteCompraSuccess = {
  id: string
  total: string
  fecha: string
}

type ClienteCompraSuccessModalProps = {
  venta: ClienteCompraSuccess | null
  onClose: () => void
}

function formatVentaFecha(fecha: string) {
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return fecha
  return d.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
}

export function ClienteCompraSuccessModal({ venta, onClose }: ClienteCompraSuccessModalProps) {
  if (!venta) return null

  const totalNum = Number(venta.total)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compra-success-title"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--panel)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20">
            <CheckCircle2 className="h-7 w-7 text-[var(--accent)]" aria-hidden />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 id="compra-success-title" className="mt-4 font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--text)]">
          ¡Compra completada!
        </h2>
        <p className="mt-2 text-sm text-white/70">
          Tu pedido quedó registrado correctamente. Gracias por comprar en IceStock.
        </p>

        <dl className="mt-5 space-y-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-white/55">Fecha</dt>
            <dd className="text-right font-medium text-[var(--text)]">{formatVentaFecha(venta.fecha)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-white/55">Total</dt>
            <dd className="font-bold text-[var(--accent)]">
              Q{Number.isFinite(totalNum) ? totalNum.toFixed(2) : venta.total}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-white/55">Referencia</dt>
            <dd className="max-w-[12rem] truncate font-mono text-xs text-white/80" title={venta.id}>
              {venta.id.slice(0, 8)}…
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            to="/tienda/compras"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--bg)] transition hover:brightness-110"
          >
            Ver mis compras
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-white/10"
          >
            Seguir comprando
          </button>
        </div>
      </div>
    </div>
  )
}
