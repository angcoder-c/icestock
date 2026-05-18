import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Loader2, Store, UserRound } from 'lucide-react'

import { useIcestock } from '#/context/icestock-context'
import { useSetupStatusQuery } from '#/hooks/use-icestock-api'
import { authClient } from '#/lib/auth-client'
import { homePathForRol } from '#/lib/auth/role-routes'

type AuthMode = 'login' | 'signup'

export function LoginHub({ redirect }: { redirect?: string }) {
  const setupQ = useSetupStatusQuery()

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--text)] font-[family-name:var(--font-body)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-40">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-[var(--primary)] blur-[100px]" />
        <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[var(--accent)] blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <div className="mb-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[var(--panel)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition hover:border-[var(--accent)]/40 hover:text-white"
          >
            ← Inicio
          </Link>
        </div>

        <h1 className="text-center font-[family-name:var(--font-heading)] text-3xl font-bold text-white sm:text-4xl">Acceso al sistema</h1>

        {redirect ? (
          <p className="mt-4 text-center text-xs text-white/40">Al iniciar sesión te llevaremos al área que corresponda a tu cuenta.</p>
        ) : null}

        {setupQ.data?.needsBootstrap ? (
          <div className="mt-8 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-5 py-4 text-center text-sm text-white/80">
            <p>Instalación nueva: crea el primer superadministrador.</p>
            <Link to="/setup" className="mt-2 inline-block font-bold text-violet-300 hover:text-white">
              Ir a configuración inicial →
            </Link>
          </div>
        ) : null}

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Link
            to="/login/cliente"
            search={{ redirect: '/tienda' }}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--panel)] p-8 shadow-xl ring-1 ring-white/5 transition hover:border-[var(--accent)]/40 hover:shadow-[0_0_0_1px_rgba(32,178,170,0.25)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/25">
              <UserRound className="h-6 w-6" />
            </div>
            <h2 className="mt-6 font-[family-name:var(--font-heading)] text-2xl font-bold text-white">Cliente</h2>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)]">
              Entrar o registrarse <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            to="/login/empleado"
            search={{ redirect: '/empleado' }}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--panel)] p-8 shadow-xl ring-1 ring-white/5 transition hover:border-[var(--secondary)]/35 hover:shadow-[0_0_0_1px_rgba(255,107,107,0.2)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--secondary)]/15 text-[var(--secondary)] ring-1 ring-[var(--secondary)]/25">
              <Store className="h-6 w-6" />
            </div>
            <h2 className="mt-6 font-[family-name:var(--font-heading)] text-2xl font-bold text-white">Personal</h2>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--secondary)]">
              Iniciar sesión <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

type Audience = 'cliente' | 'empleado'

export function LoginAudiencePage({ audience, redirect: _redirect }: { audience: Audience; redirect?: string }) {
  const navigate = useNavigate()
  const { session, sessionPending } = useIcestock()

  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; name?: string; confirm?: string }>({})
  const [signInError, setSignInError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!sessionPending && session) {
      void navigate({ to: homePathForRol(session.user.rol), replace: true })
    }
  }, [session, sessionPending, navigate])

  const validateForm = useCallback(() => {
    const e: typeof fieldErrors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Correo no válido.'
    if (password.length < 1) e.password = 'Ingresa tu contraseña.'
    if (authMode === 'signup') {
      if (name.trim().length < 2) e.name = 'Nombre muy corto.'
      if (password.length < 8) e.password = 'Mínimo 8 caracteres.'
      if (password !== confirmPassword) e.confirm = 'Las contraseñas no coinciden.'
    }
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }, [email, password, confirmPassword, name, authMode])

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSignInError(null)
    setStatusMessage(null)
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const { error } = await authClient.signIn.email({ email: email.trim(), password })
      if (error) throw new Error(error.message || 'No se pudo iniciar sesión')
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Error de acceso')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSignInError(null)
    setStatusMessage(null)
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const { error } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
        rol: 'cliente',
      })
      if (error) throw new Error(error.message || 'No se pudo registrar')
      setStatusMessage('Cuenta creada. Inicia sesión con el mismo correo.')
      setAuthMode('login')
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Error al registrar')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sessionPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-[var(--text)]">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--panel)] px-6 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          Comprobando sesión…
        </div>
      </div>
    )
  }

  const isCliente = audience === 'cliente'
  const allowSignup = isCliente
  const accentClass = isCliente ? 'text-[var(--accent)]' : 'text-[var(--secondary)]'
  const ringFocus = isCliente ? 'focus:ring-[var(--accent)]/35' : 'focus:ring-[var(--secondary)]/30'
  const btnClass = isCliente
    ? 'rounded-2xl bg-[var(--accent)] py-3.5 text-sm font-bold text-[var(--bg)] shadow-lg shadow-[var(--accent)]/20'
    : 'rounded-2xl bg-[var(--secondary)] py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--secondary)]/15'

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] px-4 pb-12 pt-8 text-[var(--text)] font-[family-name:var(--font-body)]">
      <div className="pointer-events-none fixed inset-0 opacity-35">
        <div className={`absolute left-1/4 top-24 h-64 w-64 rounded-full blur-[100px] ${isCliente ? 'bg-[var(--accent)]' : 'bg-[var(--secondary)]'}`} />
        <div className="absolute bottom-20 right-1/4 h-72 w-72 rounded-full bg-[var(--primary)] blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto mb-6 flex w-full max-w-5xl flex-wrap items-center justify-between gap-4">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[var(--panel)] px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white"
        >
          ← Volver a elegir perfil
        </Link>
        <Link to="/" className="text-sm font-medium text-white/45 hover:text-[var(--accent)]">
          Inicio
        </Link>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center">
        <div className="relative mx-auto w-full max-w-md px-4">
          <div className="rounded-3xl border border-white/10 bg-[var(--panel)] p-8 shadow-2xl ring-1 ring-white/5">
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${accentClass}`}>{isCliente ? 'Tienda' : 'Caja'}</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold text-white sm:text-3xl">
              {isCliente ? 'Cliente' : 'Personal de caja'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              {isCliente
                ? 'Inicia sesión o regístrate para comprar en la tienda.'
                : 'Inicia sesión con la cuenta que te asignó un administrador. El personal no se registra por su cuenta.'}
            </p>
            {!allowSignup ? (
              <p className="mt-3 text-xs text-white/40">
                ¿Primera instalación?{' '}
                <Link to="/setup" className="text-violet-300 hover:text-white">
                  Configuración inicial
                </Link>
              </p>
            ) : null}
            {allowSignup ? (
              <div className="mt-6 mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/25 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login')
                    setSignInError(null)
                  }}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                    authMode === 'login' ? 'bg-white/12 text-white shadow-sm' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup')
                    setSignInError(null)
                  }}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                    authMode === 'signup' ? 'bg-white/12 text-white shadow-sm' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  Registro
                </button>
              </div>
            ) : (
              <div className="mt-6 mb-2" />
            )}

            <form
              className="space-y-4"
              onSubmit={allowSignup && authMode === 'signup' ? handleSignupSubmit : handleLoginSubmit}
            >
            {allowSignup && authMode === 'signup' && (
              <label className="block text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Nombre</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`mt-1.5 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-white/30 focus:border-[var(--accent)]/50 ${ringFocus} focus:ring-2`}
                  placeholder="Tu nombre"
                />
                {fieldErrors.name && <span className="mt-1 block text-xs text-[var(--secondary)]">{fieldErrors.name}</span>}
              </label>
            )}
            <label className="block text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Correo</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                className={`mt-1.5 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)]/50 ${ringFocus} focus:ring-2`}
                placeholder="correo@ejemplo.com"
              />
              {fieldErrors.email && <span className="mt-1 block text-xs text-[var(--secondary)]">{fieldErrors.email}</span>}
            </label>
            <label className="block text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Contraseña</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                className={`mt-1.5 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)]/50 ${ringFocus} focus:ring-2`}
              />
              {fieldErrors.password && <span className="mt-1 block text-xs text-[var(--secondary)]">{fieldErrors.password}</span>}
            </label>
            {allowSignup && authMode === 'signup' && (
              <label className="block text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Confirmar contraseña</span>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  className={`mt-1.5 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)]/50 ${ringFocus} focus:ring-2`}
                />
                {fieldErrors.confirm && <span className="mt-1 block text-xs text-[var(--secondary)]">{fieldErrors.confirm}</span>}
              </label>
            )}
            {signInError && (
              <p className="rounded-2xl border border-[var(--secondary)]/25 bg-[var(--secondary)]/10 px-4 py-3 text-sm text-[var(--secondary)]">
                {signInError}
              </p>
            )}
            {statusMessage && (
              <p className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-4 py-3 text-sm text-[var(--accent)]">{statusMessage}</p>
            )}
            <button type="submit" disabled={isSubmitting} className={`flex w-full items-center justify-center gap-2 ${btnClass} disabled:opacity-50`}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {!allowSignup || authMode === 'login' ? 'Continuar' : 'Crear cuenta'}
            </button>
          </form>
          </div>
        </div>
      </div>
    </div>
  )
}
