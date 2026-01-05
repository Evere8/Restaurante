-- ==============================================
-- SCRIPT SQL PARA MENÚ DIGITAL Y PROMOCIONES
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

-- 3. Crear tabla de promociones
CREATE TABLE IF NOT EXISTS promociones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo_descuento TEXT NOT NULL DEFAULT 'porcentaje', -- porcentaje, 2x1, precio_fijo
    porcentaje_descuento INTEGER DEFAULT 10,
    precio_original INTEGER DEFAULT 0,
    precio_final INTEGER DEFAULT 0,
    motivo TEXT, -- Ej: "Día de los enamorados", "Día del niño"
    imagen_url TEXT,
    activa BOOLEAN DEFAULT true,
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla de items de promoción (para combos)
CREATE TABLE IF NOT EXISTS promocion_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promocion_id UUID REFERENCES promociones(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    cantidad INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Habilitar RLS
ALTER TABLE menu_digital_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE promocion_items ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de seguridad para menu_digital_config
DROP POLICY IF EXISTS "Permitir lectura pública de config" ON menu_digital_config;
CREATE POLICY "Permitir lectura pública de config" ON menu_digital_config
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura a usuarios del restaurante" ON menu_digital_config;
CREATE POLICY "Permitir escritura a usuarios del restaurante" ON menu_digital_config
    FOR ALL USING (true);

-- 7. Políticas de seguridad para promociones
DROP POLICY IF EXISTS "Permitir lectura pública de promociones" ON promociones;
CREATE POLICY "Permitir lectura pública de promociones" ON promociones
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura de promociones" ON promociones;
CREATE POLICY "Permitir escritura de promociones" ON promociones
    FOR ALL USING (true);

-- 8. Políticas de seguridad para promocion_items
DROP POLICY IF EXISTS "Permitir lectura pública de promocion_items" ON promocion_items;
CREATE POLICY "Permitir lectura pública de promocion_items" ON promocion_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura de promocion_items" ON promocion_items;
CREATE POLICY "Permitir escritura de promocion_items" ON promocion_items
    FOR ALL USING (true);

-- 9. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_menu_digital_config_restaurant ON menu_digital_config(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_origen ON orders(origen);
CREATE INDEX IF NOT EXISTS idx_promociones_restaurant ON promociones(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_promociones_activa ON promociones(activa);
CREATE INDEX IF NOT EXISTS idx_promocion_items_promocion ON promocion_items(promocion_id);

-- 10. Comentarios para documentación
COMMENT ON TABLE menu_digital_config IS 'Configuración del menú digital público para cada restaurante';
COMMENT ON TABLE promociones IS 'Promociones y combos especiales del restaurante';
COMMENT ON TABLE promocion_items IS 'Items que forman parte de cada promoción o combo';
COMMENT ON COLUMN orders.origen IS 'Origen del pedido: MANUAL (empleado) o DIGITAL (cliente desde menú)';

-- ==============================================
-- FIN DEL SCRIPT
-- ==============================================
