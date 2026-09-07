-- =====================================================
-- SISTEMA DE STOCK AVANZADO + RECETAS + ALERTAS
-- Restaurante CRM - Supabase
-- =====================================================

-- 1. Crear ENUM para tipo de stock
DO $$ BEGIN
    CREATE TYPE stock_tipo AS ENUM ('insumo', 'vendible');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Crear ENUM para tipo de movimiento
DO $$ BEGIN
    CREATE TYPE movimiento_tipo AS ENUM ('ingreso', 'egreso', 'ajuste');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Agregar nuevos campos a menu_items
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS usar_stock_avanzado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS crear_en_stock BOOLEAN DEFAULT false;

-- 4. Crear tabla de stock_items
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    nombre TEXT NOT NULL,
    tipo stock_tipo DEFAULT 'insumo' NOT NULL,
    cantidad NUMERIC DEFAULT 0,
    unidad_medida TEXT DEFAULT 'unidad',
    costo NUMERIC,
    vencimiento DATE,
    stock_minimo_alerta NUMERIC DEFAULT 1,
    dias_alerta_vencimiento INTEGER DEFAULT 7,
    utilizable_en_receta BOOLEAN DEFAULT true,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Crear tabla de recetas (relación menu_items -> stock_items)
CREATE TABLE IF NOT EXISTS menu_receta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
    cantidad_usada NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Crear tabla de movimientos de stock
CREATE TABLE IF NOT EXISTS stock_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
    tipo movimiento_tipo NOT NULL,
    cantidad NUMERIC NOT NULL,
    motivo TEXT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Crear tabla de historial de costos
CREATE TABLE IF NOT EXISTS stock_costo_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE NOT NULL,
    costo_anterior NUMERIC,
    costo_nuevo NUMERIC NOT NULL,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_stock_items_restaurant ON stock_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_tipo ON stock_items(tipo);
CREATE INDEX IF NOT EXISTS idx_stock_items_activo ON stock_items(activo);
CREATE INDEX IF NOT EXISTS idx_menu_receta_menu ON menu_receta(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_receta_stock ON menu_receta(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movimientos_item ON stock_movimientos(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movimientos_order ON stock_movimientos(order_id);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- FUNCIÓN: Crear automáticamente producto en stock cuando se marca "crear_en_stock"
CREATE OR REPLACE FUNCTION crear_stock_desde_menu()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si crear_en_stock está activado y no existe ya
    IF NEW.crear_en_stock = true THEN
        INSERT INTO stock_items (
            restaurant_id,
            nombre,
            tipo,
            cantidad,
            costo,
            vencimiento,
            stock_minimo_alerta,
            dias_alerta_vencimiento,
            utilizable_en_receta,
            activo
        )
        VALUES (
            NEW.restaurant_id,
            NEW.nombre,
            'vendible',
            COALESCE(NEW.dias_para_vencer, 0),  -- Usar días_para_vencer como cantidad inicial
            NEW.coste,
            CASE 
                WHEN NEW.fecha_compra IS NOT NULL AND NEW.dias_para_vencer IS NOT NULL 
                THEN NEW.fecha_compra + (NEW.dias_para_vencer || ' days')::interval
                ELSE NULL
            END,
            1,  -- stock_minimo_alerta por defecto
            COALESCE(NEW.dias_alerta_vencimiento, 7),
            false,  -- Productos enteros/gaseosas NO se usan en recetas
            true
        )
        ON CONFLICT DO NOTHING;  -- Evitar duplicados si ya existe
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Ejecutar función al insertar o actualizar menu_items
DROP TRIGGER IF EXISTS trigger_crear_stock_desde_menu ON menu_items;
CREATE TRIGGER trigger_crear_stock_desde_menu
    AFTER INSERT OR UPDATE OF crear_en_stock ON menu_items
    FOR EACH ROW
    WHEN (NEW.crear_en_stock = true)
    EXECUTE FUNCTION crear_stock_desde_menu();

-- =====================================================
-- FUNCIÓN: Procesar cobro de pedido y descontar stock
-- =====================================================
CREATE OR REPLACE FUNCTION procesar_cobro_pedido(pedido_id UUID)
RETURNS JSONB AS $$
DECLARE
    item RECORD;
    stock_item RECORD;
    receta RECORD;
    alertas JSONB := '[]'::JSONB;
    resultado JSONB;
BEGIN
    -- Iterar sobre cada item del pedido
    FOR item IN 
        SELECT oi.*, mi.usar_stock_avanzado, mi.crear_en_stock
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.order_id = pedido_id
    LOOP
        -- Si usa stock avanzado (recetas)
        IF item.usar_stock_avanzado = true THEN
            -- Descontar cada insumo de la receta
            FOR receta IN 
                SELECT mr.stock_item_id, mr.cantidad_usada, si.nombre, si.cantidad, si.stock_minimo_alerta
                FROM menu_receta mr
                JOIN stock_items si ON mr.stock_item_id = si.id
                WHERE mr.menu_item_id = item.menu_item_id
            LOOP
                -- Descontar stock
                UPDATE stock_items
                SET cantidad = cantidad - (receta.cantidad_usada * item.cantidad),
                    updated_at = NOW()
                WHERE id = receta.stock_item_id;
                
                -- Registrar movimiento
                INSERT INTO stock_movimientos (stock_item_id, tipo, cantidad, motivo, order_id)
                VALUES (receta.stock_item_id, 'egreso', receta.cantidad_usada * item.cantidad, 'Venta - Pedido cobrado', pedido_id);
                
                -- Verificar si quedó por debajo del mínimo
                IF (receta.cantidad - (receta.cantidad_usada * item.cantidad)) <= receta.stock_minimo_alerta THEN
                    alertas := alertas || jsonb_build_object(
                        'tipo', 'stock_bajo',
                        'producto', receta.nombre,
                        'cantidad_actual', receta.cantidad - (receta.cantidad_usada * item.cantidad)
                    );
                END IF;
            END LOOP;
            
        -- Si es un producto entero que se creó en stock
        ELSIF item.crear_en_stock = true THEN
            -- Buscar el producto en stock_items
            SELECT * INTO stock_item
            FROM stock_items
            WHERE nombre = (SELECT nombre FROM menu_items WHERE id = item.menu_item_id LIMIT 1)
            AND utilizable_en_receta = false
            LIMIT 1;
            
            IF FOUND THEN
                -- Descontar stock
                UPDATE stock_items
                SET cantidad = cantidad - item.cantidad,
                    updated_at = NOW()
                WHERE id = stock_item.id;
                
                -- Registrar movimiento
                INSERT INTO stock_movimientos (stock_item_id, tipo, cantidad, motivo, order_id)
                VALUES (stock_item.id, 'egreso', item.cantidad, 'Venta - Pedido cobrado', pedido_id);
                
                -- Verificar alerta
                IF (stock_item.cantidad - item.cantidad) <= stock_item.stock_minimo_alerta THEN
                    alertas := alertas || jsonb_build_object(
                        'tipo', 'stock_bajo',
                        'producto', stock_item.nombre,
                        'cantidad_actual', stock_item.cantidad - item.cantidad
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    resultado := jsonb_build_object(
        'success', true,
        'alertas', alertas,
        'message', 'Stock actualizado correctamente'
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Obtener alertas de stock y vencimiento
-- =====================================================
CREATE OR REPLACE FUNCTION stock_alertas(rest_id UUID)
RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    stock_bajo JSONB;
    proximos_vencer JSONB;
    vencidos JSONB;
BEGIN
    -- Stock bajo
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'nombre', nombre,
            'cantidad', cantidad,
            'stock_minimo', stock_minimo_alerta
        )
    ), '[]'::JSONB) INTO stock_bajo
    FROM stock_items
    WHERE restaurant_id = rest_id 
    AND activo = true
    AND cantidad <= stock_minimo_alerta;
    
    -- Próximos a vencer
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'nombre', nombre,
            'vencimiento', vencimiento,
            'dias_restantes', (vencimiento - CURRENT_DATE)
        )
    ), '[]'::JSONB) INTO proximos_vencer
    FROM stock_items
    WHERE restaurant_id = rest_id 
    AND activo = true
    AND vencimiento IS NOT NULL
    AND vencimiento > CURRENT_DATE
    AND (vencimiento - CURRENT_DATE) <= dias_alerta_vencimiento;
    
    -- Vencidos
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'nombre', nombre,
            'vencimiento', vencimiento,
            'dias_vencido', (CURRENT_DATE - vencimiento)
        )
    ), '[]'::JSONB) INTO vencidos
    FROM stock_items
    WHERE restaurant_id = rest_id 
    AND activo = true
    AND vencimiento IS NOT NULL
    AND vencimiento <= CURRENT_DATE;
    
    resultado := jsonb_build_object(
        'stock_bajo', stock_bajo,
        'proximos_vencer', proximos_vencer,
        'vencidos', vencidos
    );
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Registrar cambio de costo en historial
-- =====================================================
CREATE OR REPLACE FUNCTION registrar_cambio_costo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.costo IS DISTINCT FROM OLD.costo THEN
        INSERT INTO stock_costo_historial (stock_item_id, costo_anterior, costo_nuevo, motivo)
        VALUES (NEW.id, OLD.costo, NEW.costo, 'Actualización manual');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Ejecutar al actualizar costo
DROP TRIGGER IF EXISTS trigger_registrar_cambio_costo ON stock_items;
CREATE TRIGGER trigger_registrar_cambio_costo
    AFTER UPDATE OF costo ON stock_items
    FOR EACH ROW
    WHEN (OLD.costo IS DISTINCT FROM NEW.costo)
    EXECUTE FUNCTION registrar_cambio_costo();

-- =====================================================
-- DATOS DE EJEMPLO (OPCIONAL - Comentar si no se necesita)
-- =====================================================

-- Insertar algunos insumos de ejemplo
-- INSERT INTO stock_items (restaurant_id, nombre, tipo, cantidad, unidad_medida, costo, stock_minimo_alerta, utilizable_en_receta)
-- VALUES 
--   ('11111111-1111-1111-1111-111111111111', 'Harina (kg)', 'insumo', 50, 'kg', 2.50, 10, true),
--   ('11111111-1111-1111-1111-111111111111', 'Tomate (kg)', 'insumo', 30, 'kg', 3.00, 5, true),
--   ('11111111-1111-1111-1111-111111111111', 'Queso Mozzarella (kg)', 'insumo', 20, 'kg', 8.50, 3, true);

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
