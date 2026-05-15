import { createFileRoute } from '@tanstack/react-router'

import { LoginAudiencePage } from '#/components/login-page'
import { parseLoginRedirect } from '#/lib/login-search'

export const Route = createFileRoute('/login/empleado')({
  validateSearch: parseLoginRedirect,
  component: LoginEmpleadoRoute,
})

function LoginEmpleadoRoute() {
  const { redirect } = Route.useSearch()
  return <LoginAudiencePage audience="empleado" redirect={redirect} />
}
