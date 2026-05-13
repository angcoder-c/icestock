'use server'

import { createFileRoute } from '@tanstack/react-router'
import { registerCliente } from '#/lib/db'

export const Route = createFileRoute('/api/auth/clientes/register')({
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
      const { email, password, nombre } = body

      if (!email || !password || !nombre) {
        return new Response(
          JSON.stringify({ error: 'Email, password y nombre son requeridos' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const result = await registerCliente(email, password, nombre)

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
