import { createFileRoute } from '@tanstack/react-router'
import { crearVentaTransaccional } from '../../lib/db'

export const Route = createFileRoute('/api/ventas')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            user_id: string
            id_cliente: number | null
            items: Array<{ id_producto: number; cantidad: number }>
          }

          const result = await crearVentaTransaccional(body)

          return new Response(
            JSON.stringify({
              ok: true,
              result,
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
              error: error instanceof Error ? error.message : 'No se pudo registrar la venta',
            }),
            {
              status: 400,
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
