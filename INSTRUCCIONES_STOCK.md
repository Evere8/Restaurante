# 📦 Sistema de Stock Avanzado - Instrucciones de Instalación

## 🎯 Objetivo
Implementar un sistema completo de gestión de stock, recetas, alertas y reportes para el Restaurant CRM.

## ⚡ Paso 1: Ejecutar el Script SQL en Supabase

1. **Accede a tu proyecto de Supabase**:
   - URL: https://xyorogaopywkkjlqfbfh.supabase.co
   
2. **Ve al SQL Editor**:
   - En el menú lateral, haz clic en "SQL Editor"
   - Crea una nueva query

3. **Copia y pega el contenido del archivo** `/app/SQL_STOCK_SISTEMA.sql`

4. **Ejecuta el script** haciendo clic en "Run"

5. **Verifica la creación exitosa**:
   - Ve a "Table Editor"
   - Deberías ver las nuevas tablas:
     - `stock_items`
     - `menu_receta`
     - `stock_movimientos`
     - `stock_costo_historial`
   - Y los nuevos campos en `menu_items`:
     - `usar_stock_avanzado`
     - `crear_en_stock`

## 📋 Paso 2: Verificar las funciones creadas

En el SQL Editor, ejecuta estas consultas para verificar:

```sql
-- Verificar función de alertas
SELECT stock_alertas('11111111-1111-1111-1111-111111111111');

-- Verificar que los triggers existen
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_crear_stock_desde_menu', 'trigger_registrar_cambio_costo');
```

## ✅ Paso 3: Datos de prueba (Opcional)

Si quieres probar con datos de ejemplo, ejecuta:

```sql
-- Insertar insumos de prueba
INSERT INTO stock_items (restaurant_id, nombre, tipo, cantidad, unidad_medida, costo, stock_minimo_alerta, utilizable_en_receta)
VALUES 
  ((SELECT id FROM restaurants WHERE slug = 'demo' LIMIT 1), 'Harina (kg)', 'insumo', 50, 'kg', 2.50, 10, true),
  ((SELECT id FROM restaurants WHERE slug = 'demo' LIMIT 1), 'Tomate (kg)', 'insumo', 30, 'kg', 3.00, 5, true),
  ((SELECT id FROM restaurants WHERE slug = 'demo' LIMIT 1), 'Queso Mozzarella (kg)', 'insumo', 20, 'kg', 8.50, 3, true),
  ((SELECT id FROM restaurants WHERE slug = 'demo' LIMIT 1), 'Coca Cola 1.5L', 'vendible', 100, 'unidad', 1.50, 20, false);
```

## 🚀 Paso 4: Funcionalidades Implementadas

Una vez ejecutado el script SQL, el sistema tendrá:

### 1. **Menú Mejorado** (/menu)
- ⚠️ Advertencia cuando se usa cantidad/costo manual
- ✅ Checkbox "Usar Stock Avanzado"
- ✅ Checkbox "Crear en STOCK"
- ✅ Sección de RECETA (solo con stock avanzado)
- ✅ Campos de alertas configurables

### 2. **Stock** (/stock) - NUEVA PÁGINA
- 📦 Gestión de productos e insumos
- 🟡 Sección "Productos a Vencer"
- 🔴 Productos vencidos
- 📋 Lista de insumos para reponer
- 📱 Botón para enviar lista por WhatsApp

### 3. **Pedidos** (/pedidos)
- ✅ Permite crear pedidos sin validar stock
- ✅ Descuento de stock SOLO al cobrar

### 4. **Cobro** (/cobro)
- ✅ Al cobrar se llama a `procesar_cobro_pedido()`
- ✅ Descuenta stock automáticamente
- ✅ Genera alertas si stock bajo

### 5. **Reportes** (/reportes) - NUEVA PÁGINA
- 📊 Evolución de costos
- 📈 Productos con costos subió/bajó
- 🍕 Consumo de insumos por receta
- 💰 Productos más rentables
- ⚠️ Análisis de desperdicio

### 6. **Dashboard** (/)
- ✅ Alertas de vencimiento desde STOCK (no desde menú)
- ✅ Alertas de stock bajo

## 🔐 Credenciales de Acceso

**Acceso de Restaurante:**
- Email: sami@gmail.com
- Password: sami123

**Desarrollador:**
- Email: dev@demo.com
- Password: dev123

## 📝 Notas Importantes

1. **FIFO**: El sistema usa primero los productos más próximos a vencer
2. **No permite**:
   - Usar productos vencidos
   - Borrar productos usados en recetas activas
3. **Validaciones**:
   - Unidades compatibles en recetas
   - Stock mínimo configurable por producto
   - Días de alerta configurables

## 🆘 Solución de Problemas

### Error: "type stock_tipo already exists"
- Esto es normal, el script maneja este caso con `DO $$ BEGIN ... EXCEPTION`

### No aparecen las nuevas columnas
- Verifica que el script se ejecutó completamente
- Revisa la consola de Supabase por errores

### Las funciones no se crean
- Asegúrate de ejecutar todo el script de una sola vez
- Verifica que tienes permisos de administrador

## ✅ Checklist Final

- [ ] Script SQL ejecutado exitosamente
- [ ] Tablas creadas en Supabase
- [ ] Funciones y triggers verificados
- [ ] Datos de prueba insertados (opcional)
- [ ] Página /stock accesible
- [ ] Página /reportes accesible
- [ ] Menú con checkboxes funcionando
- [ ] Cobro descuenta stock correctamente
- [ ] Alertas funcionando en dashboard

---

**Autor**: Evere8 (evere843@gmail.com)
**Fecha**: Junio 2025
**Versión**: 1.0
