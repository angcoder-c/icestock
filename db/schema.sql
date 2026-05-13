-- ============================================================
--  Heladería "Frío & Punto" — Schema PostgreSQL
--  Auth: Better Auth (tablas propias) + pg directo (sin ORM)
--  Credenciales fijas: usuario proy2 / contraseña secret
-- ============================================================

-- ============================================================
--  TABLAS DE BETTER AUTH
--  Better Auth las gestiona internamente; no renombrar.
-- ============================================================

CREATE TABLE "user" (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    email             TEXT NOT NULL UNIQUE,
    email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    image             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campo extra para rol dentro de la heladería
    rol               TEXT NOT NULL DEFAULT 'cajero'
                      CHECK (rol IN ('admin', 'cajero'))
);

CREATE TABLE session (
    id          TEXT PRIMARY KEY,
    expires_at  TIMESTAMPTZ NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address  TEXT,
    user_agent  TEXT,
    user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE account (
    id                       TEXT PRIMARY KEY,
    account_id               TEXT NOT NULL,
    provider_id              TEXT NOT NULL,
    user_id                  TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    access_token             TEXT,
    refresh_token            TEXT,
    id_token                 TEXT,
    access_token_expires_at  TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    scope                    TEXT,
    password                 TEXT,   -- hash bcrypt gestionado por Better Auth
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE Verification (
    id          TEXT PRIMARY KEY,
    identifier  TEXT NOT NULL,
    value       TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  TABLAS DEL NEGOCIO
-- ============================================================

CREATE TABLE Categoria (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE Proveedor (
    id        SERIAL PRIMARY KEY,
    nombre    VARCHAR(150) NOT NULL,
    telefono  VARCHAR(20),
    email     VARCHAR(150),
    direccion TEXT
);

CREATE TABLE Producto (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(150) NOT NULL,
    descripcion   TEXT,
    precio        NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    id_categoria  INTEGER NOT NULL REFERENCES Categoria(id),
    id_proveedor  INTEGER NOT NULL REFERENCES Proveedor(id),
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- empleado guarda solo el perfil del negocio;
-- la autenticación la maneja Better Auth via "user"
CREATE TABLE Empleado (
    id         SERIAL PRIMARY KEY,
    user_id    TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    activo     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE Cliente (
    id         SERIAL PRIMARY KEY,
    nombre     VARCHAR(150) NOT NULL,
    email      VARCHAR(150) UNIQUE,
    telefono   VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE Venta (
    id          SERIAL PRIMARY KEY,
    id_cliente  INTEGER REFERENCES Cliente(id),
    user_id     TEXT NOT NULL REFERENCES "user"(id),   -- empleado que hizo la venta
    total       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fecha       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado      VARCHAR(20) NOT NULL DEFAULT 'completada'
                CHECK (estado IN ('completada', 'anulada'))
);

CREATE TABLE DetalleVenta (
    id          SERIAL PRIMARY KEY,
    id_venta    INTEGER NOT NULL REFERENCES Venta(id) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES Producto(id),
    cantidad    INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unit NUMERIC(10, 2) NOT NULL CHECK (precio_unit >= 0),
    subtotal    NUMERIC(10, 2) GENERATED ALWAYS AS (cantidad * precio_unit) STORED
);

-- ============================================================
--  ÍNDICES
-- ============================================================

-- Better Auth necesita lookups rápidos por token y user_id
CREATE INDEX idx_session_user_id     ON session(user_id);
CREATE INDEX idx_session_token       ON session(token);
CREATE INDEX idx_account_user_id     ON account(user_id);

-- Negocio
CREATE INDEX idx_empleado_user_id   ON Empleado(user_id);
CREATE INDEX idx_producto_categoria ON Producto(id_categoria);
CREATE INDEX idx_producto_proveedor ON Producto(id_proveedor);
CREATE INDEX idx_venta_fecha        ON Venta(fecha);
CREATE INDEX idx_venta_user_id      ON Venta(user_id);
CREATE INDEX idx_detalleventa_venta ON DetalleVenta(id_venta);
CREATE INDEX idx_detalleventa_prod  ON DetalleVenta(id_producto);

-- ============================================================
--  VIEW — cc3088: al menos 1 VIEW usado por el backend
-- ============================================================

CREATE VIEW vista_ventas_completa AS
SELECT
    v.id                 AS venta_id,
    v.fecha,
    v.total,
    v.estado,
    c.nombre             AS cliente,
    u.name               AS empleado,
    u.rol                AS rol_empleado,
    p.nombre             AS producto,
    dv.cantidad,
    dv.precio_unit,
    dv.subtotal,
    cat.nombre           AS categoria
FROM Venta v
LEFT  JOIN Cliente       c   ON c.id   = v.id_cliente
JOIN  "user"             u   ON u.id   = v.user_id
JOIN  DetalleVenta       dv  ON dv.id_venta  = v.id
JOIN  Producto          p   ON p.id   = dv.id_producto
JOIN  Categoria         cat ON cat.id = p.id_categoria;

-- ============================================================
--  DATOS DE PRUEBA
-- ============================================================

INSERT INTO Categoria (nombre, descripcion) VALUES
  ('Paleta',       'Helados en palito de agua o crema'),
  ('Copa',         'Helado servido en vaso o copa'),
  ('Sundae',       'Helado con toppings y salsas'),
  ('Malteada',     'Helado batido con leche'),
  ('Sandwich',     'Helado entre dos galletas'),
  ('Sorbete',      'Helado de frutas sin lácteos'),
  ('Tarrina',      'Helado para llevar en recipiente'),
  ('Bola',         'Porción estándar de helado'),
  ('Flotante',     'Helado sobre refresco o soda'),
  ('Especialidad', 'Creaciones únicas de temporada');

INSERT INTO Proveedor (nombre, telefono, email, direccion) VALUES
  ('Cremería El Norte',      '5555-1111', 'contacto@elnorte.com',   'Zona 1, Guatemala'),
  ('Lácteos del Sur',        '5555-2222', 'ventas@lacteossur.com',  'Zona 5, Guatemala'),
  ('Frutas Frescas SA',      '5555-3333', 'info@frutasfrescas.com', 'Zona 10, Guatemala'),
  ('Insumos Dulces',         '5555-4444', 'pedidos@dulces.com',     'Zona 12, Guatemala'),
  ('Sabores Guatemala',      '5555-5555', 'hola@saboresgt.com',     'Zona 15, Guatemala'),
  ('Importadora Cacao',      '5555-6666', 'cacao@import.com',       'Zona 4, Guatemala'),
  ('Distribuidora Vainilla', '5555-7777', 'vainilla@dist.com',      'Zona 7, Guatemala'),
  ('Berries & Co',           '5555-8888', 'berries@co.gt',          'Zona 9, Guatemala');

-- Usuarios seed (en producción Better Auth los crea vía sign-up)
-- password de todos: "secret123"  →  genera el hash real con bcrypt antes de subir
INSERT INTO "user" (id, name, email, email_verified, rol) VALUES
  ('usr_admin_001', 'Admin Sistema', 'admin@heladeria.com',  TRUE, 'admin'),
  ('usr_emp_002',   'María López',   'maria@heladeria.com',  TRUE, 'cajero'),
  ('usr_emp_003',   'Carlos Pérez',  'carlos@heladeria.com', TRUE, 'cajero'),
  ('usr_emp_004',   'Ana García',    'ana@heladeria.com',    TRUE, 'cajero'),
  ('usr_emp_005',   'Luis Torres',   'luis@heladeria.com',   TRUE, 'cajero');

INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES
  ('acc_001', 'admin@heladeria.com',  'credential', 'usr_admin_001', '$2b$10$HASH_PLACEHOLDER'),
  ('acc_002', 'maria@heladeria.com',  'credential', 'usr_emp_002',   '$2b$10$HASH_PLACEHOLDER'),
  ('acc_003', 'carlos@heladeria.com', 'credential', 'usr_emp_003',   '$2b$10$HASH_PLACEHOLDER'),
  ('acc_004', 'ana@heladeria.com',    'credential', 'usr_emp_004',   '$2b$10$HASH_PLACEHOLDER'),
  ('acc_005', 'luis@heladeria.com',   'credential', 'usr_emp_005',   '$2b$10$HASH_PLACEHOLDER');
-- Reemplaza $2b$10$HASH_PLACEHOLDER con:
--   node -e "require('bcrypt').hash('secret123',10).then(console.log)"

INSERT INTO Empleado (user_id) VALUES
  ('usr_admin_001'),
  ('usr_emp_002'),
  ('usr_emp_003'),
  ('usr_emp_004'),
  ('usr_emp_005');

INSERT INTO Cliente (nombre, email, telefono) VALUES
  ('Juan Ramírez',   'juan@mail.com',    '5500-0001'),
  ('Sofía Castillo', 'sofia@mail.com',   '5500-0002'),
  ('Pedro Alvarado', 'pedro@mail.com',   '5500-0003'),
  ('Laura Morales',  'laura@mail.com',   '5500-0004'),
  ('Diego Fuentes',  'diego@mail.com',   '5500-0005'),
  ('Valeria Cruz',   'valeria@mail.com', '5500-0006'),
  ('Roberto Mejía',  'roberto@mail.com', '5500-0007'),
  ('Claudia Ríos',   'claudia@mail.com', '5500-0008'),
  ('Fernando López', 'ferlo@mail.com',   '5500-0009'),
  ('Gabriela Sosa',  'gaby@mail.com',    '5500-0010'),
  ('Héctor Vásquez', NULL,               '5500-0011'),
  ('Irene Ramos',    'irene@mail.com',   '5500-0012'),
  ('Javier Ortiz',   'javier@mail.com',  '5500-0013'),
  ('Karla Nájera',   'karla@mail.com',   '5500-0014'),
  ('Miguel Ángel',   'miguel@mail.com',  '5500-0015'),
  ('Nancy Estrada',  'nancy@mail.com',   '5500-0016'),
  ('Oscar Pinto',    NULL,               '5500-0017'),
  ('Patricia Lima',  'pato@mail.com',    '5500-0018'),
  ('Quetzal Ajú',    'qaju@mail.com',    '5500-0019'),
  ('Rodrigo Caal',   'rodrigo@mail.com', '5500-0020'),
  ('Sandra Tzul',    'sandra@mail.com',  '5500-0021'),
  ('Tomás Jiménez',  'tomas@mail.com',   '5500-0022'),
  ('Úrsula Batz',    'ursula@mail.com',  '5500-0023'),
  ('Victor Choc',    'victor@mail.com',  '5500-0024'),
  ('Wendy Cú',       'wendy@mail.com',   '5500-0025');

INSERT INTO Producto (nombre, descripcion, precio, stock, id_categoria, id_proveedor) VALUES
  ('Paleta de Mango',       'Paleta artesanal de mango natural',          15.00, 80,  1, 3),
  ('Paleta de Tamarindo',   'Paleta con chile y tamarindo',               12.00, 60,  1, 3),
  ('Copa de Fresa',         'Copa con helado de fresa y crema',           25.00, 50,  2, 1),
  ('Sundae Chocolate',      'Helado de vainilla con salsa de chocolate',  35.00, 40,  3, 6),
  ('Malteada de Oreo',      'Malteada cremosa con galletas Oreo',         40.00, 30,  4, 4),
  ('Sandwich Vainilla',     'Helado entre dos galletas de chocolate',     20.00, 70,  5, 7),
  ('Sorbete de Limón',      'Sorbete refrescante sin lácteos',            18.00, 55,  6, 3),
  ('Tarrina 500ml',         'Helado de tu sabor favorito para llevar',    55.00, 25,  7, 1),
  ('Bola de Vainilla',      'Una bola de helado de vainilla clásica',     10.00, 100, 8, 7),
  ('Flotante de Uva',       'Helado de vainilla sobre soda de uva',       30.00, 20,  9, 4),
  ('Paleta de Coco',        'Paleta cremosa de coco rallado',             14.00, 65,  1, 2),
  ('Copa Tropicana',        'Copa con helado de frutas tropicales',       28.00, 45,  2, 3),
  ('Sundae de Fresa',       'Helado de fresa con crema y grageas',        33.00, 35,  3, 1),
  ('Malteada de Chocolate', 'Malteada espesa de chocolate oscuro',        42.00, 28,  4, 6),
  ('Sorbete de Maracuyá',   'Sorbete tropical de maracuyá',               18.00, 50,  6, 3),
  ('Bola de Chocolate',     'Una bola de helado de chocolate',            10.00, 90,  8, 6),
  ('Bola de Fresa',         'Una bola de helado de fresa',                10.00, 85,  8, 1),
  ('Sundae Caramelo',       'Helado con salsa de caramelo y nueces',      36.00, 30,  3, 4),
  ('Tarrina 1L',            'Tarrina familiar de 1 litro',                95.00, 15,  7, 1),
  ('Especialidad del Día',  'Creación especial del chef heladero',        45.00, 10, 10, 6),
  ('Paleta de Piña',        'Paleta de piña con chile piquín',            12.00, 70,  1, 3),
  ('Flotante de Naranja',   'Helado de vainilla sobre soda naranja',      30.00, 18,  9, 4),
  ('Malteada de Fresa',     'Malteada rosa con fresas naturales',         40.00, 32,  4, 1),
  ('Copa Clásica',          'Copa de helado de vainilla con chispas',     22.00, 60,  2, 7),
  ('Sandwich Chocolate',    'Helado de chocolate entre galletas doradas', 22.00, 55,  5, 4);

-- ============================================================
--  FUNCIÓN: registrar_venta — transacción explícita (cc3088)
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_venta(
    p_user_id    TEXT,
    p_id_cliente INTEGER,
    p_items      JSONB     -- [{id_producto, cantidad}]
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_id      INTEGER;
    v_total   NUMERIC := 0;
    item      JSONB;
    v_precio  NUMERIC;
    v_stock   INTEGER;
BEGIN
    -- Validar stock de todos los ítems antes de modificar nada
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
                SELECT precio, stock
                    INTO v_precio, v_stock
                    FROM Producto
                 WHERE id = (item->>'id_producto')::INTEGER
                     AND activo = TRUE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto % no encontrado o inactivo', item->>'id_producto';
        END IF;

        IF v_stock < (item->>'cantidad')::INTEGER THEN
            RAISE EXCEPTION 'Stock insuficiente para producto %', item->>'id_producto';
        END IF;
    END LOOP;

    -- Cabecera de la venta
    INSERT INTO Venta (user_id, id_cliente, total)
    VALUES (p_user_id, p_id_cliente, 0)
    RETURNING id INTO v_id;

    -- Detalle + descuento de stock
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
                SELECT precio INTO v_precio
                    FROM Producto
                 WHERE id = (item->>'id_producto')::INTEGER;

        INSERT INTO DetalleVenta (id_venta, id_producto, cantidad, precio_unit)
        VALUES (v_id,
                (item->>'id_producto')::INTEGER,
                (item->>'cantidad')::INTEGER,
                v_precio);

                UPDATE Producto
                     SET stock = stock - (item->>'cantidad')::INTEGER
                 WHERE id = (item->>'id_producto')::INTEGER;

        v_total := v_total + v_precio * (item->>'cantidad')::INTEGER;
    END LOOP;

    UPDATE Venta SET total = v_total WHERE id = v_id;

    RETURN v_id;

EXCEPTION WHEN OTHERS THEN
    RAISE;  -- el BEGIN/COMMIT/ROLLBACK lo maneja el backend con pg
END;
$$;
