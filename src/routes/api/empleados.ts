import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

function requireAdmin(request: Request) {
  return getSessionUser(request).then((u) => {
    if (!u) return { response: json({ error: 'No autenticado' }, 401) }
    if (u.rol !== 'admin') return { response: json({ error: 'Se requiere rol admin' }, 403) }
    return { user: u }
  })
}

export const Route = createFileRoute('/api/empleados')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireAdmin(request)
        if ('response' in gate) return gate.response
        const rows = await db.getEmpleados(500)
        return json(
          rows.map((e: { id: number; user_id: string; name: string; email: string; rol: string; activo: boolean; created_at: Date | string }) => ({
            id: e.id,
            user_id: e.user_id,
            nombre: e.name,
            email: e.email,
            rol: e.rol,
            activo: e.activo,
            creado_en: e.created_at instanceof Date ? e.created_at.toISOString() : String(e.created_at),
          })),
        )
      },
      POST: async ({ request }) => {
        const gate = await requireAdmin(request)
        if ('response' in gate) return gate.response
        let body: { nombre?: string; email?: string; password?: string; rol?: string }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        if (!body.nombre?.trim() || !body.email?.trim() || !body.password) {
          return json({ error: 'nombre, email y password son obligatorios' }, 400)
        }
        const rol = body.rol === 'admin' || body.rol === 'cajero' ? body.rol : 'cajero'
        try {
          const r = await db.createUserAccountAndEmpleado({
            nombre: body.nombre.trim(),
            email: body.email.trim(),
            password: body.password,
            rol,
          })
          return json({ user_id: r.user_id, nombre: r.nombre, rol: r.rol }, 201)
        } catch (e) {
          const err = e as { code?: string; message?: string }
          if (err.code === 'DUPLICATE') return json({ error: 'El email ya está registrado' }, 400)
          throw e
        }
      },
    },
  },
})
