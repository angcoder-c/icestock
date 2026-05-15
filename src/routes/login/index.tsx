import { createFileRoute, useSearch } from '@tanstack/react-router'

import { LoginHub } from '#/components/login-page'

export const Route = createFileRoute('/login/')({
  component: LoginHubRoute,
})

function LoginHubRoute() {
  const { redirect } = useSearch({ from: '/login' })
  return <LoginHub redirect={redirect} />
}
