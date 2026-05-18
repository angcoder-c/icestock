import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { resolveStaffRolForCreate } from '#/lib/api/permissions'
import { runWithoutDbRole, withSessionDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/empleados')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'staff:read')
        if ('response' in gate) return gate.response
        return withSessionDbRole(gate.user, async () => {
          const rows = await db.getEmpleados(500)
          return json(
            rows.map((e: { id: number; user_id: string; name: string; email: string; rol: string; activo: boolean; created_at: Date | string }) => ({
              id: e.id,
              user_id: e.user_id,
              nombre: e.name,
              email: e.email,
              rol: e.rol,
              activo: e.activo,
              creado_en: e.created_at instanceof Date ? e.created_at.toISOString() : String(e.created_at),
            })),
          )
        })
      },
      POST: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'staff:write')
        if ('response' in gate) return gate.response
        let body: { nombre?: string; email?: string; password?: string; rol?: string }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        if (!body.nombre?.trim() || !body.email?.trim() || !body.password) {
          return json({ error: 'nombre, email y password son obligatorios' }, 400)
        }
        const rol = resolveStaffRolForCreate(gate.user, body.rol)
        if (!rol) {
          return json({ error: 'Rol no permitido para tu cuenta' }, 400)
        }
        try {
          return await runWithoutDbRole(async () => {
            const r = await db.createUserAccountAndEmpleado({
              nombre: body.nombre!.trim(),
              email: body.email!.trim(),
              password: body.password!,
              rol,
            })
            return json({ user_id: r.user_id, nombre: r.nombre, rol: r.rol }, 201)
          })
        } catch (e) {
          const err = e as { code?: string; message?: string }
          if (err.code === 'DUPLICATE') return json({ error: 'El email ya está registrado' }, 400)
          throw e
        }
      },
    },
  },
})
