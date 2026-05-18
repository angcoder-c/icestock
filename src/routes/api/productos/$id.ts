import { createFileRoute } from '@tanstack/react-router'

import { json, mapProductoApi } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withRequestDbRole } from '#/lib/api/with-db-role'
import { isUuid } from '#/lib/is-uuid'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/productos/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'catalog:read')
        if ('response' in gate) return gate.response
        const id = params.id
        if (!isUuid(id)) return json({ error: 'ID inválido' }, 400)
        return withRequestDbRole(request, async () => {
          const row = await db.getProductoEnriquecido(id)
          if (!row) return json({ error: 'Producto no encontrado' }, 404)
          return json(mapProductoApi(row as never))
        })
      },
      PUT: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'catalog:write')
        if ('response' in gate) return gate.response
        const id = params.id
        if (!isUuid(id)) return json({ error: 'ID inválido' }, 400)
        let body: Partial<{
          nombre: string
          descripcion: string
          precio: number
          stock: number
          id_categoria: string
          id_proveedor: string
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
        if (body.id_categoria != null && !isUuid(body.id_categoria)) {
          return json({ error: 'id_categoria inválido' }, 400)
        }
        if (body.id_proveedor != null && !isUuid(body.id_proveedor)) {
          return json({ error: 'id_proveedor inválido' }, 400)
        }
        return withRequestDbRole(request, async () => {
          const row = await db.updateProducto(id, body)
          if (!row) return json({ error: 'Producto no encontrado' }, 404)
          const full = await db.getProductoEnriquecido(id)
          if (!full) return json({ error: 'Producto no encontrado' }, 404)
          return json(mapProductoApi(full as never))
        })
      },
      DELETE: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'catalog:write')
        if ('response' in gate) return gate.response
        const id = params.id
        if (!isUuid(id)) return json({ error: 'ID inválido' }, 400)
        return withRequestDbRole(request, async () => {
          const row = await db.softDeleteProducto(id)
          if (!row) return json({ error: 'Producto no encontrado' }, 404)
          return json({ mensaje: 'Producto desactivado correctamente' })
        })
      },
    },
  },
})
