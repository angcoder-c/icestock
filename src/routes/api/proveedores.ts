import { createFileRoute } from '@tanstack/react-router'

import { json, isPgFkError } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/proveedores')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        const rows = await db.getProveedores(500)
        return json(rows)
      },
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        let body: { nombre?: string; telefono?: string; email?: string; direccion?: string }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        if (!body.nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400)
        const row = await db.createProveedor(
          body.nombre.trim(),
          body.telefono,
          body.email,
          body.direccion,
        )
        return json({ id: row.id, nombre: row.nombre }, 201)
      },
    },
  },
})
