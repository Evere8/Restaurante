# 🚀 INSTRUCCIONES PARA DEPLOY EN VERCEL

## ✅ SISTEMA LISTO PARA PRODUCCIÓN

---

## 📋 CAMBIOS IMPLEMENTADOS FINALES:

### 1. ✅ Sistema de Permisos en Configuración
- Al crear/editar usuario puedes seleccionar qué módulos puede ver
- Checkboxes para: Dashboard, Menú, Pedidos, KDS, Cobro, Clientes, Cupones, Reportes, Configuración
- Los permisos se guardan en campo `permisos` (JSONB)
- El sidebar filtra automáticamente según permisos

### 2. ✅ Moneda Guaraníes (Gs)
- Añadida opción "Guaraníes (Gs)" en Configuración → Preferencias → Moneda
- Opciones disponibles: Euro (€), Dólar ($), Guaraníes (Gs)

### 3. ✅ Cronómetro KDS Reiniciable
- **NUEVO → PREPARANDO**: Cronómetro se reinicia desde 0
- **PREPARANDO → LISTO**: Cronómetro se reinicia desde 0
- Cada estado tiene su propio contador independiente
- Colores según tiempo: Verde (<15min), Amarillo (15-30min), Rojo (>30min)

---

## 🚀 PASOS PARA DEPLOY EN VERCEL:

### Paso 1: Preparar el Repositorio

```bash
# Inicializar Git (si no lo has hecho)
git init
git add .
git commit -m "CRM Restaurante completo - Listo para producción"

# Crear repositorio en GitHub y subir
git remote add origin <tu-repo-github>
git push -u origin main
```

### Paso 2: Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Click en "Add New" → "Project"
3. Import tu repositorio de GitHub
4. Vercel detectará automáticamente que es Next.js

### Paso 3: Configurar Variables de Entorno

En Vercel → Settings → Environment Variables, añade:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyorogaopywkkjlqfbfh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5b3JvZ2FvcHl3a2tqbHFmYmZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTI1NzgsImV4cCI6MjA3OTU4ODU3OH0.5a_2kFJY0x6ittzWQVoYPzB6o29UI4AEis2_tAklQrI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5b3JvZ2FvcHl3a2tqbHFmYmZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDAxMjU3OCwiZXhwIjoyMDc5NTg4NTc4fQ.MQU-U0LoIOjxC3iubj5AiaqNOrccGXV4zqNfUq73r-M
```

⚠️ **IMPORTANTE**: Aplica estas variables a **Production, Preview, y Development**

### Paso 4: Deploy

1. Click en "Deploy"
2. Espera 2-3 minutos
3. ¡Listo! Tu app estará en línea

### Paso 5: Verificar Deploy

Prueba estas páginas:
- `tu-dominio.vercel.app/login` ✓
- `tu-dominio.vercel.app/dashboard` ✓
- `tu-dominio.vercel.app/kds` ✓
- `tu-dominio.vercel.app/panel-desarrollador` ✓

---

## 🔑 CREDENCIALES PARA PRODUCCIÓN:

### Desarrollador:
```
Email: ever@gmail.com
Password: ever123
```

### Admin:
```
Email: admin@demo.com
Password: admin123
```

---

## ✅ CHECKLIST PRE-DEPLOY:

- [x] Variables de entorno configuradas
- [x] No hay localhost hardcodeado
- [x] Todas las páginas compilan sin errores
- [x] Supabase configurado correctamente
- [x] SQL ejecutado en Supabase
- [x] RLS deshabilitado o con políticas
- [x] Realtime habilitado en tabla orders
- [x] Sistema de permisos implementado
- [x] Moneda Guaraníes añadida
- [x] Cronómetro KDS funcionando
- [x] Responsive completo (móvil + desktop)

---

## 📱 FUNCIONALIDADES FINALES:

### Sistema de Permisos:
✅ Selector de permisos al crear usuario
✅ 9 módulos configurables
✅ Sidebar filtra según permisos
✅ Guardado en BD (campo permisos JSONB)

### Moneda:
✅ Euro (€)
✅ Dólar ($)
✅ Guaraníes (Gs) ← NUEVO

### Cronómetro KDS:
✅ Se reinicia en cada cambio de estado
✅ NUEVO: desde creación
✅ PREPARANDO: desde inicio preparación
✅ LISTO: desde tiempo listo
✅ Colores dinámicos según tiempo

### Responsive:
✅ Desktop: Sidebar fijo
✅ Móvil: Hamburger menu
✅ Panel Dev: Sin sidebar

---

## 🐛 TROUBLESHOOTING:

### Error: "Cannot find module..."
**Solución**: Verifica que todas las dependencias estén en package.json

### Error: "Missing environment variables"
**Solución**: Revisa que las 3 variables estén configuradas en Vercel

### Error: "Supabase connection failed"
**Solución**: Verifica las URLs y keys de Supabase

### Página en blanco
**Solución**: Revisa los logs en Vercel → Deployments → Logs

---

## 📊 MONITOREO POST-DEPLOY:

### En Vercel Dashboard:
- **Analytics**: Ver tráfico y performance
- **Logs**: Monitorear errores en tiempo real
- **Speed Insights**: Optimización de velocidad

### En Supabase Dashboard:
- **Database**: Ver actividad de BD
- **Auth**: Monitorear logins
- **Logs**: Ver queries y errores

---

## 🎯 PRÓXIMOS PASOS OPCIONALES:

1. **Dominio Custom**: Añadir tu propio dominio
2. **Analytics**: Configurar Google Analytics
3. **Monitoring**: Configurar Sentry para errores
4. **Backup**: Configurar backups automáticos en Supabase
5. **Performance**: Optimizar imágenes y caché

---

## 📝 NOTAS IMPORTANTES:

1. **Hot Reload**: Vercel tiene hot reload automático en cada push
2. **Preview Deploys**: Cada PR crea un preview automático
3. **Edge Functions**: Ya están optimizadas para edge
4. **SSL**: HTTPS automático incluido
5. **CDN**: Distribución global automática

---

## ✅ RESUMEN:

El sistema está **100% listo para producción** con:
- ✅ Sistema de permisos completo
- ✅ Moneda Guaraníes
- ✅ Cronómetro KDS reiniciable
- ✅ Responsive completo
- ✅ Sin errores de compilación
- ✅ Variables de entorno configuradas
- ✅ Compatible con Vercel

**¡Solo necesitas hacer git push y deploy en Vercel!** 🚀
