import { createFileRoute, Outlet } from '@tanstack/react-router'

import { PortalPage } from '#/components/portal-page'
import { parsePortalSearch } from '#/lib/portal-search'

export const Route = createFileRoute('/portal')({
  validateSearch: parsePortalSearch,
  component: PortalLayout,
})

function PortalLayout() {
  return (
    <>
      <PortalPage />
      <Outlet />
    </>
  )
}
