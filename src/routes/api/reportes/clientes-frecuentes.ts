import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/reportes/clientes-frecuentes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        const rows = await db.getClientesFrecuentesApi()
        return json(
          rows.map((r: { id: number; nombre: string; total_compras: number; monto_total: unknown }) => ({
            id: r.id,
            nombre: r.nombre,
            total_compras: r.total_compras,
            monto_total: fmtMoney(r.monto_total),
          })),
        )
      },
    },
  },
})
