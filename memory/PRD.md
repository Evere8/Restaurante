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

### 5. Pedidos (/pedidos) - ACTUALIZADO
- **Simplificado a 2 pestañas**: "En Proceso" y "Entregados"
- Botón "Iniciar Preparación" → "Marcar Entregado" para pasar a Entregados
- **Productos no se despliegan automáticamente** - Solo al seleccionar categoría
- Promociones visibles con precio tachado y badge de descuento
- Cuentas separadas por mesa
- Edición de pedidos

### 6. KDS/Cocina (/kds)
- Pantalla de cocina
- Resaltado de items nuevos
- Flujo de preparación

### 7. Cobro (/cobro) - ACTUALIZADO
- Sistema de cobro completo
- Métodos de pago múltiples
- Cupones de descuento
- Generación de facturas y recibos PDF
- **Pestaña "Cobrados" con selector de semana (1-5)**
- **Nombre del cliente visible en cada tarjeta**
- Exportación a Excel de ventas diarias

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

### 11. Reportes (/reportes) - ACTUALIZADO
- Ventas generales - **Filtro de fechas corregido**
- Productos vendidos con fechas y cantidades
- Evolución de costos
- Rentabilidad por producto
- Consumo de insumos
- Productos vencidos/desperdicio
- Exportación a CSV

### 12. Configuración (/configuracion)
- Datos del restaurante
- Personalización de colores
- Logo

### 13. Facturación (/configuracion-factura) - ACTUALIZADO
- Configuración de factura paraguaya
- Datos fiscales
- **Guardado en Supabase (requiere crear tabla)**

## Cambios Realizados (Marzo 2026)

### Corrección 1: Cobros - Selector de Semana y Nombre Cliente
- Agregado selector de semana (1-5) en pestaña Cobrados
- Nombre del cliente visible en cada tarjeta de pedido cobrado
- Mantiene exportación a Excel

### Corrección 2: Pedidos - Simplificado a 2 Pestañas
- Eliminada pestaña "Para Entregar"
- Solo quedan: "En Proceso" y "Entregados"
- Flujo: Iniciar Preparación → Marcar Entregado → Pasa a Entregados

### Corrección 3: Pedidos - Productos no se Despliegan
- Los productos no se muestran hasta seleccionar una categoría
- Evita scroll innecesario

### Corrección 4: Reportes - Filtro de Fechas Corregido
- Las fechas ahora se manejan sin conversión de zona horaria
- El filtro de "ayer" ahora muestra los datos correctos

### Corrección 5: Configuración Factura - Guardar en Supabase
- Código actualizado para guardar en Supabase
- **PENDIENTE**: Ejecutar script SQL para crear tabla

## Credenciales de Prueba
- Email: jose@gmail.com
- Password: jose123
