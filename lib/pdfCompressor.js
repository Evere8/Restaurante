/**
 * Utilidad para comprimir PDFs en el navegador
 * Convierte cada página a imagen JPEG comprimida y reconstruye el PDF
 * 
 * Compatible con pdfjs-dist v3.11.174 y Next.js
 */

// Cache para módulos cargados
let cachedPdfLib = null
let cachedPdfJs = null

/**
 * Comprime un archivo PDF convirtiéndolo a imágenes JPEG
 * Optimizado para reducir PDFs grandes (60MB+) a menos de 10MB
 * 
 * @param {File|Blob} file - Archivo PDF a comprimir
 * @param {Object} options - Opciones de compresión
 * @param {number} options.quality - Calidad JPEG (0.1 a 1.0, default: 0.5)
 * @param {number} options.scale - Escala de renderizado (0.5 a 2.0, default: 0.8)
 * @param {number} options.maxSizeMB - Tamaño máximo en MB (default: 9)
 * @param {function} options.onProgress - Callback de progreso (0-100)
 * @returns {Promise<{blob: Blob, originalSize: number, compressedSize: number, reduction: number, wasCompressed: boolean}>}
 */
export async function compressPDF(file, options = {}) {
  const {
    quality = 0.5,
    scale = 0.8,
    maxSizeMB = 9,
    onProgress = () => {}
  } = options

  const originalSize = file.size
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  // Si el archivo ya es pequeño, no comprimir
  if (originalSize <= maxSizeBytes) {
    return {
      blob: file,
      originalSize,
      compressedSize: originalSize,
      reduction: 0,
      wasCompressed: false
    }
  }

  // Verificar que estamos en el navegador
  if (typeof window === 'undefined') {
    throw new Error('PDF compression only works in the browser')
  }

  onProgress(5)

  try {
    // Cargar pdf-lib dinámicamente
    if (!cachedPdfLib) {
      const pdfLibModule = await import('pdf-lib')
      cachedPdfLib = pdfLibModule.PDFDocument
    }
    const PDFDocument = cachedPdfLib

    onProgress(8)

    // Cargar pdfjs-dist v3.x dinámicamente
    if (!cachedPdfJs) {
      cachedPdfJs = await import('pdfjs-dist')
      // Configurar worker para v3.x usando CDN
      cachedPdfJs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }
    const pdfjs = cachedPdfJs

    onProgress(10)

    // Leer el archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    onProgress(15)

    // Cargar el PDF con pdf.js
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
    const pdfDoc = await loadingTask.promise
    const numPages = pdfDoc.numPages

    onProgress(20)

    // Calcular parámetros óptimos basados en el tamaño del archivo
    let optimalScale = scale
    let optimalQuality = quality
    
    const sizeMB = originalSize / (1024 * 1024)
    
    // Ajustar parámetros según el tamaño del archivo
    if (sizeMB > 50) { // > 50MB - compresión muy agresiva
      optimalScale = 0.55
      optimalQuality = 0.30
    } else if (sizeMB > 30) { // > 30MB
      optimalScale = 0.60
      optimalQuality = 0.35
    } else if (sizeMB > 20) { // > 20MB
      optimalScale = 0.65
      optimalQuality = 0.40
    } else if (sizeMB > 10) { // > 10MB
      optimalScale = 0.75
      optimalQuality = 0.45
    }

    console.log(`Comprimiendo PDF: ${sizeMB.toFixed(2)}MB, ${numPages} páginas`)
    console.log(`Parámetros: escala=${optimalScale}, calidad=${optimalQuality}`)

    // Crear nuevo documento PDF
    const newPdfDoc = await PDFDocument.create()

    // Procesar cada página
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale: optimalScale })

      // Crear canvas para renderizar la página
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)

      // Renderizar la página en el canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise

      // Convertir canvas a imagen JPEG comprimida
      const jpegDataUrl = canvas.toDataURL('image/jpeg', optimalQuality)
      const jpegBase64 = jpegDataUrl.split(',')[1]
      const jpegBytes = Uint8Array.from(atob(jpegBase64), c => c.charCodeAt(0))

      // Agregar imagen al nuevo PDF
      const jpegImage = await newPdfDoc.embedJpg(jpegBytes)
      const newPage = newPdfDoc.addPage([canvas.width, canvas.height])
      newPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height
      })

      // Limpiar canvas para liberar memoria
      canvas.width = 0
      canvas.height = 0

      // Actualizar progreso
      const progress = 20 + Math.round((pageNum / numPages) * 70)
      onProgress(progress)
      
      // Log de progreso cada 5 páginas
      if (pageNum % 5 === 0 || pageNum === numPages) {
        console.log(`Procesadas ${pageNum}/${numPages} páginas`)
      }
    }

    onProgress(95)

    // Guardar el nuevo PDF
    const compressedPdfBytes = await newPdfDoc.save()
    const compressedBlob = new Blob([compressedPdfBytes], { type: 'application/pdf' })
    const compressedSize = compressedBlob.size

    onProgress(100)

    const reduction = Math.round((1 - compressedSize / originalSize) * 100)

    console.log(`Compresión completada: ${sizeMB.toFixed(2)}MB -> ${(compressedSize/1024/1024).toFixed(2)}MB (${reduction}% reducción)`)

    // Si aún es muy grande, intentar con menor calidad (recursivo)
    if (compressedSize > maxSizeBytes && optimalQuality > 0.15) {
      console.log(`PDF aún muy grande (${(compressedSize/1024/1024).toFixed(2)}MB), reintentando...`)
      return compressPDF(file, {
        ...options,
        quality: Math.max(0.15, optimalQuality - 0.1),
        scale: Math.max(0.4, optimalScale - 0.05),
        onProgress
      })
    }

    return {
      blob: compressedBlob,
      originalSize,
      compressedSize,
      reduction,
      wasCompressed: true
    }
  } catch (error) {
    console.error('Error comprimiendo PDF:', error)
    throw new Error('No se pudo comprimir el PDF: ' + error.message)
  }
}

/**
 * Formatea bytes a string legible
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
