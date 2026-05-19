import { type FormEvent, useState } from 'react'
import { Loader2, UserMinus, UserPlus } from 'lucide-react'

import { can } from '#/lib/api/permissions'
import { assignableStaffRoles, resolveStaffRolForCreate } from '#/lib/api/permissions'
import { ROLE_LABELS } from '#/lib/auth/role-routes'
import type { SessionUser } from '#/lib/api/session'
import {
  staffBtnPrimaryClass,
  staffLabelClass,
  staffPageSubtitleClass,
  staffPageTitleClass,
  staffTableHeadClass,
  staffTableWrapClass,
} from '#/components/staff-portal-shell'
import {
  useCreateEmpleadoMutation,
  useDeactivateEmpleadoMutation,
  useEmpleadosQuery,
} from '#/hooks/use-icestock-api'

type Props = {
  session: SessionUser
  enabled: boolean
  variant?: 'light' | 'dark'
}

export function StaffTeamPanel({ session, enabled, variant = 'light' }: Props) {
  const isLight = variant === 'light'
  const q = useEmpleadosQuery(enabled && can(session, 'staff:read'))
  const createMut = useCreateEmpleadoMutation()
  const deactivateMut = useDeactivateEmpleadoMutation()
  const canInvite = can(session, 'staff:invite')
  const canDeactivate = can(session, 'staff:write')

  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const assignable = assignableStaffRoles(session)

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    const resolved = resolveStaffRolForCreate(session, rol || undefined)
    if (!resolved) {
      setErr('Rol no permitido')
      return
    }
    try {
      await createMut.mutateAsync({
        nombre: nombre.trim(),
        email: email.trim(),
        password,
        rol: resolved,
      })
      setShowForm(false)
      setNombre('')
      setEmail('')
      setPassword('')
      setRol('')
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Error al crear')
    }
  }

  const panel = isLight ? 'rounded-2xl border border-slate-200 bg-white shadow-sm' : staffTableWrapClass
  const pageTitle = isLight
    ? 'font-[family-name:var(--font-heading)] text-2xl font-bold text-violet-900'
    : staffPageTitleClass
  const pageMuted = isLight ? 'text-sm text-slate-600' : staffPageSubtitleClass

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={pageTitle}>Personal</h1>
          <p className={pageMuted}>
            Cuentas de personal con acceso al sistema
            {canInvite
              ? ` (invitación permitida: ${assignable.join(', ')})`
              : canDeactivate
                ? ' (consulta y baja de cuentas; sin invitación de usuarios nuevos)'
                : ' (solo consulta)'}
            .
          </p>
        </div>
        {canInvite && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={isLight ? 'inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800' : staffBtnPrimaryClass}
          >
            <UserPlus className="h-4 w-4" />
            Invitar usuario
          </button>
        )}
      </div>

      {showForm && canInvite && (
        <form onSubmit={(e) => void onCreate(e)} className={`${panel} space-y-4 p-6`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Correo</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Contraseña</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Rol</span>
              <select value={rol} onChange={(e) => setRol(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
                <option value="">Cajero (predeterminado)</option>
                {assignable.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-xl bg-teal-800 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {createMut.isPending ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>
      )}

      <div className={`overflow-hidden ${panel}`}>
        {q.isLoading ? (
          <p className="flex items-center gap-2 p-6 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className={isLight ? 'bg-slate-50 text-xs uppercase text-slate-500' : staffTableHeadClass}>
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                {canDeactivate && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((e) => (
                <tr key={e.user_id} className={isLight ? 'border-t border-slate-100' : 'border-t border-white/10'}>
                  <td className="px-4 py-3 font-medium">{e.nombre}</td>
                  <td className="px-4 py-3">{e.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        isLight
                          ? 'rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800'
                          : 'rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]'
                      }
                    >
                      {e.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">{e.activo ? 'Activo' : 'Inactivo'}</td>
                  {canDeactivate && (
                    <td className="px-4 py-3 text-right">
                      {e.activo && (
                        <button
                          type="button"
                          title="Desactivar"
                          disabled={deactivateMut.isPending}
                          onClick={() => void deactivateMut.mutateAsync(e.user_id)}
                          className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
