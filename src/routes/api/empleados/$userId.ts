import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { getSessionUser } from '#/lib/api/session'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/empleados/$userId')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        if (user.rol !== 'admin') return json({ error: 'Se requiere rol admin' }, 403)
        const userId = params.userId
        const exists = await db.getEmpleadoByUserId(userId)
        if (!exists) return json({ error: 'Empleado no encontrado' }, 404)
        let body: { nombre?: string; rol?: string }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        const rol =
          body.rol === undefined ? undefined : body.rol === 'admin' || body.rol === 'cajero' ? body.rol : undefined
        const row = await db.updateUserEmpleadoProfile(userId, body.nombre, rol)
        if (!row) return json({ error: 'Sin cambios' }, 400)
        return json({ user_id: row.id, nombre: row.name, rol: row.rol })
      },
      DELETE: async ({ request, params }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        if (user.rol !== 'admin') return json({ error: 'Se requiere rol admin' }, 403)
        const userId = params.userId
        const row = await db.deactivateEmpleadoByUserId(userId)
        if (!row) return json({ error: 'Empleado no encontrado' }, 404)
        return json({ mensaje: 'Empleado desactivado' })
      },
    },
  },
})
