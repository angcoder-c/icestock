'use server'

import { createFileRoute } from '@tanstack/react-router'
import { loginCliente } from '#/lib/db'

export const Route = createFileRoute('/api/auth/clientes/login')({
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
      const { email, password } = body

      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email y password son requeridos' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      const result = await loginCliente(email, password)

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error en el login'
      return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
})
