import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { StaffProductEditDialog } from '#/components/staff-edit-dialogs'
import { useIcestock } from '#/context/icestock-context'
import { useProductoQuery } from '#/hooks/use-icestock-api'
import { isUuid } from '#/lib/is-uuid'
import { portalModalReturnSearch } from '#/lib/portal-search'

const portalRouteApi = getRouteApi('/portal')

export const Route = createFileRoute('/portal/productos/editar/$productId')({
  component: PortalProductEditRoute,
})

function PortalProductEditRoute() {
  const { productId } = Route.useParams()
  const navigate = useNavigate()
  const search = portalRouteApi.useSearch()
  const { session } = useIcestock()
  const isAdmin = session?.user?.rol === 'admin'
  const productQ = useProductoQuery(isUuid(productId) ? productId : null, isAdmin && isUuid(productId))

  const close = () => {
    void navigate({
      to: '/portal',
      search: portalModalReturnSearch(search),
      replace: true,
    })
  }

  useEffect(() => {
    if (!isUuid(productId)) {
      void navigate({ to: '/portal', search: portalModalReturnSearch(search), replace: true })
    }
  }, [productId, navigate, search.tab])

  if (!isUuid(productId)) return null

  return (
    <StaffProductEditDialog
      theme="light"
      productId={productId}
      product={productQ.data}
      isLoading={productQ.isLoading}
      isError={productQ.isError}
      onClose={close}
    />
  )
}
