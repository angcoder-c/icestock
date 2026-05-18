import { auth } from '#/lib/auth'

export type SessionUser = {
  id: string
  name: string
  email: string
  rol?: string
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: request.headers })
  const u = session?.user
  if (!u) return null
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    rol: (u as { rol?: string }).rol,
  }
}
