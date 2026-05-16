# API Endpoints

**OpenAPI:** especificación [public/openapi.json](../public/openapi.json) (expuesta en `/openapi.json` con `npm run dev`). **Swagger UI:** [GET /api/docs](http://localhost:3000/api/docs). Resumen en el [README](../README.md#documentación).

**Contrato:** todas las respuestas de negocio bajo `/api` son JSON (`application/json`); no se usan códigos sin cuerpo (p. ej. 204). La subida `POST /api/upload/imagen` acepta `multipart/form-data` pero responde JSON.

Base URL: `http://localhost:3000`

---

## Auth — Better Auth

Better Auth expone sus rutas automáticamente en `/api/auth/`*.
El frontend usa el cliente oficial `better-auth/client`; **Estos endpoints no deben llamarse manualmente**

### POST `/api/auth/sign-in/email`

Inicia sesión. Better Auth crea la sesión y devuelve una cookie `better-auth.session_token`.

**Request body**

```json
{
  "email": "admin@heladeria.com",
  "password": "secret123"
}
```

**Response 200**

```json
{
  "user": {
    "id": "usr_admin_001",
    "name": "Admin Sistema",
    "email": "admin@heladeria.com",
    "rol": "admin",
    "emailVerified": true,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z"
  },
  "session": {
    "id": "ses_abc123",
    "expiresAt": "2026-05-25T09:00:00Z",
    "token": "tok_xyz...",
    "userId": "usr_admin_001"
  }
}
```

**Response 401**

```json
{ "error": "Invalid credentials" }
```

### POST `/api/auth/sign-out`

Cierra la sesión activa. Invalida la cookie.

---

## Autenticación Custom — Empleados y Clientes

Sistema de autenticación con email/password, JWT tokens y bcrypt para hashing de contraseñas.

### POST `/api/auth/empleados/register`

Registra un nuevo empleado.

**Request body**

```json
{
  "email": "empleado@heladeria.com",
  "password": "password123",
  "name": "Juan Pérez",
  "rol": "cajero"
}
```

**Response 201**

```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "user_1234567890",
    "email": "empleado@heladeria.com",
    "name": "Juan Pérez",
    "rol": "cajero",
    "tipo": "empleado"
  }
}
```

**Response 400**

```json
{ "error": "El correo ya está registrado" }
```

### POST `/api/auth/empleados/login`

Inicia sesión como empleado.

**Request body**

```json
{
  "email": "empleado@heladeria.com",
  "password": "password123"
}
```

**Response 200**

```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "user_1234567890",
    "email": "empleado@heladeria.com",
    "name": "Juan Pérez",
    "rol": "cajero",
    "tipo": "empleado"
  }
}
```

**Response 401**

```json
{ "error": "Usuario o contraseña incorrectos" }
```

### POST `/api/auth/clientes/register`

Registra un nuevo cliente.

**Request body**

```json
{
  "email": "cliente@email.com",
  "password": "password123",
  "nombre": "María García"
}
```

**Response 201**

```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "user_9876543210",
    "email": "cliente@email.com",
    "name": "María García",
    "rol": "cliente",
    "tipo": "cliente"
  }
}
```

**Response 400**

```json
{ "error": "El correo ya está registrado" }
```

### POST `/api/auth/clientes/login`

Inicia sesión como cliente.

**Request body**

```json
{
  "email": "cliente@email.com",
  "password": "password123"
}
```

**Response 200**

```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "user_9876543210",
    "email": "cliente@email.com",
    "name": "María García",
    "rol": "cliente",
    "tipo": "cliente"
  }
}
```

**Response 401**

```json
{ "error": "Usuario o contraseña incorrectos" }
```

### GET `/api/auth/me`

Obtiene la información del usuario actual (requiere token JWT en header).

**Request headers**

```
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "user": {
    "userId": "user_1234567890",
    "email": "empleado@heladeria.com",
    "tipo": "empleado",
    "rol": "cajero",
    "iat": 1234567890,
    "exp": 1234654290
  }
}
```

**Response 401**

```json
{ "error": "Token inválido o expirado" }
```

---

## Cómo usar el sistema de autenticación

### En el cliente (frontend)

1. **Registro de Empleado**
  ```typescript
   const response = await fetch('/api/auth/empleados/register', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'empleado@heladeria.com',
       password: 'password123',
       name: 'Juan Pérez',
       rol: 'cajero'
     })
   });
   const data = await response.json();
   localStorage.setItem('token', data.token);
   localStorage.setItem('user', JSON.stringify(data.user));
  ```
2. **Login de Cliente**
  ```typescript
   const response = await fetch('/api/auth/clientes/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'cliente@email.com',
       password: 'password123'
     })
   });
   const data = await response.json();
   localStorage.setItem('token', data.token);
  ```
3. **Obtener usuario actual**
  ```typescript
   const token = localStorage.getItem('token');
   const response = await fetch('/api/auth/me', {
     headers: { 'Authorization': `Bearer ${token}` }
   });
   const data = await response.json();
   console.log(data.user);
  ```

### Rutas de UI

- **Login Empleado**: `/empleados/login`
- **Registro Empleado**: `/empleados/register`
- **Login Cliente**: `/clientes/login`
- **Registro Cliente**: `/clientes/register`

### Seguridad

- Las contraseñas se hashean con **bcryptjs** (10 rounds)
- Los tokens JWT están configurados con expiración de **7 días**
- El JWT_SECRET debe cambiarse en producción (ver archivo `.env`)
- Todos los endpoints de autenticación validan entrada y manejan errores

---

## POST `/api/auth/sign-out`

Cierra la sesión activa. Invalida la cookie.

**Response 200**

```json
{ "success": true }
```

### GET `/api/auth/get-session`

Devuelve la sesión activa actual. Útil para hidratar el Context en el frontend al recargar.

**Response 200**

```json
{
  "user": {
    "id": "usr_admin_001",
    "name": "Admin Sistema",
    "email": "admin@heladeria.com",
    "rol": "admin"
  },
  "session": {
    "id": "ses_abc123",
    "expiresAt": "2026-05-25T09:00:00Z"
  }
}
```

**Response 401**

```json
{ "error": "Unauthorized" }
```

---

> A partir de aquí, todos los endpoints requieren sesión activa (cookie).
> El middleware del backend llama a `auth.api.getSession()` de Better Auth en cada request.

---

## Categorías — `/api/categorias`

### GET `/api/categorias`

**Response 200**

```json
[
  { "id": 1, "nombre": "Paleta", "descripcion": "Helados en palito de agua o crema" },
  { "id": 2, "nombre": "Copa",   "descripcion": "Helado servido en vaso o copa" }
]
```

### POST `/api/categorias`

**Request body**

```json
{ "nombre": "Waffle", "descripcion": "Helado en cono waffle" }
```

**Response 201**

```json
{ "id": 11, "nombre": "Waffle", "descripcion": "Helado en cono waffle" }
```

**Response 400**

```json
{ "error": "El campo 'nombre' es obligatorio" }
```

### PUT `/api/categorias/:id`

**Request body**

```json
{ "nombre": "Waffle Premium", "descripcion": "Cono waffle artesanal" }
```

**Response 200**

```json
{ "id": 11, "nombre": "Waffle Premium", "descripcion": "Cono waffle artesanal" }
```

**Response 404**

```json
{ "error": "Categoría no encontrada" }
```

### DELETE `/api/categorias/:id`

**Response 200**

```json
{ "mensaje": "Categoría eliminada correctamente" }
```

**Response 409**

```json
{ "error": "No se puede eliminar: la categoría tiene productos asociados" }
```

---

## Productos — `/api/productos`

### GET `/api/productos`

Query params opcionales: `?categoria=1`, `?search=mango`, `?stock_bajo=true`

**Response 200**

```json
[
  {
    "id": 1,
    "nombre": "Paleta de Mango",
    "descripcion": "Paleta artesanal de mango natural",
    "precio": "15.00",
    "stock": 80,
    "activo": true,
    "categoria": { "id": 1, "nombre": "Paleta" },
    "proveedor":  { "id": 3, "nombre": "Frutas Frescas SA" }
  }
]
```

### GET `/api/productos/:id`

**Response 200** — mismo objeto de arriba, individual.

**Response 404**

```json
{ "error": "Producto no encontrado" }
```

### POST `/api/productos`

**Request body**

```json
{
  "nombre": "Paleta de Guanábana",
  "descripcion": "Paleta cremosa de guanábana",
  "precio": 16.00,
  "stock": 50,
  "id_categoria": 1,
  "id_proveedor": 3
}
```

**Response 201**

```json
{ "id": 26, "nombre": "Paleta de Guanábana", "precio": "16.00", "stock": 50 }
```

**Response 400**

```json
{ "error": "El precio debe ser mayor a 0" }
```

### PUT `/api/productos/:id`

**Request body** (todos opcionales)

```json
{ "precio": 18.00, "stock": 45 }
```

**Response 200**

```json
{ "id": 26, "nombre": "Paleta de Guanábana", "precio": "18.00", "stock": 45 }
```

### DELETE `/api/productos/:id`

Soft delete — cambia `activo` a `false`.

**Response 200**

```json
{ "mensaje": "Producto desactivado correctamente" }
```

---

## Proveedores — `/api/proveedores`

### GET `/api/proveedores`

**Response 200**

```json
[
  {
    "id": 1,
    "nombre": "Cremería El Norte",
    "telefono": "5555-1111",
    "email": "contacto@elnorte.com",
    "direccion": "Zona 1, Guatemala"
  }
]
```

### POST `/api/proveedores`

**Request body**

```json
{
  "nombre": "Helados Importados SA",
  "telefono": "5555-9999",
  "email": "info@importados.com",
  "direccion": "Zona 3, Guatemala"
}
```

**Response 201**

```json
{ "id": 9, "nombre": "Helados Importados SA" }
```

### PUT `/api/proveedores/:id`

**Request body**

```json
{ "telefono": "5555-0000" }
```

**Response 200**

```json
{ "id": 9, "nombre": "Helados Importados SA", "telefono": "5555-0000" }
```

### DELETE `/api/proveedores/:id`

**Response 200**

```json
{ "mensaje": "Proveedor eliminado correctamente" }
```

**Response 409**

```json
{ "error": "No se puede eliminar: el proveedor tiene productos asociados" }
```

---

## Clientes — `/api/clientes`

### GET `/api/clientes`

**Response 200**

```json
[
  {
    "id": 1,
    "nombre": "Juan Ramírez",
    "email": "juan@mail.com",
    "telefono": "5500-0001",
    "creado_en": "2026-01-15T10:30:00Z"
  }
]
```

### GET `/api/clientes/:id`

**Response 200**

```json
{
  "id": 1,
  "nombre": "Juan Ramírez",
  "email": "juan@mail.com",
  "telefono": "5500-0001",
  "total_compras": 3,
  "monto_total": "210.00"
}
```

### POST `/api/clientes`

**Request body**

```json
{ "nombre": "Beatriz Chan", "email": "bea@mail.com", "telefono": "5500-9999" }
```

**Response 201**

```json
{ "id": 26, "nombre": "Beatriz Chan", "email": "bea@mail.com" }
```

### PUT `/api/clientes/:id`

**Request body**

```json
{ "telefono": "5500-1234" }
```

**Response 200**

```json
{ "id": 26, "nombre": "Beatriz Chan", "telefono": "5500-1234" }
```

### DELETE `/api/clientes/:id`

**Response 200**

```json
{ "mensaje": "Cliente eliminado correctamente" }
```

---

## Ventas — `/api/ventas`

### GET `/api/ventas`

Query params: `?fecha_inicio=2026-01-01`, `?fecha_fin=2026-12-31`

**Response 200**

```json
[
  {
    "id": 1,
    "fecha": "2026-05-01T14:22:00Z",
    "total": "75.00",
    "estado": "completada",
    "cliente": "Juan Ramírez",
    "empleado": "María López"
  }
]
```

### GET `/api/ventas/:id`

**Response 200**

```json
{
  "id": 1,
  "fecha": "2026-05-01T14:22:00Z",
  "total": "75.00",
  "estado": "completada",
  "cliente": { "id": 1, "nombre": "Juan Ramírez" },
  "empleado": { "id": "usr_emp_002", "nombre": "María López" },
  "detalle": [
    {
      "id_producto": 1,
      "producto": "Paleta de Mango",
      "cantidad": 3,
      "precio_unit": "15.00",
      "subtotal": "45.00"
    }
  ]
}
```

### POST `/api/ventas`

Llama internamente a `registrar_venta()` dentro de un `BEGIN/COMMIT` explícito.
El `user_id` se obtiene de la sesión activa de Better Auth — no se envía en el body.

**Request body**

```json
{
  "id_cliente": 1,
  "items": [
    { "id_producto": 1, "cantidad": 3 },
    { "id_producto": 4, "cantidad": 1 }
  ]
}
```

**Response 201**

```json
{
  "id": 42,
  "total": "80.00",
  "fecha": "2026-05-11T09:15:00Z",
  "mensaje": "Venta registrada correctamente"
}
```

**Response 400**

```json
{ "error": "Stock insuficiente para producto 1" }
```

### DELETE `/api/ventas/:id`

Anula la venta y restaura el stock (transacción explícita).

**Response 200**

```json
{ "mensaje": "Venta anulada y stock restaurado" }
```

**Response 403**

```json
{ "error": "Solo un administrador puede anular ventas" }
```

---

## Empleados — `/api/empleados`

Solo accesible con `rol = 'admin'`. El middleware verifica el campo `rol` del user de Better Auth.

### GET `/api/empleados`

**Response 200**

```json
[
  {
    "id": 1,
    "user_id": "usr_admin_001",
    "nombre": "Admin Sistema",
    "email": "admin@heladeria.com",
    "rol": "admin",
    "activo": true,
    "creado_en": "2026-01-01T00:00:00Z"
  }
]
```

### POST `/api/empleados`

Crea el usuario en Better Auth y el perfil en `empleados` en una sola operación.

**Request body**

```json
{
  "nombre": "Nueva Cajera",
  "email": "nueva@heladeria.com",
  "password": "secret123",
  "rol": "cajero"
}
```

**Response 201**

```json
{ "user_id": "usr_new_006", "nombre": "Nueva Cajera", "rol": "cajero" }
```

**Response 400**

```json
{ "error": "El email ya está registrado" }
```

### PUT `/api/empleados/:user_id`

Actualiza nombre y/o rol. No permite cambiar password desde aquí.

**Request body**

```json
{ "nombre": "Cajera Senior", "rol": "cajero" }
```

**Response 200**

```json
{ "user_id": "usr_new_006", "nombre": "Cajera Senior", "rol": "cajero" }
```

### DELETE `/api/empleados/:user_id`

Soft delete — cambia `activo` a `false`. No elimina el user de Better Auth.

**Response 200**

```json
{ "mensaje": "Empleado desactivado" }
```

---

## Reportes — `/api/reportes`

### GET `/api/reportes/ventas-del-dia`

Usa `vista_ventas_completa`.

**Response 200**

```json
{
  "fecha": "2026-05-11",
  "total_ventas": 12,
  "ingresos": "945.00",
  "ventas": []
}
```

### GET `/api/reportes/productos-mas-vendidos`

Usa CTE internamente. Query params: `?fecha_inicio=2026-01-01&fecha_fin=2026-12-31`

**Response 200**

```json
[
  {
    "rank": 1,
    "id_producto": 9,
    "producto": "Bola de Vainilla",
    "categoria": "Bola",
    "total_vendido": 320,
    "ingresos": "3200.00"
  }
]
```

### GET `/api/reportes/stock-disponible`

`alerta: true` cuando `stock < 20`.

**Response 200**

```json
[
  { "id": 20, "producto": "Especialidad del Día", "stock": 10, "alerta": true },
  { "id": 19, "producto": "Tarrina 1L",            "stock": 15, "alerta": true }
]
```

### GET `/api/reportes/ventas-por-categoria`

Usa `GROUP BY` + `HAVING`.

**Response 200**

```json
[
  { "categoria": "Sundae", "total_vendido": 180, "ingresos": "6120.00" }
]
```

### GET `/api/reportes/clientes-frecuentes`

Usa subquery — clientes con más de 3 compras.

**Response 200**

```json
[
  { "id": 1, "nombre": "Juan Ramírez", "total_compras": 8, "monto_total": "640.00" }
]
```

---

## Códigos HTTP


| Código | Significado                                       |
| ------ | ------------------------------------------------- |
| 200    | Éxito                                             |
| 201    | Recurso creado                                    |
| 400    | Error de validación / datos incorrectos           |
| 401    | No autenticado (sesión inválida o expirada)       |
| 403    | Sin permisos (rol insuficiente)                   |
| 404    | Recurso no encontrado                             |
| 409    | Conflicto (no se puede eliminar por dependencias) |
| 500    | Error interno del servidor                        |


---

## Notas de integración — Better Auth + Express sin ORM

```js
// auth.js — configuración del servidor
import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,      // proy2
  password: process.env.DB_PASSWORD, // secret
  database: process.env.DB_NAME,
})

export const auth = betterAuth({
  database: {
    // adaptador custom: Better Auth ejecuta sus queries con tu pool de pg
    type: 'pg',
    pool,
  },
  emailAndPassword: { enabled: true },
  // campo extra en la tabla "user"
  user: {
    additionalFields: {
      rol: { type: 'string', defaultValue: 'cajero' },
    },
  },
})

// middleware.js — proteger rutas del negocio
export async function requireSession(req, res, next) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return res.status(401).json({ error: 'No autenticado' })
  req.user = session.user   // { id, name, email, rol, ... }
  next()
}

export function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'admin')
    return res.status(403).json({ error: 'Se requiere rol admin' })
  next()
}
```

---

## Cobertura de rúbrica


| Criterio cc3062 / cc3088             | Cubierto por                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| CRUD ≥ 2 entidades                   | `/api/productos`, `/api/clientes`, `/api/ventas`, `/api/categorias`             |
| Endpoint de agregación               | `/api/reportes/ventas-del-dia`, `/api/reportes/stock-disponible`                |
| Manejo de errores HTTP               | Todos los endpoints                                                             |
| JOINs visibles en UI                 | `GET /api/ventas/:id`, `/api/reportes/*`                                        |
| Subquery                             | `GET /api/reportes/clientes-frecuentes`                                         |
| GROUP BY / HAVING                    | `GET /api/reportes/ventas-por-categoria`                                        |
| CTE                                  | `GET /api/reportes/productos-mas-vendidos`                                      |
| VIEW                                 | `GET /api/ventas` y `/api/reportes/ventas-del-dia` usan `vista_ventas_completa` |
| Transacción explícita + ROLLBACK     | `POST /api/ventas`, `DELETE /api/ventas/:id`                                    |
| Autenticación login/logout + Context | Better Auth — `/api/auth/sign-in/email`, `/api/auth/sign-out`                   |


