import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '#/lib/api-fetch'

export type CategoriaApi = {
  id: number
  nombre: string
  descripcion: string | null
}

export function useCategoriasQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => apiFetch<CategoriaApi[]>('/api/categorias'),
    enabled,
  })
}

export type ProductoApi = {
  id: number
  nombre: string
  descripcion: string | null
  precio: string
  stock: number
  activo: boolean
  imagen_url: string | null
  categoria: { id: number; nombre: string }
  proveedor: { id: number; nombre: string }
}

export function useProductosQuery(search: string, categoria: number | null, enabled: boolean, incluirInactivos = false) {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  if (categoria != null) params.set('categoria', String(categoria))
  params.set('incluir_inactivos', incluirInactivos ? 'true' : 'false')
  const qs = params.toString()
  const url = `/api/productos${qs ? `?${qs}` : ''}`

  return useQuery({
    queryKey: ['productos', search, categoria, incluirInactivos],
    queryFn: () => apiFetch<ProductoApi[]>(url),
    enabled,
  })
}

export type VentasDelDia = {
  fecha: string
  total_ventas: number
  ingresos: string
  ventas: unknown[]
}

export function useVentasDelDiaQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['reportes', 'ventas-del-dia'],
    queryFn: () => apiFetch<VentasDelDia>('/api/reportes/ventas-del-dia'),
    enabled,
  })
}

export function useCreateVentaMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { id_cliente: number | null; items: { id_producto: number; cantidad: number }[] }) =>
      apiFetch<{ id: number; total: string; fecha: string; mensaje: string }>('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reportes', 'ventas-del-dia'] })
      void qc.invalidateQueries({ queryKey: ['productos'] })
      void qc.invalidateQueries({ queryKey: ['ventas', 'list'] })
    },
  })
}

export type ClienteListApi = {
  id: number
  nombre: string
  email: string | null
  telefono: string | null
  creado_en: string
}

export function useClientesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: () => apiFetch<ClienteListApi[]>('/api/clientes'),
    enabled,
  })
}

export type ClienteMeApi = {
  id: number
  nombre: string
  email: string | null
  telefono: string | null
}

export function useClienteMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['clientes', 'me'],
    queryFn: () => apiFetch<ClienteMeApi>('/api/clientes/me'),
    enabled,
  })
}

export function useProductoQuery(id: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['productos', 'detail', id],
    queryFn: () => apiFetch<ProductoApi>(`/api/productos/${id}`),
    enabled: enabled && id != null,
  })
}

export function useCreateClienteMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { nombre: string; email?: string | null; telefono?: string | null }) =>
      apiFetch<{ id: number; nombre: string; email: string | null }>('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export type VentaListItem = {
  id: number
  fecha: string
  total: string
  estado: string
  cliente: string
  empleado: string
}

export function useVentasListQuery(enabled: boolean, fechaInicio?: string | null, fechaFin?: string | null) {
  const params = new URLSearchParams()
  if (fechaInicio) params.set('fecha_inicio', fechaInicio)
  if (fechaFin) params.set('fecha_fin', fechaFin)
  const qs = params.toString()
  return useQuery({
    queryKey: ['ventas', 'list', fechaInicio ?? '', fechaFin ?? ''],
    queryFn: () => apiFetch<VentaListItem[]>(`/api/ventas${qs ? `?${qs}` : ''}`),
    enabled,
  })
}

export type ProveedorApi = {
  id: number
  nombre: string
  telefono?: string | null
  email?: string | null
  direccion?: string | null
}

export function useProveedoresQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['proveedores'],
    queryFn: () => apiFetch<ProveedorApi[]>('/api/proveedores'),
    enabled,
  })
}

export function useCreateProductoMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      nombre: string
      descripcion?: string | null
      precio: number
      stock: number
      id_categoria: number
      id_proveedor: number
      imagen_url?: string | null
    }) =>
      apiFetch<ProductoApi>('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}

export function useUpdateProductoMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: number
      nombre?: string
      descripcion?: string | null
      precio?: number
      stock?: number
      id_categoria?: number
      id_proveedor?: number
      activo?: boolean
      imagen_url?: string | null
    }) => {
      const { id, ...body } = args
      return apiFetch<ProductoApi>(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['productos'] })
      void qc.invalidateQueries({ queryKey: ['productos', 'detail'] })
    },
  })
}

export function useDeleteProductoMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ mensaje: string }>(`/api/productos/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}

export function useUpdateClienteMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: number; nombre?: string; email?: string | null; telefono?: string | null }) => {
      const { id, ...body } = args
      return apiFetch<{ id: number; nombre: string; telefono: string | null }>(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export function useProductosStockBajoQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['productos', 'stock-bajo'],
    queryFn: () => apiFetch<ProductoApi[]>('/api/productos?stock_bajo=true&incluir_inactivos=true'),
    enabled,
  })
}

export type ProductoMasVendido = {
  rank: number
  id_producto: number
  producto: string
  categoria: string
  total_vendido: number
  ingresos: string
}

export function useProductosMasVendidosQuery(enabled: boolean, fechaInicio?: string, fechaFin?: string) {
  const params = new URLSearchParams()
  if (fechaInicio) params.set('fecha_inicio', fechaInicio)
  if (fechaFin) params.set('fecha_fin', fechaFin)
  const qs = params.toString()
  return useQuery({
    queryKey: ['reportes', 'productos-mas-vendidos', fechaInicio ?? '', fechaFin ?? ''],
    queryFn: () => apiFetch<ProductoMasVendido[]>(`/api/reportes/productos-mas-vendidos${qs ? `?${qs}` : ''}`),
    enabled,
  })
}

export type StockDisponibleRow = { id: number; producto: string; stock: number; alerta: boolean }

export function useStockDisponibleQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['reportes', 'stock-disponible'],
    queryFn: () => apiFetch<StockDisponibleRow[]>('/api/reportes/stock-disponible'),
    enabled,
  })
}

export type VentaPorCategoria = { categoria: string; total_vendido: number; ingresos: string }

export function useVentasPorCategoriaQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['reportes', 'ventas-por-categoria'],
    queryFn: () => apiFetch<VentaPorCategoria[]>('/api/reportes/ventas-por-categoria'),
    enabled,
  })
}

export type ClienteFrecuente = { id: number; nombre: string; total_compras: number; monto_total: string }

export function useClientesFrecuentesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['reportes', 'clientes-frecuentes'],
    queryFn: () => apiFetch<ClienteFrecuente[]>('/api/reportes/clientes-frecuentes'),
    enabled,
  })
}

export type UploadImagenResponse = {
  url: string
  public_id: string
  producto?: ProductoApi
}

export function useUploadProductImageMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { file: File; id_producto?: number }) => {
      const form = new FormData()
      form.append('file', input.file)
      if (input.id_producto != null) form.append('id_producto', String(input.id_producto))
      const res = await fetch('/api/upload/imagen', { method: 'POST', body: form, credentials: 'include' })
      const data = (await res.json()) as { error?: string } & Partial<UploadImagenResponse>
      if (!res.ok) throw new Error(data.error || 'No se pudo subir la imagen')
      return data as UploadImagenResponse
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}
