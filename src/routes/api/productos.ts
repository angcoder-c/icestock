import { createFileRoute } from '@tanstack/react-router'

import { json, mapProductoApi } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { can } from '#/lib/api/permissions'
import { getSessionUser } from '#/lib/api/session'
import { withRequestDbRole, withSessionDbRole } from '#/lib/api/with-db-role'
import { isUuid } from '#/lib/is-uuid'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/productos')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        const url = new URL(request.url)
        const categoria = url.searchParams.get('categoria')
        let catId: string | null = null
        if (categoria != null && categoria !== '') {
          if (!isUuid(categoria)) return json({ error: 'Parámetro categoria inválido' }, 400)
          catId = categoria
        }
        const search = url.searchParams.get('search')

        const stock_bajo = url.searchParams.get('stock_bajo')
        const incluir = url.searchParams.get('incluir_inactivos')
        const wantsStaffFilters =
          stock_bajo === 'true' || incluir === 'true'
        if (user && wantsStaffFilters && !can(user, 'sales:read') && !can(user, 'catalog:write')) {
          return json({ error: 'Sin permiso para filtros de inventario del personal' }, 403)
        }
        try {
          return await withSessionDbRole(
            user,
            async () => {
              const rows = await db.getProductosListApi({
                categoria: catId,
                search: search || null,
                stock_bajo: wantsStaffFilters && stock_bajo === 'true',
                incluir_inactivos: wantsStaffFilters && incluir === 'true',
                limit: user ? 500 : 200,
              })
              return json(rows.map((r) => mapProductoApi(r as never)))
            },
            { publicCatalog: !user },
          )
        } catch (e) {
          console.error('[GET /api/productos]', e)
          return json(
            { error: e instanceof Error ? e.message : 'Error al listar productos' },
            500,
          )
        }
      },
      POST: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'catalog:write')
        if ('response' in gate) return gate.response
        let body: {
          nombre?: string
          descripcion?: string
          precio?: number
          stock?: number
          id_categoria?: string
          id_proveedor?: string
          imagen_url?: string | null
        }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        if (!body.nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400)
        if (body.precio == null || Number(body.precio) <= 0) {
          return json({ error: 'El precio debe ser mayor a 0' }, 400)
        }
        if (body.id_categoria == null || body.id_proveedor == null) {
          return json({ error: 'id_categoria e id_proveedor son obligatorios' }, 400)
        }
        if (!isUuid(body.id_categoria) || !isUuid(body.id_proveedor)) {
          return json({ error: 'id_categoria o id_proveedor no son UUID válidos' }, 400)
        }
        return withRequestDbRole(request, async () => {
          const row = await db.createProducto(
            body.nombre.trim(),
            Number(body.precio),
            body.id_categoria,
            body.id_proveedor,
            body.descripcion?.trim(),
            body.stock ?? 0,
            body.imagen_url ?? null,
          )
          const full = await db.getProductoEnriquecido(row.id as string)
          if (!full) return json({ error: 'Producto creado pero no se pudo leer' }, 500)
          return json(mapProductoApi(full as never), 201)
        })
      },
    },
  },
})
