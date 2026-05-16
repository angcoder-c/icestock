import { createFileRoute } from '@tanstack/react-router'

import { ClienteComprasPage } from '#/components/cliente-compras-page'

export const Route = createFileRoute('/tienda/compras')({
  component: ClienteComprasRoute,
})

function ClienteComprasRoute() {
  return <ClienteComprasPage />
}
