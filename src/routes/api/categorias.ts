import { createFileRoute } from '@tanstack/react-router'

import { json, isPgUniqueError } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { getSessionUser } from '#/lib/api/session'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import { withRequestDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/categorias')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        return withSessionDbRole(
          user,
          async () => {
            const rows = await db.getCategorias(500)
            return json(rows)
          },
          { publicCatalog: !user },
        )
      },
      POST: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'catalog:write')
        if ('response' in gate) return gate.response
        let body: { nombre?: string; descripcion?: string }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        if (!body.nombre || typeof body.nombre !== 'string' || !body.nombre.trim()) {
          return json({ error: "El campo 'nombre' es obligatorio" }, 400)
        }
        try {
          return await withRequestDbRole(request, async () => {
            const row = await db.createCategoria(body.nombre.trim(), body.descripcion?.trim())
            return json(row, 201)
          })
        } catch (e) {
          if (isPgUniqueError(e)) return json({ error: 'Ya existe una categoría con ese nombre' }, 400)
          throw e
        }
      },
    },
  },
})
