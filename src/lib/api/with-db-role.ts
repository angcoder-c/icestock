import {
  defaultAppRolForAnonymous,
  runWithDbRole,
  runWithoutDbRole,
} from '#/lib/db-role'
import type { SessionUser } from '#/lib/api/session'
import { getSessionUser } from '#/lib/api/session'

export type WithDbRoleOptions = {
  /** Sin sesión: catálogo tienda (`rol_cliente`) en lugar de lectura analítica. */
  publicCatalog?: boolean
}

/**
 * Ejecuta consultas de negocio con `SET LOCAL ROLE` según la sesión.
 * Sin usuario: `rol_cliente` (catálogo) o `rol_analista` (resto de lecturas anónimas).
 */
export async function withSessionDbRole<T>(
  user: SessionUser | null | undefined,
  fn: () => Promise<T>,
  options?: WithDbRoleOptions,
): Promise<T> {
  const appRol = user?.rol ?? defaultAppRolForAnonymous(options)
  return runWithDbRole(appRol, fn)
}

export async function withRequestDbRole<T>(
  request: Request,
  fn: () => Promise<T>,
  options?: WithDbRoleOptions,
): Promise<T> {
  const user = await getSessionUser(request)
  return withSessionDbRole(user, fn, options)
}

/** Tablas Better Auth: conexión como `icestock_app`, sin `SET ROLE`. */
export { runWithoutDbRole }
