-- ==============================================
-- SCRIPT SQL PARA MENÚ DIGITAL
-- Ejecutar en Supabase SQL Editor
-- ==============================================

-- 1. Crear tabla de configuración del menú digital
CREATE TABLE IF NOT EXISTS menu_digital_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    descripcion TEXT,
    imagen_portada TEXT,
    colores JSONB DEFAULT '{"primary": "#f97316", "secondary": "#1e3a5f", "background": "#ffffff", "text": "#1f2937"}',
    horario_apertura TIME,
    horario_cierre TIME,
    mostrar_precios BOOLEAN DEFAULT true,
    permitir_pedidos BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(restaurant_id)
);

-- 2. Agregar columna origen a la tabla orders (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'origen') THEN
        ALTER TABLE orders ADD COLUMN origen TEXT DEFAULT 'MANUAL';
    END IF;
END $$;

-- 3. Habilitar RLS en menu_digital_config
ALTER TABLE menu_digital_config ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad para menu_digital_config
-- Permitir lectura pública (para el menú público)
CREATE POLICY "Permitir lectura pública de config" ON menu_digital_config
    FOR SELECT USING (true);

-- Permitir escritura solo a usuarios autenticados del mismo restaurante
CREATE POLICY "Permitir escritura a usuarios del restaurante" ON menu_digital_config
    FOR ALL USING (
        restaurant_id IN (
            SELECT restaurant_id FROM users WHERE id = auth.uid()
        )
    );

-- 5. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_menu_digital_config_restaurant ON menu_digital_config(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_origen ON orders(origen);

-- 6. Comentarios para documentación
COMMENT ON TABLE menu_digital_config IS 'Configuración del menú digital público para cada restaurante';
COMMENT ON COLUMN menu_digital_config.colores IS 'Objeto JSON con colores personalizados del menú';
COMMENT ON COLUMN orders.origen IS 'Origen del pedido: MANUAL (creado por empleado) o DIGITAL (creado por cliente)';

-- ==============================================
-- FIN DEL SCRIPT
-- ==============================================
