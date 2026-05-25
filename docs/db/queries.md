# Consultas SQL del proyecto IceStock

Resumen de las operaciones sobre PostgreSQL usadas por la aplicación. El código fuente está centralizado en [`src/lib/db.ts`](../../src/lib/db.ts) (capa **ORM** del Proyecto 3); el esquema y objetos de BD en [`db/schema.sql`](../../db/schema.sql).

## Diagramas del modelo

### Diagrama entidad–relación

![Diagrama entidad–relación](./er.diagram.png)

### Diagrama relacional

![Diagrama relacional](./relational.diagram.png)

---

## Objetos en la base de datos

| Objeto | Tipo | Uso |
|--------|------|-----|
| `vista_ventas_completa` | VIEW | Reportes del día, listados desnormalizados para UI |
| `vista_metricas_empleado` | VIEW | Totales por vendedor (admin / analista) |
| `sp_registrar_venta(...)` | PROCEDURE | Registro transaccional: parámetros IN/OUT, bloque `EXCEPTION` (rollback de sesión vía `runWithDbRole`) |
| `registrar_venta(...)` | FUNCTION | Wrapper que invoca `sp_registrar_venta` (compatibilidad SQL) |
| `sp_anular_venta(uuid)` | PROCEDURE | Anulación con devolución de stock; `OUT p_anulada`, `ROLLBACK` en error |
| `fn_mis_compras(uuid, limit)` | FUNCTION | Historial del comprador (`GET /api/clientes/me/ventas`) |
| `fn_catalogo_activo(limit)` | FUNCTION | Catálogo activo con categoría y proveedor (listado sin filtros de staff) |
| `anular_venta(uuid)` | FUNCTION | Anulación transaccional con devolución de stock |
| `fn_clientes_frecuentes()` | FUNCTION | Reporte de clientes con más de 3 compras |
| Índices en FK / `Venta.fecha` | INDEX | Filtros por fecha, joins y listados |

## Roles PostgreSQL (`db/roles.sql`)

| Rol PG | `user.rol` | Resumen |
|--------|------------|---------|
| `rol_cliente` | `cliente` | Catálogo, `fn_mis_compras`, registrar compra propia |
| `rol_cajero` | `cajero` | POS, ventas, `registrar_venta` |
| `rol_analista` | `analista` | Solo `SELECT` + vistas (CSV / gráficos) |
| `rol_admin` | `admin` | Analista + CRUD catálogo + anular ventas |
| `rol_superadmin` | `superadmin` | Todo el esquema de negocio |

Conexión: `icestock_app` (o `proy3` en Docker) con `SET ROLE` según sesión. Ver [`db/roles.sql`](../../db/roles.sql).

### Capa API (permisos HTTP)

La aplicación valida cada handler con la matriz en [`src/lib/api/permissions.ts`](../../src/lib/api/permissions.ts) (`can`, `requireAuthAndPermission`). Resumen documentado en [docs/endpoints.md — Permisos por rol](../endpoints.md#permisos-por-rol).

---

## Autenticación

Las tablas `user`, `session`, `account` y `Verification` las gestiona **Better Auth** vía `/api/auth/*`. En `db.ts` solo se insertan usuarios de personal al crear empleados:

| Función | Operación | Tablas |
|---------|-----------|--------|
| `findUserByEmail` | `SELECT id FROM "user" WHERE LOWER(email) = …` | `user` |
| `createUserAccountAndEmpleado` | `INSERT` en `user`, `account`, `Usuario` (transacción) | `user`, `account`, `Usuario` |
| `updateUserEmpleadoProfile` | `UPDATE "user" SET name, rol …` | `user` |
| `deactivateEmpleadoByUserId` | `UPDATE Usuario SET activo = FALSE` | `Usuario` |

---

## Catálogo

### Categorías y proveedores

CRUD estándar: `INSERT` / `SELECT` / `UPDATE` / `DELETE` por `id` (UUID).

| Función | Endpoint API (ejemplo) |
|---------|------------------------|
| `getCategorias`, `getCategoria`, `createCategoria`, `updateCategoria`, `deleteCategoria` | `/api/categorias` |
| `getProveedores`, `getProveedor`, `createProveedor`, … | `/api/proveedores` |
| `countProductosByCategoria` | Validación antes de borrar categoría |
| `countProductosByProveedor` | Validación antes de borrar proveedor |

### Productos

| Función | Descripción SQL |
|---------|-----------------|
| `getProductosListApi` | Sin filtros staff: `fn_catalogo_activo`; con filtros: `JOIN` categoría/proveedor, `stock < 20`, etc. |
| `getProductoEnriquecido` | Detalle con nombres de categoría y proveedor |
| `createProducto` / `updateProducto` / `deleteProducto` | CRUD sobre `Producto` |
| `softDeleteProducto` | `UPDATE Producto SET activo = FALSE` |
| `getProductosConCategoriaYProveedor` | Listado analítico con joins |

---

## Clientes

| Función | Descripción |
|---------|-------------|
| `getClientes`, `getCliente`, `createCliente`, `updateCliente`, `deleteCliente` | CRUD |
| `getOrCreateClienteForUser` | Busca por email; si no existe, `INSERT` (tienda / `GET /api/clientes/me`) |
| `getClienteConStats` | Cliente + `COUNT`/`SUM` de ventas completadas |
| `getVentasByClienteId` | Historial para **Mis compras** (`GET /api/clientes/me/ventas`) |
| `getClientesConCompraMayorA` | Subconsulta `Venta.total >= $monto` |
| `getClientesFrecuentesApi` | `SELECT * FROM fn_clientes_frecuentes()` |

---

## Empleados

| Función | Descripción |
|---------|-------------|
| `getEmpleados`, `getEmpleado`, `createEmpleado`, `updateEmpleado`, `deleteEmpleado` | Personal (`Usuario` con `user_id`) + join con `user` |
| `getEmpleadoByUserId` | Resuelve fila `Usuario` desde sesión |
| `getOrCreateEmpleadoForUser` | Crea fila `Usuario` si cajero/admin aún no la tiene (POS) |

---

## Ventas (núcleo transaccional)

### `crearVentaTransaccional` (usado por `POST /api/ventas`)

La aplicación delega en el stored procedure (dentro de la transacción de `runWithDbRole`):

```sql
CALL sp_registrar_venta($userId, $idComprador, $idVendedor, $items::jsonb, NULL, NULL);
```

El procedure valida stock con `FOR UPDATE`, inserta venta y detalle, devuelve `OUT p_venta_id` y `OUT p_total`, y ante error relanza la excepción (el bloque PL/pgSQL revierte sus cambios; la sesión hace `ROLLBACK` en `runWithDbRole`).

### Consultas de ventas

| Función | Descripción |
|---------|-------------|
| `getVentasListApi` | Listado con `LEFT JOIN Usuario` (comprador/vendedor); filtro opcional por fechas |
| `getVentaDetalleApi` | Cabecera + líneas con nombre de producto |
| `anularVentaTransaccional` | `CALL sp_anular_venta($id, NULL)` |
| `getVentasDesdeVista` | `SELECT` desde `vista_ventas_completa` |
| `getVentasConClienteYEmpleado` | Agregación `COUNT` líneas por venta |

### Detalle de venta (CRUD auxiliar)

`createDetalleVenta`, `getDetalleVenta`, `getDetallesVenta`, `updateDetalleVenta`, `deleteDetalleVenta` — uso interno o extensiones; el flujo principal usa la transacción anterior.

---

## Reportes y analítica

| Función | Endpoint API | Idea de la consulta |
|---------|--------------|----------------------|
| `getReporteVentasDelDia` | `GET /api/reportes/ventas-del-dia` | `vista_ventas_completa` filtrada por fecha + agregados |
| `getProductosMasVendidosApi` | `GET /api/reportes/productos-mas-vendidos` | CTE: suma `cantidad`/`subtotal` por producto |
| `getStockDisponibleApi` | `GET /api/reportes/stock-disponible` | Productos activos, alerta si `stock < 20` |
| `getVentasPorCategoriaReporteApi` | `GET /api/reportes/ventas-por-categoria` | `GROUP BY` categoría sobre ventas completadas |
| `getVentasPorCategoria` | Dashboard / analítica | Similar con `HAVING` por monto mínimo |
| `getProductosSinVentas` | Analítica | `NOT EXISTS` en `DetalleVenta` |
| `getRankingProductosCte` | Dashboard | CTE + `DENSE_RANK()` por monto vendido |
| `getDetalleVentaJoin` | Analítica | Join detalle–producto–categoría |

`getDashboardData()` agrupa en una sola llamada varias de las consultas anteriores para el portal admin.

---

## Patrones SQL recurrentes

| Patrón | Ejemplo en el proyecto |
|--------|-------------------------|
| Transacción explícita | `crearVentaTransaccional` y `anularVentaTransaccional` (envuelven funciones almacenadas), `createUserAccountAndEmpleado` |
| Bloqueo de fila | `SELECT … FOR UPDATE` en producto (stock) y venta (anulación) |
| Precio histórico | `DetalleVenta.precio_unit` al insertar; no se recalcula si cambia `Producto.precio` |
| Soft delete | `Producto.activo = FALSE` |
| Vista desnormalizada | `vista_ventas_completa` para reportes sin romper 3FN en tablas base |
| Parámetros dinámicos | Filtros de fecha y búsqueda en `getVentasListApi`, `getProductosListApi` |

---

## Mapa función → capa HTTP

| Capa | Ubicación |
|------|-----------|
| Handlers REST | `src/routes/api/**/*.ts` |
| Acceso a datos (ORM) | `src/lib/db.ts` |
| Contrato HTTP | [../endpoints.md](../endpoints.md) |
| OpenAPI / Swagger | [../openapi.json](../openapi.json) → `/openapi.json`, UI `/api/docs` |

Para el proceso de diseño de tablas, ver [normalization.md](./normalization.md).
