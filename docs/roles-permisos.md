# Roles, permisos y modelo unificado de usuario

El presente documento describe el modelo de autorización de **IceStock**: roles de aplicación y de PostgreSQL, permisos en base de datos y en la capa HTTP, el refactor del modelo de personas y el comportamiento de la interfaz según el rol de la sesión.

## Referencias en el repositorio

| Tema | Archivo |
|------|---------|
| Esquema de tablas | [`db/schema.sql`](../db/schema.sql) |
| Roles y privilegios (`GRANT` / `REVOKE`) | [`db/roles.sql`](../db/roles.sql) |
| Permisos de la API | [`src/lib/api/permissions.ts`](../src/lib/api/permissions.ts) |
| Contrato OpenAPI / Swagger | [`docs/openapi.json`](./openapi.json), [`public/openapi.json`](../public/openapi.json), UI en `/api/docs` |
| Autenticación | [`docs/auth.md`](./auth.md) |
| Endpoints REST (detalle) | [`docs/endpoints.md`](./endpoints.md) |
| Aplicación de rol PostgreSQL en Node | [`src/lib/db-role.ts`](../src/lib/db-role.ts) |
| Envoltorio por petición HTTP | [`src/lib/api/with-db-role.ts`](../src/lib/api/with-db-role.ts) |
| Rutas de la interfaz por rol | [`src/lib/auth/role-routes.ts`](../src/lib/auth/role-routes.ts) |
| Normalización del modelo (3FN) | [`db/normalization.md`](./db/normalization.md) |

---

## Resumen del modelo de autorización

El sistema define **cinco roles de aplicación** (`cliente`, `cajero`, `analista`, `admin`, `superadmin`), almacenados en la columna `"user".rol` y replicados como roles PostgreSQL `rol_*`.

La seguridad se implementa en **dos capas complementarias**:

1. **PostgreSQL** — privilegios definidos en `db/roles.sql` mediante `GRANT` y `REVOKE`.
2. **Aplicación** — permisos simbólicos en `permissions.ts` y comprobaciones en los handlers de la API y en la interfaz.

Además, el modelo de personas del negocio se unifica en la tabla **`Usuario`**, sustituyendo el esquema anterior con tablas separadas para clientes y empleados. En calificación y Docker, la conexión usa **`proy3`** / **`secret`** (`DATABASE_URL` en [`.env.example`](../.env.example)); el rol `icestock_app` sigue definido en `roles.sql` para despliegues que lo usen. En cada transacción de negocio la aplicación ejecuta `SET LOCAL ROLE` según el rol de la sesión activa.

Los portales de la interfaz quedan acotados por rol: `/tienda`, `/empleado`, `/analista`, `/portal` y `/superadmin`.

---

## Roles en PostgreSQL

### Rol de conexión (`LOGIN`)

| Rol PostgreSQL | Descripción |
|----------------|-------------|
| `icestock_app` | Usuario con el que la aplicación establece el pool de conexiones (`DATABASE_URL`). Dispone de `LOGIN`, no hereda roles de forma automática (`NOINHERIT`) y puede ejecutar `SET ROLE` hacia los roles de negocio por ser miembro de cada uno. |

Las tablas de **Better Auth** (`"user"`, `session`, `account`, `verification`) conceden privilegios únicamente a `icestock_app` (y, en el entorno de curso, al usuario `proy3` en Docker). Los roles de negocio **no** acceden de forma directa a dichas tablas.

### Roles de negocio (`NOLOGIN`)

Estos roles se alinean con los valores de `"user".rol`:

| `user.rol` (aplicación) | Rol PostgreSQL | Herencia |
|-------------------------|----------------|----------|
| `cliente` | `rol_cliente` | — |
| `cajero` | `rol_cajero` | — |
| `analista` | `rol_analista` | — |
| `admin` | `rol_admin` | `rol_analista`, `rol_cajero` |
| `superadmin` | `rol_superadmin` | `rol_admin` (y, por transitividad, `rol_analista` y `rol_cajero`) |

La herencia en PostgreSQL permite que un administrador acumule, a nivel de privilegios, las capacidades de analista y cajero.

### Funciones con `SECURITY DEFINER`

Para escenarios en los que el rol no dispone de `SELECT` global (por ejemplo, el cliente sobre ventas ajenas), el esquema define:

- `fn_mis_compras(usuario_id, limit)` — historial de compras del comprador.
- `fn_catalogo_activo(limit)` — catálogo de productos activos con categoría y proveedor.
- `sp_registrar_venta(...)` — procedure de venta (IN/OUT, excepciones; rollback de sesión si falla el `CALL`).
- `sp_anular_venta(venta_id)` — procedure de anulación con parámetro `OUT p_anulada`.
- `registrar_venta` / `anular_venta` — funciones wrapper sobre los procedures anteriores.
- `fn_clientes_frecuentes()` — reporte de clientes frecuentes (más de 3 compras).

---

## Privilegios por rol en PostgreSQL

Tras revocar el acceso público (`REVOKE ALL ... FROM PUBLIC`) sobre las tablas de negocio, cada rol recibe únicamente los privilegios necesarios para su función.

### `rol_cliente` (tienda en línea)

| Objeto | Privilegios |
|--------|-------------|
| `categoria`, `proveedor`, `producto` | `SELECT` |
| `usuario` | `SELECT` |
| `venta`, `detalleventa` | `INSERT`; `SELECT` en `detalleventa` |
| Funciones / procedures | `EXECUTE` en `fn_catalogo_activo`, `fn_mis_compras`, `sp_registrar_venta`, `registrar_venta` (wrapper) |

No dispone de `SELECT` libre sobre todas las filas de `venta`; el historial del comprador se obtiene mediante `fn_mis_compras`.

### `rol_cajero` (punto de venta)

| Objeto | Privilegios |
|--------|-------------|
| `"user"` | `SELECT` sobre `(id, name, email, rol)` |
| Catálogo y personas | `SELECT` en `categoria`, `proveedor`, `producto`, `usuario` |
| Ventas | `SELECT`, `INSERT` en `venta`, `detalleventa` |
| Clientes de mostrador | `INSERT` en `usuario` |
| Stock | `UPDATE (stock)` en `producto` |
| Reportes | `SELECT` en `vista_ventas_completa` |
| Funciones / procedures | `EXECUTE` en `sp_registrar_venta`, `registrar_venta`; `fn_catalogo_activo` (hereda admin) |

### `rol_analista` (lectura y reportes)

| Objeto | Privilegios |
|--------|-------------|
| `"user"` | `SELECT (id, name, email, rol)` |
| Tablas de negocio | `SELECT` en `categoria`, `proveedor`, `producto`, `usuario`, `venta`, `detalleventa` |
| Vistas | `SELECT` en `vista_ventas_completa`, `vista_metricas_empleado` |
| Funciones | `EXECUTE` en `fn_clientes_frecuentes` |

No dispone de `INSERT`, `UPDATE` ni `DELETE` sobre catálogo ni ventas.

### `rol_admin` (operación y catálogo)

| Objeto | Privilegios |
|--------|-------------|
| `"user"` | `SELECT`, `UPDATE` (el `INSERT` de cuentas lo realiza `icestock_app` en operaciones de autenticación) |
| Catálogo | `INSERT`, `UPDATE`, `DELETE` en `categoria`, `proveedor`, `producto`, `usuario` |
| Ventas | `UPDATE` en `venta`; `DELETE` en `detalleventa`; `UPDATE (stock)` en `producto` |
| Funciones / procedures | `EXECUTE` en `sp_anular_venta`, `anular_venta`, `fn_clientes_frecuentes` |

Hereda los privilegios de analista y cajero.

### `rol_superadmin` (control del esquema de negocio)

Dispone de `ALL PRIVILEGES` sobre las tablas de negocio, las vistas citadas y las funciones auxiliares. Esto **no** equivale a superusuario de PostgreSQL; el dominio de Better Auth permanece restringido a `icestock_app`.

---

## Modelo unificado `Usuario`

### Situación anterior

El diseño previo contemplaba entidades separadas **Cliente** y **Empleado**, cada una con posible vínculo a `"user"`, lo que generaba redundancia y complejidad en las ventas (identificadores de cliente, empleado y sesión).

### Modelo actual

La tabla **`Usuario`** (`db/schema.sql`) representa a cualquier persona del negocio:

```sql
CREATE TABLE Usuario (
    id         UUID PRIMARY KEY,
    user_id    TEXT UNIQUE REFERENCES "user"("id"),  -- NULL = mostrador sin cuenta web
    nombre     VARCHAR(150) NOT NULL,
    email      VARCHAR(150),
    telefono   VARCHAR(20),
    activo     BOOLEAN NOT NULL DEFAULT TRUE,
    ...
);
```

| Caso de uso | `user_id` | Criterio en la aplicación |
|-------------|-----------|---------------------------|
| Cliente con cuenta web | Referencia a `"user".id` con `rol = 'cliente'` | Tienda en línea; API `clients:me` |
| Cliente de mostrador | `NULL` | Alta desde el POS; sin inicio de sesión |
| Personal (`cajero`, `analista`, `admin`, `superadmin`) | Referencia a `"user".id` | `JOIN` con `"user"` donde `rol` pertenece al personal |

En la tabla **`Venta`**:

- `id_comprador` identifica al comprador (`Usuario.id`).
- `id_vendedor` identifica al vendedor (`Usuario.id`; `NULL` en autocompra en línea).
- `user_id` registra la sesión Better Auth que documentó la operación (auditoría).

La capa de datos (`src/lib/db.ts`) expone operaciones de clientes y empleados sobre la **misma tabla**, filtrando por `user_id` y por el rol en `"user"`.

Para el contexto de normalización, véase [`docs/db/normalization.md`](./db/normalization.md) (sección «Tabla Usuario unificada»).

---

## Conexión a la base de datos según el rol de sesión

### Pool de conexión

El módulo [`src/lib/pg-pool.ts`](../src/lib/pg-pool.ts) crea un pool con `DATABASE_URL` (o las variables `DB_*`). En entorno local se recomienda, por ejemplo:

```env
# Calificación (Docker / host puerto 5433)
DATABASE_URL=postgres://proy3:secret@localhost:5433/icestock
# Alternativa documentada: postgres://icestock_app:secret@localhost:5433/icestock
```

Docker aplica `db/schema.sql` y `db/roles.sql` en el primer arranque del contenedor con volumen vacío.

### Correspondencia aplicación ↔ PostgreSQL

[`src/lib/db-role.ts`](../src/lib/db-role.ts) define el mapeo:

| Rol en aplicación | Rol PostgreSQL |
|-------------------|----------------|
| `cliente` | `rol_cliente` |
| `cajero` | `rol_cajero` |
| `analista` | `rol_analista` |
| `admin` | `rol_admin` |
| `superadmin` | `rol_superadmin` |

### Flujo por petición a la API

```mermaid
sequenceDiagram
  participant Cliente as Cliente HTTP
  participant API as API
  participant Auth as Better Auth
  participant Pool as icestock_app
  participant PG as PostgreSQL

  Cliente->>API: Petición HTTP (cookie de sesión)
  API->>Auth: getSessionUser()
  Auth-->>API: user.rol
  API->>Pool: connect()
  Pool->>PG: BEGIN
  Pool->>PG: SET LOCAL ROLE rol_*
  API->>PG: Consultas de negocio (pgQuery)
  Pool->>PG: COMMIT
  Pool->>Pool: release()
```

- **`runWithDbRole(appRol, fn)`** — Inicia una transacción, ejecuta `SET LOCAL ROLE` y corre `fn` con el mismo cliente (`AsyncLocalStorage`).
- **`withRequestDbRole(request, fn)`** — Obtiene la sesión y delega en `runWithDbRole`.
- **Sin sesión** — El catálogo público utiliza `rol_cliente` (`publicCatalog: true`); otras lecturas anónimas emplean `rol_analista` por defecto.
- **`runWithoutDbRole(fn)`** — Operaciones sobre tablas Better Auth o bootstrap, sin `SET ROLE`.

El alta de cuentas de personal (`createUserAccountAndEmpleado`) utiliza `runWithoutDbRole` para insertar en `"user"` y `account`, y posteriormente `runWithDbRole('admin', ...)` para el registro en `Usuario`.

---

## Permisos en la capa de aplicación (API)

Los permisos HTTP **no sustituyen** los de PostgreSQL; refuerzan qué endpoints puede invocar cada rol aunque el motor ya limite filas y columnas.

La definición canónica reside en [`src/lib/api/permissions.ts`](../src/lib/api/permissions.ts).

| Permiso | Descripción |
|---------|-------------|
| `catalog:read_public` | Consulta del catálogo activo sin sesión |
| `catalog:read` | Consulta de catálogo, categorías y proveedores |
| `catalog:write` | Creación, actualización y eliminación en catálogo |
| `catalog:upload` | Carga de imágenes de producto |
| `clients:me` | Perfil y compras propias del cliente autenticado |
| `clients:read` / `clients:write` | Consulta y gestión de clientes |
| `sales:read` | Consulta de ventas |
| `sales:create_pos` | Registro de venta en POS (con vendedor) |
| `sales:create_self` | Autocompra en tienda en línea |
| `sales:void` | Anulación de ventas y restauración de stock |
| `reports:read` | Reportes analíticos |
| `staff:read` | Listado de personal |
| `staff:write` | Baja y actualización de personal (no incluye invitación) |
| `staff:invite` | Invitación de nuevas cuentas de personal (**exclusivo de superadmin**) |
| `meta:dashboard` | Panel de resumen (`/api/`) |

### Matriz rol → permisos API

| Permiso | cliente | cajero | analista | admin | superadmin |
|---------|:-------:|:------:|:--------:|:-----:|:----------:|
| `catalog:read_public` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `catalog:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `catalog:write` | | | | ✓ | ✓ |
| `catalog:upload` | | | | ✓ | ✓ |
| `clients:me` | ✓ | | | | |
| `clients:read` | | ✓ | ✓ | ✓ | ✓ |
| `clients:write` | | ✓ | | ✓ | ✓ |
| `sales:read` | | ✓ | ✓ | ✓ | ✓ |
| `sales:create_pos` | | ✓ | | ✓ | ✓ |
| `sales:create_self` | ✓ | | | | ✓ |
| `sales:void` | | | | ✓ | ✓ |
| `reports:read` | | | ✓ | ✓ | ✓ |
| `staff:read` | | | | ✓ | ✓ |
| `staff:write` | | | | ✓ | ✓ |
| `staff:invite` | | | | | ✓ |
| `meta:dashboard` | | | ✓ | ✓ | ✓ |

### Invitación de personal

Únicamente el rol **`superadmin`** dispone del permiso `staff:invite` y puede invocar `POST /api/empleados` para crear cuentas nuevas. El administrador (`admin`) puede **consultar** el personal y **desactivar** cuentas (`staff:write`), pero **no** invitar usuarios.

Al invitar, el superadministrador puede asignar los roles: `cajero`, `analista`, `admin` y `superadmin`. Si no se indica rol, el sistema asigna `cajero` por defecto.

---

## Comportamiento de la interfaz por rol

La autenticación utiliza **Better Auth** (sesión por cookie). Tras el inicio de sesión, [`homePathForRol`](../src/lib/auth/role-routes.ts) redirige al portal correspondiente:

| Rol | Ruta principal | Acceso al login |
|-----|----------------|-----------------|
| `cliente` | `/tienda` | `/login/cliente` |
| `cajero` | `/empleado` | `/login/empleado` |
| `analista` | `/analista` | `/login/empleado` |
| `admin` | `/portal` | `/login/empleado` |
| `superadmin` | `/superadmin` | `/login/empleado`; `/setup` si no existe superadmin |

El hook [`useRequireRoles`](../src/hooks/use-role-access.ts) impide el acceso a rutas no autorizadas: si el rol no coincide, redirige a la ruta principal del usuario.

### Cliente (`/tienda`)

El cliente accede al catálogo y al carrito (modo `checkoutMode="cliente"`), realiza compras en línea vinculadas a su registro en `Usuario` y consulta su historial (`/tienda/compras`, API `clients:me`). No accede a portales de personal ni a la edición del catálogo.

### Cajero (`/empleado`)

Portal orientado al mostrador (POS): resumen del día, registro de ventas, consulta de inventario y gestión de clientes de mostrador. La ruta `/caja` redirige a `/empleado`.

### Analista (`/analista`)

Acceso de **solo lectura**: consulta de ventas, catálogo (incluidos productos inactivos en listados internos), clientes y reportes analíticos. No dispone de POS ni de ABM de proveedores o personal.

### Administrador (`/portal`)

Gestión operativa del negocio: inicio, ventas/POS, productos (edición y desactivación), clientes, proveedores, reportes y consulta del personal (sin invitación de usuarios). La interfaz utiliza la paleta **Arctic Precision** (tema oscuro) mediante variables CSS (`--bg`, `--panel`, `--accent`, etc.).

### Superadministrador (`/superadmin`)

Incluye las capacidades del administrador y, además: invitación de personal (`staff:invite`), posibilidad de autocompra en tienda y configuración inicial en [`/setup`](../src/routes/setup/index.tsx) cuando no existe ningún superadministrador (`needsBootstrap`).

---

## Puesta en marcha del modelo de roles

1. Levantar PostgreSQL: `docker compose up -d db` (aplica `schema.sql` y `roles.sql`).
2. Copiar [`.env.example`](../.env.example) a `.env` (`proy3` / `secret`, `BETTER_AUTH_SECRET`).
3. Si la base de datos ya existía antes de aplicar `roles.sql`, ejecutar dicho script manualmente como superusuario (por ejemplo `proy3` en el entorno de curso).
4. Iniciar la aplicación y completar `/setup` o utilizar los usuarios del seed definidos en `db/schema.sql`.

---

## Relación entre capas

| Capa | Responsabilidad |
|------|-----------------|
| `"user".rol` | Fuente de verdad del rol de la cuenta |
| `db/roles.sql` | Límite en SQL (tablas, columnas, funciones) |
| `permissions.ts` y `guard.ts` | Autorización de endpoints HTTP |
| `role-routes.ts` y `useRequireRoles` | Autorización de pantallas en React |
| `runWithDbRole` | Aplicación coherente del rol PostgreSQL en cada transacción |

Una cuenta con rol elevado en `"user".rol` pero sin los `GRANT` adecuados en PostgreSQL fallará en las consultas de negocio. Un rol con privilegios amplios en la base de datos pero sin permiso en la API recibirá respuesta **403** antes de ejecutar la operación de negocio.
