import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { useIcestock } from '#/context/icestock-context'
import type { AppRol } from '#/lib/api/permissions'
import { normalizeAppRol } from '#/lib/api/permissions'
import { homePathForRol, staffLoginRedirect } from '#/lib/auth/role-routes'

type Options = {
  /** Ruta a usar en `redirect` del login de personal. */
  loginPath?: string
}

/**
 * Redirige si no hay sesión o el rol no está en `allowedRoles`.
 * Devuelve `ready` cuando la vista puede renderizarse.
 */
export function useRequireRoles(allowedRoles: readonly AppRol[], options?: Options) {
  const navigate = useNavigate()
  const { session, sessionPending } = useIcestock()
  const rol = normalizeAppRol(session?.user)
  const allowed = rol != null && allowedRoles.includes(rol)
  const loginRedirect = options?.loginPath ?? (typeof window !== 'undefined' ? staffLoginRedirect(window.location.pathname) : '/empleado')

  useEffect(() => {
    if (sessionPending) return
    if (!session) {
      void navigate({ to: '/login/empleado', search: { redirect: loginRedirect }, replace: true })
      return
    }
    if (!allowed) {
      void navigate({ to: homePathForRol(rol ?? 'cliente'), replace: true })
    }
  }, [session, sessionPending, allowed, rol, navigate, loginRedirect])

  return {
    session: allowed ? session : null,
    rol,
    sessionPending,
    ready: !sessionPending && !!session && allowed,
  }
}
