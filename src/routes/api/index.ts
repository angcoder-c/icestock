import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { withRequestDbRole } from '#/lib/api/with-db-role'
import { getDashboardData } from '../../lib/db'

export const Route = createFileRoute('/api/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await withRequestDbRole(request, async () => {
          const data = await getDashboardData()
          return json({
            ok: true,
            meta: {
              openapi: '/openapi.json',
              documentacion: '/api/docs',
              swagger: '/api/docs',
              humanDocs: '/docs/endpoints.md',
            },
            data,
          })
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