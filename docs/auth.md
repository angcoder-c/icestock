# Sistema de Autenticación - Documentación Técnica

## Descripción General

Se ha implementado un sistema de autenticación completo para dos tipos de usuarios:

- **Empleados**: Acceso al sistema de punto de venta (cajeros y admins)
- **Clientes**: Acceso para ver sus compras y perfil

## Tecnologías Utilizadas

- **Hashing de Contraseñas**: `bcryptjs` (10 rounds)
- **Tokens JWT**: `jsonwebtoken` con expiración de 7 días
- **Base de Datos**: PostgreSQL con tablas Better Auth + Custom

## Arquitectura

### Base de Datos

#### Tablas Better Auth

- `user`: Usuarios del sistema
- `session`: Sesiones activas
- `account`: Credenciales (almacena hash bcrypt)
- `Verification`: Tokens de verificación

#### Tablas Custom

- `Empleado`: Perfil de empleados (vinculado a `user` via `user_id`)
- `Cliente`: Perfil de clientes (vinculado a `user` via `user_id`)

### Flujo de Autenticación

#### Registro

1. Usuario envía email, password y datos personales
2. Se verifica que el email no esté duplicado
3. Se genera UUID para el usuario
4. Se hashea la contraseña con bcryptjs
5. Se inserta en `user` table
6. Se inserta en `Empleado` o `Cliente` table
7. Se inserta hash en `account` table
8. Se genera JWT token de 7 días
9. Se retorna token + datos del usuario

#### Login

1. Usuario envía email y password
2. Se busca el usuario en `user` table
3. Se obtiene el hash de `account` table
4. Se verifica password con bcryptjs
5. Se genera JWT token
6. Se retorna token + datos del usuario

#### Verificación de Token

1. Frontend envía token en header `Authorization: Bearer <token>`
2. Se verifica y decodifica el JWT
3. Se retornan datos del usuario si es válido
4. Se retorna error 401 si no es válido

## Código Implementado

### Backend (`src/lib/db.ts`)

#### Funciones principales

```typescript
// Registro de empleados
export async function registerEmpleado(
  email: string,
  password: string,
  name: string,
  rol: 'admin' | 'cajero' = 'cajero'
): Promise<AuthResponse>

// Login de empleados
export async function loginEmpleado(
  email: string,
  password: string
): Promise<AuthResponse>

// Registro de clientes
export async function registerCliente(
  email: string,
  password: string,
  nombre: string
): Promise<AuthResponse>

// Login de clientes
export async function loginCliente(
  email: string,
  password: string
): Promise<AuthResponse>

// Verificar token JWT
export function verifyToken(token: string)
```

### API Endpoints

#### Empleados

- `POST /api/auth/empleados/register` - Registrar nuevo empleado
- `POST /api/auth/empleados/login` - Iniciar sesión como empleado

#### Clientes

- `POST /api/auth/clientes/register` - Registrar nuevo cliente
- `POST /api/auth/clientes/login` - Iniciar sesión como cliente

#### General

- `GET /api/auth/me` - Obtener usuario actual (requiere token)

### Componentes UI (`src/routes/`)

#### Empleados

- `/empleados/login` - Formulario de login para empleados
- `/empleados/register` - Formulario de registro para empleados

#### Clientes

- `/clientes/login` - Formulario de login para clientes
- `/clientes/register` - Formulario de registro para clientes

## Flujo de Uso

### Para Empleados

1. **Registro**
  - Acceder a `/empleados/register`
  - Completar: Nombre, Email, Contraseña, Confirmar Contraseña
  - El rol se asigna como "cajero" por defecto
  - Se guarda token en localStorage y redirige a `/dashboard`
2. **Login**
  - Acceder a `/empleados/login`
  - Completar: Email, Contraseña
  - Se guarda token en localStorage y redirige a `/dashboard`

### Para Clientes

1. **Registro**
  - Acceder a `/clientes/register`
  - Completar: Nombre, Email, Contraseña, Confirmar Contraseña
  - Se guarda token en localStorage y redirige a `/mi-cuenta`
2. **Login**
  - Acceder a `/clientes/login`
  - Completar: Email, Contraseña
  - Se guarda token en localStorage y redirige a `/mi-cuenta`

## Almacenamiento de Token

El token JWT se guarda en `localStorage`:

```typescript
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
```

Cada petición protegida debe enviar el token en el header:

```typescript
fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

## Validación

### Email

- Se verifica que no esté duplicado
- Formato de email válido (validado por input type="email")

### Contraseña

- Mínimo 6 caracteres
- Se hashea con bcryptjs (10 rounds)
- Nunca se almacena en texto plano

### JWT

- Expiración: 7 días
- Secret: Configurable via `JWT_SECRET` env var
- Payload contiene: userId, email, tipo (empleado/cliente), rol (si aplica)

## Manejo de Errores

### Errores de Validación (400)

- Email duplicado
- Campos requeridos faltantes
- Contraseñas no coinciden

### Errores de Autenticación (401)

- Usuario o contraseña incorrectos
- Token inválido o expirado
- Token no proporcionado

### Errores del Servidor (500)

- Error en la base de datos
- Error interno del servidor

## Configuración

### Variables de Entorno

```env
# JWT
JWT_SECRET=super-secret-key-change-in-production

# Base de Datos
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_NAME=icestock
DB_PORT=5432
```

## Próximos Pasos (Opcionales)

### Mejoras Sugeridas

1. **Email Verification**
  - Enviar email de confirmación al registrar
  - Marcar `email_verified` como true solo después de confirmación
2. **Password Reset**
  - Crear endpoint para solicitar reset
  - Enviar link con token de tiempo limitado
3. **Refresh Tokens**
  - Implementar tokens de refresco
  - Rotar access tokens cada cierto tiempo
4. **Protección de Rutas**
  - Crear middleware para proteger rutas
  - Redirigir a login si token está expirado
5. **Social Login**
  - Integrar con Better Auth para OAuth
  - Login con Google, GitHub, etc.
6. **2FA (Two-Factor Authentication)**
  - Enviar código via email o SMS
  - Verificar antes de completar login
7. **Auditoría**
  - Registrar intentos de login
  - Alertar sobre acceso anómalo

## Testing

### Credenciales de Prueba

**Empleado (creado con seed)**

```
Email: admin@heladeria.com
Password: secret
Rol: admin
```

**Cliente (nuevo registro)**

```
Email: cliente@test.com
Password: password123
Nombre: Cliente Test
```

