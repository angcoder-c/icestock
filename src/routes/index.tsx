import { createFileRoute } from '@tanstack/react-router'
import { type FormEvent, useEffect, useState } from 'react'
import { BadgeCheck, CheckCircle2, Loader2, LogOut, ShieldUser, Store, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/')({ component: Home })

type AccessMode = 'empleado' | 'cliente'
type AuthMode = 'login' | 'signup'

function Home() {
  const [mode, setMode] = useState<AccessMode>('empleado')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (session?.user?.rol === 'cliente') {
      setMode('cliente')
    }
  }, [session])

  const activeMode = session?.user?.rol === 'cliente' ? 'cliente' : 'empleado'

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setSignInError(null)
    setStatusMessage(null)

    try {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
      })

      if (error) {
        throw new Error(error.message || 'No se pudo iniciar sesión')
      }

      setStatusMessage(mode === 'empleado' ? 'Sesión de empleado activa.' : 'Sesión de cliente activa.')
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'No se pudo iniciar sesión')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setSignInError(null)
    setStatusMessage(null)

    if (password !== confirmPassword) {
      setSignInError('Las contraseñas no coinciden')
      setIsSubmitting(false)
      return
    }

    if (password.length < 8) {
      setSignInError('La contraseña debe tener al menos 8 caracteres')
      setIsSubmitting(false)
      return
    }

    try {
      const { error, data } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
        data: {
          rol: mode,
        },
      })

      if (error) {
        throw new Error(error.message || 'No se pudo crear la cuenta')
      }

      setStatusMessage(`Cuenta creada como ${mode}. ¡Bienvenido!`)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setName('')
      setTimeout(() => {
        setAuthMode('login')
      }, 2000)
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'No se pudo crear la cuenta')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    setStatusMessage(null)
    setSignInError(null)
    await authClient.signOut()
  }

  if (isPending) {
    return <ShellLoader />
  }

  if (session) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
          <section className="grid w-full gap-6 rounded-4xl border border-white/60 bg-white/75 p-6 shadow-[0_24px_80px_rgba(58,38,20,0.15)] backdrop-blur xl:grid-cols-[1.1fr_0.9fr] xl:p-8">
            <div className="space-y-6 rounded-3xl bg-[#1f1b16] p-6 text-white shadow-lg shadow-black/10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/80">
                <BadgeCheck className="h-4 w-4" />
                Better Auth activo
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sesión iniciada</h1>
                <p className="max-w-xl text-sm leading-6 text-white/72 sm:text-base">
                  {activeMode === 'empleado'
                    ? 'Tienes acceso al panel de ventas, inventario y gestión del sistema.'
                    : 'Tu cuenta quedó autenticada para ver compras, historial y datos de perfil.'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Usuario" value={session.user.name || session.user.email} />
                <StatCard label="Correo" value={session.user.email} />
                <StatCard label="Rol" value={session.user.rol || 'sin rol'} />
                <StatCard label="Modo" value={activeMode === 'empleado' ? 'Empleado' : 'Cliente'} />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1f1b16] transition hover:bg-white/90"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/72">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Cookie de sesión activa
                </span>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-[#eadcc8] bg-[#fcf8f2] p-6">
              <RoleChipRow mode={activeMode} onSelect={setMode} />
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-[#1f2937]">Acceso rápido</h2>
                <p className="text-sm leading-6 text-[#5b6472]">
                  Cambia el modo cuando necesites entrar como otro tipo de usuario y vuelve a autenticarse.
                </p>
              </div>
              <div className="grid gap-3">
                <ActionPill icon={Store} title="Empleado" text="Venta, inventario y operaciones" active={activeMode === 'empleado'} />
                <ActionPill icon={UserRound} title="Cliente" text="Compras, perfil y seguimiento" active={activeMode === 'cliente'} />
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden rounded-4xl border border-white/60 bg-[#1f1b16] p-6 text-white shadow-[0_30px_90px_rgba(58,38,20,0.18)] sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(190,95,34,0.3),transparent_35%)]" />
          <div className="relative space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/80">
                <ShieldUser className="h-4 w-4" />
                Better Auth + TanStack Start
              </div>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Un solo acceso para empleados y clientes.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-white/74 sm:text-base">
                El mismo formulario inicia sesión con Better Auth y adapta el acceso según el modo que elijas.
                Empleado para operación interna, cliente para su experiencia de compra.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FeatureCard title="Empleado" text="Ventas, catálogo, inventario y operaciones de caja." icon={Store} />
              <FeatureCard title="Cliente" text="Compras, historial y perfil personal en una sola vista." icon={UserRound} />
            </div>

            <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/6 p-4 sm:grid-cols-3">
              <MiniStat label="Sesión" value="Cookie HTTP-only" />
              <MiniStat label="Backend" value="Better Auth" />
              <MiniStat label="DB" value="PostgreSQL" />
            </div>
          </div>
        </section>

        <section className="rounded-4xl border border-white/60 bg-white/82 p-4 shadow-[0_24px_80px_rgba(58,38,20,0.15)] backdrop-blur sm:p-6">
          <div className="rounded-3xl border border-[#eadcc8] bg-[#fcf8f2] p-5 sm:p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b5e3c]">Acceso</p>
              <h2 className="text-2xl font-semibold text-[#1f2937]">
                {authMode === 'login' ? 'Inicia sesión' : 'Crea una cuenta'}
              </h2>
              <p className="text-sm leading-6 text-[#5b6472]">
                {authMode === 'login'
                  ? 'Selecciona el perfil correcto antes de entrar. El mismo login sirve para ambos tipos de usuario.'
                  : 'Registra una cuenta nueva como empleado o cliente.'}
              </p>
            </div>

            {/* Auth Mode Tabs */}
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-full border border-[#eadcc8] bg-white p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login')
                  setSignInError(null)
                  setStatusMessage(null)
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  authMode === 'login' ? 'bg-[#1f1b16] text-white shadow-md' : 'text-[#5b6472] hover:bg-[#f6f0e6]'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup')
                  setSignInError(null)
                  setStatusMessage(null)
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  authMode === 'signup' ? 'bg-[#1f1b16] text-white shadow-md' : 'text-[#5b6472] hover:bg-[#f6f0e6]'
                }`}
              >
                Registrarse
              </button>
            </div>

            <div className="mt-5">
              <RoleChipRow mode={mode} onSelect={setMode} />
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={authMode === 'login' ? handleLoginSubmit : handleSignupSubmit}
            >
              {authMode === 'signup' && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-[#344054]">Nombre completo</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    type="text"
                    autoComplete="name"
                    placeholder={mode === 'empleado' ? 'Juan Pérez' : 'María García'}
                    className="w-full rounded-2xl border border-[#d9c9b3] bg-white px-4 py-3 text-[#1f2937] outline-none transition focus:border-[#be5f22] focus:ring-4 focus:ring-[#be5f22]/15"
                    required={authMode === 'signup'}
                  />
                </label>
              )}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#344054]">Correo electrónico</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete={authMode === 'login' ? 'email' : 'email'}
                  placeholder={mode === 'empleado' ? 'admin@heladeria.com' : 'cliente@correo.com'}
                  className="w-full rounded-2xl border border-[#d9c9b3] bg-white px-4 py-3 text-[#1f2937] outline-none transition focus:border-[#be5f22] focus:ring-4 focus:ring-[#be5f22]/15"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#344054]">Contraseña</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-[#d9c9b3] bg-white px-4 py-3 text-[#1f2937] outline-none transition focus:border-[#be5f22] focus:ring-4 focus:ring-[#be5f22]/15"
                  required
                />
              </label>

              {authMode === 'signup' && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-[#344054]">Confirmar contraseña</span>
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-[#d9c9b3] bg-white px-4 py-3 text-[#1f2937] outline-none transition focus:border-[#be5f22] focus:ring-4 focus:ring-[#be5f22]/15"
                    required={authMode === 'signup'}
                  />
                </label>
              )}

              {signInError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {signInError}
                </div>
              )}

              {statusMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {statusMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1f1b16] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isSubmitting
                  ? authMode === 'login'
                    ? 'Ingresando...'
                    : 'Registrando...'
                  : authMode === 'login'
                    ? `Ingresar como ${mode}`
                    : `Registrarse como ${mode}`}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-dashed border-[#d9c9b3] bg-white px-4 py-4 text-sm text-[#5b6472]">
              <p className="font-medium text-[#344054]">
                {authMode === 'login' ? 'Credenciales de prueba' : 'Información de registro'}
              </p>
              <p className="mt-1">
                Empleado: <span className="font-semibold text-[#1f2937]">admin@heladeria.com</span>
              </p>
              <p>
                Contraseña: <span className="font-semibold text-[#1f2937]">secret123</span>
              </p>
              <p className="mt-3 text-xs">
                {authMode === 'signup'
                  ? 'La contraseña debe tener al menos 8 caracteres. El rol se asignará según el perfil que selecciones.'
                  : 'O registra un usuario nuevo usando el formulario de registro.'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function ShellLoader() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/80 px-4 py-3 text-sm text-[#344054] shadow-lg backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin text-[#be5f22]" />
        Verificando la sesión...
      </div>
    </main>
  )
}

function RoleChipRow({ mode, onSelect }: { mode: AccessMode; onSelect: (mode: AccessMode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-full border border-[#eadcc8] bg-white p-1">
      <button
        type="button"
        onClick={() => onSelect('empleado')}
        className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
          mode === 'empleado' ? 'bg-[#1f1b16] text-white shadow-md' : 'text-[#5b6472] hover:bg-[#f6f0e6]'
        }`}
      >
        <Store className="h-4 w-4" />
        Empleado
      </button>
      <button
        type="button"
        onClick={() => onSelect('cliente')}
        className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
          mode === 'cliente' ? 'bg-[#0f766e] text-white shadow-md' : 'text-[#5b6472] hover:bg-[#f6f0e6]'
        }`}
      >
        <UserRound className="h-4 w-4" />
        Cliente
      </button>
    </div>
  )
}

function FeatureCard({ title, text, icon: Icon }: { title: string; text: string; icon: LucideIcon }) {
  return (
    <article className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white/10 p-2 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-sm leading-6 text-white/72">{text}</p>
        </div>
      </div>
    </article>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/54">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/54">{label}</p>
      <p className="mt-1 wrap-break-word text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function ActionPill({
  icon: Icon,
  title,
  text,
  active,
}: {
  icon: LucideIcon
  title: string
  text: string
  active: boolean
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
        active ? 'border-[#be5f22]/25 bg-[#be5f22]/8' : 'border-[#eadcc8] bg-white'
      }`}
    >
      <div className={`rounded-2xl p-2 ${active ? 'bg-[#be5f22] text-white' : 'bg-[#f3e6d7] text-[#8b5e3c]'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-semibold text-[#1f2937]">{title}</p>
        <p className="text-sm leading-6 text-[#5b6472]">{text}</p>
      </div>
    </div>
  )
}
