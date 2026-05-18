import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withRequestDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/proveedores')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'catalog:read')
        if ('response' in gate) return gate.response
        return withRequestDbRole(request, async () => {
          const rows = await db.getProveedores(500)
          return json(rows)
        })
      },
      POST: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'catalog:write')
        if ('response' in gate) return gate.response
        let body: { nombre?: string; telefono?: string; email?: string; direccion?: string }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        if (!body.nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400)
        return withRequestDbRole(request, async () => {
          const row = await db.createProveedor(
            body.nombre.trim(),
            body.telefono,
            body.email,
            body.direccion,
          )
          return json({ id: row.id, nombre: row.nombre }, 201)
        })
      },
    },
  },
})
