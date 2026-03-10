# CRM Restaurante - Product Requirements Document

## Overview
Sistema CRM completo para gestión de restaurantes con menú digital, pedidos, cocina (KDS), cobros, stock, clientes, reportes y facturación.

## Stack Técnico
- **Frontend**: Next.js 14, React, Tailwind CSS, Shadcn/UI
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **PDF**: jsPDF

## Módulos Implementados

### 1. Autenticación
- Login por email/contraseña
- Roles: Cliente, Desarrollador
- Permisos por módulo

### 2. Dashboard
- Resumen de ventas
- Pedidos del día
- Métricas rápidas

### 3. Menú (/menu)
- CRUD de productos
- Categorías y subcategorías jerárquicas
- Stock avanzado con recetas
- Gestión de disponibilidad

### 4. Menú Digital (/menu-digital)
- Configuración de menú público
- Generador de QR
- Personalización de colores
- Sistema de promociones (2x1, porcentaje, precio fijo)

### 5. Pedidos (/pedidos)
- Creación de pedidos
- Estados: NUEVO → PREPARANDO → LISTO → ENTREGADO
- Cuentas separadas por mesa
- Agregar productos a pedidos entregados
- Edición de pedidos en cualquier estado

### 6. KDS/Cocina (/kds)
- Pantalla de cocina
- Resaltado de items nuevos
- Flujo de preparación

### 7. Cobro (/cobro)
- Sistema de cobro completo
- Métodos de pago múltiples
- Cupones de descuento
- Generación de facturas y recibos PDF
- Pestaña "Cobrados" con productos vendidos (30 días)
- Exportación a Excel de ventas diarias
- Cobro rápido

### 8. Stock (/stock)
- Control de inventario
- Alertas de stock bajo
- Alertas de vencimiento
- Movimientos de stock (ingresos/egresos)
- Historial de costos

### 9. Clientes (/clientes)
- Base de datos de clientes
- Marketing por WhatsApp (opt-in)
- Historial de compras

### 10. Cupones (/cupones)
- Gestión de cupones de descuento
- Límites de uso
- Fechas de vencimiento

### 11. Reportes (/reportes)
- Ventas generales
- Productos vendidos (nuevo)
- Evolución de costos
- Rentabilidad por producto
- Consumo de insumos
- Productos vencidos/desperdicio
- Exportación a CSV

### 12. Configuración (/configuracion)
- Datos del restaurante
- Personalización de colores
- Logo

### 13. Facturación (/configuracion-factura)
- Configuración de factura paraguaya
- Datos fiscales

## Cambios Recientes (Marzo 2026)

### Bugs Corregidos
1. **Error al actualizar pedido**: Corregido manejo de items con `menu_item_id` nulo en `/app/app/pedidos/page.js`
2. **Error al guardar promoción**: Corregida validación de `porcentaje_descuento` en `/app/app/menu-digital/page.js`

### Funcionalidades Añadidas
3. **Pestaña Cobrados mejorada**: 
   - Muestra productos vendidos en cada tarjeta
   - Persistencia de 30 días
   - Botón exportar ventas del día a Excel/CSV

4. **Reporte de Productos Vendidos**:
   - Nueva pestaña en /reportes
   - Tabla de productos con cantidades y fechas
   - Resumen por producto
   - Exportación a CSV

## Próximas Tareas (Backlog)
- P2: Implementar lógica de promociones en página admin de Pedidos
- P3: Dashboard de analytics avanzado
- P3: Integración con delivery (terceros)

## Credenciales de Prueba
- Email: jose@gmail.com
- Password: jose123
