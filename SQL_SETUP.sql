-- CRM Restaurante - Script de Creación de Tablas
-- Ejecutar en Supabase SQL Editor

-- 1. Tabla de Restaurantes
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(255),
  direccion TEXT,
  logo_url TEXT,
  tipo_pago VARCHAR(50) DEFAULT 'MIXTO',
  activo BOOLEAN DEFAULT true,
  en_mantenimiento BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'CAJERO',
  activo BOOLEAN DEFAULT true,
  permisos JSONB DEFAULT '{}',
  ultimo_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Clientes
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(255),
  direccion_principal TEXT,
  notas TEXT,
  acepta_marketing_whatsapp BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Categorías del Menú
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Items del Menú
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio_base DECIMAL(10,2) NOT NULL,
  coste DECIMAL(10,2),
  img_url TEXT,
  tiempo_preparacion_min INTEGER DEFAULT 15,
  disponible BOOLEAN DEFAULT true,
  dias_para_vencer INTEGER,
  dias_alerta_vencimiento INTEGER DEFAULT 2,
  fecha_compra DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  tipo VARCHAR(50) DEFAULT 'SALA',
  mesa VARCHAR(50),
  customer_nombre VARCHAR(255),
  subtotal DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'NUEVO',
  metodo_pago VARCHAR(50),
  fecha_pago TIMESTAMP WITH TIME ZONE,
  nota_cliente TEXT,
  nota_cocina TEXT,
  tiempo_inicio_preparacion TIMESTAMP WITH TIME ZONE,
  tiempo_listo TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla de Items de Pedidos
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  nombre_item_snapshot VARCHAR(255) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  total_item DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabla de Cupones
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  tipo VARCHAR(50) DEFAULT 'PORCENTAJE',
  valor DECIMAL(10,2) NOT NULL,
  monto_minimo DECIMAL(10,2) DEFAULT 0,
  limite_usos INTEGER,
  veces_usado INTEGER DEFAULT 0,
  fecha_vencimiento DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_users_restaurant ON users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_estado ON orders(estado);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_coupons_restaurant ON coupons(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_codigo ON coupons(codigo);

-- Datos iniciales de ejemplo
-- Restaurante demo
INSERT INTO restaurants (id, nombre, slug, telefono, email, direccion, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Restaurante Demo', 'demo', '+34 600 000 000', 'info@demo.com', 'Calle Principal 123', true)
ON CONFLICT (slug) DO NOTHING;

-- Usuario admin demo
INSERT INTO users (restaurant_id, nombre, email, password, rol, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Admin Demo', 'admin@demo.com', 'admin123', 'ADMIN', true)
ON CONFLICT (email) DO NOTHING;

-- Usuario desarrollador
INSERT INTO users (restaurant_id, nombre, email, password, rol, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Desarrollador', 'dev@demo.com', 'dev123', 'DESARROLLADOR', true)
ON CONFLICT (email) DO NOTHING;

-- Categorías demo
INSERT INTO menu_categories (restaurant_id, nombre, orden, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Entrantes', 1, true),
  ('11111111-1111-1111-1111-111111111111', 'Platos Principales', 2, true),
  ('11111111-1111-1111-1111-111111111111', 'Postres', 3, true),
  ('11111111-1111-1111-1111-111111111111', 'Bebidas', 4, true)
ON CONFLICT DO NOTHING;
