import { createFileRoute, Outlet } from '@tanstack/react-router'

import { SuperadminPortalPage } from '#/components/superadmin-portal-page'
import { parseSuperadminSearch } from '#/lib/superadmin-search'

export const Route = createFileRoute('/superadmin')({
  validateSearch: parseSuperadminSearch,
  component: SuperadminLayout,
})

function SuperadminLayout() {
  return (
    <>
      <SuperadminPortalPage />
      <Outlet />
    </>
  )
}
