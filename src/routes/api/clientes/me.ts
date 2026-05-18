import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/clientes/me')({
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
            const row = await db.getOrCreateClienteForUser({
              nombre: user.name?.trim() || email,
              email,
              userId: user.id,
            })
            return json({
              id: row.id,
              nombre: row.nombre,
              email: row.email,
              telefono: row.telefono,
            })
          })
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Error al preparar tu perfil de cliente'
          return json({ error: msg }, 500)
        }
      },
    },
  },
})
