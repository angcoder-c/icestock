-- ============================================================
--  Heladería "IceStock"
--  Credenciales fijas calificación: 
-- usuario: proy2 / password: secret
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
                    CHECK ("rol" IN ('admin', 'cajero', 'cliente'))
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

CREATE TABLE Empleado (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
    activo     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE Cliente (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     VARCHAR(150) NOT NULL,
    email      VARCHAR(150) UNIQUE,
    telefono   VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE Venta (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cliente   UUID REFERENCES Cliente(id),
    user_id      TEXT NOT NULL REFERENCES "user"("id"),
    empleado_id  UUID REFERENCES Empleado(id),
    total        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fecha        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado       VARCHAR(20) NOT NULL DEFAULT 'completada'
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
CREATE INDEX idx_empleado_user_id   ON Empleado(user_id);
CREATE INDEX idx_producto_categoria ON Producto(id_categoria);
CREATE INDEX idx_producto_proveedor ON Producto(id_proveedor);
CREATE INDEX idx_venta_fecha        ON Venta(fecha);
CREATE INDEX idx_venta_user_id       ON Venta(user_id);
CREATE INDEX idx_venta_empleado_id   ON Venta(empleado_id);
CREATE INDEX idx_detalleventa_venta ON DetalleVenta(id_venta);
CREATE INDEX idx_detalleventa_prod  ON DetalleVenta(id_producto);

CREATE VIEW vista_ventas_completa AS
SELECT
    v.id                 AS venta_id,
    v.fecha,
    v.total,
    v.estado,
    c.nombre             AS cliente,
    u."name"             AS empleado,
    u."rol"              AS rol_empleado,
    p.nombre             AS producto,
    dv.cantidad,
    dv.precio_unit,
    dv.subtotal,
    cat.nombre           AS categoria
FROM Venta v
LEFT  JOIN Cliente       c   ON c.id     = v.id_cliente
LEFT  JOIN Empleado      e   ON e.id     = v.empleado_id
LEFT  JOIN "user"        u   ON u."id"   = e.user_id
JOIN  DetalleVenta       dv  ON dv.id_venta  = v.id
JOIN  Producto          p   ON p.id     = dv.id_producto
JOIN  Categoria         cat ON cat.id   = p.id_categoria;

-- ============================================================
--  DATOS DE PRUEBA (UUIDs fijos para FK en seeds)
-- ============================================================

-- ============================================================
-- SEEDS COMPLETOS HELADERÍA "FRÍO & PUNTO"
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
-- USERS (25)
-- ============================================================

INSERT INTO "user" (
    id,
    name,
    email,
    "emailVerified",
    rol
)
VALUES
('usr001','Admin General','admin1@heladeria.com',TRUE,'admin'),
('usr002','María López','maria@heladeria.com',TRUE,'cajero'),
('usr003','Carlos Pérez','carlos@heladeria.com',TRUE,'cajero'),
('usr004','Ana García','ana@heladeria.com',TRUE,'cajero'),
('usr005','Luis Torres','luis@heladeria.com',TRUE,'cajero'),
('usr006','Andrea Méndez','andrea@heladeria.com',TRUE,'cajero'),
('usr007','José Ramírez','jose@heladeria.com',TRUE,'cajero'),
('usr008','Patricia Morales','patricia@heladeria.com',TRUE,'cajero'),
('usr009','Kevin Díaz','kevin@heladeria.com',TRUE,'cajero'),
('usr010','Fernanda Ruiz','fernanda@heladeria.com',TRUE,'cajero'),
('usr011','Miguel Castro','miguel@heladeria.com',TRUE,'cajero'),
('usr012','Daniela Gómez','daniela@heladeria.com',TRUE,'cajero'),
('usr013','Oscar Fuentes','oscar@heladeria.com',TRUE,'cajero'),
('usr014','Lucía Herrera','lucia@heladeria.com',TRUE,'cajero'),
('usr015','Ricardo Soto','ricardo@heladeria.com',TRUE,'cajero'),
('usr016','Valeria Cruz','valeria@heladeria.com',TRUE,'cliente'),
('usr017','Pedro Alvarado','pedro@heladeria.com',TRUE,'cliente'),
('usr018','Sofía Castillo','sofia@heladeria.com',TRUE,'cliente'),
('usr019','Diego Flores','diego@heladeria.com',TRUE,'cliente'),
('usr020','Gabriela León','gabriela@heladeria.com',TRUE,'cliente'),
('usr021','Héctor Reyes','hector@heladeria.com',TRUE,'cliente'),
('usr022','Natalia Pérez','natalia@heladeria.com',TRUE,'cliente'),
('usr023','Fernando Ortiz','fernando@heladeria.com',TRUE,'cliente'),
('usr024','Claudia Ríos','claudia@heladeria.com',TRUE,'cliente'),
('usr025','Tomás Jiménez','tomas@heladeria.com',TRUE,'cliente');

-- ============================================================
-- EMPLEADOS (25)
-- ============================================================

INSERT INTO Empleado (id, user_id, activo)
SELECT
    gen_random_uuid(),
    id,
    TRUE
FROM "user";

-- ============================================================
-- CLIENTES (25)
-- ============================================================

INSERT INTO Cliente (
    id,
    nombre,
    email,
    telefono
)
VALUES
(gen_random_uuid(),'Juan Ramírez','juan@mail.com','5500-0001'),
(gen_random_uuid(),'Sofía Castillo','sofia@mail.com','5500-0002'),
(gen_random_uuid(),'Pedro Alvarado','pedro@mail.com','5500-0003'),
(gen_random_uuid(),'Laura Morales','laura@mail.com','5500-0004'),
(gen_random_uuid(),'Diego Fuentes','diego@mail.com','5500-0005'),
(gen_random_uuid(),'Valeria Cruz','valeria@mail.com','5500-0006'),
(gen_random_uuid(),'Roberto Mejía','roberto@mail.com','5500-0007'),
(gen_random_uuid(),'Claudia Ríos','claudia@mail.com','5500-0008'),
(gen_random_uuid(),'Fernando López','fernando@mail.com','5500-0009'),
(gen_random_uuid(),'Gabriela Sosa','gabriela@mail.com','5500-0010'),
(gen_random_uuid(),'Héctor Vásquez','hector@mail.com','5500-0011'),
(gen_random_uuid(),'Irene Ramos','irene@mail.com','5500-0012'),
(gen_random_uuid(),'Javier Ortiz','javier@mail.com','5500-0013'),
(gen_random_uuid(),'Karla Nájera','karla@mail.com','5500-0014'),
(gen_random_uuid(),'Miguel Ángel','miguel@mail.com','5500-0015'),
(gen_random_uuid(),'Nancy Estrada','nancy@mail.com','5500-0016'),
(gen_random_uuid(),'Oscar Pinto','oscar@mail.com','5500-0017'),
(gen_random_uuid(),'Patricia Lima','patricia@mail.com','5500-0018'),
(gen_random_uuid(),'Quetzal Ajú','quetzal@mail.com','5500-0019'),
(gen_random_uuid(),'Rodrigo Caal','rodrigo@mail.com','5500-0020'),
(gen_random_uuid(),'Sandra Tzul','sandra@mail.com','5500-0021'),
(gen_random_uuid(),'Tomás Jiménez','tomas@mail.com','5500-0022'),
(gen_random_uuid(),'Úrsula Batz','ursula@mail.com','5500-0023'),
(gen_random_uuid(),'Victor Choc','victor@mail.com','5500-0024'),
(gen_random_uuid(),'Wendy Cú','wendy@mail.com','5500-0025');

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
    id_cliente,
    user_id,
    empleado_id,
    total,
    estado
)
SELECT
    gen_random_uuid(),
    (SELECT id FROM Cliente ORDER BY random() LIMIT 1),
    (SELECT id FROM "user" ORDER BY random() LIMIT 1),
    (SELECT id FROM Empleado ORDER BY random() LIMIT 1),
    round((random() * 200 + 20)::numeric,2),
    'completada'
FROM generate_series(1,25);

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
--  FUNCIÓN: registrar_venta (íitems con id_producto UUID en JSON)
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_venta(
    p_userId      TEXT,
    p_idCliente   UUID,
    p_empleadoId  UUID,
    p_items       JSONB
)
RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
    v_id      UUID;
    v_total   NUMERIC := 0;
    i         INTEGER := 0;
    n         INTEGER;
    it        JSONB;
    v_precio  NUMERIC;
    v_stock   INTEGER;
    v_pid     UUID;
BEGIN
    n := jsonb_array_length(p_items);
    WHILE i < n LOOP
        it := p_items->i;
        v_pid := (it->>'id_producto')::uuid;
        SELECT precio, stock
            INTO v_precio, v_stock
            FROM Producto
         WHERE id = v_pid AND activo = TRUE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto % no encontrado o inactivo', v_pid;
        END IF;

        IF v_stock < (it->>'cantidad')::INTEGER THEN
            RAISE EXCEPTION 'Stock insuficiente para producto %', v_pid;
        END IF;

        i := i + 1;
    END LOOP;

    INSERT INTO Venta (user_id, id_cliente, empleado_id, total)
    VALUES (p_userId, p_idCliente, p_empleadoId, 0)
    RETURNING id INTO v_id;

    i := 0;
    WHILE i < n LOOP
        it := p_items->i;
        v_pid := (it->>'id_producto')::uuid;
        SELECT precio INTO v_precio FROM Producto WHERE id = v_pid;

        INSERT INTO DetalleVenta (id_venta, id_producto, cantidad, precio_unit)
        VALUES (v_id, v_pid, (it->>'cantidad')::INTEGER, v_precio);

        UPDATE Producto SET stock = stock - (it->>'cantidad')::INTEGER WHERE id = v_pid;
        v_total := v_total + v_precio * (it->>'cantidad')::INTEGER;
        i := i + 1;
    END LOOP;

    UPDATE Venta SET total = v_total WHERE id = v_id;
    RETURN v_id;

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;
