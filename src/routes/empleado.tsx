import { createFileRoute } from '@tanstack/react-router'

import { EmpleadoPortalPage } from '#/components/empleado-portal-page'
import { parseEmpleadoSearch } from '#/lib/empleado-search'

export const Route = createFileRoute('/empleado')({
  validateSearch: parseEmpleadoSearch,
  component: EmpleadoRoute,
})

function EmpleadoRoute() {
  return <EmpleadoPortalPage />
}
