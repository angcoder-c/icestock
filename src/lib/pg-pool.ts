import pg from 'pg'

import { pgPoolConfig } from '#/lib/pg-config'

/** Pool compartido: conexión como `icestock_app` (o usuario en DATABASE_URL). */
export const pool = new pg.Pool(pgPoolConfig())

/** Alias histórico usado en `db.ts`. */
export const db = pool
