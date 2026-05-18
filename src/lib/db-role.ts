import { AsyncLocalStorage } from 'node:async_hooks'
import type pg from 'pg'

import { pool } from '#/lib/pg-pool'

/** Roles de negocio alineados con `user.rol` y `db/roles.sql`. */
export const APP_ROL_TO_PG_ROLE = {
  cliente: 'rol_cliente',
  cajero: 'rol_cajero',
  analista: 'rol_analista',
  admin: 'rol_admin',
  superadmin: 'rol_superadmin',
} as const

export type AppRol = keyof typeof APP_ROL_TO_PG_ROLE

const PG_ROLE_ALLOWLIST = new Set<string>(Object.values(APP_ROL_TO_PG_ROLE))

const pgClientStorage = new AsyncLocalStorage<pg.PoolClient>()

export function isDbRoleContextActive(): boolean {
  return pgClientStorage.getStore() !== undefined
}

export function appRolToPgRole(appRol: string): string {
  const pgRole = APP_ROL_TO_PG_ROLE[appRol as AppRol]
  if (!pgRole) throw new Error(`Rol de aplicación desconocido: ${appRol}`)
  return pgRole
}

/** Rol PG para peticiones sin sesión (catálogo público vs lectura analítica). */
export function defaultAppRolForAnonymous(options?: { publicCatalog?: boolean }): AppRol {
  return options?.publicCatalog ? 'cliente' : 'analista'
}

/**
 * Ejecuta `fn` en una transacción con `SET LOCAL ROLE` según `user.rol`.
 * Reutiliza el cliente si ya hay contexto (p. ej. venta transaccional dentro del handler).
 */
export async function runWithDbRole<T>(
  appRol: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = pgClientStorage.getStore()
  if (existing) return fn()

  const pgRole = appRolToPgRole(appRol)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SET LOCAL ROLE ${pgRole}`)
    const result = await pgClientStorage.run(client, fn)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Operaciones en tablas Better Auth (`user`, `account`, …): sin `SET ROLE`,
 * solo privilegios de `icestock_app`.
 */
export async function runWithoutDbRole<T>(fn: () => Promise<T>): Promise<T> {
  if (pgClientStorage.getStore()) {
    throw new Error('runWithoutDbRole no puede usarse dentro de runWithDbRole')
  }
  return fn()
}

/**
 * Consulta usando el cliente de la transacción con rol, o el pool sin rol si no hay contexto.
 */
export async function pgQuery<R extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<R>> {
  const client = pgClientStorage.getStore()
  if (client) return client.query<R>(text, params)
  return pool.query<R>(text, params)
}

/**
 * Transacción en el mismo cliente que el contexto de rol, o una nueva sin `SET ROLE`
 * si no hay contexto (p. ej. seed / scripts).
 */
export async function withPgTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const existing = pgClientStorage.getStore()
  if (existing) return fn(existing)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Valida que el nombre de rol PG sea uno de los definidos en roles.sql. */
export function assertPgRoleName(pgRole: string): void {
  if (!PG_ROLE_ALLOWLIST.has(pgRole)) {
    throw new Error(`Rol PostgreSQL no permitido: ${pgRole}`)
  }
}
