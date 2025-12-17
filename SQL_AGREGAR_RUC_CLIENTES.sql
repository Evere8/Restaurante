-- =====================================================
-- AGREGAR CAMPO RUC A TABLA CUSTOMERS
-- =====================================================

-- Agregar columna ruc
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS ruc TEXT;

-- Crear índice para búsquedas rápidas por RUC
CREATE INDEX IF NOT EXISTS idx_customers_ruc ON customers(ruc);

-- Verificar que se agregó correctamente
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customers' AND column_name = 'ruc';
