import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/reportes/productos-mas-vendidos')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'reports:read')
        if ('response' in gate) return gate.response
        const user = gate.user
        const url = new URL(request.url)
        const fi = url.searchParams.get('fecha_inicio')
        const ff = url.searchParams.get('fecha_fin')
        return withSessionDbRole(user, async () => {
          const rows = await db.getProductosMasVendidosApi(fi, ff)
          return json(
            rows.map((r: { rank: number; id_producto: number; producto: string; categoria: string; total_vendido: string | number; ingresos: unknown }) => ({
              rank: Number(r.rank),
              id_producto: r.id_producto,
              producto: r.producto,
              categoria: r.categoria,
              total_vendido: Number(r.total_vendido),
              ingresos: fmtMoney(r.ingresos),
            })),
          )
        })
      },
    },
  },
})
