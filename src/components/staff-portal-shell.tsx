import type { ReactNode } from 'react'

/** Botón de navegación lateral — paleta Arctic Precision. */
export function staffNavButton(active: boolean): string {
  return `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
    active
      ? 'bg-[var(--primary)] text-white shadow'
      : 'text-[var(--text)]/75 hover:bg-white/10'
  }`
}

export function staffStatusPill(estado: string): string {
  const e = estado.toLowerCase()
  if (e.includes('complet')) return 'bg-[var(--accent)]/20 text-[var(--accent)]'
  if (e.includes('pend')) return 'bg-amber-500/20 text-amber-200'
  if (e.includes('anul') || e.includes('refund')) return 'bg-[var(--secondary)]/20 text-[var(--secondary)]'
  return 'bg-white/10 text-[var(--text)]/80'
}

export const staffCardClass =
  'rounded-2xl border border-white/10 bg-[var(--panel)] p-4 shadow-lg shadow-black/25'

export const staffTableWrapClass =
  'overflow-hidden rounded-2xl border border-white/10 bg-[var(--panel)] shadow-lg shadow-black/25'

export const staffTableHeadClass =
  'border-b border-white/10 bg-[var(--primary)]/30 text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55'

export const staffPageTitleClass =
  'font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--accent)]'

export const staffPageSubtitleClass = 'text-sm text-[var(--text)]/75'

export const staffLabelClass = 'text-xs font-semibold uppercase tracking-wide text-[var(--text)]/55'

export const staffInputClass =
  'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-white/40 outline-none focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/25'

export const staffBtnPrimaryClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50'

export const staffBtnGhostClass =
  'rounded-xl px-4 py-2 text-sm font-semibold text-[var(--text)]/80 transition hover:bg-white/10'

export const staffIconBtnClass =
  'inline-flex rounded-lg p-2 text-[var(--accent)] transition hover:bg-[var(--accent)]/15'

export const staffIconBtnDangerClass =
  'inline-flex rounded-lg p-2 text-[var(--secondary)] transition hover:bg-[var(--secondary)]/15'

type StaffPortalShellProps = {
  sidebarLogo: ReactNode
  sidebarNav: ReactNode
  sidebarActions?: ReactNode
  sidebarFooter?: ReactNode
  header?: ReactNode
  children: ReactNode
  sidebarClassName?: string
}

/** Layout staff: sidebar acotado a `100dvh`, contenido con scroll independiente. */
export function StaffPortalShell({
  sidebarLogo,
  sidebarNav,
  sidebarActions,
  sidebarFooter,
  header,
  children,
  sidebarClassName = 'w-60',
}: StaffPortalShellProps) {
  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-[var(--bg)] text-[var(--text)] antialiased font-[family-name:var(--font-body)]">
      <aside
        className={`flex h-full max-h-dvh shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[var(--panel)] px-3 py-4 shadow-xl shadow-black/25 ${sidebarClassName}`}
      >
        <div className="shrink-0">{sidebarLogo}</div>
        <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">{sidebarNav}</nav>
        {sidebarActions ? <div className="mt-3 shrink-0">{sidebarActions}</div> : null}
        {sidebarFooter ? (
          <div className="mt-3 shrink-0 space-y-1 border-t border-white/10 pt-4">{sidebarFooter}</div>
        ) : null}
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {header ? (
          <header className="z-20 shrink-0 border-b border-white/10 bg-[var(--bg)]/95 px-6 py-4 backdrop-blur">
            {header}
          </header>
        ) : null}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
      </div>
    </div>
  )
}
