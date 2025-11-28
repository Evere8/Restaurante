# 🔧 INSTRUCCIONES PASO A PASO - CONFIGURACIÓN SUPABASE

## ⚠️ IMPORTANTE: DEBES EJECUTAR ESTAS INSTRUCCIONES ANTES DE USAR LA APLICACIÓN

---

## 📝 PASO 1: CREAR LAS TABLAS EN SUPABASE

### 1.1 Acceder a Supabase SQL Editor
1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto: **xyorogaopywkkjlqfbfh**
4. En el menú lateral, haz clic en **"SQL Editor"**

### 1.2 Ejecutar el Script SQL
1. Haz clic en **"New Query"**
2. **COPIA TODO EL CONTENIDO** del archivo `SQL_SETUP.sql` que está en la raíz del proyecto
3. **PEGA** el contenido en el editor SQL de Supabase
4. Haz clic en **"RUN"** (o presiona Ctrl+Enter)
5. ✅ Deberías ver el mensaje: "Success. No rows returned"

---

## 🔒 PASO 2: CONFIGURAR POLÍTICAS DE SEGURIDAD (RLS)

### Opción A: Deshabilitar RLS (Solo para Desarrollo/Testing)

**ESTA ES LA FORMA MÁS RÁPIDA PARA EMPEZAR:**

1. Ve a **Authentication** → **Policies** en Supabase
2. Para cada tabla (restaurants, users, customers, etc.):
   - Busca el toggle "Enable RLS"
   - **DESACTÍVALO** (esto permite acceso completo)

### Opción B: Crear Políticas Permisivas (Recomendado)

Si prefieres mantener RLS activo, ejecuta este script adicional:

```sql
-- Políticas permisivas para desarrollo
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON restaurants FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON customers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON menu_categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON menu_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON order_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON coupons FOR ALL USING (true) WITH CHECK (true);
```

**⚠️ NOTA:** Para producción, deberías crear políticas más restrictivas basadas en `restaurant_id` y roles de usuario.

---

## 🔄 PASO 3: HABILITAR REALTIME (Importante para KDS)

### 3.1 Habilitar Realtime en la tabla de pedidos

1. Ve a **Database** → **Replication** en Supabase
2. Busca la tabla **"orders"**
3. Activa el toggle de **"Realtime"**
4. ✅ Esto permitirá que el KDS se actualice en tiempo real

---

## ✅ PASO 4: VERIFICAR LA INSTALACIÓN

### 4.1 Verificar que las tablas se crearon
1. Ve a **Table Editor** en Supabase
2. Deberías ver estas 8 tablas:
   - ✅ restaurants
   - ✅ users
   - ✅ customers
   - ✅ menu_categories
   - ✅ menu_items
   - ✅ orders
   - ✅ order_items
   - ✅ coupons

### 4.2 Verificar datos de prueba
1. Abre la tabla **"restaurants"**
2. Deberías ver un restaurante llamado "Restaurante Demo"
3. Abre la tabla **"users"**
4. Deberías ver 2 usuarios:
   - admin@demo.com
   - dev@demo.com

---

## 🚀 PASO 5: PROBAR LA APLICACIÓN

### 5.1 Iniciar sesión

Abre tu aplicación y prueba con estas credenciales:

**Usuario Admin:**
- Email: `admin@demo.com`
- Password: `admin123`
- Tipo: Cliente

**Usuario Desarrollador:**
- Email: `dev@demo.com`
- Password: `dev123`
- Tipo: Desarrollador

### 5.2 Recorrido rápido

1. **Dashboard** - Verás los KPIs (todos en 0 inicialmente)
2. **Menú** - Crea categorías y productos
3. **Pedidos** - Crea tu primer pedido
4. **KDS** - Verás el pedido aparecer automáticamente
5. **Cobro** - Procesa el pago del pedido

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### ❌ Error: "relation does not exist"
**Solución:** Las tablas no se crearon. Vuelve al PASO 1.

### ❌ Error: "permission denied"
**Solución:** RLS está bloqueando el acceso. Ve al PASO 2 y deshabilita RLS.

### ❌ No puedo iniciar sesión
**Solución:** 
1. Verifica que la tabla "users" tiene datos
2. Comprueba que usas las credenciales correctas
3. Abre la consola del navegador para ver errores

### ❌ KDS no se actualiza automáticamente
**Solución:** Ve al PASO 3 y habilita Realtime en la tabla "orders"

### ❌ Error de conexión a Supabase
**Solución:**
1. Verifica las variables de entorno en `.env.local`
2. Comprueba que tu proyecto de Supabase está activo
3. Verifica las URLs y keys

---

## 📊 CREAR DATOS DE EJEMPLO (Opcional)

Si quieres tener datos de ejemplo para probar:

```sql
-- Insertar productos de ejemplo (ajusta el restaurant_id si es necesario)
-- Primero, obtén tu category_id de la tabla menu_categories

-- Ejemplo de productos
INSERT INTO menu_items (restaurant_id, category_id, nombre, descripcion, precio_base, coste, disponible)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 
   (SELECT id FROM menu_categories WHERE nombre = 'Entrantes' LIMIT 1),
   'Ensalada César', 'Ensalada con pollo, parmesano y croutones', 8.50, 3.50, true),
  ('11111111-1111-1111-1111-111111111111',
   (SELECT id FROM menu_categories WHERE nombre = 'Platos Principales' LIMIT 1),
   'Pizza Margarita', 'Pizza con tomate, mozzarella y albahaca', 12.00, 4.50, true),
  ('11111111-1111-1111-1111-111111111111',
   (SELECT id FROM menu_categories WHERE nombre = 'Bebidas' LIMIT 1),
   'Agua Mineral', 'Agua mineral natural 500ml', 2.00, 0.50, true);

-- Insertar un cliente de ejemplo
INSERT INTO customers (restaurant_id, nombre, telefono, email, acepta_marketing_whatsapp)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Juan Pérez', '+34 600 123 456', 'juan@email.com', true);

-- Insertar un cupón de ejemplo
INSERT INTO coupons (restaurant_id, codigo, tipo, valor, monto_minimo, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'DESCUENTO10', 'PORCENTAJE', 10, 20, true);
```

---

## 🎯 PRÓXIMOS PASOS

Una vez que todo esté funcionando:

1. **Personaliza el restaurante**: Ve a Configuración → Restaurante
2. **Crea tu menú**: Añade categorías y productos reales
3. **Configura usuarios**: Crea cuentas para tu equipo
4. **Crea cupones**: Configura promociones
5. **¡Empieza a recibir pedidos!**

---

## 📞 ¿NECESITAS AYUDA?

Si después de seguir todos estos pasos sigues teniendo problemas:

1. Revisa la consola del navegador (F12) para ver errores específicos
2. Verifica los logs de Supabase en la sección "Logs"
3. Comprueba que todas las variables de entorno están correctas
4. Asegúrate de que tu proyecto de Supabase está en el plan correcto

---

## ✅ CHECKLIST FINAL

Antes de usar la aplicación, verifica:

- [ ] He ejecutado el script SQL completo en Supabase
- [ ] Las 8 tablas están creadas en mi base de datos
- [ ] He configurado RLS (deshabilitado o con políticas)
- [ ] He habilitado Realtime en la tabla "orders"
- [ ] Puedo iniciar sesión con las credenciales demo
- [ ] Las variables de entorno están configuradas en .env.local

---

🎉 **¡Listo! Tu CRM está configurado y funcionando correctamente.**
