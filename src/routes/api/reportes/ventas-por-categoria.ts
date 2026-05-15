import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/reportes/ventas-por-categoria')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        const rows = await db.getVentasPorCategoriaReporteApi()
        return json(
          rows.map((r: { categoria: string; total_vendido: string | number; ingresos: unknown }) => ({
            categoria: r.categoria,
            total_vendido: Number(r.total_vendido),
            ingresos: fmtMoney(r.ingresos),
          })),
        )
      },
    },
  },
})
