import { createFileRoute } from '@tanstack/react-router'

import { json, mapProductoApi } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/productos')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        const url = new URL(request.url)
        const categoria = url.searchParams.get('categoria')
        const catNum = categoria != null && categoria !== '' ? Number(categoria) : null
        if (categoria != null && categoria !== '' && (catNum == null || !Number.isFinite(catNum))) {
          return json({ error: 'Parámetro categoria inválido' }, 400)
        }
        const search = url.searchParams.get('search')

        if (!user) {
          try {
            const rows = await db.getProductosListApi({
              categoria: catNum,
              search: search || null,
              stock_bajo: false,
              incluir_inactivos: false,
              limit: 200,
            })
            return json(rows.map((r) => mapProductoApi(r as never)))
          } catch (e) {
            console.error('[GET /api/productos público]', e)
            return json(
              { error: e instanceof Error ? e.message : 'Error al listar productos' },
              500,
            )
          }
        }

        const stock_bajo = url.searchParams.get('stock_bajo')
        const incluir = url.searchParams.get('incluir_inactivos')
        try {
          const rows = await db.getProductosListApi({
            categoria: catNum,
            search: search || null,
            stock_bajo: stock_bajo === 'true',
            incluir_inactivos: incluir === 'true',
            limit: 500,
          })
          return json(rows.map((r) => mapProductoApi(r as never)))
        } catch (e) {
          console.error('[GET /api/productos]', e)
          return json(
            { error: e instanceof Error ? e.message : 'Error al listar productos' },
            500,
          )
        }
      },
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        let body: {
          nombre?: string
          descripcion?: string
          precio?: number
          stock?: number
          id_categoria?: number
          id_proveedor?: number
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
        const row = await db.createProducto(
          body.nombre.trim(),
          Number(body.precio),
          body.id_categoria,
          body.id_proveedor,
          body.descripcion?.trim(),
          body.stock ?? 0,
          body.imagen_url ?? null,
        )
        const full = await db.getProductoEnriquecido(row.id as number)
        if (!full) return json({ error: 'Producto creado pero no se pudo leer' }, 500)
        return json(mapProductoApi(full as never), 201)
      },
    },
  },
})
