import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/reportes/clientes-frecuentes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'reports:read')
        if ('response' in gate) return gate.response
        const user = gate.user
        return withSessionDbRole(user, async () => {
          const rows = await db.getClientesFrecuentesApi()
          return json(
            rows.map((r: { id: number; nombre: string; total_compras: number; monto_total: unknown }) => ({
              id: r.id,
              nombre: r.nombre,
              total_compras: r.total_compras,
              monto_total: fmtMoney(r.monto_total),
            })),
          )
        })
      },
    },
  },
})
