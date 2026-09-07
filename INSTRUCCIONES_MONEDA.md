# Instrucciones para Activar la Funcionalidad de Moneda

## Paso 1: Ejecutar Script SQL en Supabase

Necesitas ejecutar el siguiente script SQL en tu proyecto de Supabase para agregar la columna de moneda:

### Opción A: Desde Supabase Dashboard
1. Ve a tu proyecto de Supabase: https://xyorogaopywkkjlqfbfh.supabase.co
2. Abre el **SQL Editor**
3. Copia y pega el siguiente código:

```sql
-- Agregar columna de moneda a la tabla restaurants
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS moneda VARCHAR(10) DEFAULT 'EUR';

-- Actualizar comentario de la columna
COMMENT ON COLUMN restaurants.moneda IS 'Moneda preferida del restaurante (EUR, USD, PYG)';
```

4. Haz clic en **Run** para ejecutar el script

### Opción B: Usar el archivo SQL_UPDATE_MONEDA.sql
El archivo ya está en `/app/SQL_UPDATE_MONEDA.sql` y contiene el mismo script.

## Paso 2: Verificar la Implementación

Una vez ejecutado el script, la funcionalidad estará completa:

### ✅ Funcionalidades Implementadas:

1. **Selector de Moneda en Configuración**
   - Ubicación: Configuración → Pestaña "Preferencias"
   - Opciones disponibles:
     - Euro (€)
     - Dólar ($)
     - Guaraníes (Gs)
   - Botón "Guardar Preferencias" para persistir la selección

2. **Aplicación Global de Moneda**
   - Dashboard: KPIs de ventas, ticket promedio, pedidos recientes
   - Pedidos: Precios de productos, totales de pedidos
   - Menú: Precios de productos
   - Cobro: Totales, subtotales, descuentos, procesamiento de pagos

3. **Contexto de Moneda (CurrencyContext)**
   - Carga automática de la moneda del restaurante
   - Función `formatCurrency()` para formatear valores según la moneda
   - Función `updateCurrency()` para cambiar la moneda

## Cómo Funciona

### Formato de Monedas:
- **EUR**: €1,234.56
- **USD**: $1,234.56
- **PYG (Guaraníes)**: Gs 1,235 (sin decimales)

### Persistencia:
- La moneda se guarda en la tabla `restaurants`
- Se carga automáticamente al iniciar sesión
- Se aplica a todas las páginas que muestran valores monetarios

## Archivos Modificados/Creados:

### Nuevos Archivos:
- `/app/contexts/CurrencyContext.js` - Contexto global de moneda
- `/app/SQL_UPDATE_MONEDA.sql` - Script de migración
- `/app/INSTRUCCIONES_MONEDA.md` - Este archivo

### Archivos Actualizados:
- `/app/app/layout.js` - Añadido CurrencyProvider
- `/app/app/configuracion/page.js` - Selector y botón de guardar
- `/app/app/dashboard/page.js` - Formateo de valores monetarios
- `/app/app/pedidos/page.js` - Formateo de valores monetarios
- `/app/app/menu/page.js` - Formateo de valores monetarios
- `/app/app/cobro/page.js` - Formateo de valores monetarios

## Prueba la Funcionalidad

1. Inicia sesión como admin: sami@gmail.com / sami123
2. Ve a **Configuración** → **Preferencias**
3. Selecciona **Guaraníes (Gs)**
4. Haz clic en **Guardar Preferencias**
5. Ve al **Dashboard** y verifica que los valores ahora muestren "Gs" en lugar de "€"
6. Navega por otras páginas (Pedidos, Menú, Cobro) para ver la moneda aplicada globalmente

## Soporte

Si tienes algún problema:
1. Verifica que el script SQL se ejecutó correctamente
2. Revisa la consola del navegador para errores
3. Asegúrate de que la columna `moneda` existe en la tabla `restaurants`
