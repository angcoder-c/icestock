import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { StaffProductEditDialog } from '#/components/staff-edit-dialogs'
import { useIcestock } from '#/context/icestock-context'
import { useProductoQuery } from '#/hooks/use-icestock-api'
import { isUuid } from '#/lib/is-uuid'
import { superadminModalReturnSearch } from '#/lib/superadmin-search'

const superadminRouteApi = getRouteApi('/superadmin')

export const Route = createFileRoute('/superadmin/productos/editar/$productId')({
  component: SuperadminProductEditRoute,
})

function SuperadminProductEditRoute() {
  const { productId } = Route.useParams()
  const navigate = useNavigate()
  const search = superadminRouteApi.useSearch()
  const { session } = useIcestock()
  const ok = session?.user?.rol === 'superadmin'
  const productQ = useProductoQuery(isUuid(productId) ? productId : null, ok && isUuid(productId))

  const close = () => {
    void navigate({
      to: '/superadmin',
      search: superadminModalReturnSearch(search),
      replace: true,
    })
  }

  useEffect(() => {
    if (!isUuid(productId)) {
      void navigate({ to: '/superadmin', search: superadminModalReturnSearch(search), replace: true })
    }
  }, [productId, navigate, search.tab])

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
