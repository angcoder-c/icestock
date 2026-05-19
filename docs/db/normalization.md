# Normalización de la base de datos IceStock

Este documento describe el proceso de normalización del modelo de datos de la heladería **IceStock**, desde un diseño no normalizado conceptual hasta **3FN** (tercera forma normal), tal como quedó implementado en `[db/schema.sql](../../db/schema.sql)`.

## Diagramas


| Diagrama                | Archivo                                            |
| ----------------------- | -------------------------------------------------- |
| Entidad–relación (Chen) | [er.diagram.png](./er.diagram.png)                 |
| Modelo relacional       | [relational.diagram.png](./relational.diagram.png) |


---

## 1. Punto de partida (0FN — datos sin estructura relacional)

Antes de normalizar, se puede imaginar un único registro “plano” por cada operación del negocio, mezclando autenticación, catálogo, cliente, empleado y líneas de venta:


| venta_id | fecha | total | cliente_nombre | cliente_email | empleado_nombre | empleado_email | producto_1 | cant_1 | precio_1 | producto_2 | cant_2 | …   | categoria | proveedor |
| -------- | ----- | ----- | -------------- | ------------- | --------------- | -------------- | ---------- | ------ | -------- | ---------- | ------ | --- | --------- | --------- |


**Problemas:**

- Grupos repetitivos (`producto_1`, `producto_2`, …) → violación de atomicidad.
- Redundancia: nombre de categoría y proveedor repetidos en cada fila de producto.
- Mezcla de dominios: sesión/login, inventario y ventas en la misma tabla.
- Anomalías de inserción, actualización y borrado (p. ej. cambiar el email del empleado en muchas filas).

El objetivo es separar **autenticación** (Better Auth), **maestros** (categoría, proveedor, producto, cliente, empleado) y **transacciones** (venta + detalle).

---

## 2. Primera forma normal (1FN)

**Regla:** todos los atributos son atómicos; no hay columnas multivaluadas ni grupos repetitivos.

### Cambios aplicados

1. **Líneas de venta** → tabla independiente `DetalleVenta` (una fila por producto vendido), en lugar de columnas `producto_1`, `cant_1`, etc.
2. **Un producto por fila** en `Producto`; atributos escalares (`nombre`, `precio`, `stock`).
3. **Autenticación** en tablas propias de Better Auth: `user`, `session`, `account`, `Verification` (dominio separado del inventario).

### Esquema tras 1FN (resumen)

- `Categoria`, `Proveedor`, `Producto`, `Cliente`, `Empleado`, `Venta`, `DetalleVenta`
- Tablas `user` / `session` / `account` para credenciales y sesión

Cada celda contiene un solo valor; las ventas con varios ítems se modelan con varias filas en `DetalleVenta` ligadas a un mismo `id_venta`.

---

## 3. Segunda forma normal (2FN)

**Regla:** estar en 1FN y que ningún atributo no clave dependa de **una parte** de una clave compuesta.

### Claves relevantes


| Tabla          | Clave primaria | Notas                                                                           |
| -------------- | -------------- | ------------------------------------------------------------------------------- |
| `DetalleVenta` | `id` (UUID)    | Alternativa conceptual: `(id_venta, id_producto)`; el diseño usa surrogate `id` |
| `Producto`     | `id`           |                                                                                 |
| `Venta`        | `id`           |                                                                                 |


Con clave surrogate en `DetalleVenta`, los atributos `cantidad`, `precio_unit` y `subtotal` dependen de la **clave completa** `id`. No hay dependencias parciales respecto a una clave compuesta de dos columnas.

### Descomposición adicional en 2FN

- `**Producto`** solo guarda `id_categoria` e `id_proveedor` (FK), no `categoria_nombre` ni `proveedor_nombre` en la misma fila.
- `**Venta`** guarda `id_cliente`, `user_id`, `empleado_id` como FK, no copias redundantes de nombres de cliente o empleado en la cabecera de venta (esos nombres se obtienen por `JOIN` o por la vista `vista_ventas_completa`).

---

## 4. Tercera forma normal (3FN)

**Regla:** estar en 2FN y que ningún atributo no clave dependa de otro atributo no clave (eliminar dependencias transitivas).

### Dependencias transitivas eliminadas


| Antes (conceptual)                                 | Problema                                                          | Solución en 3FN                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `Producto` → `categoria_nombre` vía `id_categoria` | `categoria_nombre` depende de `id_categoria`, no de `producto.id` | Tabla `Categoria`; `Producto.id_categoria` → `Categoria.id`                            |
| `Producto` → datos del proveedor                   | Igual con proveedor                                               | Tabla `Proveedor`; `Producto.id_proveedor`                                             |
| `Venta` → `empleado_nombre`, `empleado_email`      | Dependen de `empleado_id`, no de `venta.id`                       | `Empleado` + `user`; `Venta.empleado_id` → `Empleado.id`                               |
| Credenciales en `Empleado`                         | Email/password no son propios del UUID de empleado                | `Empleado.user_id` → `user` (Better Auth)                                              |
| Cliente vs usuario web                             | Compras de mostrador vs cuenta app                                | `Cliente` separado; usuarios con `rol = 'cliente'` se vinculan por email en aplicación |


### Tabla `Usuario` unificada

- **PK:** `Usuario.id` (UUID).
- **FK:** `user_id` UNIQUE opcional → `"user".id` (NULL = mostrador sin cuenta web).
- `Venta.id_vendedor` puede ser **NULL** en autocompra; `Venta.id_comprador` identifica al comprador; `Venta.user_id` audita la sesión Better Auth.

---

## 5. Esquema final en 3FN (versión actual)

### Autenticación (Better Auth)


| Tabla          | Rol                                                             |
| -------------- | --------------------------------------------------------------- |
| `user`         | Cuenta (`cliente`, `cajero`, `analista`, `admin`, `superadmin`) |
| `session`      | Sesión activa                                                   |
| `account`      | Proveedor de credenciales (password hash)                       |
| `Verification` | Tokens de verificación                                          |


### Negocio


| Tabla          | Descripción                                                       |
| -------------- | ----------------------------------------------------------------- |
| `Categoria`    | Clasificación de productos                                        |
| `Proveedor`    | Origen / suministro                                               |
| `Producto`     | Inventario y precio                                               |
| `Usuario`      | Compradores y vendedores; `user_id` opcional (Better Auth)        |
| `Venta`        | Cabecera: `id_comprador`, `id_vendedor`, `user_id`, total, estado |
| `DetalleVenta` | Líneas: producto, cantidad, precio unitario, subtotal             |


### Objetos derivados

- **Vista** `vista_ventas_completa`: proyección para reportes (JOIN de venta, cliente, empleado, producto, categoría).
- **Función** `registrar_venta(...)`: transacción PL/pgSQL alternativa (validación de stock + inserción); la aplicación usa principalmente `crearVentaTransaccional` en Node.
- **Índices** en FK y fechas para consultas frecuentes.

### Identificadores

- Entidades de negocio: **UUID** (`gen_random_uuid()`).
- Usuarios Better Auth: **TEXT** (`id` definido en registro o seed).

---

## 6. Verificación 3FN


| Criterio                                              | Cumple |
| ----------------------------------------------------- | ------ |
| Valores atómicos (1FN)                                | Sí     |
| Sin dependencias parciales en claves compuestas (2FN) | Sí     |
| Sin dependencias transitivas A→B→C entre tablas (3FN) | Sí     |
| Dominios separados (auth / catálogo / ventas)         | Sí     |


---

## Referencias

- Script canónico: `[db/schema.sql](../../db/schema.sql)`
- Consultas en la aplicación: [queries.md](./queries.md)
- API REST que consume estos datos: [../endpoints.md](../endpoints.md)

