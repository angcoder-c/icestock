import { createFileRoute } from '@tanstack/react-router'

import { LoginAudiencePage } from '#/components/login-page'
import { parseLoginRedirect } from '#/lib/login-search'

export const Route = createFileRoute('/login/cliente')({
  validateSearch: parseLoginRedirect,
  component: LoginClienteRoute,
})

function LoginClienteRoute() {
  const { redirect } = Route.useSearch()
  return <LoginAudiencePage audience="cliente" redirect={redirect} />
}
