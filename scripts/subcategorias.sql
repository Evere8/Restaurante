-- =====================================================
-- SCRIPT: Subcategorías y Segmentación de Productos
-- =====================================================

-- Agregar campos para subcategorías en menu_categories
ALTER TABLE menu_categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS descripcion TEXT,
ADD COLUMN IF NOT EXISTS icono TEXT;

-- Agregar campo de subcategoría en menu_items
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS destacado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS orden_display INTEGER DEFAULT 0;

-- Índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_menu_categories_parent ON menu_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_subcategory ON menu_items(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_orden ON menu_items(orden_display);

-- =====================================================
-- COMENTARIOS:
-- parent_id: Si es NULL, es una categoría principal
--            Si tiene valor, es una subcategoría
-- orden_display: Para ordenar productos dentro de su subcategoría
-- destacado: Para mostrar productos destacados primero
-- =====================================================
