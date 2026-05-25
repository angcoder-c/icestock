import dotenv from 'dotenv'
import { hashPassword } from 'better-auth/crypto'
import { v4 as uuidv4 } from 'uuid'

import { pgQuery, runWithDbRole, runWithoutDbRole, withPgTransaction } from '#/lib/db-role'
import { db, pool } from '#/lib/pg-pool'

dotenv.config()

export { db, pool }

type SaleItem = {
  id_producto: string
  cantidad: number
}

/** Personal con cuenta Better Auth (no compradores). */
const SQL_STAFF_ROLES = `'cajero', 'analista', 'admin', 'superadmin'`

// ============================================================
//  AUTENTICACIÓN: Usar Better Auth via sus APIs automáticas
//  POST /api/auth/sign-up/email
//  POST /api/auth/sign-in/email
//  GET  /api/auth/session
//  POST /api/auth/sign-out
// ============================================================

// ============================================================
//  CONSULTAS: VISTAS Y ANALÍTICA
// ============================================================

export async function getVentasDesdeVista(limit = 20) {
  const query = `
    SELECT
      venta_id,
      fecha,
      total,
      estado,
      cliente,
      empleado,
      rol_empleado,
      producto,
      cantidad,
      precio_unit,
      subtotal,
      categoria
    FROM vista_ventas_completa
    ORDER BY fecha DESC, venta_id DESC
    LIMIT $1
  `

  const result = await pgQuery(query, [limit])
  return result.rows
}

export async function getVentasConClienteYEmpleado(limit = 20) {
  const query = `
    SELECT
      v.id,
      v.fecha,
      v.total,
      v.estado,
      comp.nombre AS cliente,
      vend.nombre AS empleado,
      COUNT(dv.id) AS lineas
    FROM Venta v
    LEFT JOIN Usuario comp ON comp.id = v.id_comprador
    LEFT JOIN Usuario vend ON vend.id = v.id_vendedor
    LEFT JOIN DetalleVenta dv ON dv.id_venta = v.id
    GROUP BY v.id, v.fecha, v.total, v.estado, comp.nombre, vend.nombre
    ORDER BY v.fecha DESC
    LIMIT $1
  `

  const result = await pgQuery(query, [limit])
  return result.rows
}

export async function getProductosConCategoriaYProveedor(limit = 30) {
  const query = `
    SELECT
      p.id,
      p.nombre,
      p.precio,
      p.stock,
      p.activo,
      c.nombre AS categoria,
      pr.nombre AS proveedor
    FROM Producto p
    JOIN Categoria c ON c.id = p.id_categoria
    JOIN Proveedor pr ON pr.id = p.id_proveedor
    ORDER BY p.id ASC
    LIMIT $1
  `

  const result = await pgQuery(query, [limit])
  return result.rows
}

export async function getDetalleVentaJoin(limit = 30) {
  const query = `
    SELECT
      dv.id,
      dv.id_venta,
      p.nombre AS producto,
      c.nombre AS categoria,
      dv.cantidad,
      dv.precio_unit,
      dv.subtotal
    FROM DetalleVenta dv
    JOIN Producto p ON p.id = dv.id_producto
    JOIN Categoria c ON c.id = p.id_categoria
    ORDER BY dv.id DESC
    LIMIT $1
  `

  const result = await pgQuery(query, [limit])
  return result.rows
}

export async function getClientesConCompraMayorA(monto: number) {
  const query = `
    SELECT u.id, u.nombre, u.email
    FROM Usuario u
    WHERE u.id IN (
      SELECT v.id_comprador
      FROM Venta v
      WHERE v.id_comprador IS NOT NULL
        AND v.total >= $1
    )
    ORDER BY u.nombre
  `

  const result = await pgQuery(query, [monto])
  return result.rows
}

export async function getProductosSinVentas() {
  const query = `
    SELECT p.id, p.nombre, p.stock, p.activo
    FROM Producto p
    WHERE NOT EXISTS (
      SELECT 1
      FROM DetalleVenta dv
      WHERE dv.id_producto = p.id
    )
    ORDER BY p.id
  `

  const result = await pgQuery(query)
  return result.rows
}

export async function getVentasPorCategoria(minTotal = 0) {
  const query = `
    SELECT
      c.id,
      c.nombre AS categoria,
      COUNT(DISTINCT v.id) AS ventas,
      COALESCE(SUM(dv.subtotal), 0) AS total_vendido,
      COALESCE(AVG(dv.subtotal), 0) AS promedio_linea
    FROM Categoria c
    JOIN Producto p ON p.id_categoria = c.id
    JOIN DetalleVenta dv ON dv.id_producto = p.id
    JOIN Venta v ON v.id = dv.id_venta
    GROUP BY c.id, c.nombre
    HAVING COALESCE(SUM(dv.subtotal), 0) >= $1
    ORDER BY total_vendido DESC
  `

  const result = await pgQuery(query, [minTotal])
  return result.rows
}

export async function getRankingProductosCte() {
  const query = `
    WITH ventas_producto AS (
      SELECT
        p.id,
        p.nombre,
        SUM(dv.cantidad) AS unidades,
        SUM(dv.subtotal) AS monto
      FROM Producto p
      JOIN DetalleVenta dv ON dv.id_producto = p.id
      GROUP BY p.id, p.nombre
    )
    SELECT
      id,
      nombre,
      unidades,
      monto,
      DENSE_RANK() OVER (ORDER BY monto DESC) AS ranking
    FROM ventas_producto
    ORDER BY ranking, nombre
    LIMIT 10
  `

  const result = await pgQuery(query)
  return result.rows
}

export async function crearVentaTransaccional(params: {
  user_id: string
  /** UUID en Usuario del vendedor (id_vendedor). */
  empleado_id: string | null
  /** UUID en Usuario del comprador (id_comprador). */
  id_cliente: string | null
  items: SaleItem[]
}) {
  const itemsJson = JSON.stringify(
    params.items.map((it) => ({
      id_producto: it.id_producto,
      cantidad: it.cantidad,
    })),
  )
  const result = await pgQuery<{ p_venta_id: string; p_total: string }>(
    `CALL sp_registrar_venta($1::text, $2::uuid, $3::uuid, $4::jsonb, NULL, NULL)`,
    [params.user_id, params.id_cliente, params.empleado_id, itemsJson],
  )
  if (result.rowCount === 0) {
    throw new Error('No se pudo registrar la venta')
  }
  const row = result.rows[0]
  return { ventaId: row.p_venta_id, total: Number(row.p_total) }
}

export async function getDashboardData() {
  const [
    vistaVentas,
    ventasJoin,
    productosJoin,
    detalleJoin,
    clientesSubquery,
    productosSinVentasSubquery,
    ventasPorCategoriaAgg,
    rankingCte,
  ] = await Promise.all([
    getVentasDesdeVista(15),
    getVentasConClienteYEmpleado(15),
    getProductosConCategoriaYProveedor(20),
    getDetalleVentaJoin(20),
    getClientesConCompraMayorA(30),
    getProductosSinVentas(),
    getVentasPorCategoria(20),
    getRankingProductosCte(),
  ])

  return {
    vistaVentas,
    joins: {
      ventasJoin,
      productosJoin,
      detalleJoin,
    },
    subqueries: {
      clientesSubquery,
      productosSinVentasSubquery,
    },
    aggregates: ventasPorCategoriaAgg,
    cte: rankingCte,
  }
}

// ============================================================
//  CRUD: CATEGORIA
// ============================================================

export async function createCategoria(nombre: string, descripcion?: string) {
  const query = `
    INSERT INTO Categoria (nombre, descripcion)
    VALUES ($1, $2)
    RETURNING id, nombre, descripcion
  `
  const result = await pgQuery(query, [nombre, descripcion || null])
  return result.rows[0]
}

export async function getCategoria(id: string) {
  const query = 'SELECT id, nombre, descripcion FROM Categoria WHERE id = $1'
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

export async function getCategorias(limit = 50) {
  const query = 'SELECT id, nombre, descripcion FROM Categoria ORDER BY nombre LIMIT $1'
  const result = await pgQuery(query, [limit])
  return result.rows
}

export async function updateCategoria(id: string, nombre?: string, descripcion?: string) {
  let query = 'UPDATE Categoria SET'
  const params: (string | number)[] = []
  const updates: string[] = []

  if (nombre !== undefined) {
    updates.push(`nombre = $${params.length + 1}`)
    params.push(nombre)
  }

  if (descripcion !== undefined) {
    updates.push(`descripcion = $${params.length + 1}`)
    params.push(descripcion)
  }

  if (updates.length === 0) return null

  query += ' ' + updates.join(', ') + ` WHERE id = $${params.length + 1} RETURNING id, nombre, descripcion`
  params.push(id)

  const result = await pgQuery(query, params)
  return result.rows[0] || null
}

export async function deleteCategoria(id: string) {
  const query = 'DELETE FROM Categoria WHERE id = $1 RETURNING id'
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  CRUD: PROVEEDOR
// ============================================================

export async function createProveedor(nombre: string, telefono?: string, email?: string, direccion?: string) {
  const query = `
    INSERT INTO Proveedor (nombre, telefono, email, direccion)
    VALUES ($1, $2, $3, $4)
    RETURNING id, nombre, telefono, email, direccion
  `
  const result = await pgQuery(query, [nombre, telefono || null, email || null, direccion || null])
  return result.rows[0]
}

export async function getProveedor(id: string) {
  const query = 'SELECT id, nombre, telefono, email, direccion FROM Proveedor WHERE id = $1'
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

export async function getProveedores(limit = 50) {
  const query = 'SELECT id, nombre, telefono, email, direccion FROM Proveedor ORDER BY nombre LIMIT $1'
  const result = await pgQuery(query, [limit])
  return result.rows
}

export async function updateProveedor(id: string, nombre?: string, telefono?: string, email?: string, direccion?: string) {
  let query = 'UPDATE Proveedor SET'
  const params: (string | number)[] = []
  const updates: string[] = []

  if (nombre !== undefined) {
    updates.push(`nombre = $${params.length + 1}`)
    params.push(nombre)
  }

  if (telefono !== undefined) {
    updates.push(`telefono = $${params.length + 1}`)
    params.push(telefono)
  }

  if (email !== undefined) {
    updates.push(`email = $${params.length + 1}`)
    params.push(email)
  }

  if (direccion !== undefined) {
    updates.push(`direccion = $${params.length + 1}`)
    params.push(direccion)
  }

  if (updates.length === 0) return null

  query += ' ' + updates.join(', ') + ` WHERE id = $${params.length + 1} RETURNING id, nombre, telefono, email, direccion`
  params.push(id)

  const result = await pgQuery(query, params)
  return result.rows[0] || null
}

export async function deleteProveedor(id: string) {
  const query = 'DELETE FROM Proveedor WHERE id = $1 RETURNING id'
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  CRUD: PRODUCTO
// ============================================================

export async function createProducto(
  nombre: string,
  precio: number,
  id_categoria: string,
  id_proveedor: string,
  descripcion?: string,
  stock: number = 0,
  imagen_url?: string | null,
) {
  const query = `
    INSERT INTO Producto (nombre, descripcion, precio, stock, id_categoria, id_proveedor, imagen_url, activo, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING id, nombre, descripcion, precio, stock, id_categoria, id_proveedor, imagen_url, activo, created_at
  `
  const result = await pgQuery(query, [nombre, descripcion || null, precio, stock, id_categoria, id_proveedor, imagen_url ?? null, true])
  return result.rows[0]
}

export async function getProducto(id: string) {
  const query = `
    SELECT id, nombre, descripcion, precio, stock, id_categoria, id_proveedor, imagen_url, activo, created_at
    FROM Producto WHERE id = $1
  `
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

export async function getProductos(limit = 50, activos_solo = true) {
  let query = 'SELECT id, nombre, descripcion, precio, stock, id_categoria, id_proveedor, imagen_url, activo, created_at FROM Producto'
  if (activos_solo) query += ' WHERE activo = true'
  query += ' ORDER BY nombre LIMIT $1'
  const result = await pgQuery(query, [limit])
  return result.rows
}

export async function updateProducto(
  id: string,
  updates: Partial<{
    nombre: string
    descripcion: string
    precio: number
    stock: number
    id_categoria: string
    id_proveedor: string
    activo: boolean
    imagen_url: string | null
  }>,
) {
  let query = 'UPDATE Producto SET'
  const params: (string | number | boolean | null)[] = []
  const updateParts: string[] = []

  Object.entries(updates).forEach(([key, value]) => {
    updateParts.push(`${key} = $${params.length + 1}`)
    params.push(value)
  })

  if (updateParts.length === 0) return null

  query +=
    ' ' +
    updateParts.join(', ') +
    ` WHERE id = $${params.length + 1} RETURNING id, nombre, descripcion, precio, stock, id_categoria, id_proveedor, imagen_url, activo, created_at`
  params.push(id)

  const result = await pgQuery(query, params)
  return result.rows[0] || null
}

export async function deleteProducto(id: string) {
  const query = 'DELETE FROM Producto WHERE id = $1 RETURNING id'
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  CRUD: CLIENTE (tabla Usuario — compradores)
// ============================================================

export async function createCliente(nombre: string, email?: string, telefono?: string) {
  const query = `
    INSERT INTO Usuario (nombre, email, telefono, activo, created_at)
    VALUES ($1, $2, $3, TRUE, NOW())
    RETURNING id, nombre, email, telefono, created_at
  `
  const result = await pgQuery(query, [nombre, email || null, telefono || null])
  return result.rows[0]
}

export async function getCliente(id: string) {
  const query = `
    SELECT id, nombre, email, telefono, created_at
    FROM Usuario WHERE id = $1
  `
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

export async function getClientes(limit = 50) {
  const query = `
    SELECT u.id, u.nombre, u.email, u.telefono, u.created_at
    FROM Usuario u
    LEFT JOIN "user" usr ON usr.id = u.user_id
    WHERE u.activo = TRUE
      AND (u.user_id IS NULL OR usr.rol = 'cliente')
    ORDER BY u.nombre
    LIMIT $1
  `
  const result = await pgQuery(query, [limit])
  return result.rows
}

/** Perfil de compra vinculado a la cuenta Better Auth (rol cliente). */
export async function getOrCreateClienteForUser(opts: { nombre: string; email: string; userId: string }) {
  const email = opts.email.trim()
  const nombre = opts.nombre.trim()
  if (!email) throw new Error('El usuario no tiene correo para vincular la compra')
  const byUser = await pgQuery(
    `SELECT id, nombre, email, telefono FROM Usuario WHERE user_id = $1 LIMIT 1`,
    [opts.userId],
  )
  if (byUser.rows[0]) return byUser.rows[0] as { id: string; nombre: string; email: string | null; telefono: string | null }
  const find = await pgQuery(
    `SELECT id, nombre, email, telefono FROM Usuario
     WHERE email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1`,
    [email],
  )
  if (find.rows[0]) {
    const row = find.rows[0] as { id: string; nombre: string; email: string | null; telefono: string | null }
    await pgQuery(`UPDATE Usuario SET user_id = $1 WHERE id = $2 AND user_id IS NULL`, [opts.userId, row.id])
    return row
  }
  try {
    const ins = await pgQuery(
      `INSERT INTO Usuario (user_id, nombre, email, telefono, activo, created_at)
       VALUES ($1, $2, $3, NULL, TRUE, NOW())
       RETURNING id, nombre, email, telefono`,
      [opts.userId, nombre, email],
    )
    return ins.rows[0] as { id: string; nombre: string; email: string | null; telefono: string | null }
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === '23505') {
      const again = await pgQuery(
        `SELECT id, nombre, email, telefono FROM Usuario WHERE user_id = $1 LIMIT 1`,
        [opts.userId],
      )
      if (again.rows[0]) return again.rows[0] as { id: string; nombre: string; email: string | null; telefono: string | null }
    }
    throw e
  }
}

export async function updateCliente(id: string, nombre?: string, email?: string, telefono?: string) {
  let query = 'UPDATE Usuario SET'
  const params: (string | number)[] = []
  const updates: string[] = []

  if (nombre !== undefined) {
    updates.push(`nombre = $${params.length + 1}`)
    params.push(nombre)
  }

  if (email !== undefined) {
    updates.push(`email = $${params.length + 1}`)
    params.push(email)
  }

  if (telefono !== undefined) {
    updates.push(`telefono = $${params.length + 1}`)
    params.push(telefono)
  }

  if (updates.length === 0) return null

  query += ' ' + updates.join(', ') + ` WHERE id = $${params.length + 1} RETURNING id, nombre, email, telefono, created_at`
  params.push(id)

  const result = await pgQuery(query, params)
  return result.rows[0] || null
}

export async function deleteCliente(id: string) {
  const query = 'DELETE FROM Usuario WHERE id = $1 RETURNING id'
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  CRUD: EMPLEADO (tabla Usuario — personal con user_id)
// ============================================================

export async function createEmpleado(user_id: string) {
  const auth = await pgQuery(`SELECT name, email FROM "user" WHERE id = $1`, [user_id])
  const u = auth.rows[0] as { name: string; email: string } | undefined
  if (!u) throw new Error('Usuario de autenticación no encontrado')
  const query = `
    INSERT INTO Usuario (user_id, nombre, email, activo, created_at)
    VALUES ($1, $2, $3, TRUE, NOW())
    RETURNING id, user_id, activo, created_at
  `
  const result = await pgQuery(query, [user_id, u.name, u.email])
  return result.rows[0]
}

export async function getEmpleado(id: string) {
  const query = `
    SELECT u.id, u.user_id, u.activo, u.created_at, usr.name, usr.email, usr.rol
    FROM Usuario u
    JOIN "user" usr ON usr.id = u.user_id
    WHERE u.id = $1 AND usr.rol IN (${SQL_STAFF_ROLES})
  `
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

export async function getEmpleados(limit = 50) {
  const query = `
    SELECT u.id, u.user_id, u.activo, u.created_at, usr.name, usr.email, usr.rol
    FROM Usuario u
    JOIN "user" usr ON usr.id = u.user_id
    WHERE usr.rol IN (${SQL_STAFF_ROLES})
    ORDER BY usr.name
    LIMIT $1
  `
  const result = await pgQuery(query, [limit])
  return result.rows
}

export async function updateEmpleado(id: string, activo?: boolean) {
  if (activo === undefined) return null

  const query = `
    UPDATE Usuario SET activo = $1 WHERE id = $2
    RETURNING id, user_id, activo, created_at
  `
  const result = await pgQuery(query, [activo, id])
  return result.rows[0] || null
}

export async function deleteEmpleado(id: string) {
  const query = 'DELETE FROM Usuario WHERE id = $1 RETURNING id'
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  CRUD: VENTA
// ============================================================

export async function createVenta(
  user_id: string,
  id_cliente?: string | null,
  total: number = 0,
  empleado_id: string | null = null,
) {
  const query = `
    INSERT INTO Venta (user_id, id_comprador, id_vendedor, total, fecha, estado)
    VALUES ($1, $2, $3, $4, NOW(), 'completada')
    RETURNING id, user_id, id_comprador, id_vendedor, total, fecha, estado
  `
  const result = await pgQuery(query, [user_id, id_cliente || null, empleado_id, total])
  return result.rows[0]
}

export async function getVenta(id: string) {
  const query = `
    SELECT id, user_id, id_comprador, id_vendedor, total, fecha, estado
    FROM Venta WHERE id = $1
  `
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

export async function getVentas(limit = 50) {
  const query = `
    SELECT id, user_id, id_comprador, id_vendedor, total, fecha, estado
    FROM Venta ORDER BY fecha DESC LIMIT $1
  `
  const result = await pgQuery(query, [limit])
  return result.rows
}

export async function updateVenta(id: string, total?: number, estado?: string) {
  let query = 'UPDATE Venta SET'
  const params: (string | number)[] = []
  const updates: string[] = []

  if (total !== undefined) {
    updates.push(`total = $${params.length + 1}`)
    params.push(total)
  }

  if (estado !== undefined) {
    updates.push(`estado = $${params.length + 1}`)
    params.push(estado)
  }

  if (updates.length === 0) return null

  query += ' ' + updates.join(', ') + ` WHERE id = $${params.length + 1} RETURNING id, user_id, id_comprador, id_vendedor, total, fecha, estado`
  params.push(id)

  const result = await pgQuery(query, params)
  return result.rows[0] || null
}

export async function deleteVenta(id: string) {
  const query = 'DELETE FROM Venta WHERE id = $1 RETURNING id'
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  CRUD: DETALLE VENTA
// ============================================================

export async function createDetalleVenta(id_venta: string, id_producto: string, cantidad: number, precio_unit: number) {
  const query = `
    INSERT INTO DetalleVenta (id_venta, id_producto, cantidad, precio_unit)
    VALUES ($1, $2, $3, $4)
    RETURNING id, id_venta, id_producto, cantidad, precio_unit, subtotal
  `
  const result = await pgQuery(query, [id_venta, id_producto, cantidad, precio_unit])
  return result.rows[0]
}

export async function getDetalleVenta(id: string) {
  const query = `
    SELECT id, id_venta, id_producto, cantidad, precio_unit, subtotal
    FROM DetalleVenta WHERE id = $1
  `
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

export async function getDetallesVenta(id_venta: string) {
  const query = `
    SELECT id, id_venta, id_producto, cantidad, precio_unit, subtotal
    FROM DetalleVenta WHERE id_venta = $1 ORDER BY id
  `
  const result = await pgQuery(query, [id_venta])
  return result.rows
}

export async function updateDetalleVenta(id: string, cantidad?: number, precio_unit?: number) {
  let query = 'UPDATE DetalleVenta SET'
  const params: (string | number)[] = []
  const updates: string[] = []

  if (cantidad !== undefined) {
    updates.push(`cantidad = $${params.length + 1}`)
    params.push(cantidad)
  }

  if (precio_unit !== undefined) {
    updates.push(`precio_unit = $${params.length + 1}`)
    params.push(precio_unit)
  }

  if (updates.length === 0) return null

  query += ' ' + updates.join(', ') + ` WHERE id = $${params.length + 1} RETURNING id, id_venta, id_producto, cantidad, precio_unit, subtotal`
  params.push(id)

  const result = await pgQuery(query, params)
  return result.rows[0] || null
}

export async function deleteDetalleVenta(id: string) {
  const query = 'DELETE FROM DetalleVenta WHERE id = $1 RETURNING id'
  const result = await pgQuery(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  API: conteos y reportes
// ============================================================

export async function countProductosByCategoria(categoriaId: string) {
  const r = await pgQuery('SELECT COUNT(*)::int AS n FROM Producto WHERE id_categoria = $1', [categoriaId])
  return r.rows[0].n as number
}

export async function countProductosByProveedor(proveedorId: string) {
  const r = await pgQuery('SELECT COUNT(*)::int AS n FROM Producto WHERE id_proveedor = $1', [proveedorId])
  return r.rows[0].n as number
}

export async function getVentasByClienteId(clienteId: string, limit = 200) {
  const result = await pgQuery(
    `SELECT id, fecha, total, estado, lineas FROM fn_mis_compras($1::uuid, $2::int)`,
    [clienteId, limit],
  )
  return result.rows
}

export async function getVentasListApi(fecha_inicio?: string | null, fecha_fin?: string | null, limit = 500) {
  const params: (string | number)[] = []
  let i = 0
  let where = 'WHERE 1=1'
  if (fecha_inicio) {
    i++
    where += ` AND v.fecha >= $${i}::date`
    params.push(fecha_inicio)
  }
  if (fecha_fin) {
    i++
    where += ` AND v.fecha < ($${i}::date + interval '1 day')`
    params.push(fecha_fin)
  }
  i++
  params.push(limit)
  const query = `
    SELECT
      v.id,
      v.fecha,
      v.total,
      v.estado,
      comp.nombre AS cliente,
      vend.nombre AS empleado
    FROM Venta v
    LEFT JOIN Usuario comp ON comp.id = v.id_comprador
    LEFT JOIN Usuario vend ON vend.id = v.id_vendedor
    ${where}
    ORDER BY v.fecha DESC
    LIMIT $${i}
  `
  const result = await pgQuery(query, params)
  return result.rows
}

export async function getVentaDetalleApi(ventaId: string) {
  const head = await pgQuery(
    `
      SELECT
        v.id,
        v.fecha,
        v.total,
        v.estado,
        comp.id AS cliente_id,
        comp.nombre AS cliente_nombre,
        vend.id AS empleado_id,
        vend.nombre AS empleado_nombre
      FROM Venta v
      LEFT JOIN Usuario comp ON comp.id = v.id_comprador
      LEFT JOIN Usuario vend ON vend.id = v.id_vendedor
      WHERE v.id = $1
    `,
    [ventaId],
  )
  if (head.rowCount === 0) return null
  const h = head.rows[0]
  const det = await pgQuery(
    `
      SELECT dv.id_producto, p.nombre AS producto, dv.cantidad, dv.precio_unit, dv.subtotal
      FROM DetalleVenta dv
      JOIN Producto p ON p.id = dv.id_producto
      WHERE dv.id_venta = $1
      ORDER BY dv.id
    `,
    [ventaId],
  )
  return { head: h, detalle: det.rows }
}

export async function anularVentaTransaccional(ventaId: string) {
  try {
    await pgQuery(`CALL sp_anular_venta($1::uuid, NULL)`, [ventaId])
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('no encontrada')) {
      throw Object.assign(new Error('Venta no encontrada'), { code: 'NOT_FOUND' })
    }
    throw e
  }
}

export async function getProductosListApi(opts: {
  categoria?: string | null
  search?: string | null
  stock_bajo?: boolean | null
  incluir_inactivos?: boolean | null
  limit?: number
}) {
  const limit = opts.limit ?? 200
  const sinFiltrosStaff =
    !opts.categoria && !opts.search && !opts.stock_bajo && !opts.incluir_inactivos
  if (sinFiltrosStaff) {
    const result = await pgQuery(
      `
        SELECT
          id,
          nombre,
          descripcion,
          precio,
          stock,
          imagen_url,
          activo,
          categoria_id,
          categoria_nombre,
          proveedor_id,
          proveedor_nombre
        FROM fn_catalogo_activo($1::int)
      `,
      [limit],
    )
    return result.rows
  }

  const params: unknown[] = []
  let where = 'WHERE 1=1'
  if (!opts.incluir_inactivos) {
    where += ' AND p.activo = TRUE'
  }
  if (opts.categoria != null) {
    params.push(opts.categoria)
    where += ` AND p.id_categoria = $${params.length}`
  }
  if (opts.search) {
    params.push(`%${opts.search}%`)
    where += ` AND p.nombre ILIKE $${params.length}`
  }
  if (opts.stock_bajo) {
    where += ' AND p.stock < 20'
  }
  params.push(limit)
  const query = `
    SELECT
      p.id,
      p.nombre,
      p.descripcion,
      p.precio,
      p.stock,
      p.imagen_url,
      p.activo,
      c.id AS categoria_id,
      c.nombre AS categoria_nombre,
      pr.id AS proveedor_id,
      pr.nombre AS proveedor_nombre
    FROM Producto p
    JOIN Categoria c ON c.id = p.id_categoria
    JOIN Proveedor pr ON pr.id = p.id_proveedor
    ${where}
    ORDER BY p.nombre
    LIMIT $${params.length}
  `
  const result = await pgQuery(query, params)
  return result.rows
}

export async function getProductoEnriquecido(id: string) {
  const result = await pgQuery(
    `
      SELECT
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.stock,
        p.imagen_url,
        p.activo,
        c.id AS categoria_id,
        c.nombre AS categoria_nombre,
        pr.id AS proveedor_id,
        pr.nombre AS proveedor_nombre
      FROM Producto p
      JOIN Categoria c ON c.id = p.id_categoria
      JOIN Proveedor pr ON pr.id = p.id_proveedor
      WHERE p.id = $1
    `,
    [id],
  )
  return result.rows[0] || null
}

export async function softDeleteProducto(id: string) {
  const result = await pgQuery(
    'UPDATE Producto SET activo = FALSE WHERE id = $1 RETURNING id',
    [id],
  )
  return result.rows[0] || null
}

export async function getClienteConStats(id: string) {
  const base = await getCliente(id)
  if (!base) return null
  const stats = await pgQuery(
    `
      SELECT
        COUNT(*)::int AS total_compras,
        COALESCE(SUM(total), 0) AS monto_total
      FROM Venta
      WHERE id_comprador = $1 AND estado = 'completada'
    `,
    [id],
  )
  const s = stats.rows[0]
  return {
    ...base,
    total_compras: s.total_compras,
    monto_total: s.monto_total,
  }
}

export async function getReporteVentasDelDia(fecha?: string | null) {
  const day = fecha || new Date().toISOString().slice(0, 10)
  const list = await pgQuery(
    `
      SELECT venta_id, fecha, total, estado, cliente, empleado, producto, cantidad, precio_unit, subtotal, categoria
      FROM vista_ventas_completa
      WHERE fecha::date = $1::date
      ORDER BY fecha DESC, venta_id DESC
    `,
    [day],
  )
  const agg = await pgQuery(
    `
      SELECT
        COUNT(DISTINCT venta_id)::int AS total_ventas,
        COALESCE(SUM(subtotal), 0) AS ingresos
      FROM vista_ventas_completa
      WHERE fecha::date = $1::date
    `,
    [day],
  )
  const a = agg.rows[0]
  return {
    fecha: day,
    total_ventas: a.total_ventas,
    ingresos: String(a.ingresos),
    ventas: list.rows,
  }
}

export async function getProductosMasVendidosApi(fecha_inicio?: string | null, fecha_fin?: string | null) {
  const params: unknown[] = []
  let dateFilter = ''
  if (fecha_inicio) {
    params.push(fecha_inicio)
    dateFilter += ` AND v.fecha >= $${params.length}::date`
  }
  if (fecha_fin) {
    params.push(fecha_fin)
    dateFilter += ` AND v.fecha < ($${params.length}::date + interval '1 day')`
  }
  const query = `
    WITH ventas_filtradas AS (
      SELECT dv.id_producto, dv.cantidad, dv.subtotal, p.nombre, cat.nombre AS categoria
      FROM DetalleVenta dv
      JOIN Venta v ON v.id = dv.id_venta AND v.estado = 'completada'
      JOIN Producto p ON p.id = dv.id_producto
      JOIN Categoria cat ON cat.id = p.id_categoria
      WHERE 1=1 ${dateFilter}
    ),
    agg AS (
      SELECT
        id_producto,
        MAX(nombre) AS producto,
        MAX(categoria) AS categoria,
        SUM(cantidad)::bigint AS total_vendido,
        SUM(subtotal) AS ingresos
      FROM ventas_filtradas
      GROUP BY id_producto
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY ingresos DESC NULLS LAST, producto) AS rank,
      id_producto,
      producto,
      categoria,
      total_vendido,
      ingresos
    FROM agg
    ORDER BY rank
    LIMIT 50
  `
  const result = await pgQuery(query, params)
  return result.rows
}

export async function getStockDisponibleApi() {
  const result = await pgQuery(`
    SELECT id, nombre AS producto, stock, (stock < 20) AS alerta
    FROM Producto
    WHERE activo = TRUE
    ORDER BY stock ASC, nombre
  `)
  return result.rows
}

export async function getVentasPorCategoriaReporteApi() {
  const result = await pgQuery(`
    SELECT
      cat.nombre AS categoria,
      SUM(dv.cantidad)::bigint AS total_vendido,
      SUM(dv.subtotal) AS ingresos
    FROM DetalleVenta dv
    JOIN Venta v ON v.id = dv.id_venta AND v.estado = 'completada'
    JOIN Producto p ON p.id = dv.id_producto
    JOIN Categoria cat ON cat.id = p.id_categoria
    GROUP BY cat.id, cat.nombre
    HAVING SUM(dv.subtotal) > 0
    ORDER BY ingresos DESC
  `)
  return result.rows
}

export async function getClientesFrecuentesApi() {
  const result = await pgQuery(
    `SELECT id, nombre, total_compras, monto_total FROM fn_clientes_frecuentes()`,
  )
  return result.rows
}

export async function findUserByEmail(email: string) {
  const r = await pgQuery('SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)', [email])
  return r.rows[0]?.id as string | undefined
}

export async function countSuperadmins(): Promise<number> {
  const r = await pgQuery(`SELECT COUNT(*)::int AS n FROM "user" WHERE rol = 'superadmin'`)
  return Number(r.rows[0]?.n ?? 0)
}

export async function getSetupStatus() {
  const superadminCount = await countSuperadmins()
  return { needsBootstrap: superadminCount === 0, superadminCount }
}

/** Primer superadmin (instalación vacía). Solo cuando no hay ningún superadmin en BD. */
export async function bootstrapSuperadmin(input: { nombre: string; email: string; password: string }) {
  if ((await countSuperadmins()) > 0) {
    throw Object.assign(new Error('Ya existe un superadministrador en el sistema'), { code: 'BOOTSTRAP_DONE' })
  }
  if (input.password.length < 8) {
    throw Object.assign(new Error('La contraseña debe tener al menos 8 caracteres'), { code: 'INVALID' })
  }
  return createUserAccountAndEmpleado({
    nombre: input.nombre.trim(),
    email: input.email.trim(),
    password: input.password,
    rol: 'superadmin',
  })
}

export async function createUserAccountAndEmpleado(input: {
  nombre: string
  email: string
  password: string
  rol: string
}) {
  return runWithoutDbRole(async () => {
    const existing = await findUserByEmail(input.email)
    if (existing) {
      throw Object.assign(new Error('El email ya está registrado'), { code: 'DUPLICATE' })
    }
    const userId = `usr_${uuidv4().replace(/-/g, '').slice(0, 12)}`
    const accountId = `acc_${uuidv4().replace(/-/g, '').slice(0, 12)}`
    const hashed = await hashPassword(input.password)
    await withPgTransaction(async (client) => {
      await client.query(
        `
          INSERT INTO "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", rol)
          VALUES ($1, $2, $3, FALSE, NULL, NOW(), NOW(), $4)
        `,
        [userId, input.nombre, input.email.toLowerCase(), input.rol],
      )
      await client.query(
        `
          INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
          VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())
        `,
        [accountId, input.email.toLowerCase(), userId, hashed],
      )
    })
    await runWithDbRole('admin', async () => {
      await pgQuery(
        `INSERT INTO Usuario (user_id, nombre, email, activo, created_at)
         VALUES ($1, $2, $3, TRUE, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, input.nombre, input.email.toLowerCase()],
      )
    })
    return { user_id: userId, nombre: input.nombre, rol: input.rol }
  })
}

export async function updateUserEmpleadoProfile(userId: string, nombre?: string, rol?: string) {
  const parts: string[] = []
  const params: unknown[] = []
  if (nombre !== undefined) {
    params.push(nombre)
    parts.push(`"name" = $${params.length}`)
  }
  if (rol !== undefined) {
    params.push(rol)
    parts.push(`rol = $${params.length}`)
  }
  if (parts.length === 0) return null
  params.push(userId)
  const q = `UPDATE "user" SET ${parts.join(', ')}, "updatedAt" = NOW() WHERE id = $${params.length} RETURNING id, name, rol`
  const r = await pgQuery(q, params)
  return r.rows[0] || null
}

export async function deactivateEmpleadoByUserId(userId: string) {
  const r = await pgQuery(
    'UPDATE Usuario SET activo = FALSE WHERE user_id = $1 RETURNING id',
    [userId],
  )
  return r.rows[0] || null
}

export async function getEmpleadoByUserId(userId: string) {
  const r = await pgQuery(
    `
      SELECT u.id, u.user_id, u.activo, u.created_at, usr.name, usr.email, usr.rol
      FROM Usuario u
      JOIN "user" usr ON usr.id = u.user_id
      WHERE u.user_id = $1 AND usr.rol IN (${SQL_STAFF_ROLES})
    `,
    [userId],
  )
  return r.rows[0] || null
}

/** Vincula la sesión de personal a un registro Usuario (vendedor) para ventas en POS. */
export async function getOrCreateEmpleadoForUser(userId: string) {
  const existing = await getEmpleadoByUserId(userId)
  if (existing) return existing
  try {
    return await createEmpleado(userId)
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === '23505') {
      const again = await getEmpleadoByUserId(userId)
      if (again) return again
    }
    throw e
  }
}
