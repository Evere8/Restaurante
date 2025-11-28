-- Actualizar usuario desarrollador con nuevas credenciales
UPDATE users 
SET 
  email = 'ever@gmail.com',
  password = 'ever123',
  nombre = 'Ever - Desarrollador'
WHERE rol = 'DESARROLLADOR' AND email = 'dev@demo.com';

-- O insertar si no existe
INSERT INTO users (restaurant_id, nombre, email, password, rol, activo, permisos)
VALUES 
  (NULL, 'Ever - Desarrollador', 'ever@gmail.com', 'ever123', 'DESARROLLADOR', true, '{}'::jsonb)
ON CONFLICT (email) DO UPDATE SET
  password = 'ever123',
  activo = true;

-- Añadir columnas necesarias a la tabla restaurants para el panel desarrollador
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS contacto_numero VARCHAR(50);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tipo_pago_plan VARCHAR(50) DEFAULT 'CONTADO';

-- Verificar el cambio
SELECT email, password, nombre, rol FROM users WHERE email = 'ever@gmail.com';
