/**
 * Respuesta JSON estándar para rutas bajo `/api` (negocio).
 * No uses códigos sin cuerpo (p. ej. 204): siempre devuelve un objeto JSON.
 */
export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  })
}

export function html(body: string, status = 200, headers?: HeadersInit) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...headers,
    },
  })
}

export function fmtMoney(v: unknown) {
  if (v == null || v === '') return '0.00'
  const n = Number(v)
  if (Number.isNaN(n)) return '0.00'
  return n.toFixed(2)
}

export function isPgFkError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === '23503'
}

export function isPgUniqueError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === '23505'
}

export function mapProductoApi(row: {
  id: string
  nombre: string
  descripcion: string | null
  precio: unknown
  stock: number
  activo: boolean
  imagen_url?: string | null
  categoria_id: string
  categoria_nombre: string
  proveedor_id: string
  proveedor_nombre: string
}) {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio: fmtMoney(row.precio),
    stock: row.stock,
    activo: row.activo,
    imagen_url: row.imagen_url ?? null,
    categoria: { id: row.categoria_id, nombre: row.categoria_nombre },
    proveedor: { id: row.proveedor_id, nombre: row.proveedor_nombre },
  }
}
