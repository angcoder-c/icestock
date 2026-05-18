import { createFileRoute, Outlet } from '@tanstack/react-router'

import { AnalistaPortalPage } from '#/components/analista-portal-page'
import { parseAnalistaSearch } from '#/lib/analista-search'

export const Route = createFileRoute('/analista')({
  validateSearch: parseAnalistaSearch,
  component: AnalistaLayout,
})

function AnalistaLayout() {
  return (
    <>
      <AnalistaPortalPage />
      <Outlet />
    </>
  )
}
