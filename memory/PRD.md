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

### 4. Menú Digital (/menu-digital) - ACTUALIZADO
- Configuración de menú público
- Generador de QR
- Personalización de colores
- Sistema de promociones (2x1, porcentaje, precio fijo)
- **NUEVO: Subir PDF del menú**
- **NUEVO: Landing page con 2 opciones (Ver Menú PDF / Hacer Pedido)**

### 5. Pedidos (/pedidos)
- Simplificado a 2 pestañas: "En Proceso" y "Entregados"
- Botón "Iniciar Preparación" → "Marcar Entregado"
- Productos no se despliegan automáticamente
- Promociones visibles con precio tachado y badge de descuento
- Cuentas separadas por mesa

### 6. KDS/Cocina (/kds)
- Pantalla de cocina
- Resaltado de items nuevos
- Flujo de preparación

### 7. Cobro (/cobro) - ACTUALIZADO
- Sistema de cobro completo
- Métodos de pago múltiples
- Cupones de descuento
- Generación de facturas y recibos PDF
- Pestaña "Cobrados" con selector de semana (1-5)
- **Nombre y RUC del cliente visible en cada tarjeta**
- **Exportar ventas del DÍA y del MES** (formato Excel mejorado)

### 8. Stock (/stock)
- Control de inventario
- Alertas de stock bajo
- Alertas de vencimiento
- Movimientos de stock

### 9. Clientes (/clientes)
- Base de datos de clientes con RUC
- Marketing por WhatsApp (opt-in)
- Historial de compras

### 10. Cupones (/cupones)
- Gestión de cupones de descuento
- Límites de uso
- Fechas de vencimiento

### 11. Reportes (/reportes)
- Ventas generales - Filtro de fechas corregido
- Productos vendidos con fechas y cantidades
- Evolución de costos
- Rentabilidad por producto
- Exportación a CSV

### 12. Configuración (/configuracion)
- Datos del restaurante
- Personalización de colores
- Logo

### 13. Facturación (/configuracion-factura)
- Configuración de factura paraguaya
- Guardado en Supabase

## Landing Page del Menú (/menu/[slug]) - NUEVO
Cuando el cliente escanea el QR, ve una pantalla con 2 opciones:
1. **Ver Menú** - Muestra el PDF del menú
2. **Hacer Pedido** - Lleva al menú interactivo para crear pedidos

## Cambios Recientes (Marzo 2026)

### Cobros - RUC del Cliente
- Agregado RUC del cliente en las tarjetas de pedidos cobrados
- Query actualizada para traer el campo `ruc` de la tabla `customers`

### Menú Digital - PDF del Menú
- Nueva sección en Configuración para subir PDF del menú
- Nueva página de landing `/menu/[slug]` con diseño minimalista
- 2 opciones: "Ver Menú" (PDF) y "Hacer Pedido" (interactivo)
- El link del QR ahora apunta a `/menu/[slug]`

## Script SQL Pendiente
Ver archivo: `/app/scripts/supabase_setup.sql`

Incluye:
- Columna `menu_pdf_url` en `menu_digital_config`
- Columna `ruc` en `customers` (si no existe)
- Tabla `factura_config` para guardar configuración de facturas

## Credenciales de Prueba
- Email: jose@gmail.com
- Password: jose123
