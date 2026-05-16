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
| **API (OpenAPI)**                             | [docs/openapi.json](docs/openapi.json)                           |
| **Swagger UI**                                | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) |
| **Autenticación**                             | [docs/auth.md](docs/auth.md)                                     |
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

## Puesta en marcha con Docker

```bash
cp .env.example .env
docker compose up
```

- **App:** [http://localhost:3000](http://localhost:3000)  
- **PostgreSQL:** puerto host **5433** → `5432` en el contenedor  
- **Init:** `db/schema.sql` se aplica en el primer arranque con volumen vacío

Variables de calificación en `.env.example`: usuario DB `**proy2`**, contraseña `**secret**`. Define un `BETTER_AUTH_SECRET` largo. Opcional: `CLOUDINARY_URL` para imágenes.

---

## Desarrollo local (sin Docker)

```bash
npm install
npm run dev
```

Puerto por defecto: **3000**. OpenAPI estático: `/openapi.json`.

---

## Scripts


| Comando             | Descripción                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Desarrollo (Vite + TanStack Start) |
| `npm run build`     | Build cliente y servidor           |
| `npm run preview`   | Vista previa del build             |
| `npm run lint`      | ESLint                             |
| `npm test`          | Vitest                             |
| `npm run test:jest` | Jest (OpenAPI, HTTP, UI)           |


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

## Despliegue

Compilar con `npm run build` y desplegar con las mismas variables de `.env.example`. Configuración opcional Cloudflare Workers (`wrangler`).

---

## Licencia

MIT
