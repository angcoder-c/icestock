-- ============================================================
--  IceStock — roles PostgreSQL (GRANT / REVOKE)
--  Ejecutar DESPUÉS de db/schema.sql como superusuario (p. ej. proy3).
--  La app se conecta con icestock_app (o el usuario en DATABASE_URL)
--  y hace SET ROLE según user.rol de la sesión.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rol de conexión (LOGIN)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'icestock_app') THEN
    CREATE ROLE icestock_app
      LOGIN
      PASSWORD 'secret'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT;
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 2. Roles de negocio (NOLOGIN) — alineados con user.rol
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_cliente') THEN
    CREATE ROLE rol_cliente NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_cajero') THEN
    CREATE ROLE rol_cajero NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_analista') THEN
    CREATE ROLE rol_analista NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_admin') THEN
    CREATE ROLE rol_admin NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_superadmin') THEN
    CREATE ROLE rol_superadmin NOLOGIN;
  END IF;
END
$$;

-- Herencia: admin ⊃ analista + cajero; superadmin ⊃ admin
GRANT rol_analista TO rol_admin;
GRANT rol_cajero TO rol_admin;
GRANT rol_admin TO rol_superadmin;

-- ------------------------------------------------------------
-- 3. Funciones almacenadas (definidas en db/schema.sql)
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 4. REVOKE público en objetos de negocio
-- ------------------------------------------------------------
REVOKE ALL ON TABLE categoria, proveedor, producto, usuario, venta, detalleventa FROM PUBLIC;
REVOKE ALL ON vista_ventas_completa, vista_metricas_empleado FROM PUBLIC;
REVOKE EXECUTE ON PROCEDURE public.sp_registrar_venta(TEXT, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON PROCEDURE public.sp_anular_venta(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.registrar_venta(TEXT, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_mis_compras(UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_catalogo_activo(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.anular_venta(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_clientes_frecuentes() FROM PUBLIC;

-- Better Auth: solo la conexión de la aplicación (no roles de negocio)
REVOKE ALL ON TABLE "user", session, account, verification FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "user", session, account, verification TO icestock_app;

-- ------------------------------------------------------------
-- 5. USAGE (esquema y base)
-- ------------------------------------------------------------
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO icestock_app', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO icestock_app;
GRANT USAGE ON SCHEMA public TO rol_cliente, rol_cajero, rol_analista, rol_admin, rol_superadmin;

-- ------------------------------------------------------------
-- 6. rol_cliente — tienda en línea
-- ------------------------------------------------------------
-- JOIN en listado de productos (categoría / proveedor para la ficha en catálogo)
GRANT SELECT ON TABLE categoria, proveedor, producto TO rol_cliente;
GRANT SELECT ON TABLE usuario TO rol_cliente;
GRANT EXECUTE ON FUNCTION public.fn_catalogo_activo(INT) TO rol_cliente;
GRANT EXECUTE ON FUNCTION public.fn_mis_compras(UUID, INT) TO rol_cliente;
GRANT EXECUTE ON PROCEDURE public.sp_registrar_venta(TEXT, UUID, UUID, JSONB) TO rol_cliente;
GRANT EXECUTE ON FUNCTION public.registrar_venta(TEXT, UUID, UUID, JSONB) TO rol_cliente;

-- INSERT venta propia (autocompra: vendedor NULL); la app valida id_comprador
GRANT INSERT ON TABLE venta, detalleventa TO rol_cliente;
GRANT SELECT ON TABLE detalleventa TO rol_cliente;

-- ------------------------------------------------------------
-- 7. rol_cajero — POS
-- ------------------------------------------------------------
-- Solo columnas necesarias para listados (rol comprador vs personal, nombre en ventas)
GRANT SELECT (id, name, email, rol) ON TABLE "user" TO rol_cajero;

GRANT SELECT ON TABLE categoria, proveedor, producto, usuario TO rol_cajero;
GRANT SELECT ON TABLE venta, detalleventa TO rol_cajero;
GRANT INSERT ON TABLE venta, detalleventa TO rol_cajero;
GRANT INSERT ON TABLE usuario TO rol_cajero;
GRANT UPDATE (stock) ON TABLE producto TO rol_cajero;
GRANT EXECUTE ON PROCEDURE public.sp_registrar_venta(TEXT, UUID, UUID, JSONB) TO rol_cajero;
GRANT EXECUTE ON FUNCTION public.registrar_venta(TEXT, UUID, UUID, JSONB) TO rol_cajero;
GRANT SELECT ON vista_ventas_completa TO rol_cajero;

-- ------------------------------------------------------------
-- 8. rol_analista — lectura y reportes (CSV desde vistas/tablas)
-- ------------------------------------------------------------
GRANT SELECT (id, name, email, rol) ON TABLE "user" TO rol_analista;

GRANT SELECT ON TABLE categoria, proveedor, producto, usuario, venta, detalleventa TO rol_analista;
GRANT SELECT ON vista_ventas_completa, vista_metricas_empleado TO rol_analista;
GRANT EXECUTE ON FUNCTION public.fn_clientes_frecuentes() TO rol_analista;

-- ------------------------------------------------------------
-- 9. rol_admin — operación + catálogo + anulaciones
-- ------------------------------------------------------------
-- Gestión de personal: leer/actualizar cuentas Better Auth (no INSERT: usa icestock_app en alta)
GRANT SELECT, UPDATE ON TABLE "user" TO rol_admin;

GRANT INSERT, UPDATE, DELETE ON TABLE categoria, proveedor, producto, usuario TO rol_admin;
GRANT UPDATE ON TABLE venta TO rol_admin;
GRANT UPDATE (stock) ON TABLE producto TO rol_admin;
GRANT DELETE ON TABLE detalleventa TO rol_admin;
GRANT EXECUTE ON PROCEDURE public.sp_anular_venta(UUID) TO rol_admin;
GRANT EXECUTE ON FUNCTION public.anular_venta(UUID) TO rol_admin;
GRANT EXECUTE ON FUNCTION public.fn_clientes_frecuentes() TO rol_admin;

-- ------------------------------------------------------------
-- 10. rol_superadmin — control total del esquema de negocio
-- ------------------------------------------------------------
GRANT ALL PRIVILEGES ON TABLE categoria, proveedor, producto, usuario, venta, detalleventa TO rol_superadmin;
GRANT ALL PRIVILEGES ON vista_ventas_completa, vista_metricas_empleado TO rol_superadmin;
GRANT ALL PRIVILEGES ON PROCEDURE public.sp_registrar_venta(TEXT, UUID, UUID, JSONB) TO rol_superadmin;
GRANT ALL PRIVILEGES ON PROCEDURE public.sp_anular_venta(UUID) TO rol_superadmin;
GRANT ALL PRIVILEGES ON FUNCTION public.registrar_venta(TEXT, UUID, UUID, JSONB) TO rol_superadmin;
GRANT ALL PRIVILEGES ON FUNCTION public.fn_mis_compras(UUID, INT) TO rol_superadmin;
GRANT ALL PRIVILEGES ON FUNCTION public.fn_catalogo_activo(INT) TO rol_superadmin;
GRANT ALL PRIVILEGES ON FUNCTION public.anular_venta(UUID) TO rol_superadmin;
GRANT ALL PRIVILEGES ON FUNCTION public.fn_clientes_frecuentes() TO rol_superadmin;

-- Catálogo enriquecido y reportes también para cajero (POS) y analista
GRANT EXECUTE ON FUNCTION public.fn_catalogo_activo(INT) TO rol_cajero, rol_analista, rol_admin;

-- ------------------------------------------------------------
-- 11. La app puede hacer SET ROLE (miembros de cada rol)
-- ------------------------------------------------------------
GRANT rol_cliente TO icestock_app;
GRANT rol_cajero TO icestock_app;
GRANT rol_analista TO icestock_app;
GRANT rol_admin TO icestock_app;
GRANT rol_superadmin TO icestock_app;

-- Compatibilidad: usuario Docker del curso también puede SET ROLE
DO $$
DECLARE
  r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['proy2', 'proy3'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT rol_cliente, rol_cajero, rol_analista, rol_admin, rol_superadmin TO %I', r);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "user", session, account, verification TO %I', r);
    END IF;
  END LOOP;
END
$$;