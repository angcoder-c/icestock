import { createFileRoute } from '@tanstack/react-router'

import { json, mapProductoApi } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/productos/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        const id = Number(params.id)
        if (!Number.isFinite(id)) return json({ error: 'ID inválido' }, 400)
        const row = await db.getProductoEnriquecido(id)
        if (!row) return json({ error: 'Producto no encontrado' }, 404)
        return json(mapProductoApi(row as never))
      },
      PUT: async ({ request, params }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        const id = Number(params.id)
        if (!Number.isFinite(id)) return json({ error: 'ID inválido' }, 400)
        let body: Partial<{
          nombre: string
          descripcion: string
          precio: number
          stock: number
          id_categoria: number
          id_proveedor: number
          activo: boolean
          imagen_url: string | null
        }>
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        if (body.precio != null && Number(body.precio) <= 0) {
          return json({ error: 'El precio debe ser mayor a 0' }, 400)
        }
        const row = await db.updateProducto(id, body)
        if (!row) return json({ error: 'Producto no encontrado' }, 404)
        const full = await db.getProductoEnriquecido(id)
        if (!full) return json({ error: 'Producto no encontrado' }, 404)
        return json(mapProductoApi(full as never))
      },
      DELETE: async ({ request, params }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        const id = Number(params.id)
        if (!Number.isFinite(id)) return json({ error: 'ID inválido' }, 400)
        const row = await db.softDeleteProducto(id)
        if (!row) return json({ error: 'Producto no encontrado' }, 404)
        return json({ mensaje: 'Producto desactivado correctamente' })
      },
    },
  },
})
