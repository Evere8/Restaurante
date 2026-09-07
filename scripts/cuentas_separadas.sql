-- Script SQL para agregar soporte de Cuentas Separadas
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas a la tabla orders para soportar cuentas separadas
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nombre_cuenta VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS grupo_mesa_id UUID;

-- Crear índice para mejorar rendimiento de búsqueda por grupo
CREATE INDEX IF NOT EXISTS idx_orders_grupo_mesa_id ON orders(grupo_mesa_id);

-- Comentarios para documentación
COMMENT ON COLUMN orders.nombre_cuenta IS 'Nombre de la persona asociada a esta cuenta (para cuentas separadas)';
COMMENT ON COLUMN orders.grupo_mesa_id IS 'ID de grupo que conecta múltiples pedidos de la misma mesa con cuentas separadas';
