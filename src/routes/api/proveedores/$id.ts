import { createFileRoute } from '@tanstack/react-router'

import { json, isPgFkError } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withRequestDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'
import { isUuid } from '#/lib/is-uuid'

export const Route = createFileRoute('/api/proveedores/$id')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'catalog:write')
        if ('response' in gate) return gate.response
        const id = params.id
        if (!isUuid(id)) return json({ error: 'ID inválido' }, 400)
        let body: { nombre?: string; telefono?: string; email?: string; direccion?: string }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        return withRequestDbRole(request, async () => {
          const row = await db.updateProveedor(id, body.nombre, body.telefono, body.email, body.direccion)
          if (!row) return json({ error: 'Proveedor no encontrado' }, 404)
          return json(row)
        })
      },
      DELETE: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'catalog:write')
        if ('response' in gate) return gate.response
        const id = params.id
        if (!isUuid(id)) return json({ error: 'ID inválido' }, 400)
        return withRequestDbRole(request, async () => {
          const n = await db.countProductosByProveedor(id)
          if (n > 0) {
            return json({ error: 'No se puede eliminar: el proveedor tiene productos asociados' }, 409)
          }
          try {
            const row = await db.deleteProveedor(id)
            if (!row) return json({ error: 'Proveedor no encontrado' }, 404)
            return json({ mensaje: 'Proveedor eliminado correctamente' })
          } catch (e) {
            if (isPgFkError(e)) {
              return json({ error: 'No se puede eliminar: el proveedor tiene productos asociados' }, 409)
            }
            throw e
          }
        })
      },
    },
  },
})
