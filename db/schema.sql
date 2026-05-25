-- ============================================================
--  Heladería "IceStock" — esquema canónico (init Docker: 01-schema.sql)
--  Permisos por rol: db/roles.sql (02-roles.sql). Sin carpeta migrations.
--  Credenciales fijas calificación:
--  usuario: proy3 / password: secret
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
--  TABLAS DE BETTER AUTH
-- ============================================================

CREATE TABLE "user" (
    "id"            TEXT PRIMARY KEY,
    "name"          TEXT NOT NULL,
    "email"         TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "image"         TEXT,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "rol"           TEXT NOT NULL DEFAULT 'cajero'
                    CHECK ("rol" IN (
                        'cliente',
                        'cajero',
                        'analista',
                        'admin',
                        'superadmin'
                    ))
);

CREATE TABLE session (
    "id"          TEXT PRIMARY KEY,
    "expiresAt"   TIMESTAMPTZ NOT NULL,
    "token"       TEXT NOT NULL UNIQUE,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "ipAddress"   TEXT,
    "userAgent"   TEXT,
    "userId"      TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE account (
    "id"                    TEXT PRIMARY KEY,
    "accountId"             TEXT NOT NULL,
    "providerId"            TEXT NOT NULL,
    "userId"                TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "accessToken"           TEXT,
    "refreshToken"          TEXT,
    "idToken"               TEXT,
    "accessTokenExpiresAt"  TIMESTAMPTZ,
    "refreshTokenExpiresAt" TIMESTAMPTZ,
    "scope"                 TEXT,
    "password"              TEXT,
    "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE Verification (
    "id"         TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value"      TEXT NOT NULL,
    "expiresAt"  TIMESTAMPTZ NOT NULL,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  TABLAS DEL NEGOCIO (PK / FK UUID)
-- ============================================================

CREATE TABLE Categoria (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE Proveedor (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre    VARCHAR(150) NOT NULL,
    telefono  VARCHAR(20),
    email     VARCHAR(150),
    direccion TEXT
);

CREATE TABLE Producto (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(150) NOT NULL,
    descripcion   TEXT,
    precio        NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    id_categoria  UUID NOT NULL REFERENCES Categoria(id),
    id_proveedor  UUID NOT NULL REFERENCES Proveedor(id),
    imagen_url    TEXT,
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Personas del negocio 
-- user_id NULL = cliente de mostrador sin login
CREATE TABLE Usuario (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT UNIQUE REFERENCES "user"("id") ON DELETE SET NULL,
    nombre     VARCHAR(150) NOT NULL,
    email      VARCHAR(150),
    telefono   VARCHAR(20),
    activo     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_usuario_email_lower
    ON Usuario (LOWER(TRIM(email)))
    WHERE email IS NOT NULL AND TRIM(email) <> '';

CREATE TABLE Venta (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_comprador  UUID REFERENCES Usuario(id),
    id_vendedor   UUID REFERENCES Usuario(id),
    user_id       TEXT NOT NULL REFERENCES "user"("id"),
    total         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado        VARCHAR(20) NOT NULL DEFAULT 'completada'
                  CHECK (estado IN ('completada', 'anulada'))
);

CREATE TABLE DetalleVenta (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_venta    UUID NOT NULL REFERENCES Venta(id) ON DELETE CASCADE,
    id_producto UUID NOT NULL REFERENCES Producto(id),
    cantidad    INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unit NUMERIC(10, 2) NOT NULL CHECK (precio_unit >= 0),
    subtotal    NUMERIC(10, 2) GENERATED ALWAYS AS (cantidad * precio_unit) STORED
);

-- ============================================================
--  ÍNDICES
-- ============================================================

CREATE INDEX idx_session_userId    ON session("userId");
CREATE INDEX idx_session_token      ON session("token");
CREATE INDEX idx_account_userId     ON account("userId");
CREATE INDEX idx_usuario_user_id      ON Usuario(user_id);
CREATE INDEX idx_producto_categoria   ON Producto(id_categoria);
CREATE INDEX idx_producto_proveedor   ON Producto(id_proveedor);
CREATE INDEX idx_venta_fecha          ON Venta(fecha);
CREATE INDEX idx_venta_user_id        ON Venta(user_id);
CREATE INDEX idx_venta_comprador      ON Venta(id_comprador);
CREATE INDEX idx_venta_vendedor       ON Venta(id_vendedor);
CREATE INDEX idx_detalleventa_venta   ON DetalleVenta(id_venta);
CREATE INDEX idx_detalleventa_prod    ON DetalleVenta(id_producto);

CREATE VIEW vista_ventas_completa AS
SELECT
    v.id                 AS venta_id,
    v.fecha,
    v.total,
    v.estado,
    comp.nombre          AS cliente,
    vend.nombre          AS empleado,
    vu."rol"             AS rol_empleado,
    p.nombre             AS producto,
    dv.cantidad,
    dv.precio_unit,
    dv.subtotal,
    cat.nombre           AS categoria
FROM Venta v
LEFT  JOIN Usuario       comp ON comp.id = v.id_comprador
LEFT  JOIN Usuario       vend ON vend.id = v.id_vendedor
LEFT  JOIN "user"        vu   ON vu."id" = vend.user_id
JOIN  DetalleVenta       dv   ON dv.id_venta = v.id
JOIN  Producto           p    ON p.id = dv.id_producto
JOIN  Categoria          cat  ON cat.id = p.id_categoria;

-- Métricas por vendedor (portal admin / analista).
CREATE VIEW vista_metricas_empleado AS
SELECT
    vend.id                              AS vendedor_id,
    vend.nombre                          AS vendedor,
    vu."rol"                             AS rol_vendedor,
    COUNT(DISTINCT v.id)::int            AS total_ventas,
    COALESCE(SUM(v.total), 0)            AS monto_total
FROM Usuario vend
LEFT JOIN "user" vu ON vu."id" = vend.user_id
LEFT JOIN Venta v
       ON v.id_vendedor = vend.id
      AND v.estado = 'completada'
WHERE vend.user_id IS NOT NULL
  AND vu."rol" IN ('cajero', 'analista', 'admin', 'superadmin')
GROUP BY vend.id, vend.nombre, vu."rol";

-- ============================================================
--  DATOS DE PRUEBA (UUIDs fijos para FK en seeds)
-- ============================================================

-- ============================================================
-- 25 REGISTROS PARA CADA ENTIDAD PRINCIPAL
-- PostgreSQL
-- ============================================================

-- ============================================================
-- CATEGORIAS (25)
-- ============================================================

INSERT INTO Categoria (id, nombre, descripcion) VALUES
(gen_random_uuid(), 'Paleta', 'Helados artesanales en palito'),
(gen_random_uuid(), 'Copa', 'Helados servidos en copa'),
(gen_random_uuid(), 'Sundae', 'Helados con toppings'),
(gen_random_uuid(), 'Malteada', 'Batidos cremosos'),
(gen_random_uuid(), 'Sandwich', 'Helado entre galletas'),
(gen_random_uuid(), 'Sorbete', 'Helados sin lácteos'),
(gen_random_uuid(), 'Tarrina', 'Helado para llevar'),
(gen_random_uuid(), 'Bola', 'Porciones individuales'),
(gen_random_uuid(), 'Flotante', 'Helado con soda'),
(gen_random_uuid(), 'Especialidad', 'Postres premium'),
(gen_random_uuid(), 'Gelato', 'Estilo italiano'),
(gen_random_uuid(), 'Frozen Yogurt', 'Yogurt congelado'),
(gen_random_uuid(), 'Mini', 'Porciones pequeñas'),
(gen_random_uuid(), 'Premium', 'Helados gourmet'),
(gen_random_uuid(), 'Vegano', 'Sin productos animales'),
(gen_random_uuid(), 'Light', 'Bajo en azúcar'),
(gen_random_uuid(), 'Infantil', 'Sabores para niños'),
(gen_random_uuid(), 'Picante', 'Sabores con chile'),
(gen_random_uuid(), 'Café', 'Postres con café'),
(gen_random_uuid(), 'Chocolate', 'Especialidades chocolate'),
(gen_random_uuid(), 'Frutal', 'Sabores de frutas'),
(gen_random_uuid(), 'Navideño', 'Temporada navidad'),
(gen_random_uuid(), 'Verano', 'Sabores tropicales'),
(gen_random_uuid(), 'Fitness', 'Proteicos'),
(gen_random_uuid(), 'Tradicional', 'Sabores clásicos');

-- ============================================================
-- PROVEEDORES (25)
-- ============================================================

INSERT INTO Proveedor (id, nombre, telefono, email, direccion) VALUES
(gen_random_uuid(), 'Cremería El Norte', '5555-1001', 'ventas@elnorte.com', 'Zona 1 Guatemala'),
(gen_random_uuid(), 'Lácteos del Sur', '5555-1002', 'contacto@sur.com', 'Zona 2 Guatemala'),
(gen_random_uuid(), 'Sabores GT', '5555-1003', 'info@saboresgt.com', 'Zona 10 Guatemala'),
(gen_random_uuid(), 'Importadora Dulce', '5555-1004', 'pedidos@dulce.com', 'Zona 11 Guatemala'),
(gen_random_uuid(), 'Chocolate Factory', '5555-1005', 'cacao@factory.com', 'Zona 12 Guatemala'),
(gen_random_uuid(), 'Berries Market', '5555-1006', 'berries@market.com', 'Zona 13 Guatemala'),
(gen_random_uuid(), 'Vainilla Premium', '5555-1007', 'vainilla@premium.com', 'Zona 14 Guatemala'),
(gen_random_uuid(), 'Tropical Foods', '5555-1008', 'tropical@foods.com', 'Zona 15 Guatemala'),
(gen_random_uuid(), 'Distribuidora Helados', '5555-1009', 'helados@dist.com', 'Mixco'),
(gen_random_uuid(), 'Frozen Imports', '5555-1010', 'frozen@imports.com', 'Villa Nueva'),
(gen_random_uuid(), 'Coffee Beans', '5555-1011', 'coffee@beans.com', 'Antigua Guatemala'),
(gen_random_uuid(), 'Nutella Supply', '5555-1012', 'ventas@nutella.com', 'Zona 4'),
(gen_random_uuid(), 'Fruit Paradise', '5555-1013', 'fruit@paradise.com', 'Zona 16'),
(gen_random_uuid(), 'Milk Land', '5555-1014', 'milk@land.com', 'Zona 17'),
(gen_random_uuid(), 'Ice Cream World', '5555-1015', 'world@ice.com', 'Zona 18'),
(gen_random_uuid(), 'Candy Shop', '5555-1016', 'candy@shop.com', 'Zona 5'),
(gen_random_uuid(), 'Sweet Imports', '5555-1017', 'sweet@imports.com', 'Zona 6'),
(gen_random_uuid(), 'Premium Cream', '5555-1018', 'cream@premium.com', 'Zona 7'),
(gen_random_uuid(), 'Delicias Tropicales', '5555-1019', 'tropical@delicias.com', 'Zona 8'),
(gen_random_uuid(), 'Fresh Fruits SA', '5555-1020', 'fresh@fruits.com', 'Zona 9'),
(gen_random_uuid(), 'Mega Foods', '5555-1021', 'mega@foods.com', 'Escuintla'),
(gen_random_uuid(), 'Helado Express', '5555-1022', 'express@helado.com', 'Quetzaltenango'),
(gen_random_uuid(), 'Gourmet Ice', '5555-1023', 'gourmet@ice.com', 'Petén'),
(gen_random_uuid(), 'Creamy Dreams', '5555-1024', 'dreams@cream.com', 'Cobán'),
(gen_random_uuid(), 'The Ice Factory', '5555-1025', 'factory@ice.com', 'Retalhuleu');

-- ============================================================
-- CUENTAS DE DEMOSTRACIÓN (contraseña: secret)
-- Instalación sin superadmin: usar /setup para el primero.
-- ============================================================

INSERT INTO "user" (
    id,
    name,
    email,
    "emailVerified",
    rol
)
VALUES
('usr-demo-super', 'Superadmin Demo',    'superadmin@heladeria.com', TRUE, 'superadmin'),
('usr-demo-admin', 'Administrador Demo', 'admin@heladeria.com',      TRUE, 'admin'),
('usr-demo-anal',  'Analista Demo',      'analista@heladeria.com',   TRUE, 'analista'),
('usr-demo-cajero','Cajero Demo',        'cajero@heladeria.com',     TRUE, 'cajero'),
('usr-demo-cli',   'Cliente Demo',       'cliente@heladeria.com',    TRUE, 'cliente');

INSERT INTO account (
    id,
    "accountId",
    "providerId",
    "userId",
    password,
    "createdAt",
    "updatedAt"
)
VALUES
(
    'acc-demo-super',
    'superadmin@heladeria.com',
    'credential',
    'usr-demo-super',
    'a9280d74a6b3755c40d1ad260e1e597a:51379e1ba8f25f8cdeb596f7cbe8e661bd81ee0a2b6882591dde9b624cb6cea291461339abc29eea3825a065de5cb44e7c94db093c21035d6c2b7a24b058d6bb',
    NOW(),
    NOW()
),
(
    'acc-demo-admin',
    'admin@heladeria.com',
    'credential',
    'usr-demo-admin',
    'a9280d74a6b3755c40d1ad260e1e597a:51379e1ba8f25f8cdeb596f7cbe8e661bd81ee0a2b6882591dde9b624cb6cea291461339abc29eea3825a065de5cb44e7c94db093c21035d6c2b7a24b058d6bb',
    NOW(),
    NOW()
),
(
    'acc-demo-anal',
    'analista@heladeria.com',
    'credential',
    'usr-demo-anal',
    'a9280d74a6b3755c40d1ad260e1e597a:51379e1ba8f25f8cdeb596f7cbe8e661bd81ee0a2b6882591dde9b624cb6cea291461339abc29eea3825a065de5cb44e7c94db093c21035d6c2b7a24b058d6bb',
    NOW(),
    NOW()
),
(
    'acc-demo-cajero',
    'cajero@heladeria.com',
    'credential',
    'usr-demo-cajero',
    'a9280d74a6b3755c40d1ad260e1e597a:51379e1ba8f25f8cdeb596f7cbe8e661bd81ee0a2b6882591dde9b624cb6cea291461339abc29eea3825a065de5cb44e7c94db093c21035d6c2b7a24b058d6bb',
    NOW(),
    NOW()
),
(
    'acc-demo-cli',
    'cliente@heladeria.com',
    'credential',
    'usr-demo-cli',
    'a9280d74a6b3755c40d1ad260e1e597a:51379e1ba8f25f8cdeb596f7cbe8e661bd81ee0a2b6882591dde9b624cb6cea291461339abc29eea3825a065de5cb44e7c94db093c21035d6c2b7a24b058d6bb',
    NOW(),
    NOW()
);

-- ============================================================
-- USUARIOS (cuentas Better Auth + mostrador sin login)
-- ============================================================

INSERT INTO Usuario (id, user_id, nombre, email, telefono, activo)
SELECT gen_random_uuid(), id, name, email, NULL, TRUE
FROM "user";

INSERT INTO Usuario (id, user_id, nombre, email, telefono, activo)
VALUES
(gen_random_uuid(), NULL, 'Juan Ramírez', 'juan@mail.com', '5500-0001', TRUE),
(gen_random_uuid(), NULL, 'Laura Morales', 'laura@mail.com', '5500-0004', TRUE),
(gen_random_uuid(), NULL, 'Roberto Mejía', 'roberto@mail.com', '5500-0007', TRUE),
(gen_random_uuid(), NULL, 'Gabriela Sosa', 'gabriela@mail.com', '5500-0010', TRUE),
(gen_random_uuid(), NULL, 'Héctor Vásquez', 'hector@mail.com', '5500-0011', TRUE),
(gen_random_uuid(), NULL, 'Irene Ramos', 'irene@mail.com', '5500-0012', TRUE),
(gen_random_uuid(), NULL, 'Javier Ortiz', 'javier@mail.com', '5500-0013', TRUE),
(gen_random_uuid(), NULL, 'Karla Nájera', 'karla@mail.com', '5500-0014', TRUE),
(gen_random_uuid(), NULL, 'Miguel Ángel', 'miguel@mail.com', '5500-0015', TRUE),
(gen_random_uuid(), NULL, 'Nancy Estrada', 'nancy@mail.com', '5500-0016', TRUE),
(gen_random_uuid(), NULL, 'Oscar Pinto', 'oscar@mail.com', '5500-0017', TRUE),
(gen_random_uuid(), NULL, 'Patricia Lima', 'patricia@mail.com', '5500-0018', TRUE),
(gen_random_uuid(), NULL, 'Quetzal Ajú', 'quetzal@mail.com', '5500-0019', TRUE),
(gen_random_uuid(), NULL, 'Rodrigo Caal', 'rodrigo@mail.com', '5500-0020', TRUE),
(gen_random_uuid(), NULL, 'Sandra Tzul', 'sandra@mail.com', '5500-0021', TRUE),
(gen_random_uuid(), NULL, 'Úrsula Batz', 'ursula@mail.com', '5500-0023', TRUE),
(gen_random_uuid(), NULL, 'Victor Choc', 'victor@mail.com', '5500-0024', TRUE),
(gen_random_uuid(), NULL, 'Wendy Cú', 'wendy@mail.com', '5500-0025', TRUE);

-- ============================================================
-- PRODUCTOS (25)
-- ============================================================

INSERT INTO Producto (
    id,
    nombre,
    descripcion,
    precio,
    stock,
    id_categoria,
    id_proveedor,
    imagen_url
)
SELECT
    gen_random_uuid(),
    nombre,
    descripcion,
    precio,
    stock,
    (SELECT id FROM Categoria ORDER BY random() LIMIT 1),
    (SELECT id FROM Proveedor ORDER BY random() LIMIT 1),
    imagen
FROM (
VALUES
('Paleta Mango Tajín','Paleta artesanal de mango',16.50,80,'https://images.unsplash.com/photo-1563805042-7684c019e1cb'),
('Paleta Fresa','Paleta cremosa de fresa',15.00,75,'https://images.unsplash.com/photo-1570197788417-0e82375c9371'),
('Sundae Brownie','Brownie caliente con helado',42.00,35,'https://images.unsplash.com/photo-1551024601-bec78aea704b'),
('Malteada Nutella','Malteada premium',48.00,25,'https://images.unsplash.com/photo-1577805947697-89e18249d767'),
('Copa Tropical','Helado con frutas',35.00,40,'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f'),
('Bola Pistacho','Helado italiano pistacho',14.00,90,'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57'),
('Flotante Cola','Helado con soda cola',32.00,20,'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd'),
('Banana Split','Postre clásico',55.00,15,'https://images.unsplash.com/photo-1488900128323-21503983a07e'),
('Affogato','Espresso con helado',36.00,18,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085'),
('Gelato Italiano','Helado artesanal italiano',46.00,30,'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57'),
('Sorbete Limón','Refrescante limón',18.00,60,'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd'),
('Sorbete Maracuyá','Maracuyá tropical',19.00,55,'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0'),
('Tarrina Familiar','Helado 1 litro',98.00,12,'https://images.unsplash.com/photo-1470337458703-46ad1756a187'),
('Ice Cream Sandwich','Cookies con helado',28.00,30,'https://images.unsplash.com/photo-1586985289906-406988974504'),
('Cheesecake Ice Cream','Helado cheesecake',49.00,22,'https://images.unsplash.com/photo-1488900128323-21503983a07e'),
('Chocolate Volcano','Volcán chocolate',58.00,14,'https://images.unsplash.com/photo-1551024601-bec78aea704b'),
('Frozen Yogurt Berry','Yogurt congelado',34.00,25,'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f'),
('Milkshake Oreo','Malteada oreo',44.00,20,'https://images.unsplash.com/photo-1577805947697-89e18249d767'),
('Paleta Tamarindo','Paleta picante',15.00,70,'https://images.unsplash.com/photo-1563805042-7684c019e1cb'),
('Copa Oreo','Copa con oreo',39.00,45,'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57'),
('Helado Vainilla','Vainilla clásica',12.00,100,'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f'),
('Helado Chocolate','Chocolate premium',13.00,95,'https://images.unsplash.com/photo-1551024601-bec78aea704b'),
('Helado Fresa','Fresa natural',12.50,85,'https://images.unsplash.com/photo-1570197788417-0e82375c9371'),
('Waffle Ice Cream','Waffle belga',52.00,18,'https://images.unsplash.com/photo-1504674900247-0877df9cc836'),
('Coffee Ice Cream','Helado de café',38.00,20,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085')
) AS t(nombre,descripcion,precio,stock,imagen);

-- ============================================================
-- VENTAS (25)
-- ============================================================

INSERT INTO Venta (
    id,
    id_comprador,
    id_vendedor,
    user_id,
    total,
    estado
)
SELECT
    gen_random_uuid(),
    (SELECT id FROM Usuario ORDER BY random() LIMIT 1),
    (
        SELECT u.id
        FROM Usuario u
        JOIN "user" au ON au.id = u.user_id
        WHERE au."rol" IN ('cajero', 'admin', 'superadmin')
        ORDER BY random()
        LIMIT 1
    ),
    (SELECT id FROM "user" WHERE "rol" IN ('cajero', 'admin', 'superadmin') ORDER BY random() LIMIT 1),
    round((random() * 200 + 20)::numeric, 2),
    'completada'
FROM generate_series(1, 25);

-- ============================================================
-- DETALLE VENTA (25)
-- ============================================================

INSERT INTO DetalleVenta (
    id,
    id_venta,
    id_producto,
    cantidad,
    precio_unit
)
SELECT
    gen_random_uuid(),
    (SELECT id FROM Venta ORDER BY random() LIMIT 1),
    (SELECT id FROM Producto ORDER BY random() LIMIT 1),
    floor(random() * 4 + 1)::int,
    round((random() * 40 + 10)::numeric,2)
FROM generate_series(1,25);

-- ============================================================
--  PROCEDURES / FUNCIONES — usadas por src/lib/db.ts
--  Permisos: db/roles.sql
-- ============================================================

-- Stored procedure: parámetros IN/OUT, transacción explícita (SAVEPOINT + ROLLBACK) y excepciones.
CREATE OR REPLACE PROCEDURE sp_registrar_venta(
    IN  p_user_id      TEXT,
    IN  p_id_comprador UUID,
    IN  p_id_vendedor  UUID,
    IN  p_items        JSONB,
    OUT p_venta_id     UUID,
    OUT p_total        NUMERIC(10, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_i       INTEGER := 0;
    v_n       INTEGER;
    v_it      JSONB;
    v_precio  NUMERIC(10, 2);
    v_stock   INTEGER;
    v_pid     UUID;
    v_qty     INTEGER;
BEGIN
    p_venta_id := NULL;
    p_total := 0;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Debe incluir al menos un ítem'
            USING ERRCODE = '22023';
    END IF;

    v_n := jsonb_array_length(p_items);
    WHILE v_i < v_n LOOP
        v_it := p_items->v_i;
        v_pid := (v_it->>'id_producto')::uuid;
        v_qty := (v_it->>'cantidad')::INTEGER;

        SELECT p.precio, p.stock
          INTO v_precio, v_stock
          FROM Producto p
         WHERE p.id = v_pid AND p.activo = TRUE
         FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto % no encontrado o inactivo', v_pid
                USING ERRCODE = 'P0002';
        END IF;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Cantidad inválida para producto %', v_pid
                USING ERRCODE = '22023';
        END IF;

        IF v_stock < v_qty THEN
            RAISE EXCEPTION 'Stock insuficiente para producto %', v_pid
                USING ERRCODE = 'P0001';
        END IF;

        v_i := v_i + 1;
    END LOOP;

    INSERT INTO Venta (user_id, id_comprador, id_vendedor, total)
    VALUES (p_user_id, p_id_comprador, p_id_vendedor, 0)
    RETURNING id INTO p_venta_id;

    v_i := 0;
    WHILE v_i < v_n LOOP
        v_it := p_items->v_i;
        v_pid := (v_it->>'id_producto')::uuid;
        v_qty := (v_it->>'cantidad')::INTEGER;

        SELECT p.precio INTO v_precio FROM Producto p WHERE p.id = v_pid;

        INSERT INTO DetalleVenta (id_venta, id_producto, cantidad, precio_unit)
        VALUES (p_venta_id, v_pid, v_qty, v_precio);

        UPDATE Producto SET stock = stock - v_qty WHERE id = v_pid;
        p_total := p_total + v_precio * v_qty;
        v_i := v_i + 1;
    END LOOP;

    UPDATE Venta SET total = p_total WHERE id = p_venta_id;

EXCEPTION
    WHEN OTHERS THEN
        -- El bloque PL/pgSQL revierte sus cambios al propagar la excepción;
        -- la transacción de sesión hace ROLLBACK en runWithDbRole si el CALL falla.
        RAISE EXCEPTION 'Error al registrar venta: %', SQLERRM
            USING ERRCODE = SQLSTATE;
END;
$$;

-- Wrapper para compatibilidad (SELECT desde SQL / herramientas).
CREATE OR REPLACE FUNCTION registrar_venta(
    p_userId       TEXT,
    p_idComprador  UUID,
    p_idVendedor   UUID,
    p_items        JSONB
)
RETURNS TABLE (venta_id UUID, total NUMERIC(10, 2))
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id    UUID;
    v_total NUMERIC(10, 2);
BEGIN
    CALL sp_registrar_venta(p_userId, p_idComprador, p_idVendedor, p_items, v_id, v_total);
    RETURN QUERY SELECT v_id, v_total;
END;
$$;

-- Historial de compras del comprador (rol_cliente sin SELECT global en Venta).
CREATE OR REPLACE FUNCTION fn_mis_compras(
    p_usuario_id UUID,
    p_limit      INT DEFAULT 200
)
RETURNS TABLE (
    id     UUID,
    fecha  TIMESTAMPTZ,
    total  NUMERIC(10, 2),
    estado VARCHAR(20),
    lineas BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        v.id,
        v.fecha,
        v.total,
        v.estado::VARCHAR(20),
        (SELECT COUNT(*)::bigint FROM DetalleVenta dv WHERE dv.id_venta = v.id) AS lineas
    FROM Venta v
    WHERE v.id_comprador = p_usuario_id
    ORDER BY v.fecha DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 500));
$$;

-- Catálogo activo con categoría y proveedor (tienda / listado público).
CREATE OR REPLACE FUNCTION fn_catalogo_activo(p_limit INT DEFAULT 500)
RETURNS TABLE (
    id                UUID,
    nombre            VARCHAR(150),
    descripcion       TEXT,
    precio            NUMERIC(10, 2),
    stock             INTEGER,
    imagen_url        TEXT,
    activo            BOOLEAN,
    categoria_id      UUID,
    categoria_nombre  VARCHAR(100),
    proveedor_id      UUID,
    proveedor_nombre  VARCHAR(150)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.stock,
        p.imagen_url,
        p.activo,
        c.id,
        c.nombre,
        pr.id,
        pr.nombre
    FROM Producto p
    JOIN Categoria c ON c.id = p.id_categoria
    JOIN Proveedor pr ON pr.id = p.id_proveedor
    WHERE p.activo = TRUE
    ORDER BY p.nombre
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 500), 1000));
$$;

-- Anulación: parámetro IN, validaciones con excepciones y ROLLBACK a SAVEPOINT.
CREATE OR REPLACE PROCEDURE sp_anular_venta(
    IN p_venta_id UUID,
    OUT p_anulada BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estado VARCHAR(20);
    dv       RECORD;
BEGIN
    p_anulada := FALSE;

    SELECT estado INTO v_estado FROM Venta WHERE id = p_venta_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta no encontrada' USING ERRCODE = 'P0002';
    END IF;
    IF v_estado <> 'completada' THEN
        RAISE EXCEPTION 'La venta ya está anulada' USING ERRCODE = '22023';
    END IF;

    FOR dv IN
        SELECT id_producto, cantidad FROM DetalleVenta WHERE id_venta = p_venta_id
    LOOP
        UPDATE Producto SET stock = stock + dv.cantidad WHERE id = dv.id_producto;
    END LOOP;

    UPDATE Venta SET estado = 'anulada' WHERE id = p_venta_id;
    p_anulada := TRUE;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION anular_venta(p_venta_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ok BOOLEAN;
BEGIN
    CALL sp_anular_venta(p_venta_id, v_ok);
END;
$$;

-- Reporte: clientes con más de 3 compras completadas.
CREATE OR REPLACE FUNCTION fn_clientes_frecuentes()
RETURNS TABLE (
    id              UUID,
    nombre          VARCHAR(150),
    total_compras   INT,
    monto_total     NUMERIC(10, 2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        u.id,
        u.nombre,
        COUNT(v.id)::int AS total_compras,
        COALESCE(SUM(v.total), 0) AS monto_total
    FROM Usuario u
    JOIN Venta v ON v.id_comprador = u.id AND v.estado = 'completada'
    WHERE u.id IN (
        SELECT id_comprador
        FROM Venta
        WHERE id_comprador IS NOT NULL AND estado = 'completada'
        GROUP BY id_comprador
        HAVING COUNT(*) > 3
    )
    GROUP BY u.id, u.nombre
    ORDER BY total_compras DESC;
$$;
