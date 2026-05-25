# Autenticación — IceStock

## Descripción general

La aplicación utiliza **[Better Auth](https://www.better-auth.com/)** para registro, inicio de sesión y cierre de sesión. Las credenciales y sesiones viven en PostgreSQL (`"user"`, `session`, `account`, `Verification`). El campo `"user".rol` define el tipo de cuenta en la aplicación y se alinea con los roles PostgreSQL (`rol_*`).

El frontend usa el cliente oficial (`better-auth/client`) y cookies de sesión; **no** se implementan JWT propios ni endpoints `/api/auth/empleados/*` / `/api/auth/clientes/*`.

Documentación de rutas HTTP: [endpoints.md](./endpoints.md#auth--better-auth). OpenAPI (tags **Auth**): [openapi.json](./openapi.json). Permisos por rol: [roles-permisos.md](./roles-permisos.md).

---

## Rutas Better Auth (automáticas)

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/api/auth/sign-in/email` | Inicio de sesión (email + contraseña) |
| POST | `/api/auth/sign-out` | Cierre de sesión |
| GET | `/api/auth/get-session` | Sesión actual (hidratación del contexto React) |

El registro público de clientes puede exponerse según la configuración de Better Auth; el alta de **personal** se hace por `POST /api/empleados` (solo **superadmin**, permiso `staff:invite`).

---

## Rutas de la interfaz

| Rol | Login | Portal principal |
|-----|-------|------------------|
| Cliente | `/login/cliente` | `/tienda` |
| Personal (cajero, analista, admin, superadmin) | `/login/empleado` | `/empleado`, `/analista`, `/portal` o `/superadmin` según `user.rol` |
| Instalación inicial | — | `/setup` (primer superadmin si no existe ninguno) |

La protección de pantallas usa `useRequireRoles` y `canAccessPath` ([`src/lib/auth/role-routes.ts`](../src/lib/auth/role-routes.ts)).

---

## Capa de datos (`src/lib/db.ts`)

Better Auth gestiona la mayoría de operaciones sobre `"user"` / `session` / `account`. Para personal del negocio, la app usa:

| Función | Descripción |
|---------|-------------|
| `findUserByEmail` | Comprueba duplicados antes de alta |
| `createUserAccountAndEmpleado` | `INSERT` en `"user"`, `account` y fila en `Usuario` (transacción) |
| `updateUserEmpleadoProfile` | Actualiza nombre y `rol` en `"user"` |
| `deactivateEmpleadoByUserId` | `UPDATE Usuario SET activo = FALSE` |
| `bootstrapSuperadmin` | Primer superadmin cuando la BD no tiene ninguno |

Las contraseñas las hashea Better Auth (credencial en `account.password`).

---

## Variables de entorno

```env
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=   # obligatorio: cadena larga y aleatoria

# PostgreSQL (calificación: proy3 / secret — ver .env.example)
DATABASE_URL=postgres://proy3:secret@db:5432/icestock
```

---

## Cuentas de demostración (seed)

Contraseña para todas: **`secret`** (definida en `db/schema.sql`).

| Rol | Email |
|-----|-------|
| superadmin | superadmin@heladeria.com |
| admin | admin@heladeria.com |
| analista | analista@heladeria.com |
| cajero | cajero@heladeria.com |
| cliente | cliente@heladeria.com |

Listado en código: [`src/lib/setup-demo.ts`](../src/lib/setup-demo.ts).

---

## Flujo resumido

1. El usuario envía email y contraseña a `POST /api/auth/sign-in/email`.
2. Better Auth valida contra `account` y crea la sesión (cookie).
3. Cada petición a `/api/*` de negocio pasa por `requireAuth` / `requireAuthAndPermission` y, en base de datos, por `runWithDbRole` (`SET LOCAL ROLE` según `user.rol`).
4. `POST /api/auth/sign-out` invalida la sesión.

---

## Errores habituales

| Código | Situación |
|--------|-----------|
| 401 | Sin sesión o credenciales inválidas |
| 403 | Sesión válida pero permiso HTTP insuficiente (`permissions.ts`) |
