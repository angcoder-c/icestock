import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'
import { isUuid } from '#/lib/is-uuid'

export const Route = createFileRoute('/api/clientes/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'clients:read')
        if ('response' in gate) return gate.response
        const user = gate.user
        const id = params.id
        if (!isUuid(id)) return json({ error: 'ID inválido' }, 400)
        return withSessionDbRole(user, async () => {
          const row = await db.getClienteConStats(id)
          if (!row) return json({ error: 'Cliente no encontrado' }, 404)
          const created = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
          return json({
            id: row.id,
            nombre: row.nombre,
            email: row.email,
            telefono: row.telefono,
            creado_en: created,
            total_compras: row.total_compras,
            monto_total: fmtMoney(row.monto_total),
          })
        })
      },
      PUT: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'clients:write')
        if ('response' in gate) return gate.response
        const user = gate.user
        const id = params.id
        if (!isUuid(id)) return json({ error: 'ID inválido' }, 400)
        let body: { nombre?: string; email?: string; telefono?: string }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        return withSessionDbRole(user, async () => {
          const row = await db.updateCliente(id, body.nombre, body.email, body.telefono)
          if (!row) return json({ error: 'Cliente no encontrado' }, 404)
          return json({ id: row.id, nombre: row.nombre, telefono: row.telefono })
        })
      },
      DELETE: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'clients:write')
        if ('response' in gate) return gate.response
        const user = gate.user
        const id = params.id
        if (!isUuid(id)) return json({ error: 'ID inválido' }, 400)
        return withSessionDbRole(user, async () => {
          const row = await db.deleteCliente(id)
          if (!row) return json({ error: 'Cliente no encontrado' }, 404)
          return json({ mensaje: 'Cliente eliminado correctamente' })
        })
      },
    },
  },
})
