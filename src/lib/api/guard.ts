import { json } from '#/lib/api/http'
import { can, forbiddenMessage, type Permission } from '#/lib/api/permissions'
import { getSessionUser, type SessionUser } from '#/lib/api/session'

export type AuthGate = { user: SessionUser } | { response: Response }

export async function requireAuth(request: Request): Promise<AuthGate> {
  const user = await getSessionUser(request)
  if (!user) return { response: json({ error: 'No autenticado' }, 401) }
  return { user }
}

export function requirePermission(user: SessionUser, permission: Permission): AuthGate {
  if (!can(user, permission)) {
    return { response: json({ error: forbiddenMessage(permission) }, 403) }
  }
  return { user }
}

export async function requireAuthAndPermission(
  request: Request,
  permission: Permission,
): Promise<AuthGate> {
  const auth = await requireAuth(request)
  if ('response' in auth) return auth
  return requirePermission(auth.user, permission)
}
