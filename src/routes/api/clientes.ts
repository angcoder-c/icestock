import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { getSessionUser, isStaffUser } from '#/lib/api/session'
import * as db from '#/lib/db'

function mapClienteList(row: { id: number; nombre: string; email: string | null; telefono: string | null; created_at: Date | string }) {
  const d = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono,
    creado_en: d,
  }
}

export const Route = createFileRoute('/api/clientes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        if (!isStaffUser(user)) return json({ error: 'Solo personal autorizado puede listar clientes' }, 403)
        const rows = await db.getClientes(500)
        return json(rows.map((r) => mapClienteList(r as never)))
      },
      POST: async ({ request }) => {
        const user = await getSessionUser(request)
        if (!user) return json({ error: 'No autenticado' }, 401)
        if (!isStaffUser(user)) return json({ error: 'Solo personal autorizado puede crear clientes' }, 403)
        let body: { nombre?: string; email?: string; telefono?: string }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        if (!body.nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400)
        const row = await db.createCliente(body.nombre.trim(), body.email, body.telefono)
        return json({ id: row.id, nombre: row.nombre, email: row.email }, 201)
      },
    },
  },
})
