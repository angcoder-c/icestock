<h1 align="center">IceStock</h1>

<p align="center">
  <img src="./public/logo.png" alt="IceStock" width="140" />
</p>

<p align="center">
  <strong>Inventario y ventas para heladería</strong>
  <a href="https://icestock.vercel.app" align="center">icestock.vercel.app</a>
</p>

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

[![Cloudinary](https://img.shields.io/badge/Cloudinary-enabled-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)
---

Aplicación web para **inventario y ventas** de una tienda: catálogo público, portales de administración y cajero, reportes y autenticación con Better Auth.

**Entrega Proyecto 3 (cc3088):** rama `proyecto-3` — roles PostgreSQL, stored procedures y capa de datos en [`src/lib/db.ts`](src/lib/db.ts). Checklist de rúbrica: [docs/endpoints.md#cobertura--proyecto-3-cc3088](docs/endpoints.md#cobertura--proyecto-3-cc3088).

## Arquitectura: API REST + cliente React

El flujo de negocio va por **API REST con respuestas JSON**; el navegador es un **cliente React** que consume `/api/...` con `fetch` (TanStack Query). **El frontend no se conecta a PostgreSQL.**

- **Backend:** rutas bajo `/api/productos`, `/api/ventas`, `/api/reportes/...`, Better Auth en `/api/auth/...`.
- **Cliente:** React 19, Context (sesión, carrito), TanStack Router en `src/routes/`.
- **Stack:** TanStack Start + Vite; en desarrollo el mismo proceso sirve UI y handlers.

---

## Documentación


| Tema                                          | Archivo                                                          |
| --------------------------------------------- | ---------------------------------------------------------------- |
| **API**                                       | [docs/endpoints.md](docs/endpoints.md)                           |
| **Permisos API (matriz por rol)**             | [docs/endpoints.md#permisos-por-rol](docs/endpoints.md#permisos-por-rol) |
| **API (OpenAPI)**                             | [docs/openapi.json](docs/openapi.json) · [public/openapi.json](public/openapi.json) |
| **Swagger UI**                                | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) |
| **Autenticación**                             | [docs/auth.md](docs/auth.md)                                     |
| **Roles, permisos y modelo de usuario**       | [docs/roles-permisos.md](docs/roles-permisos.md)                   |
| **Proyecto 3 — rúbrica (checklist)**          | [docs/endpoints.md#cobertura--proyecto-3-cc3088](docs/endpoints.md#cobertura--proyecto-3-cc3088) |
| **Base de datos — normalización (0FN → 3FN)** | [docs/db/normalization.md](docs/db/normalization.md)             |
| **Base de datos — consultas SQL**             | [docs/db/queries.md](docs/db/queries.md)                         |
| **Diagrama ER**                               | [docs/db/er.diagram.png](docs/db/er.diagram.png)                 |
| **Diagrama relacional**                       | [docs/db/relational.diagram.png](docs/db/relational.diagram.png) |
| **Esquema SQL (init Docker)**                 | [db/schema.sql](db/schema.sql)                                   |


---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose v2  
- **Node.js** 22+ y npm (opcional si solo usas Docker)

---

## Ejecución con Docker

<img width="800" height="450" alt="running" src="https://github.com/user-attachments/assets/b952dc7f-ea78-4430-bd52-097d16fb6cc1" />

https://github.com/user-attachments/assets/198fb8da-bc9d-433b-ab26-e2c5a298ae4f

```bash
git clone https://github.com/angcoder-c/icestock.git
cd icestock
git checkout proyecto-3
cp .env.example .env
docker compose up
```

- **App:** [http://localhost:3000](http://localhost:3000)  
- **PostgreSQL:** puerto host **5433** → `5432` en el contenedor  
- **Init:** `db/schema.sql` y `db/roles.sql` en el primer arranque con volumen vacío (el bootstrap de `proy3` ya vive dentro de `db/schema.sql`; modelo `Usuario` unificado; no hay scripts de migración aparte)

Variables de calificación en `.env.example`: usuario DB **proy3**, contraseña **secret**. Copiar a `.env` y definir `BETTER_AUTH_SECRET` (en `.env` de desarrollo puede ir un valor de ejemplo). Opcional: `CLOUDINARY_URL` para imágenes.

**Error `role "proy3" does not exist`:** se debe a que el volumen `pg_data` se creó con otro usuario. Recrear la base:

```bash
docker compose down -v
docker compose up
```

(`-v` borra el volumen.)

---

## Desarrollo local (sin Docker)

```bash
npm install
npm run dev
```

Puerto por defecto: **3000**. OpenAPI estático: `/openapi.json`.

---

## Calidad y pruebas

- ESLint: [eslint.config.js](eslint.config.js)  
- Jest: `tests/openapi.test.ts`, `tests/http.test.ts`, `tests/ui/*.test.tsx`  
- Vitest: `npm test`

---

## Imágenes

- Columna `Producto.imagen_url`  
- `POST /api/upload/imagen` (autorizado), variable `CLOUDINARY_URL`

---

## Licencia

MIT
