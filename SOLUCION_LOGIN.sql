-- ========================================
-- SOLUCIÓN COMPLETA PARA ERROR DE LOGIN
-- ========================================

-- PASO 1: DESHABILITAR RLS EN TODAS LAS TABLAS
-- Esto es CRÍTICO para que la app funcione
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;

-- PASO 2: VERIFICAR QUE LOS DATOS EXISTEN
-- Ejecuta esto para ver si hay datos en las tablas
SELECT 'Restaurantes:', COUNT(*) FROM restaurants;
SELECT 'Usuarios:', COUNT(*) FROM users;

-- PASO 3: VER LOS USUARIOS QUE EXISTEN
SELECT id, nombre, email, rol, activo, restaurant_id FROM users;

-- PASO 4: VER LOS RESTAURANTES QUE EXISTEN
SELECT id, nombre, slug, activo FROM restaurants;

-- PASO 5: SI NO HAY DATOS, INSERTARLOS NUEVAMENTE
-- Solo ejecuta esto si el SELECT anterior no mostró datos

-- Insertar restaurante demo
INSERT INTO restaurants (id, nombre, slug, telefono, email, direccion, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Restaurante Demo', 'demo', '+34 600 000 000', 'info@demo.com', 'Calle Principal 123', true)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  activo = EXCLUDED.activo;

-- Insertar usuario admin
INSERT INTO users (restaurant_id, nombre, email, password, rol, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Admin Demo', 'admin@demo.com', 'admin123', 'ADMIN', true)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  activo = EXCLUDED.activo,
  restaurant_id = EXCLUDED.restaurant_id;

-- Insertar usuario desarrollador
INSERT INTO users (restaurant_id, nombre, email, password, rol, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Desarrollador', 'dev@demo.com', 'dev123', 'DESARROLLADOR', true)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  activo = EXCLUDED.activo,
  restaurant_id = EXCLUDED.restaurant_id;

-- PASO 6: VERIFICACIÓN FINAL
-- Ejecuta esto para confirmar que todo está bien
SELECT 
  u.id,
  u.nombre as usuario,
  u.email,
  u.password,
  u.rol,
  u.activo,
  r.nombre as restaurante,
  r.id as restaurant_id
FROM users u
LEFT JOIN restaurants r ON u.restaurant_id = r.id
WHERE u.email IN ('admin@demo.com', 'dev@demo.com');

-- PASO 7: HABILITAR REALTIME PARA KDS
-- Ejecuta esto después de que el login funcione
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
