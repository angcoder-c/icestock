import { createFileRoute } from '@tanstack/react-router'
import { getDashboardData } from '../../lib/db'

export const Route = createFileRoute('/api/')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const data = await getDashboardData()

          return new Response(
            JSON.stringify({
              ok: true,
              data,
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          )
        } catch (error) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: error instanceof Error ? error.message : 'Error interno',
            }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          )
        }
      },
    },
  },
})