-- Añadir columna moneda a la tabla restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS moneda VARCHAR(10) DEFAULT 'EUR';

-- Actualizar el restaurante demo
UPDATE restaurants SET moneda = 'EUR' WHERE id = '11111111-1111-1111-1111-111111111111';

-- Verificar
SELECT id, nombre, moneda FROM restaurants;
