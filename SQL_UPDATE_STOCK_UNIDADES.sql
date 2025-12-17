-- =====================================================
-- ACTUALIZACIÓN: Agregar unidad_medida a stock_items
-- =====================================================

-- Agregar columna unidad_medida
ALTER TABLE stock_items 
ADD COLUMN IF NOT EXISTS unidad_medida TEXT DEFAULT 'unidad';

-- Verificar que se agregó correctamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'stock_items' AND column_name = 'unidad_medida';
