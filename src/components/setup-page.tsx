import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Loader2, ShieldCheck, UserPlus } from 'lucide-react'

import { useIcestock } from '#/context/icestock-context'
import { homePathForRol, ROLE_LABELS } from '#/lib/auth/role-routes'
import type { AppRol } from '#/lib/api/permissions'
import { DEMO_PASSWORD_HINT } from '#/lib/setup-demo'
import { useBootstrapSuperadminMutation, useSetupStatusQuery } from '#/hooks/use-icestock-api'

export function SetupPage() {
  const navigate = useNavigate()
  const { session, sessionPending } = useIcestock()
  const statusQ = useSetupStatusQuery()
  const bootstrapMut = useBootstrapSuperadminMutation()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (sessionPending || !session) return
    void navigate({ to: homePathForRol(session.user.rol), replace: true })
  }, [session, sessionPending, navigate])

  const onBootstrap = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (password.length < 8) {
      setErr('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setErr('Las contraseñas no coinciden.')
      return
    }
    try {
      await bootstrapMut.mutateAsync({ nombre: nombre.trim(), email: email.trim(), password })
      setDone(true)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo crear la cuenta')
    }
  }

  if (sessionPending || statusQ.isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          <span className="text-white/70">Comprobando instalación…</span>
        </div>
      </Shell>
    )
  }

  const needsBootstrap = statusQ.data?.needsBootstrap ?? false
  const demos = statusQ.data?.demoAccounts ?? []

  return (
    <Shell>
      <div className="rounded-3xl border border-white/10 bg-[var(--panel)] p-8 shadow-2xl ring-1 ring-white/5">
        <SetupHeader needsBootstrap={needsBootstrap} />

        {needsBootstrap ? (
          done ? (
            <div className="mt-8 space-y-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <p className="text-white/80">Cuenta de superadministrador creada. Inicia sesión con el correo que registraste.</p>
              <Link
                to="/login/empleado"
                className="inline-flex rounded-2xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-500"
              >
                Ir a acceso personal
              </Link>
            </div>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={(e) => void onBootstrap(e)}>
              <p className="text-sm text-white/55">
                Crea la primera cuenta de superadministrador. Después podrás dar de alta al resto del personal desde el
                portal.
              </p>
              <Field label="Nombre completo" value={nombre} onChange={setNombre} />
              <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <Field label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
              <Field label="Confirmar contraseña" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
              {err && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</p>}
              <button
                type="submit"
                disabled={bootstrapMut.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {bootstrapMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Crear superadministrador
              </button>
            </form>
          )
        ) : (
          <div className="mt-8 space-y-6">
            <p className="text-sm leading-relaxed text-white/60">
              El sistema ya tiene un superadministrador. El personal no puede registrarse por su cuenta: un superadmin
              debe crear las cuentas en <strong className="text-white/85">Superadmin → Personal</strong>.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/login/empleado"
                className="rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
              >
                Acceso personal
              </Link>
              <Link
                to="/superadmin"
                search={{ tab: 'personal' }}
                className="rounded-2xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5"
              >
                Panel superadmin
              </Link>
            </div>
          </div>
        )}

        {demos.length > 0 && (
          <DemoAccountsTable demos={demos} passwordHint={statusQ.data?.demoPasswordHint ?? DEMO_PASSWORD_HINT} />
        )}

        <p className="mt-8 text-center text-xs text-white/35">
          <Link to="/" className="hover:text-[var(--accent)]">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-12 text-[var(--text)] font-[family-name:var(--font-body)]">
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-violet-600 blur-[100px]" />
        <div className="absolute right-0 bottom-10 h-72 w-72 rounded-full bg-[var(--accent)] blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-lg">{children}</div>
    </div>
  )
}

function SetupHeader({ needsBootstrap }: { needsBootstrap: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/30">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Configuración</p>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white">
          {needsBootstrap ? 'Primer superadministrador' : 'Sistema configurado'}
        </h1>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
}) {
  return (
    <label className="block text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/25"
      />
    </label>
  )
}

function DemoAccountsTable({
  demos,
  passwordHint,
}: {
  demos: { rol: AppRol; email: string; label: string }[]
  passwordHint: string
}) {
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Cuentas de demostración</p>
      <p className="mt-1 text-xs text-white/50">
        Contraseña para todas: <code className="rounded bg-white/10 px-1.5 py-0.5 text-[var(--accent)]">{passwordHint}</code>
      </p>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-white/40">
            <th className="pb-2 font-semibold">Rol</th>
            <th className="pb-2 font-semibold">Correo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {demos.map((d) => (
            <tr key={d.email}>
              <td className="py-2 pr-2 text-white/75">{ROLE_LABELS[d.rol] ?? d.label}</td>
              <td className="py-2 font-mono text-xs text-white/60">{d.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
