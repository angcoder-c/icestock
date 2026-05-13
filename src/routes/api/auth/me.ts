'use server'

import { createFileRoute } from '@tanstack/react-router'
import { verifyToken } from '#/lib/db'

export const Route = createFileRoute('/api/auth/me')({
  methods: ['GET'],
  handler: async ({ request }) => {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const authHeader = request.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Token no proporcionado' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const token = authHeader.substring(7)
      const decoded = verifyToken(token)

      return new Response(JSON.stringify({ user: decoded }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al verificar token'
      return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
})
