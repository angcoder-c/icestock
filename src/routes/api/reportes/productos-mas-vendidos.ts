import { createFileRoute } from '@tanstack/react-router'

import { fmtMoney, json } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/reportes/productos-mas-vendidos')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        const url = new URL(request.url)
        const fi = url.searchParams.get('fecha_inicio')
        const ff = url.searchParams.get('fecha_fin')
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
      },
    },
  },
})
