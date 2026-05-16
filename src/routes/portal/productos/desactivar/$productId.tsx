import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { ProductDeactivateModal } from '#/components/product-deactivate-modal'
import { useIcestock } from '#/context/icestock-context'
import { useDeleteProductoMutation, useProductosQuery } from '#/hooks/use-icestock-api'
import { isUuid } from '#/lib/is-uuid'
import { portalModalReturnSearch } from '#/lib/portal-search'

const portalRouteApi = getRouteApi('/portal')

export const Route = createFileRoute('/portal/productos/desactivar/$productId')({
  component: PortalProductDeactivateRoute,
})

function PortalProductDeactivateRoute() {
  const { productId } = Route.useParams()
  const navigate = useNavigate()
  const search = portalRouteApi.useSearch()
  const { session } = useIcestock()
  const isAdmin = session?.user?.rol === 'admin'
  const productosQ = useProductosQuery('', null, !!isAdmin, true)
  const deleteProd = useDeleteProductoMutation()
  const [err, setErr] = useState<string | null>(null)

  const productRow = useMemo(() => {
    if (!isUuid(productId)) return null
    return (productosQ.data ?? []).find((p) => p.id === productId) ?? null
  }, [productosQ.data, productId])

  const close = () => {
    void navigate({
      to: '/portal',
      search: portalModalReturnSearch(search),
      replace: true,
    })
  }

  useEffect(() => {
    if (!isUuid(productId)) {
      void navigate({
        to: '/portal',
        search: portalModalReturnSearch(search),
        replace: true,
      })
    }
  }, [productId, navigate, search.tab])

  if (!isUuid(productId)) {
    return null
  }

  const target = productRow
    ? { id: productRow.id, nombre: productRow.nombre }
    : { id: productId, nombre: 'Producto' }

  return (
    <ProductDeactivateModal
      product={target}
      variant="light"
      isPending={deleteProd.isPending}
      error={err}
      onClose={() => {
        if (!deleteProd.isPending) {
          setErr(null)
          close()
        }
      }}
      onConfirm={() => {
        setErr(null)
        void deleteProd
          .mutateAsync(productId)
          .then(() => close())
          .catch((e) => setErr(e instanceof Error ? e.message : 'No se pudo desactivar'))
      }}
    />
  )
}
