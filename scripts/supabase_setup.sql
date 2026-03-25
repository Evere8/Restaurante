-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT SQL PARA SUPABASE - MENÚ PDF Y FACTURA CONFIG
-- ═══════════════════════════════════════════════════════════════════════════════
-- Ejecutar este script en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. AGREGAR COLUMNA menu_pdf_url A LA TABLA menu_digital_config (SI NO EXISTE)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar si la columna existe y agregarla si no
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'menu_digital_config' AND column_name = 'menu_pdf_url'
    ) THEN
        ALTER TABLE menu_digital_config ADD COLUMN menu_pdf_url TEXT;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. AGREGAR COLUMNA ruc A LA TABLA customers (SI NO EXISTE)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'ruc'
    ) THEN
        ALTER TABLE customers ADD COLUMN ruc VARCHAR(50);
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. CREAR TABLA factura_config (SI NO EXISTE)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS factura_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL DEFAULT 'factura', -- 'factura' o 'recibo'
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(restaurant_id, tipo)
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_factura_config_restaurant ON factura_config(restaurant_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_factura_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_factura_config ON factura_config;
CREATE TRIGGER trigger_update_factura_config
    BEFORE UPDATE ON factura_config
    FOR EACH ROW
    EXECUTE FUNCTION update_factura_config_updated_at();

-- Habilitar RLS
ALTER TABLE factura_config ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios puedan leer/escribir solo sus propias configuraciones
DROP POLICY IF EXISTS "Users can manage their restaurant factura config" ON factura_config;
CREATE POLICY "Users can manage their restaurant factura config"
    ON factura_config FOR ALL
    USING (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
    WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. CREAR BUCKET DE STORAGE PARA ASSETS DEL RESTAURANTE (MANUAL EN SUPABASE)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- NOTA: Los buckets de Storage deben crearse manualmente en Supabase Dashboard:
-- 1. Ve a Storage en tu proyecto Supabase
-- 2. Crea un nuevo bucket llamado "restaurant-assets"
-- 3. Marca la opción "Public bucket" si quieres URLs públicas
-- 4. Configura las políticas de RLS según necesites
--
-- O puedes usar el bucket "imagenes" que ya existe
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════════
