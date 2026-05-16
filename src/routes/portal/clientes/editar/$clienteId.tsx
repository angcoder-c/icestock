import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { StaffClienteEditDialog } from '#/components/staff-edit-dialogs'
import { useIcestock } from '#/context/icestock-context'
import { useClienteStaffDetailQuery } from '#/hooks/use-icestock-api'
import { isUuid } from '#/lib/is-uuid'

export const Route = createFileRoute('/portal/clientes/editar/$clienteId')({
  component: PortalClienteEditRoute,
})

function PortalClienteEditRoute() {
  const { clienteId } = Route.useParams()
  const navigate = useNavigate()
  const { session } = useIcestock()
  const isAdmin = session?.user?.rol === 'admin'
  const clienteQ = useClienteStaffDetailQuery(isUuid(clienteId) ? clienteId : null, isAdmin && isUuid(clienteId))

  const close = () => {
    void navigate({
      to: '/portal',
      search: { tab: 'clientes' },
      replace: true,
    })
  }

  useEffect(() => {
    if (!isUuid(clienteId)) {
      void navigate({ to: '/portal', search: { tab: 'clientes' }, replace: true })
    }
  }, [clienteId, navigate])

  if (!isUuid(clienteId)) return null

  return (
    <StaffClienteEditDialog
      theme="light"
      clienteId={clienteId}
      cliente={clienteQ.data}
      isLoading={clienteQ.isLoading}
      isError={clienteQ.isError}
      onClose={close}
    />
  )
}
