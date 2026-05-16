import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { StaffProductEditDialog } from '#/components/staff-edit-dialogs'
import { useIcestock } from '#/context/icestock-context'
import { useProductoQuery } from '#/hooks/use-icestock-api'
import { empleadoModalReturnSearch } from '#/lib/empleado-search'
import { isUuid } from '#/lib/is-uuid'

const empleadoRouteApi = getRouteApi('/empleado')

export const Route = createFileRoute('/empleado/productos/editar/$productId')({
  component: EmpleadoProductEditRoute,
})

function EmpleadoProductEditRoute() {
  const { productId } = Route.useParams()
  const navigate = useNavigate()
  const search = empleadoRouteApi.useSearch()
  const { session } = useIcestock()
  const ok = session?.user?.rol === 'cajero'
  const productQ = useProductoQuery(isUuid(productId) ? productId : null, ok && isUuid(productId))

  const close = () => {
    void navigate({
      to: '/empleado',
      search: empleadoModalReturnSearch(search),
      replace: true,
    })
  }

  useEffect(() => {
    if (!isUuid(productId)) {
      void navigate({ to: '/empleado', search: empleadoModalReturnSearch(search), replace: true })
    }
  }, [productId, navigate, search.tab, search.reportSub])

  if (!isUuid(productId)) return null

  return (
    <StaffProductEditDialog
      theme="dark"
      productId={productId}
      product={productQ.data}
      isLoading={productQ.isLoading}
      isError={productQ.isError}
      onClose={close}
    />
  )
}
