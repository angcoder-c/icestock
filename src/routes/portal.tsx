import { createFileRoute } from '@tanstack/react-router'

import { PortalPage } from '#/components/portal-page'

export const Route = createFileRoute('/portal')({
  component: PortalRoute,
})

function PortalRoute() {
  return <PortalPage />
}
