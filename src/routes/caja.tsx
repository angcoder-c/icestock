import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/caja')({
  component: CajaRedirectRoute,
})

function CajaRedirectRoute() {
  return <Navigate to="/empleado" replace />
}
