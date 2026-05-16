import { createFileRoute } from '@tanstack/react-router'

import { TiendaPage } from '#/components/tienda-page'

export const Route = createFileRoute('/tienda/')({
  component: TiendaRoute,
})

function TiendaRoute() {
  return <TiendaPage />
}
