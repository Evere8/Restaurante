import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabase'

/**
 * Comprime y sube una imagen al bucket "imagenes" de Supabase Storage.
 * Devuelve { url, error }
 *
 * @param {File} file       - archivo seleccionado por el usuario
 * @param {string} folder   - carpeta dentro del bucket (ej: 'productos', 'logos')
 * @param {string} prefix   - prefijo del nombre de archivo (ej: restaurantId)
 * @param {object} options  - opciones de compresión
 */
export async function compressAndUploadImage(file, folder = 'productos', prefix = '', options = {}) {
  if (!file) return { url: null, error: 'No se proporcionó archivo' }

  // Validaciones básicas
  if (!file.type.startsWith('image/')) {
    return { url: null, error: 'El archivo debe ser una imagen' }
  }

  const compressionOptions = {
    maxSizeMB: 0.4,           // ~400KB máximo
    maxWidthOrHeight: 1200,   // Suficiente para vista previa y zoom
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.82,
    ...options
  }

  try {
    // Comprimir
    let compressed = file
    if (file.size > 50 * 1024) { // solo comprime si > 50KB
      compressed = await imageCompression(file, compressionOptions)
    }

    // Subir a Supabase Storage
    const safePrefix = prefix ? `${prefix}-` : ''
    const fileExt = 'jpg' // forzamos jpg porque comprimimos a jpeg
    const fileName = `${safePrefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('imagenes')
      .upload(filePath, compressed, {
        upsert: true,
        contentType: 'image/jpeg'
      })

    if (uploadError) {
      console.error('Error subiendo imagen:', uploadError)
      return { url: null, error: uploadError.message || 'Error al subir imagen' }
    }

    const { data: urlData } = supabase.storage
      .from('imagenes')
      .getPublicUrl(filePath)

    return { url: urlData.publicUrl, error: null }
  } catch (err) {
    console.error('Error comprimiendo/subiendo imagen:', err)
    return { url: null, error: err.message || 'Error procesando imagen' }
  }
}
