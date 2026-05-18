import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/clientes/me/ventas')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'clients:me')
        if ('response' in gate) return gate.response
        const user = gate.user
        const email = user.email?.trim()
        if (!email) return json({ error: 'Tu cuenta no tiene correo electrónico' }, 400)
        try {
          return await withSessionDbRole(user, async () => {
            const cliente = await db.getOrCreateClienteForUser({
              nombre: user.name?.trim() || email,
              email,
              userId: user.id,
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
          })
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Error al cargar tus compras'
          return json({ error: msg }, 500)
        }
      },
    },
  },
})
