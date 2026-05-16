import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { getSessionUser, isStaffUser } from '#/lib/api/session'
import * as db from '#/lib/db'
import { isUuid } from '#/lib/is-uuid'

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
          rows.map((r: { id: string; fecha: Date | string; total: unknown; estado: string; cliente: string | null; empleado: string }) => ({
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
        let body: { id_cliente?: string | null; items?: Array<{ id_producto: string; cantidad: number }> }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        if (!body.items?.length) return json({ error: 'Debe incluir al menos un ítem' }, 400)
        if (body.id_cliente != null && body.id_cliente !== '' && !isUuid(body.id_cliente)) {
          return json({ error: 'id_cliente inválido' }, 400)
        }
        for (const it of body.items) {
          if (!isUuid(it.id_producto)) return json({ error: 'id_producto inválido en ítems' }, 400)
        }
        try {
          let empleado_id: string | null = null
          if (isStaffUser(user)) {
            const emp = await db.getOrCreateEmpleadoForUser(user.id)
            empleado_id = emp.id as string
          }

          const result = await db.crearVentaTransaccional({
            user_id: user.id,
            empleado_id,
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
