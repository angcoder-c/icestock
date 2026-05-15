import { createFileRoute, Outlet } from '@tanstack/react-router'

import { parseLoginRedirect } from '#/lib/login-search'

export const Route = createFileRoute('/login')({
  validateSearch: parseLoginRedirect,
  component: LoginLayout,
})

function LoginLayout() {
  return <Outlet />
}
