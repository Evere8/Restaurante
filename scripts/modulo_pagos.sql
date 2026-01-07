-- =====================================================
-- SCRIPT: Módulo de Gestión Financiera y Empleados
-- =====================================================

-- =====================================================
-- TABLA: Empleados
-- =====================================================
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
  tipo_pago VARCHAR(20) DEFAULT 'mensual', -- mensual, quincenal, semanal
  banco VARCHAR(100),
  cuenta_bancaria VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Pagos a Empleados
-- =====================================================
CREATE TABLE IF NOT EXISTS pagos_empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  periodo VARCHAR(50), -- "Enero 2025", "Semana 1 - Enero 2025"
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
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, pagado, vencido
  metodo_pago VARCHAR(50), -- efectivo, transferencia, cheque
  notas TEXT,
  pagado_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Gastos Fijos (Alquiler, Servicios, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS gastos_fijos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(100), -- alquiler, servicios, seguros, impuestos, otros
  monto DECIMAL(15,2) NOT NULL,
  frecuencia VARCHAR(20) DEFAULT 'mensual', -- diario, semanal, mensual, anual
  dia_vencimiento INTEGER, -- día del mes que vence (1-31)
  proveedor VARCHAR(255),
  cuenta_pago VARCHAR(255), -- número de cuenta o referencia
  activo BOOLEAN DEFAULT true,
  recordatorio_dias INTEGER DEFAULT 5, -- días antes para recordar
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Pagos de Gastos
-- =====================================================
CREATE TABLE IF NOT EXISTS pagos_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  gasto_fijo_id UUID REFERENCES gastos_fijos(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL, -- Nombre del gasto (puede ser manual)
  categoria VARCHAR(100),
  monto DECIMAL(15,2) NOT NULL,
  fecha_vencimiento DATE,
  fecha_pago DATE,
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, pagado, vencido
  metodo_pago VARCHAR(50),
  comprobante_url TEXT,
  notas TEXT,
  pagado_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Caja Chica / Movimientos de Caja
-- =====================================================
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL, -- ingreso, egreso
  categoria VARCHAR(100), -- venta, pago_proveedor, gasto_operativo, retiro, deposito
  concepto VARCHAR(255) NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  metodo VARCHAR(50), -- efectivo, tarjeta, transferencia
  referencia VARCHAR(100), -- número de factura, recibo, etc.
  usuario_id UUID,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Resumen Financiero Mensual (para dashboard)
-- =====================================================
CREATE TABLE IF NOT EXISTS resumen_financiero (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  ingresos_ventas DECIMAL(15,2) DEFAULT 0,
  gastos_empleados DECIMAL(15,2) DEFAULT 0,
  gastos_fijos DECIMAL(15,2) DEFAULT 0,
  gastos_operativos DECIMAL(15,2) DEFAULT 0,
  ganancia_neta DECIMAL(15,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, mes, anio)
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_empleados_restaurant ON empleados(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empleados_restaurant ON pagos_empleados(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empleados_estado ON pagos_empleados(estado);
CREATE INDEX IF NOT EXISTS idx_gastos_fijos_restaurant ON gastos_fijos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_gastos_restaurant ON pagos_gastos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_gastos_estado ON pagos_gastos(estado);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_restaurant ON movimientos_caja(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_fecha ON movimientos_caja(fecha);

-- =====================================================
-- COMENTARIOS SOBRE EL DISEÑO:
-- 
-- 1. EMPLEADOS: Gestión completa de empleados con info bancaria
-- 
-- 2. PAGOS_EMPLEADOS: Registro de cada pago con desglose de:
--    - Salario base
--    - Horas extras y su monto
--    - Turnos dobles
--    - Bonificaciones y descuentos
--    - Adelantos
-- 
-- 3. GASTOS_FIJOS: Gastos recurrentes con:
--    - Categorización
--    - Día de vencimiento
--    - Recordatorios automáticos
-- 
-- 4. PAGOS_GASTOS: Historial de pagos de gastos
-- 
-- 5. MOVIMIENTOS_CAJA: Control de caja diario
-- 
-- 6. RESUMEN_FINANCIERO: Para dashboard rápido
-- =====================================================
