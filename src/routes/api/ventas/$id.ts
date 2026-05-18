import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'
import { isUuid } from '#/lib/is-uuid'

export const Route = createFileRoute('/api/ventas/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'sales:read')
        if ('response' in gate) return gate.response
        const user = gate.user
        const id = params.id
        if (!isUuid(id)) return json({ error: 'ID inválido' }, 400)
        return withSessionDbRole(user, async () => {
        const data = await db.getVentaDetalleApi(id)
        if (!data) return json({ error: 'Venta no encontrada' }, 404)
        const h = data.head as {
          id: string
          fecha: Date | string
          total: unknown
          estado: string
          cliente_id: string | null
          cliente_nombre: string | null
          empleado_id: string | null
          empleado_nombre: string | null
        }
        return json({
          id: h.id,
          fecha: h.fecha instanceof Date ? h.fecha.toISOString() : String(h.fecha),
          total: fmtMoney(h.total),
          estado: h.estado,
          cliente: h.cliente_id != null ? { id: h.cliente_id, nombre: h.cliente_nombre } : null,
          empleado:
            h.empleado_id != null
              ? { id: h.empleado_id, nombre: h.empleado_nombre ?? '' }
              : null,
          detalle: (data.detalle as { id_producto: number; producto: string; cantidad: number; precio_unit: unknown; subtotal: unknown }[]).map(
            (d) => ({
              id_producto: d.id_producto,
              producto: d.producto,
              cantidad: d.cantidad,
              precio_unit: fmtMoney(d.precio_unit),
              subtotal: fmtMoney(d.subtotal),
            }),
          ),
        })
        })
      },
      DELETE: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'sales:void')
        if ('response' in gate) return gate.response
        const user = gate.user
        const id = params.id
        if (!isUuid(id)) return json({ error: 'ID inválido' }, 400)
        try {
          return await withSessionDbRole(user, async () => {
            await db.anularVentaTransaccional(id)
            return json({ mensaje: 'Venta anulada y stock restaurado' })
          })
        } catch (e) {
          const err = e as { code?: string; message?: string }
          if (err.code === 'NOT_FOUND') return json({ error: 'Venta no encontrada' }, 404)
          return json({ error: err.message ?? 'No se pudo anular la venta' }, 400)
        }
      },
    },
  },
})
