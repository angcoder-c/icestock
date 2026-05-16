import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { ProductDeactivateModal } from '#/components/product-deactivate-modal'
import { useIcestock } from '#/context/icestock-context'
import { useDeleteProductoMutation, useProductosQuery } from '#/hooks/use-icestock-api'
import { isUuid } from '#/lib/is-uuid'

const empleadoRouteApi = getRouteApi('/empleado')

export const Route = createFileRoute('/empleado/productos/desactivar/$productId')({
  component: EmpleadoProductDeactivateRoute,
})

function EmpleadoProductDeactivateRoute() {
  const { productId } = Route.useParams()
  const navigate = useNavigate()
  const search = empleadoRouteApi.useSearch()
  const { session } = useIcestock()
  const ok = session?.user?.rol === 'cajero'
  const productosQ = useProductosQuery('', null, !!ok, true)
  const deleteProd = useDeleteProductoMutation()
  const [err, setErr] = useState<string | null>(null)

  const productRow = useMemo(() => {
    if (!isUuid(productId)) return null
    return (productosQ.data ?? []).find((p) => p.id === productId) ?? null
  }, [productosQ.data, productId])

  const close = () => {
    void navigate({
      to: '/empleado',
      search:
        search.tab === 'reportes'
          ? { tab: 'reportes', reportSub: search.reportSub ?? 'hoy' }
          : { tab: search.tab ?? 'productos' },
      replace: true,
    })
  }

  useEffect(() => {
    if (!isUuid(productId)) {
      void navigate({
        to: '/empleado',
        search:
          search.tab === 'reportes'
            ? { tab: 'reportes', reportSub: search.reportSub ?? 'hoy' }
            : { tab: search.tab ?? 'productos' },
        replace: true,
      })
    }
  }, [productId, navigate, search.tab, search.reportSub])

  if (!isUuid(productId)) {
    return null
  }

  const target = productRow
    ? { id: productRow.id, nombre: productRow.nombre }
    : { id: productId, nombre: 'Producto' }

  return (
    <ProductDeactivateModal
      product={target}
      variant="dark"
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
