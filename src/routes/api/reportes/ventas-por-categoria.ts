import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/reportes/ventas-por-categoria')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'reports:read')
        if ('response' in gate) return gate.response
        const user = gate.user
        return withSessionDbRole(user, async () => {
          const rows = await db.getVentasPorCategoriaReporteApi()
          return json(
            rows.map((r: { categoria: string; total_vendido: string | number; ingresos: unknown }) => ({
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
