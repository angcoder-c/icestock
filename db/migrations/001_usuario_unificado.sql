-- Migración: Empleado + Cliente → Usuario; Venta.id_comprador / id_vendedor
-- Ejecutar solo en bases EXISTENTES con el esquema anterior.
-- Bases nuevas: usar db/schema.sql directamente.

BEGIN;

ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_rol_check;
ALTER TABLE "user" ADD CONSTRAINT user_rol_check CHECK (
    "rol" IN ('cliente', 'cajero', 'analista', 'admin', 'superadmin')
);

CREATE TABLE IF NOT EXISTS Usuario (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT UNIQUE REFERENCES "user"("id") ON DELETE SET NULL,
    nombre     VARCHAR(150) NOT NULL,
    email      VARCHAR(150),
    telefono   VARCHAR(20),
    activo     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_email_lower
    ON Usuario (LOWER(TRIM(email)))
    WHERE email IS NOT NULL AND TRIM(email) <> '';

INSERT INTO Usuario (id, user_id, nombre, email, telefono, activo, created_at)
SELECT e.id, e.user_id, u.name, u.email, NULL, e.activo, e.created_at
FROM Empleado e
JOIN "user" u ON u.id = e.user_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO Usuario (id, user_id, nombre, email, telefono, activo, created_at)
SELECT c.id, u.id, c.nombre, c.email, c.telefono, TRUE, c.created_at
FROM Cliente c
LEFT JOIN "user" u ON u.email IS NOT NULL AND LOWER(TRIM(u.email)) = LOWER(TRIM(c.email))
ON CONFLICT (id) DO NOTHING;

ALTER TABLE Venta ADD COLUMN IF NOT EXISTS id_comprador UUID REFERENCES Usuario(id);
ALTER TABLE Venta ADD COLUMN IF NOT EXISTS id_vendedor UUID REFERENCES Usuario(id);

UPDATE Venta v SET id_comprador = v.id_cliente WHERE id_comprador IS NULL AND id_cliente IS NOT NULL;
UPDATE Venta v SET id_vendedor = v.empleado_id WHERE id_vendedor IS NULL AND empleado_id IS NOT NULL;

ALTER TABLE Venta DROP CONSTRAINT IF EXISTS venta_id_cliente_fkey;
ALTER TABLE Venta DROP CONSTRAINT IF EXISTS venta_empleado_id_fkey;
ALTER TABLE Venta DROP COLUMN IF EXISTS id_cliente;
ALTER TABLE Venta DROP COLUMN IF EXISTS empleado_id;

DROP VIEW IF EXISTS vista_ventas_completa;
DROP VIEW IF EXISTS vista_metricas_empleado;

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

DROP TABLE IF EXISTS Empleado CASCADE;
DROP TABLE IF EXISTS Cliente CASCADE;

CREATE INDEX IF NOT EXISTS idx_usuario_user_id ON Usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_venta_comprador ON Venta(id_comprador);
CREATE INDEX IF NOT EXISTS idx_venta_vendedor ON Venta(id_vendedor);

DROP FUNCTION IF EXISTS registrar_venta(TEXT, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION registrar_venta(
    p_userId       TEXT,
    p_idComprador  UUID,
    p_idVendedor   UUID,
    p_items        JSONB
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
        SELECT precio, stock INTO v_precio, v_stock
        FROM Producto WHERE id = v_pid AND activo = TRUE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto % no encontrado o inactivo', v_pid;
        END IF;
        IF v_stock < (it->>'cantidad')::INTEGER THEN
            RAISE EXCEPTION 'Stock insuficiente para producto %', v_pid;
        END IF;
        i := i + 1;
    END LOOP;

    INSERT INTO Venta (user_id, id_comprador, id_vendedor, total)
    VALUES (p_userId, p_idComprador, p_idVendedor, 0)
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
END;
$$;

COMMIT;
