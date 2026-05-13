import pg from 'pg'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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
  process.env.DATABASE_URL ??
  process.env.VITE_DATABASE_URL ??
  `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`

export const db = new pg.Pool({
  connectionString,
})

// JWT Secret for token generation and verification
const JWT_SECRET = process.env.JWT_SECRET ?? 'super-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d'

type AuthResponse = {
  token: string
  user: {
    id: string
    email: string
    name: string
    rol: string
    tipo: 'empleado' | 'cliente'
  }
}

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
//  FUNCIONES DE AUTENTICACIÓN
// ============================================================

export async function registerEmpleado(
  email: string,
  password: string,
  name: string,
  rol: 'admin' | 'cajero' = 'cajero',
): Promise<AuthResponse> {
  const client = await db.connect()

  try {
    await client.query('BEGIN')

    // Verificar si el email ya existe
    const existingUser = await client.query('SELECT id FROM "user" WHERE email = $1', [email])
    if (existingUser.rowCount && existingUser.rowCount > 0) {
      throw new Error('El correo ya está registrado')
    }

    // Generar ID para el usuario
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insertar en tabla "user"
    await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, rol)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, name, email, false, rol],
    )

    // Insertar en tabla Empleado
    await client.query('INSERT INTO Empleado (user_id, activo) VALUES ($1, $2)', [
      userId,
      true,
    ])

    // Insertar contraseña en tabla account
    const accountId = `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await client.query(
      `INSERT INTO account (id, account_id, provider_id, user_id, password)
       VALUES ($1, $2, $3, $4, $5)`,
      [accountId, accountId, 'credential', userId, hashedPassword],
    )

    await client.query('COMMIT')

    // Generar token JWT
    const token = jwt.sign(
      {
        userId,
        email,
        tipo: 'empleado',
        rol,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    )

    return {
      token,
      user: {
        id: userId,
        email,
        name,
        rol,
        tipo: 'empleado',
      },
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function loginEmpleado(email: string, password: string): Promise<AuthResponse> {
  // Buscar usuario
  const userResult = await db.query('SELECT * FROM "user" WHERE email = $1', [email])

  if (!userResult.rows.length) {
    throw new Error('Usuario o contraseña incorrectos')
  }

  const user = userResult.rows[0]

  // Buscar contraseña
  const accountResult = await db.query(
    `SELECT password FROM account WHERE user_id = $1 AND provider_id = $2`,
    [user.id, 'credential'],
  )

  if (!accountResult.rows.length) {
    throw new Error('Usuario o contraseña incorrectos')
  }

  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(password, accountResult.rows[0].password)

  if (!isPasswordValid) {
    throw new Error('Usuario o contraseña incorrectos')
  }

  // Generar token JWT
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tipo: 'empleado',
      rol: user.rol,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  )

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      rol: user.rol,
      tipo: 'empleado',
    },
  }
}

export async function registerCliente(
  email: string,
  password: string,
  nombre: string,
): Promise<AuthResponse> {
  const client = await db.connect()

  try {
    await client.query('BEGIN')

    // Verificar si el email ya existe
    const existingUser = await client.query('SELECT id FROM "user" WHERE email = $1', [email])
    if (existingUser.rowCount && existingUser.rowCount > 0) {
      throw new Error('El correo ya está registrado')
    }

    // Generar ID para el usuario
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insertar en tabla "user" con rol por defecto para clientes
    await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, rol)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, nombre, email, false, 'cliente'],
    )

    // Insertar en tabla Cliente
    await client.query(
      `INSERT INTO Cliente (nombre, email, user_id, activo)
       VALUES ($1, $2, $3, $4)`,
      [nombre, email, userId, true],
    )

    // Insertar contraseña en tabla account
    const accountId = `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await client.query(
      `INSERT INTO account (id, account_id, provider_id, user_id, password)
       VALUES ($1, $2, $3, $4, $5)`,
      [accountId, accountId, 'credential', userId, hashedPassword],
    )

    await client.query('COMMIT')

    // Generar token JWT
    const token = jwt.sign(
      {
        userId,
        email,
        tipo: 'cliente',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    )

    return {
      token,
      user: {
        id: userId,
        email,
        name: nombre,
        rol: 'cliente',
        tipo: 'cliente',
      },
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function loginCliente(email: string, password: string): Promise<AuthResponse> {
  // Buscar usuario
  const userResult = await db.query('SELECT * FROM "user" WHERE email = $1', [email])

  if (!userResult.rows.length) {
    throw new Error('Usuario o contraseña incorrectos')
  }

  const user = userResult.rows[0]

  // Buscar contraseña
  const accountResult = await db.query(
    `SELECT password FROM account WHERE user_id = $1 AND provider_id = $2`,
    [user.id, 'credential'],
  )

  if (!accountResult.rows.length) {
    throw new Error('Usuario o contraseña incorrectos')
  }

  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(password, accountResult.rows[0].password)

  if (!isPasswordValid) {
    throw new Error('Usuario o contraseña incorrectos')
  }

  // Generar token JWT
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tipo: 'cliente',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  )

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      rol: 'cliente',
      tipo: 'cliente',
    },
  }
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    throw new Error('Token inválido o expirado')
  }
}