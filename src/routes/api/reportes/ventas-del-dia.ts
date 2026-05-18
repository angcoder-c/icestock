import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/reportes/ventas-del-dia')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'reports:read')
        if ('response' in gate) return gate.response
        const user = gate.user
        const url = new URL(request.url)
        const fecha = url.searchParams.get('fecha')
        return withSessionDbRole(user, async () => {
          const data = await db.getReporteVentasDelDia(fecha)
          return json({
            ...data,
            ingresos: fmtMoney(data.ingresos),
          })
        })
      },
    },
  },
})
