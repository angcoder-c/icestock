import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/clientes/me/ventas')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        if (user.rol !== 'cliente') {
          return json({ error: 'Solo disponible para cuentas de cliente' }, 403)
        }
        const email = user.email?.trim()
        if (!email) return json({ error: 'Tu cuenta no tiene correo electrónico' }, 400)
        try {
          const cliente = await db.getOrCreateClienteForUser({
            nombre: user.name?.trim() || email,
            email,
          })
          const rows = await db.getVentasByClienteId(cliente.id, 200)
          return json(
            rows.map((r: { id: string; fecha: string; total: string; estado: string; lineas: number }) => ({
              id: r.id,
              fecha: r.fecha,
              total: r.total,
              estado: r.estado,
              lineas: r.lineas,
            })),
          )
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Error al cargar tus compras'
          return json({ error: msg }, 500)
        }
      },
    },
  },
})
