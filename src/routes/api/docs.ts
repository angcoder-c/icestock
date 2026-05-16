import { createFileRoute } from '@tanstack/react-router'

import { html } from '#/lib/api/http'
import { swaggerUiPageHtml } from '#/lib/api/swagger-ui-page'

export const Route = createFileRoute('/api/docs')({
  server: {
    handlers: {
      GET: async () => html(swaggerUiPageHtml('/openapi.json')),
    },
  },
})
