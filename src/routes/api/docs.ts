import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'

export const Route = createFileRoute('/api/docs')({
  server: {
    handlers: {
      GET: async () => {
        return json({
          ok: true,
          openapi: '/openapi.json',
          mensaje:
            'Todas las respuestas del API de negocio son JSON (application/json), sin 204 ni cuerpos vacíos. Importa `openapi.json` en Postman, Stoplight o Swagger Editor para explorar el contrato.',
        })
      },
    },
  },
})
