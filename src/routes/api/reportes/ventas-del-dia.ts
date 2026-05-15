import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/reportes/ventas-del-dia')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        const url = new URL(request.url)
        const fecha = url.searchParams.get('fecha')
        const data = await db.getReporteVentasDelDia(fecha)
        return json({
          ...data,
          ingresos: fmtMoney(data.ingresos),
        })
      },
    },
  },
})
