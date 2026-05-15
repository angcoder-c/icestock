import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/reportes/stock-disponible')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        const rows = await db.getStockDisponibleApi()
        return json(
          rows.map((r: { id: number; producto: string; stock: number; alerta: boolean }) => ({
            id: r.id,
            producto: r.producto,
            stock: r.stock,
            alerta: r.alerta,
          })),
        )
      },
    },
  },
})
