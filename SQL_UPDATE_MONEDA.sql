-- Agregar columna de moneda a la tabla restaurants
-- Ejecutar en Supabase SQL Editor

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS moneda VARCHAR(10) DEFAULT 'EUR';

-- Actualizar comentario de la columna
COMMENT ON COLUMN restaurants.moneda IS 'Moneda preferida del restaurante (EUR, USD, PYG)';
