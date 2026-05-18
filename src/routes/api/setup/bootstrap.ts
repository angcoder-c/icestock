import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { runWithoutDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'

export const Route = createFileRoute('/api/setup/bootstrap')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { nombre?: string; email?: string; password?: string }
        try {
          body = (await request.json()) as typeof body
        } catch {
          return json({ error: 'JSON inválido' }, 400)
        }
        if (!body.nombre?.trim() || !body.email?.trim() || !body.password) {
          return json({ error: 'nombre, email y password son obligatorios' }, 400)
        }
        try {
          const r = await runWithoutDbRole(() =>
            db.bootstrapSuperadmin({
              nombre: body.nombre!.trim(),
              email: body.email!.trim(),
              password: body.password!,
            }),
          )
          return json(
            {
              user_id: r.user_id,
              nombre: r.nombre,
              rol: r.rol,
              mensaje: 'Superadministrador creado. Ya puedes iniciar sesión.',
            },
            201,
          )
        } catch (e) {
          const err = e as { code?: string; message?: string }
          if (err.code === 'BOOTSTRAP_DONE') return json({ error: err.message }, 409)
          if (err.code === 'DUPLICATE') return json({ error: 'El email ya está registrado' }, 400)
          if (err.code === 'INVALID') return json({ error: err.message }, 400)
          throw e
        }
      },
    },
  },
})
