import pg from 'pg'
import dotenv from 'dotenv'
import { hashPassword } from 'better-auth/crypto'
import { v4 as uuidv4 } from 'uuid'

dotenv.config()

type SaleItem = {
  id_producto: string
  cantidad: number
}

import { pgPoolConfig } from '#/lib/pg-config'

export const db = new pg.Pool(pgPoolConfig())

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

  const result = await db.query(query, [limit])
  return result.rows
}

export async function getVentasConClienteYEmpleado(limit = 20) {
  const query = `
    SELECT
      v.id,
      v.fecha,
      v.total,
      v.estado,
      c.nombre AS cliente,
      u.name AS empleado,
      COUNT(dv.id) AS lineas
    FROM Venta v
    LEFT JOIN Cliente c ON c.id = v.id_cliente
    LEFT JOIN Empleado e ON e.id = v.empleado_id
    LEFT JOIN "user" u ON u.id = e.user_id
    LEFT JOIN DetalleVenta dv ON dv.id_venta = v.id
    GROUP BY v.id, v.fecha, v.total, v.estado, c.nombre, u.name
    ORDER BY v.fecha DESC
    LIMIT $1
  `

  const result = await db.query(query, [limit])
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

  const result = await db.query(query, [limit])
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

  const result = await db.query(query, [limit])
  return result.rows
}

export async function getClientesConCompraMayorA(monto: number) {
  const query = `
    SELECT c.id, c.nombre, c.email
    FROM Cliente c
    WHERE c.id IN (
      SELECT v.id_cliente
      FROM Venta v
      WHERE v.id_cliente IS NOT NULL
        AND v.total >= $1
    )
    ORDER BY c.nombre
  `

  const result = await db.query(query, [monto])
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

  const result = await db.query(query)
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

  const result = await db.query(query, [minTotal])
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

  const result = await db.query(query)
  return result.rows
}

export async function crearVentaTransaccional(params: {
  user_id: string
  empleado_id: string | null
  id_cliente: string | null
  items: SaleItem[]
}) {
  const client = await db.connect()

  try {
    await client.query('BEGIN')

    let total = 0

    for (const item of params.items) {
      const stockResult = await client.query(
        `
          SELECT id, precio, stock
          FROM Producto
          WHERE id = $1
            AND activo = TRUE
          FOR UPDATE
        `,
        [item.id_producto],
      )

      if (stockResult.rowCount === 0) {
        throw new Error(`Producto ${item.id_producto} no existe o no está activo`)
      }

      const producto = stockResult.rows[0]
      if (Number(producto.stock) < item.cantidad) {
        throw new Error(`Stock insuficiente para producto ${item.id_producto}`)
      }

      total += Number(producto.precio) * item.cantidad
    }

    const ventaResult = await client.query(
      `
        INSERT INTO Venta (id_cliente, user_id, empleado_id, total)
        VALUES ($1, $2, $3, 0)
        RETURNING id
      `,
      [params.id_cliente, params.user_id, params.empleado_id],
    )

    const ventaId = ventaResult.rows[0].id as string

    for (const item of params.items) {
      const precioResult = await client.query('SELECT precio FROM Producto WHERE id = $1', [
        item.id_producto,
      ])

      const precio = Number(precioResult.rows[0].precio)

      await client.query(
        `
          INSERT INTO DetalleVenta (id_venta, id_producto, cantidad, precio_unit)
          VALUES ($1, $2, $3, $4)
        `,
        [ventaId, item.id_producto, item.cantidad, precio],
      )

      await client.query(
        `
          UPDATE Producto
          SET stock = stock - $1
          WHERE id = $2
        `,
        [item.cantidad, item.id_producto],
      )
    }

    await client.query('UPDATE Venta SET total = $1 WHERE id = $2', [total, ventaId])

    await client.query('COMMIT')

    return { ventaId, total }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
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
  const result = await db.query(query, [nombre, descripcion || null])
  return result.rows[0]
}

export async function getCategoria(id: string) {
  const query = 'SELECT id, nombre, descripcion FROM Categoria WHERE id = $1'
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

export async function getCategorias(limit = 50) {
  const query = 'SELECT id, nombre, descripcion FROM Categoria ORDER BY nombre LIMIT $1'
  const result = await db.query(query, [limit])
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

  const result = await db.query(query, params)
  return result.rows[0] || null
}

export async function deleteCategoria(id: string) {
  const query = 'DELETE FROM Categoria WHERE id = $1 RETURNING id'
  const result = await db.query(query, [id])
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
  const result = await db.query(query, [nombre, telefono || null, email || null, direccion || null])
  return result.rows[0]
}

export async function getProveedor(id: string) {
  const query = 'SELECT id, nombre, telefono, email, direccion FROM Proveedor WHERE id = $1'
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

export async function getProveedores(limit = 50) {
  const query = 'SELECT id, nombre, telefono, email, direccion FROM Proveedor ORDER BY nombre LIMIT $1'
  const result = await db.query(query, [limit])
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

  const result = await db.query(query, params)
  return result.rows[0] || null
}

export async function deleteProveedor(id: string) {
  const query = 'DELETE FROM Proveedor WHERE id = $1 RETURNING id'
  const result = await db.query(query, [id])
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
  const result = await db.query(query, [nombre, descripcion || null, precio, stock, id_categoria, id_proveedor, imagen_url ?? null, true])
  return result.rows[0]
}

export async function getProducto(id: string) {
  const query = `
    SELECT id, nombre, descripcion, precio, stock, id_categoria, id_proveedor, imagen_url, activo, created_at
    FROM Producto WHERE id = $1
  `
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

export async function getProductos(limit = 50, activos_solo = true) {
  let query = 'SELECT id, nombre, descripcion, precio, stock, id_categoria, id_proveedor, imagen_url, activo, created_at FROM Producto'
  if (activos_solo) query += ' WHERE activo = true'
  query += ' ORDER BY nombre LIMIT $1'
  const result = await db.query(query, [limit])
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

  const result = await db.query(query, params)
  return result.rows[0] || null
}

export async function deleteProducto(id: string) {
  const query = 'DELETE FROM Producto WHERE id = $1 RETURNING id'
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  CRUD: CLIENTE
// ============================================================

export async function createCliente(nombre: string, email?: string, telefono?: string) {
  const query = `
    INSERT INTO Cliente (nombre, email, telefono, created_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING id, nombre, email, telefono, created_at
  `
  const result = await db.query(query, [nombre, email || null, telefono || null])
  return result.rows[0]
}

export async function getCliente(id: string) {
  const query = `
    SELECT id, nombre, email, telefono, created_at
    FROM Cliente WHERE id = $1
  `
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

export async function getClientes(limit = 50) {
  const query = `
    SELECT id, nombre, email, telefono, created_at
    FROM Cliente ORDER BY nombre LIMIT $1
  `
  const result = await db.query(query, [limit])
  return result.rows
}

/** Perfil de compra vinculado al correo del usuario (registro en Cliente). */
export async function getOrCreateClienteForUser(opts: { nombre: string; email: string }) {
  const email = opts.email.trim()
  const nombre = opts.nombre.trim()
  if (!email) throw new Error('El usuario no tiene correo para vincular la compra')
  const find = await db.query(
    `SELECT id, nombre, email, telefono FROM Cliente
     WHERE email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1`,
    [email],
  )
  if (find.rows[0]) return find.rows[0] as { id: string; nombre: string; email: string | null; telefono: string | null }
  try {
    const ins = await db.query(
      `INSERT INTO Cliente (nombre, email, telefono, created_at)
       VALUES ($1, $2, NULL, NOW())
       RETURNING id, nombre, email, telefono`,
      [nombre, email],
    )
    return ins.rows[0] as { id: string; nombre: string; email: string | null; telefono: string | null }
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === '23505') {
      const again = await db.query(
        `SELECT id, nombre, email, telefono FROM Cliente
         WHERE email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1`,
        [email],
      )
      if (again.rows[0]) return again.rows[0] as { id: string; nombre: string; email: string | null; telefono: string | null }
    }
    throw e
  }
}

export async function updateCliente(id: string, nombre?: string, email?: string, telefono?: string) {
  let query = 'UPDATE Cliente SET'
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

  const result = await db.query(query, params)
  return result.rows[0] || null
}

export async function deleteCliente(id: string) {
  const query = 'DELETE FROM Cliente WHERE id = $1 RETURNING id'
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  CRUD: EMPLEADO (vinculado a Better Auth user)
// ============================================================

export async function createEmpleado(user_id: string) {
  const query = `
    INSERT INTO Empleado (user_id, activo, created_at)
    VALUES ($1, $2, NOW())
    RETURNING id, user_id, activo, created_at
  `
  const result = await db.query(query, [user_id, true])
  return result.rows[0]
}

export async function getEmpleado(id: string) {
  const query = `
    SELECT e.id, e.user_id, e.activo, e.created_at, u.name, u.email, u.rol
    FROM Empleado e
    JOIN "user" u ON u.id = e.user_id
    WHERE e.id = $1
  `
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

export async function getEmpleados(limit = 50) {
  const query = `
    SELECT e.id, e.user_id, e.activo, e.created_at, u.name, u.email, u.rol
    FROM Empleado e
    JOIN "user" u ON u.id = e.user_id
    ORDER BY u.name LIMIT $1
  `
  const result = await db.query(query, [limit])
  return result.rows
}

export async function updateEmpleado(id: string, activo?: boolean) {
  if (activo === undefined) return null

  const query = `
    UPDATE Empleado SET activo = $1 WHERE id = $2
    RETURNING id, user_id, activo, created_at
  `
  const result = await db.query(query, [activo, id])
  return result.rows[0] || null
}

export async function deleteEmpleado(id: string) {
  const query = 'DELETE FROM Empleado WHERE id = $1 RETURNING id'
  const result = await db.query(query, [id])
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
    INSERT INTO Venta (user_id, id_cliente, empleado_id, total, fecha, estado)
    VALUES ($1, $2, $3, $4, NOW(), 'completada')
    RETURNING id, user_id, id_cliente, empleado_id, total, fecha, estado
  `
  const result = await db.query(query, [user_id, id_cliente || null, empleado_id, total])
  return result.rows[0]
}

export async function getVenta(id: string) {
  const query = `
    SELECT id, user_id, id_cliente, empleado_id, total, fecha, estado
    FROM Venta WHERE id = $1
  `
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

export async function getVentas(limit = 50) {
  const query = `
    SELECT id, user_id, id_cliente, total, fecha, estado
    FROM Venta ORDER BY fecha DESC LIMIT $1
  `
  const result = await db.query(query, [limit])
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

  query += ' ' + updates.join(', ') + ` WHERE id = $${params.length + 1} RETURNING id, user_id, id_cliente, total, fecha, estado`
  params.push(id)

  const result = await db.query(query, params)
  return result.rows[0] || null
}

export async function deleteVenta(id: string) {
  const query = 'DELETE FROM Venta WHERE id = $1 RETURNING id'
  const result = await db.query(query, [id])
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
  const result = await db.query(query, [id_venta, id_producto, cantidad, precio_unit])
  return result.rows[0]
}

export async function getDetalleVenta(id: string) {
  const query = `
    SELECT id, id_venta, id_producto, cantidad, precio_unit, subtotal
    FROM DetalleVenta WHERE id = $1
  `
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

export async function getDetallesVenta(id_venta: string) {
  const query = `
    SELECT id, id_venta, id_producto, cantidad, precio_unit, subtotal
    FROM DetalleVenta WHERE id_venta = $1 ORDER BY id
  `
  const result = await db.query(query, [id_venta])
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

  const result = await db.query(query, params)
  return result.rows[0] || null
}

export async function deleteDetalleVenta(id: string) {
  const query = 'DELETE FROM DetalleVenta WHERE id = $1 RETURNING id'
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  API: conteos y reportes
// ============================================================

export async function countProductosByCategoria(categoriaId: string) {
  const r = await db.query('SELECT COUNT(*)::int AS n FROM Producto WHERE id_categoria = $1', [categoriaId])
  return r.rows[0].n as number
}

export async function countProductosByProveedor(proveedorId: string) {
  const r = await db.query('SELECT COUNT(*)::int AS n FROM Producto WHERE id_proveedor = $1', [proveedorId])
  return r.rows[0].n as number
}

export async function getVentasByClienteId(clienteId: string, limit = 200) {
  const result = await db.query(
    `
      SELECT
        v.id,
        v.fecha,
        v.total,
        v.estado,
        (SELECT COUNT(*)::int FROM DetalleVenta dv WHERE dv.id_venta = v.id) AS lineas
      FROM Venta v
      WHERE v.id_cliente = $1
      ORDER BY v.fecha DESC
      LIMIT $2
    `,
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
      c.nombre AS cliente,
      u.name AS empleado
    FROM Venta v
    LEFT JOIN Cliente c ON c.id = v.id_cliente
    LEFT JOIN Empleado e ON e.id = v.empleado_id
    LEFT JOIN "user" u ON u.id = e.user_id
    ${where}
    ORDER BY v.fecha DESC
    LIMIT $${i}
  `
  const result = await db.query(query, params)
  return result.rows
}

export async function getVentaDetalleApi(ventaId: string) {
  const head = await db.query(
    `
      SELECT
        v.id,
        v.fecha,
        v.total,
        v.estado,
        c.id AS cliente_id,
        c.nombre AS cliente_nombre,
        e.id AS empleado_id,
        u.name AS empleado_nombre
      FROM Venta v
      LEFT JOIN Cliente c ON c.id = v.id_cliente
      LEFT JOIN Empleado e ON e.id = v.empleado_id
      LEFT JOIN "user" u ON u.id = e.user_id
      WHERE v.id = $1
    `,
    [ventaId],
  )
  if (head.rowCount === 0) return null
  const h = head.rows[0]
  const det = await db.query(
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
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const v = await client.query('SELECT id, estado FROM Venta WHERE id = $1 FOR UPDATE', [ventaId])
    if (v.rowCount === 0) {
      throw Object.assign(new Error('Venta no encontrada'), { code: 'NOT_FOUND' })
    }
    if (v.rows[0].estado !== 'completada') {
      throw new Error('La venta ya está anulada')
    }
    const dvs = await client.query(
      'SELECT id_producto, cantidad FROM DetalleVenta WHERE id_venta = $1',
      [ventaId],
    )
    for (const row of dvs.rows) {
      await client.query('UPDATE Producto SET stock = stock + $1 WHERE id = $2', [
        row.cantidad,
        row.id_producto,
      ])
    }
    await client.query(`UPDATE Venta SET estado = 'anulada' WHERE id = $1`, [ventaId])
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
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
  const result = await db.query(query, params)
  return result.rows
}

export async function getProductoEnriquecido(id: string) {
  const result = await db.query(
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
  const result = await db.query(
    'UPDATE Producto SET activo = FALSE WHERE id = $1 RETURNING id',
    [id],
  )
  return result.rows[0] || null
}

export async function getClienteConStats(id: string) {
  const base = await getCliente(id)
  if (!base) return null
  const stats = await db.query(
    `
      SELECT
        COUNT(*)::int AS total_compras,
        COALESCE(SUM(total), 0) AS monto_total
      FROM Venta
      WHERE id_cliente = $1 AND estado = 'completada'
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
  const list = await db.query(
    `
      SELECT venta_id, fecha, total, estado, cliente, empleado, producto, cantidad, precio_unit, subtotal, categoria
      FROM vista_ventas_completa
      WHERE fecha::date = $1::date
      ORDER BY fecha DESC, venta_id DESC
    `,
    [day],
  )
  const agg = await db.query(
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
  const result = await db.query(query, params)
  return result.rows
}

export async function getStockDisponibleApi() {
  const result = await db.query(`
    SELECT id, nombre AS producto, stock, (stock < 20) AS alerta
    FROM Producto
    WHERE activo = TRUE
    ORDER BY stock ASC, nombre
  `)
  return result.rows
}

export async function getVentasPorCategoriaReporteApi() {
  const result = await db.query(`
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
  const result = await db.query(`
    SELECT c.id, c.nombre,
           COUNT(v.id)::int AS total_compras,
           COALESCE(SUM(v.total), 0) AS monto_total
    FROM Cliente c
    JOIN Venta v ON v.id_cliente = c.id AND v.estado = 'completada'
    WHERE c.id IN (
      SELECT id_cliente
      FROM Venta
      WHERE id_cliente IS NOT NULL AND estado = 'completada'
      GROUP BY id_cliente
      HAVING COUNT(*) > 3
    )
    GROUP BY c.id, c.nombre
    ORDER BY total_compras DESC
  `)
  return result.rows
}

export async function findUserByEmail(email: string) {
  const r = await db.query('SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)', [email])
  return r.rows[0]?.id as string | undefined
}

export async function createUserAccountAndEmpleado(input: {
  nombre: string
  email: string
  password: string
  rol: string
}) {
  const existing = await findUserByEmail(input.email)
  if (existing) {
    throw Object.assign(new Error('El email ya está registrado'), { code: 'DUPLICATE' })
  }
  const userId = `usr_${uuidv4().replace(/-/g, '').slice(0, 12)}`
  const accountId = `acc_${uuidv4().replace(/-/g, '').slice(0, 12)}`
  const hashed = await hashPassword(input.password)
  const client = await db.connect()
  try {
    await client.query('BEGIN')
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
    await client.query(
      `INSERT INTO Empleado (user_id, activo, created_at) VALUES ($1, TRUE, NOW())`,
      [userId],
    )
    await client.query('COMMIT')
    return { user_id: userId, nombre: input.nombre, rol: input.rol }
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
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
  const r = await db.query(q, params)
  return r.rows[0] || null
}

export async function deactivateEmpleadoByUserId(userId: string) {
  const r = await db.query(
    'UPDATE Empleado SET activo = FALSE WHERE user_id = $1 RETURNING id',
    [userId],
  )
  return r.rows[0] || null
}

export async function getEmpleadoByUserId(userId: string) {
  const r = await db.query(
    `
      SELECT e.id, e.user_id, e.activo, e.created_at, u.name, u.email, u.rol
      FROM Empleado e
      JOIN "user" u ON u.id = e.user_id
      WHERE e.user_id = $1
    `,
    [userId],
  )
  return r.rows[0] || null
}

/** Vincula la sesión de personal (admin/cajero) a un registro Empleado para ventas en POS. */
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
