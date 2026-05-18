import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/reportes/stock-disponible')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'reports:read')
        if ('response' in gate) return gate.response
        const user = gate.user
        return withSessionDbRole(user, async () => {
          const rows = await db.getStockDisponibleApi()
          return json(
            rows.map((r: { id: number; producto: string; stock: number; alerta: boolean }) => ({
              id: r.id,
              producto: r.producto,
              stock: r.stock,
              alerta: r.alerta,
            })),
          )
        })
      },
    },
  },
})
