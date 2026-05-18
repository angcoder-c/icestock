import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { resolveStaffRolForUpdate } from '#/lib/api/permissions'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/empleados/$userId')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'staff:write')
        if ('response' in gate) return gate.response
        const user = gate.user
        const userId = params.userId
        return withSessionDbRole(user, async () => {
          const exists = await db.getEmpleadoByUserId(userId)
          if (!exists) return json({ error: 'Empleado no encontrado' }, 404)
          let body: { nombre?: string; rol?: string }
          try {
            body = (await request.json()) as typeof body
          } catch {
            return json({ error: 'JSON inválido' }, 400)
          }
          const rol = resolveStaffRolForUpdate(user, body.rol)
          if (rol === null) {
            return json({ error: 'Rol no permitido para tu cuenta' }, 400)
          }
          const row = await db.updateUserEmpleadoProfile(userId, body.nombre, rol)
          if (!row) return json({ error: 'Sin cambios' }, 400)
          return json({ user_id: row.id, nombre: row.name, rol: row.rol })
        })
      },
      DELETE: async ({ request, params }) => {
        const gate = await requireAuthAndPermission(request, 'staff:write')
        if ('response' in gate) return gate.response
        const user = gate.user
        const userId = params.userId
        return withSessionDbRole(user, async () => {
          const row = await db.deactivateEmpleadoByUserId(userId)
          if (!row) return json({ error: 'Empleado no encontrado' }, 404)
          return json({ mensaje: 'Empleado desactivado' })
        })
      },
    },
  },
})
