-- Usuario de calificación UVG (cc3088): proy3 / secret
-- En el primer arranque con POSTGRES_USER=proy3, Docker ya crea este rol; el bloque es idempotente.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'proy3') THEN
    CREATE ROLE proy3
      LOGIN
      SUPERUSER
      CREATEDB
      CREATEROLE
      PASSWORD 'secret';
  END IF;
END
$$;
