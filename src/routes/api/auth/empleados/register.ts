'use server'

import { createFileRoute } from '@tanstack/react-router'
import { registerEmpleado } from '#/lib/db'

export const Route = createFileRoute('/api/auth/empleados/register')({
  methods: ['POST'],
  validateSearch: (search: Record<string, unknown>) => search,
  handler: async ({ request }) => {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const body = await request.json()
      const { email, password, name, rol = 'cajero' } = body

      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: 'Email, password y name son requeridos' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const result = await registerEmpleado(email, password, name, rol)

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error en el registro'
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
})
