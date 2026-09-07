# 📋 Scripts SQL para Nuevas Funcionalidades

## Instrucciones
Ejecuta estos scripts en tu panel de Supabase (SQL Editor) en el orden indicado.

---

## 1. Script: Subcategorías de Productos
**Archivo:** `/app/scripts/subcategorias.sql`

```sql
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_menu_categories_parent ON menu_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_subcategory ON menu_items(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_orden ON menu_items(orden_display);
```

---

## 2. Script: Módulo de Pagos y Empleados
**Archivo:** `/app/scripts/modulo_pagos.sql`

```sql
-- TABLA: Empleados
CREATE TABLE IF NOT EXISTS empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255),
  documento VARCHAR(50),
  telefono VARCHAR(50),
  email VARCHAR(255),
  cargo VARCHAR(100),
  fecha_ingreso DATE,
  salario_base DECIMAL(15,2) DEFAULT 0,
  tipo_pago VARCHAR(20) DEFAULT 'mensual',
  banco VARCHAR(100),
  cuenta_bancaria VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: Pagos a Empleados
CREATE TABLE IF NOT EXISTS pagos_empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  periodo VARCHAR(50),
  fecha_pago DATE,
  fecha_vencimiento DATE,
  salario_base DECIMAL(15,2) DEFAULT 0,
  horas_extras DECIMAL(10,2) DEFAULT 0,
  monto_horas_extras DECIMAL(15,2) DEFAULT 0,
  turnos_dobles INTEGER DEFAULT 0,
  monto_turnos_dobles DECIMAL(15,2) DEFAULT 0,
  bonificaciones DECIMAL(15,2) DEFAULT 0,
  descuentos DECIMAL(15,2) DEFAULT 0,
  adelantos DECIMAL(15,2) DEFAULT 0,
  total_pagar DECIMAL(15,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'pendiente',
  metodo_pago VARCHAR(50),
  notas TEXT,
  pagado_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: Gastos Fijos
CREATE TABLE IF NOT EXISTS gastos_fijos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  monto DECIMAL(15,2) NOT NULL,
  frecuencia VARCHAR(20) DEFAULT 'mensual',
  dia_vencimiento INTEGER,
  proveedor VARCHAR(255),
  cuenta_pago VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  recordatorio_dias INTEGER DEFAULT 5,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: Pagos de Gastos
CREATE TABLE IF NOT EXISTS pagos_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  gasto_fijo_id UUID REFERENCES gastos_fijos(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  monto DECIMAL(15,2) NOT NULL,
  fecha_vencimiento DATE,
  fecha_pago DATE,
  estado VARCHAR(20) DEFAULT 'pendiente',
  metodo_pago VARCHAR(50),
  comprobante_url TEXT,
  notas TEXT,
  pagado_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_empleados_restaurant ON empleados(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empleados_restaurant ON pagos_empleados(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empleados_estado ON pagos_empleados(estado);
CREATE INDEX IF NOT EXISTS idx_gastos_fijos_restaurant ON gastos_fijos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_gastos_restaurant ON pagos_gastos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_gastos_estado ON pagos_gastos(estado);
```

---

## Notas Importantes

### Para las Subcategorías:
- `parent_id`: Si es NULL, es una categoría principal. Si tiene valor, es una subcategoría.
- `orden_display`: Para ordenar productos dentro de su subcategoría.
- `destacado`: Para mostrar productos destacados primero.

### Para el Módulo de Pagos:
- **Empleados**: Gestión completa con datos bancarios
- **Pagos Empleados**: Desglose de salario, horas extras, turnos dobles, bonificaciones
- **Gastos Fijos**: Con recordatorio de vencimiento automático
- **Pagos Gastos**: Historial de todos los pagos realizados

---

## Verificación
Después de ejecutar los scripts, verifica que las tablas se crearon correctamente:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('empleados', 'pagos_empleados', 'gastos_fijos', 'pagos_gastos');
```
