import { createFileRoute } from '@tanstack/react-router'

import { json, isPgUniqueError } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/categorias')({
  server: {
    handlers: {
      GET: async () => {
        const rows = await db.getCategorias(500)
        return json(rows)
      },
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
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
          const row = await db.createCategoria(body.nombre.trim(), body.descripcion?.trim())
          return json(row, 201)
        } catch (e) {
          if (isPgUniqueError(e)) return json({ error: 'Ya existe una categoría con ese nombre' }, 400)
          throw e
        }
      },
    },
  },
})
