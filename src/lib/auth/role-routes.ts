import type { AppRol } from '#/lib/api/permissions'
import { isAppRol } from '#/lib/api/permissions'

export const ROLE_LABELS: Record<AppRol, string> = {
  cliente: 'Cliente',
  cajero: 'Cajero',
  analista: 'Analista',
  admin: 'Administrador',
  superadmin: 'Superadmin',
}

/** Ruta principal tras iniciar sesión. */
export function homePathForRol(rol: string | undefined | null): string {
  if (rol === 'cajero') return '/empleado'
  if (rol === 'analista') return '/analista'
  if (rol === 'admin') return '/portal'
  if (rol === 'superadmin') return '/superadmin'
  return '/tienda'
}

/** Prefijos de ruta permitidos por rol (primer match gana en guards de modal). */
export const ROUTE_PREFIX_BY_ROL: Record<AppRol, readonly string[]> = {
  cliente: ['/tienda', '/login/cliente'],
  cajero: ['/empleado', '/login/empleado'],
  analista: ['/analista', '/login/empleado'],
  admin: ['/portal', '/login/empleado'],
  superadmin: ['/superadmin', '/login/empleado'],
}

export function canAccessPath(rol: string | undefined | null, pathname: string): boolean {
  if (!isAppRol(rol)) return pathname === '/' || pathname.startsWith('/login')
  const prefixes = ROUTE_PREFIX_BY_ROL[rol]
  if (pathname === '/' || pathname.startsWith('/login')) return true
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function staffLoginRedirect(pathname: string): string {
  if (pathname.startsWith('/analista')) return '/analista'
  if (pathname.startsWith('/superadmin')) return '/superadmin'
  if (pathname.startsWith('/portal')) return '/portal'
  return '/empleado'
}
