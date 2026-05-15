'use server'

import pg from 'pg'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

dotenv.config()

type SaleItem = {
  id_producto: number
  cantidad: number
}

const dbUser = process.env.DB_USER ?? process.env.VITE_DB_USER ?? 'postgres'
const dbPassword = process.env.DB_PASSWORD ?? process.env.VITE_DB_PASSWORD ?? 'postgres'
const dbHost = process.env.DB_HOST ?? process.env.VITE_DB_HOST ?? 'localhost'
const dbName = process.env.DB_NAME ?? process.env.VITE_DB_NAME ?? 'icestock'
const dbPort = Number(process.env.DB_PORT ?? process.env.VITE_DB_PORT ?? 5432)

const connectionString =
  process.env.VITE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`

export const db = new pg.Pool({
  connectionString,
})

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
    JOIN "user" u ON u.id = v.user_id
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
  id_cliente: number | null
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
        INSERT INTO Venta (id_cliente, user_id, total)
        VALUES ($1, $2, 0)
        RETURNING id
      `,
      [params.id_cliente, params.user_id],
    )

    const ventaId = ventaResult.rows[0].id as number

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

export async function getCategoria(id: number) {
  const query = 'SELECT id, nombre, descripcion FROM Categoria WHERE id = $1'
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

export async function getCategorias(limit = 50) {
  const query = 'SELECT id, nombre, descripcion FROM Categoria ORDER BY nombre LIMIT $1'
  const result = await db.query(query, [limit])
  return result.rows
}

export async function updateCategoria(id: number, nombre?: string, descripcion?: string) {
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

export async function deleteCategoria(id: number) {
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

export async function getProveedor(id: number) {
  const query = 'SELECT id, nombre, telefono, email, direccion FROM Proveedor WHERE id = $1'
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

export async function getProveedores(limit = 50) {
  const query = 'SELECT id, nombre, telefono, email, direccion FROM Proveedor ORDER BY nombre LIMIT $1'
  const result = await db.query(query, [limit])
  return result.rows
}

export async function updateProveedor(id: number, nombre?: string, telefono?: string, email?: string, direccion?: string) {
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

export async function deleteProveedor(id: number) {
  const query = 'DELETE FROM Proveedor WHERE id = $1 RETURNING id'
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  CRUD: PRODUCTO
// ============================================================

export async function createProducto(nombre: string, precio: number, id_categoria: number, id_proveedor: number, descripcion?: string, stock: number = 0) {
  const query = `
    INSERT INTO Producto (nombre, descripcion, precio, stock, id_categoria, id_proveedor, activo, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id, nombre, descripcion, precio, stock, id_categoria, id_proveedor, activo, created_at
  `
  const result = await db.query(query, [nombre, descripcion || null, precio, stock, id_categoria, id_proveedor, true])
  return result.rows[0]
}

export async function getProducto(id: number) {
  const query = `
    SELECT id, nombre, descripcion, precio, stock, id_categoria, id_proveedor, activo, created_at
    FROM Producto WHERE id = $1
  `
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

export async function getProductos(limit = 50, activos_solo = true) {
  let query = 'SELECT id, nombre, descripcion, precio, stock, id_categoria, id_proveedor, activo, created_at FROM Producto'
  if (activos_solo) query += ' WHERE activo = true'
  query += ' ORDER BY nombre LIMIT $1'
  const result = await db.query(query, [limit])
  return result.rows
}

export async function updateProducto(id: number, updates: Partial<{ nombre: string; descripcion: string; precio: number; stock: number; id_categoria: number; id_proveedor: number; activo: boolean }>) {
  let query = 'UPDATE Producto SET'
  const params: any[] = []
  const updateParts: string[] = []

  Object.entries(updates).forEach(([key, value]) => {
    updateParts.push(`${key} = $${params.length + 1}`)
    params.push(value)
  })

  if (updateParts.length === 0) return null

  query += ' ' + updateParts.join(', ') + ` WHERE id = $${params.length + 1} RETURNING id, nombre, descripcion, precio, stock, id_categoria, id_proveedor, activo, created_at`
  params.push(id)

  const result = await db.query(query, params)
  return result.rows[0] || null
}

export async function deleteProducto(id: number) {
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

export async function getCliente(id: number) {
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

export async function updateCliente(id: number, nombre?: string, email?: string, telefono?: string) {
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

export async function deleteCliente(id: number) {
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

export async function getEmpleado(id: number) {
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

export async function updateEmpleado(id: number, activo?: boolean) {
  if (activo === undefined) return null

  const query = `
    UPDATE Empleado SET activo = $1 WHERE id = $2
    RETURNING id, user_id, activo, created_at
  `
  const result = await db.query(query, [activo, id])
  return result.rows[0] || null
}

export async function deleteEmpleado(id: number) {
  const query = 'DELETE FROM Empleado WHERE id = $1 RETURNING id'
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  CRUD: VENTA
// ============================================================

export async function createVenta(user_id: string, id_cliente?: number | null, total: number = 0) {
  const query = `
    INSERT INTO Venta (user_id, id_cliente, total, fecha, estado)
    VALUES ($1, $2, $3, NOW(), 'completada')
    RETURNING id, user_id, id_cliente, total, fecha, estado
  `
  const result = await db.query(query, [user_id, id_cliente || null, total])
  return result.rows[0]
}

export async function getVenta(id: number) {
  const query = `
    SELECT id, user_id, id_cliente, total, fecha, estado
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

export async function updateVenta(id: number, total?: number, estado?: string) {
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

export async function deleteVenta(id: number) {
  const query = 'DELETE FROM Venta WHERE id = $1 RETURNING id'
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

// ============================================================
//  CRUD: DETALLE VENTA
// ============================================================

export async function createDetalleVenta(id_venta: number, id_producto: number, cantidad: number, precio_unit: number) {
  const query = `
    INSERT INTO DetalleVenta (id_venta, id_producto, cantidad, precio_unit)
    VALUES ($1, $2, $3, $4)
    RETURNING id, id_venta, id_producto, cantidad, precio_unit, subtotal
  `
  const result = await db.query(query, [id_venta, id_producto, cantidad, precio_unit])
  return result.rows[0]
}

export async function getDetalleVenta(id: number) {
  const query = `
    SELECT id, id_venta, id_producto, cantidad, precio_unit, subtotal
    FROM DetalleVenta WHERE id = $1
  `
  const result = await db.query(query, [id])
  return result.rows[0] || null
}

export async function getDetallesVenta(id_venta: number) {
  const query = `
    SELECT id, id_venta, id_producto, cantidad, precio_unit, subtotal
    FROM DetalleVenta WHERE id_venta = $1 ORDER BY id
  `
  const result = await db.query(query, [id_venta])
  return result.rows
}

export async function updateDetalleVenta(id: number, cantidad?: number, precio_unit?: number) {
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

export async function deleteDetalleVenta(id: number) {
  const query = 'DELETE FROM DetalleVenta WHERE id = $1 RETURNING id'
  const result = await db.query(query, [id])
  return result.rows[0] || null
}
