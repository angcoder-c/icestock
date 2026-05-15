import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/ventas')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        const url = new URL(request.url)
        const fi = url.searchParams.get('fecha_inicio')
        const ff = url.searchParams.get('fecha_fin')
        const rows = await db.getVentasListApi(fi, ff, 500)
        return json(
          rows.map((r: { id: number; fecha: Date | string; total: unknown; estado: string; cliente: string | null; empleado: string }) => ({
            id: r.id,
            fecha: r.fecha instanceof Date ? r.fecha.toISOString() : String(r.fecha),
            total: fmtMoney(r.total),
            estado: r.estado,
            cliente: r.cliente ?? '',
            empleado: r.empleado,
          })),
        )
      },
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        let body: { id_cliente?: number | null; items?: Array<{ id_producto: number; cantidad: number }> }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        if (!body.items?.length) return json({ error: 'Debe incluir al menos un ítem' }, 400)
        try {
          const result = await db.crearVentaTransaccional({
            user_id: user.id,
            id_cliente: body.id_cliente ?? null,
            items: body.items,
          })
          const venta = await db.getVenta(result.ventaId)
          return json(
            {
              id: result.ventaId,
              total: fmtMoney(result.total),
              fecha: venta?.fecha instanceof Date ? venta.fecha.toISOString() : String(venta?.fecha ?? new Date().toISOString()),
              mensaje: 'Venta registrada correctamente',
            },
            201,
          )
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Error al registrar venta'
          return json({ error: msg }, 400)
        }
      },
    },
  },
})
