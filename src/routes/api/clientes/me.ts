import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/clientes/me')({
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
          const row = await db.getOrCreateClienteForUser({ nombre: user.name?.trim() || email, email })
          return json({
            id: row.id,
            nombre: row.nombre,
            email: row.email,
            telefono: row.telefono,
          })
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Error al preparar tu perfil de cliente'
          return json({ error: msg }, 500)
        }
      },
    },
  },
})
