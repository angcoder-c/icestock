import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/ventas/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        const id = Number(params.id)
        if (!Number.isFinite(id)) return json({ error: 'ID inválido' }, 400)
        const data = await db.getVentaDetalleApi(id)
        if (!data) return json({ error: 'Venta no encontrada' }, 404)
        const h = data.head as {
          id: number
          fecha: Date | string
          total: unknown
          estado: string
          cliente_id: number | null
          cliente_nombre: string | null
          empleado_id: string
          empleado_nombre: string
        }
        return json({
          id: h.id,
          fecha: h.fecha instanceof Date ? h.fecha.toISOString() : String(h.fecha),
          total: fmtMoney(h.total),
          estado: h.estado,
          cliente: h.cliente_id != null ? { id: h.cliente_id, nombre: h.cliente_nombre } : null,
          empleado: { id: h.empleado_id, nombre: h.empleado_nombre },
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
      },
      DELETE: async ({ request, params }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        if (user.rol !== 'admin') {
          return json({ error: 'Solo un administrador puede anular ventas' }, 403)
        }
        const id = Number(params.id)
        if (!Number.isFinite(id)) return json({ error: 'ID inválido' }, 400)
        try {
          await db.anularVentaTransaccional(id)
          return json({ mensaje: 'Venta anulada y stock restaurado' })
        } catch (e) {
          const err = e as { code?: string; message?: string }
          if (err.code === 'NOT_FOUND') return json({ error: 'Venta no encontrada' }, 404)
          return json({ error: err.message ?? 'No se pudo anular la venta' }, 400)
        }
      },
    },
  },
})
