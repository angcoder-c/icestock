Welcome to your new TanStack Start app! 

# Getting Started

To run this application:

```bash
npm install
npm run dev
```

# Building For Production

To build this application for production:

```bash
npm run build
```

## API REST (negocio)

- **Documentación humana**: [docs/endpoints.md](docs/endpoints.md)
- **OpenAPI 3** (misma especificación en dos sitios): [public/openapi.json](public/openapi.json) (sirve Vite en `/openapi.json`) y [docs/openapi.json](docs/openapi.json)
- **Metadatos de documentación (JSON)**: `GET /api/docs` devuelve JSON con el enlace al spec (`openapi`) y una nota de uso; importa `/openapi.json` en Postman, Stoplight o Swagger Editor para explorar el contrato.
- **Resumen agregado (dashboard)**: `GET /api/` devuelve datos de ejemplo para gráficos y enlaces en `meta` (`openapi`, `documentacion`, `humanDocs`).

Las rutas bajo `/api/categorias`, `/api/productos`, `/api/ventas`, etc. requieren sesión Better Auth (inicia sesión vía `POST /api/auth/sign-in/email` y cookie).

### Imágenes de productos y Cloudinary

- **Columna** `Producto.imagen_url` (texto, opcional): URL pública de la foto.
- **Datos de prueba**: el `db/schema.sql` asigna la misma imagen de ejemplo a todos los productos seed; si ya tenías una base creada antes, ejecuta `db/migrations/001_producto_imagen_url.sql` sobre PostgreSQL.
- **Subida**: `POST /api/upload/imagen` (multipart `file`, opcional `id_producto`) sube a Cloudinary y, si mandas `id_producto`, actualiza ese producto. Solo **personal** (`admin` / `cajero`), no clientes. Configura `CLOUDINARY_URL` en `.env` (formato `cloudinary://API_KEY:API_SECRET@cloud_name`, ver `.env.example`).

### Frontend (rúbrica React)

- **Context** (`IcestockProvider`): sesión Better Auth + carrito global.
- **useReducer**: carrito (`cart-reducer.ts`) — líneas, cantidades, drawer; cada línea puede llevar `imagen_url` para miniaturas.
- **useCallback / useMemo**: handlers de carrito en contexto; totales y filtros memoizados en la UI.
- **TanStack Query**: productos (`/api/productos`) y reporte del día (`/api/reportes/ventas-del-dia`); mutación `POST /api/ventas` al confirmar pedido.
- **Formularios controlados**: acceso en `/login` (elegir perfil), `/login/cliente` y `/login/empleado`; datos del pedido en el POS de tienda con validación (`validation/order-form.ts`).
- **Prueba de integración (Vitest)**: `src/icestock.integration.test.ts` — reducer + validación + hook con `fetch` simulado.

### Pruebas

- **Vitest** (componentes / proyecto): `npm run test`
- **Jest** (contrato OpenAPI + helpers HTTP): `npm run test:jest`

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Uninstall the packages: `npm install @tailwindcss/vite tailwindcss -D`


## Deploy to Cloudflare Workers

This project uses the Cloudflare Vite plugin (configured in `vite.config.ts`) and `wrangler.jsonc`:

1. Install Wrangler: `npm install -g wrangler`
2. Authenticate: `wrangler login`
3. Deploy: `npx wrangler deploy`

For production env vars, run `wrangler secret put MY_VAR` for each secret listed in `.env.example`. Public (non-secret) vars go in `wrangler.jsonc` under `vars`.

KV, D1, R2, and Durable Object bindings are configured in `wrangler.jsonc` — see https://developers.cloudflare.com/workers/wrangler/configuration/.



## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')
  
  useEffect(() => {
    getServerTime().then(setTime)
  }, [])
  
  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
