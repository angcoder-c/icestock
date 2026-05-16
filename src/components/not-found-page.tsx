import { Link } from '@tanstack/react-router'
import { ArrowLeft, FileQuestion, Home } from 'lucide-react'

import { SiteLogo } from '#/components/site-logo'

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--bg)] px-4 py-16 font-[family-name:var(--font-body)] text-[var(--text)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in srgb, var(--accent) 35%, transparent), transparent)',
        }}
      />
      <div className="relative z-10 w-full max-w-md text-center">
        <Link
          to="/"
          className="mx-auto mb-8 inline-flex items-center gap-2 rounded-xl outline-none ring-[var(--accent)]/30 focus-visible:ring-2"
        >
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)] ring-1 ring-[var(--accent)]/25">
            <SiteLogo decorative className="h-6 w-6 object-contain" />
          </div>
          <span className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">IceStock</span>
        </Link>

        <p className="font-[family-name:var(--font-heading)] text-8xl font-bold leading-none text-[var(--accent)]/90">404</p>
        <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[var(--panel)]">
          <FileQuestion className="h-7 w-7 text-white/50" aria-hidden />
        </div>
        <h1 className="mt-5 font-[family-name:var(--font-heading)] text-2xl font-bold">Página no encontrada</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          La ruta que buscas no existe o fue movida. Revisa la URL o vuelve al inicio.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--bg)] transition hover:brightness-110"
          >
            <Home className="h-4 w-4" />
            Ir al inicio
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  )
}
