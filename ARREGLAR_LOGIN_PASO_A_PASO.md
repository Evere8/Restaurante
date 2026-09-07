# 🔧 SOLUCIÓN: Error "Usuario no encontrado"

## 🚨 PROBLEMA
Te aparece "Usuario no encontrado" aunque la tabla `users` existe en Supabase.

## ✅ SOLUCIÓN EN 3 PASOS

---

## 📝 PASO 1: Deshabilitar RLS (MUY IMPORTANTE)

**Ve a Supabase SQL Editor y ejecuta SOLO esto primero:**

```sql
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
```

**¿Por qué?** RLS (Row Level Security) está bloqueando las consultas. Al deshabilitarlo, la app puede leer los datos.

---

## 🔍 PASO 2: Verificar que hay datos

**Ejecuta este script para ver si existen usuarios:**

```sql
SELECT 
  u.id,
  u.nombre,
  u.email,
  u.password,
  u.rol,
  u.activo,
  u.restaurant_id,
  r.nombre as restaurante
FROM users u
LEFT JOIN restaurants r ON u.restaurant_id = r.id;
```

### ¿Qué deberías ver?

Deberías ver 2 usuarios:
- **admin@demo.com** con password **admin123**
- **dev@demo.com** con password **dev123**

---

## ✏️ PASO 3A: SI NO HAY DATOS (tabla vacía)

**Ejecuta este script para insertar los datos:**

```sql
-- Insertar restaurante
INSERT INTO restaurants (id, nombre, slug, telefono, email, direccion, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Restaurante Demo', 'demo', '+34 600 000 000', 'info@demo.com', 'Calle Principal 123', true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- Insertar usuario admin
INSERT INTO users (restaurant_id, nombre, email, password, rol, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Admin Demo', 'admin@demo.com', 'admin123', 'ADMIN', true)
ON CONFLICT (email) DO UPDATE SET password = 'admin123', activo = true;

-- Insertar usuario desarrollador
INSERT INTO users (restaurant_id, nombre, email, password, rol, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Desarrollador', 'dev@demo.com', 'dev123', 'DESARROLLADOR', true)
ON CONFLICT (email) DO UPDATE SET password = 'dev123', activo = true;

-- Insertar categorías
INSERT INTO menu_categories (restaurant_id, nombre, orden, activo)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Entrantes', 1, true),
  ('11111111-1111-1111-1111-111111111111', 'Platos Principales', 2, true),
  ('11111111-1111-1111-1111-111111111111', 'Postres', 3, true),
  ('11111111-1111-1111-1111-111111111111', 'Bebidas', 4, true)
ON CONFLICT DO NOTHING;
```

---

## ✏️ PASO 3B: SI SÍ HAY DATOS pero el password es diferente

**Ejecuta esto para actualizar la contraseña:**

```sql
-- Actualizar contraseña del admin
UPDATE users 
SET password = 'admin123', activo = true
WHERE email = 'admin@demo.com';

-- Actualizar contraseña del desarrollador
UPDATE users 
SET password = 'dev123', activo = true
WHERE email = 'dev@demo.com';
```

---

## 🧪 PASO 4: Verificar NUEVAMENTE

**Ejecuta este SELECT final:**

```sql
SELECT 
  u.email,
  u.password,
  u.rol,
  u.activo,
  r.nombre as restaurante
FROM users u
LEFT JOIN restaurants r ON u.restaurant_id = r.id
WHERE u.email IN ('admin@demo.com', 'dev@demo.com');
```

**Deberías ver:**

| email | password | rol | activo | restaurante |
|-------|----------|-----|--------|-------------|
| admin@demo.com | admin123 | ADMIN | true | Restaurante Demo |
| dev@demo.com | dev123 | DESARROLLADOR | true | Restaurante Demo |

---

## 🎯 PASO 5: Probar el Login

1. Ve a tu aplicación: http://localhost:3000/login
2. Selecciona **"Cliente"** (no Desarrollador)
3. Ingresa:
   - Email: `admin@demo.com`
   - Password: `admin123`
4. Haz clic en **Iniciar Sesión**

---

## ❌ SI AÚN NO FUNCIONA

### Opción A: Verificar en el navegador

1. Abre la aplicación en el navegador
2. Presiona **F12** (Herramientas de desarrollador)
3. Ve a la pestaña **Console**
4. Intenta iniciar sesión
5. Mira si hay errores en la consola
6. **Toma captura del error y avísame**

### Opción B: Verificar que RLS está deshabilitado

1. Ve a Supabase → **Database** → **Tables**
2. Haz clic en la tabla **"users"**
3. En la parte superior, busca el texto **"RLS enabled"**
4. Si dice **"RLS enabled"**, necesitas deshabilitarlo:
   - Haz clic en el ícono de escudo 🛡️
   - Deshabilita RLS

### Opción C: Probar consulta directa

Ejecuta esto en SQL Editor:

```sql
-- Simular el login
SELECT 
  u.*,
  r.*
FROM users u
LEFT JOIN restaurants r ON u.restaurant_id = r.id
WHERE u.email = 'admin@demo.com'
AND u.activo = true;
```

Si esto **NO devuelve resultados**, el problema es que:
- Los datos no existen → Ejecuta PASO 3A
- RLS está bloqueando → Ejecuta PASO 1

---

## 🔄 HABILITAR REALTIME (Después de que funcione el login)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

---

## 📞 ¿NECESITAS MÁS AYUDA?

Si después de todos estos pasos aún no funciona, necesito que me digas:

1. ¿Qué resultado obtuviste en el PASO 2? (copia y pega)
2. ¿Ejecutaste el PASO 1 para deshabilitar RLS?
3. ¿Qué error aparece en la consola del navegador? (F12)

---

## ✅ CHECKLIST RÁPIDO

- [ ] Ejecuté PASO 1 (Deshabilitar RLS)
- [ ] Ejecuté PASO 2 (Verificar datos)
- [ ] Si no había datos, ejecuté PASO 3A
- [ ] Ejecuté PASO 4 (Verificación final)
- [ ] Intenté login con admin@demo.com / admin123
- [ ] Abrí F12 para ver si hay errores en consola
