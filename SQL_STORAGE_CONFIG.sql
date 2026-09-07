-- ==============================================
-- CONFIGURACIÓN DE SUPABASE STORAGE PARA IMÁGENES
-- Ejecutar en Supabase SQL Editor
-- ==============================================

-- 1. Crear bucket público para imágenes (si no existe)
-- Ve a Storage en Supabase Dashboard y crea un bucket llamado "imagenes" con las siguientes configuraciones:
-- - Nombre: imagenes
-- - Public: YES (activar)
-- - Allowed MIME types: image/png, image/jpeg, image/gif, image/webp

-- 2. Política para permitir lectura pública
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagenes',
  'imagenes',
  true,
  5242880, -- 5MB máximo
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- 3. Política de acceso para lectura (todos pueden ver)
DROP POLICY IF EXISTS "Permitir lectura pública imagenes" ON storage.objects;
CREATE POLICY "Permitir lectura pública imagenes"
ON storage.objects FOR SELECT
USING (bucket_id = 'imagenes');

-- 4. Política para subir imágenes (usuarios autenticados)
DROP POLICY IF EXISTS "Permitir subir imagenes" ON storage.objects;
CREATE POLICY "Permitir subir imagenes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'imagenes');

-- 5. Política para actualizar/eliminar (usuarios autenticados)
DROP POLICY IF EXISTS "Permitir actualizar imagenes" ON storage.objects;
CREATE POLICY "Permitir actualizar imagenes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'imagenes');

DROP POLICY IF EXISTS "Permitir eliminar imagenes" ON storage.objects;
CREATE POLICY "Permitir eliminar imagenes"
ON storage.objects FOR DELETE
USING (bucket_id = 'imagenes');

-- ==============================================
-- INSTRUCCIONES MANUALES EN SUPABASE DASHBOARD:
-- ==============================================
-- 1. Ve a Storage en el menú izquierdo
-- 2. Haz clic en "New bucket"
-- 3. Nombre: imagenes
-- 4. Marca "Public bucket" como activado
-- 5. Guarda
-- 6. Luego ve a "Policies" del bucket y agrega:
--    - Para SELECT: Allow access to everyone
--    - Para INSERT: Allow access to authenticated users
--    - Para UPDATE/DELETE: Allow access to authenticated users
-- ==============================================
