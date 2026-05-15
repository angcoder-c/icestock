import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { getDashboardData } from '../../lib/db'

export const Route = createFileRoute('/api/')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const data = await getDashboardData()
          return json({
            ok: true,
            meta: {
              openapi: '/openapi.json',
              documentacion: '/api/docs',
              humanDocs: '/docs/endpoints.md',
            },
            data,
          })
        } catch (error) {
          return json(
            {
              ok: false,
              error: error instanceof Error ? error.message : 'Error interno',
            },
            500,
          )
        }
      },
    },
  },
})