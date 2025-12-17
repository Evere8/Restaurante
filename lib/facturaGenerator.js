import { jsPDF } from 'jspdf'
import { numeroALetras } from './numeroALetras'

/**
 * Generador de PDF para facturas pre-impresas paraguayas
 * Posiciones ajustadas EXACTAMENTE según PDF con marcas rojas/verdes
 * Coordenadas convertidas de puntos PDF a milímetros
 */

const POSITIONS = {
  // FECHA DE EMISIÓN (VERDE - correcto)
  // Posición en puntos: (200, 114) → Convertido a mm
  fecha: { x: 70, y: 40 },
  
  // DATOS DEL CLIENTE (VERDE - correcto)
  // Nombre: (222, 114) → Convertido a mm
  cliente: {
    nombre: { x: 78, y: 58 },
    // RUC: (244, 114) → Convertido a mm
    ruc: { x: 86, y: 67 }
  },
  
  // CONDICIÓN DE VENTA - X en CONTADO
  // "AQUI SI VA LA X" está en (768, 171)
  // Pero debe ir DENTRO del paréntesis de CONTADO
  // Basándome en el formato pre-impreso: CONTADO está en (153, 685)
  // Convertido a mm y ajustado para el paréntesis
  condicionContado: { x: 60, y: 49 },
  
  // TABLA DE PRODUCTOS (basado en marcas verdes)
  // Primera fila de productos empieza en Y: 332 puntos
  tabla: {
    inicioY: 117,  // 332 puntos → ~117mm
    altoFila: 8,   // Espaciado entre filas
    maxFilas: 10,
    columnas: {
      // Columna CANT está visible en (332, 139)
      cantidad: { x: 49 },
      // Descripción está en (332, 182) para "empanada"
      descripcion: { x: 64 },
      // Precio unitario está en (332, 555)
      precioUnitario: { x: 145 },
      // Columna 10% está en (332, 861)
      iva10: { x: 190 }
    }
  },
  
  // TOTALES (parte inferior)
  totales: {
    // Subtotal visible en (905, 861) para "35.000"
    subtotal: { x: 190, y: 320 },
    
    // "AQUI SI VA EL IVA" está en (924, 432) y (943, 432)
    // Liquidación IVA 10%
    liquidacionIva10: { x: 145, y: 326 },
    
    // Total IVA a la derecha
    totalIva: { x: 190, y: 326 },
    
    // TOTAL A PAGAR en (970, 861) para "35.000"
    totalPagar: { x: 190, y: 342 },
    
    // "AQUI COLOCAR EL TOTAL EN LETRAS" en (883, 307)
    totalPagarLetras: { x: 25, y: 311 }
  }
}

/**
 * Genera un PDF con los datos para imprimir sobre factura pre-impresa
 */
export function generarFacturaPDF(facturaData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  })

  doc.setFont('helvetica', 'normal')

  // ====== FECHA DE EMISIÓN (POSICIÓN CORRECTA EN VERDE) ======
  if (facturaData.fecha) {
    doc.setFontSize(9)
    const fecha = new Date(facturaData.fecha)
    const fechaStr = fecha.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    doc.text(fechaStr, POSITIONS.fecha.x, POSITIONS.fecha.y)
  }

  // ====== NOMBRE O RAZÓN SOCIAL (POSICIÓN CORRECTA EN VERDE) ======
  if (facturaData.cliente && facturaData.cliente.nombre) {
    doc.setFontSize(9)
    doc.text(facturaData.cliente.nombre.toUpperCase(), 
      POSITIONS.cliente.nombre.x, 
      POSITIONS.cliente.nombre.y
    )
  }

  // ====== RUC/C.I. N° (POSICIÓN CORRECTA EN VERDE) ======
  if (facturaData.cliente && facturaData.cliente.ruc) {
    doc.setFontSize(9)
    doc.text(facturaData.cliente.ruc, 
      POSITIONS.cliente.ruc.x, 
      POSITIONS.cliente.ruc.y
    )
  }

  // ====== CONDICIÓN DE VENTA - X en CONTADO (POSICIÓN CORRECTA) ======
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('X', POSITIONS.condicionContado.x, POSITIONS.condicionContado.y)
  doc.setFont('helvetica', 'normal')

  // ====== PRODUCTOS (máximo 10) ======
  if (facturaData.items && facturaData.items.length > 0) {
    doc.setFontSize(9)
    let currentY = POSITIONS.tabla.inicioY
    const maxItems = Math.min(facturaData.items.length, POSITIONS.tabla.maxFilas)

    for (let i = 0; i < maxItems; i++) {
      const item = facturaData.items[i]

      // Cantidad (ejemplo en verde: "3" en primera fila)
      doc.text(item.cantidad.toString(), 
        POSITIONS.tabla.columnas.cantidad.x, 
        currentY,
        { align: 'center' }
      )

      // Descripción (ejemplo en verde: "empanada")
      const descripcion = item.descripcion.substring(0, 40).toUpperCase()
      doc.text(descripcion, 
        POSITIONS.tabla.columnas.descripcion.x, 
        currentY
      )

      // Precio Unitario (ejemplo en verde: "5.000")
      const precioStr = formatearNumero(item.precioUnitario)
      doc.text(precioStr, 
        POSITIONS.tabla.columnas.precioUnitario.x, 
        currentY, 
        { align: 'right' }
      )

      // Columna 10% (ejemplo en verde: "15.000")
      const totalProducto = item.precioUnitario * item.cantidad
      const totalStr = formatearNumero(totalProducto)
      doc.text(totalStr, 
        POSITIONS.tabla.columnas.iva10.x, 
        currentY, 
        { align: 'right' }
      )

      currentY += POSITIONS.tabla.altoFila
    }
  }

  // ====== CALCULAR TOTALES ======
  const subtotal = facturaData.items.reduce((sum, item) => 
    sum + (item.precioUnitario * item.cantidad), 0
  )

  // Total IVA 10% = Total / 11 (ley paraguaya)
  const totalIva10 = Math.round(subtotal / 11)
  const totalIva = totalIva10

  // ====== TOTALES (POSICIONES SEGÚN VERDE) ======
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)

  // Sub Total (ejemplo verde: "35.000" en posición 905, 861)
  doc.text(formatearNumero(Math.round(subtotal)), 
    POSITIONS.totales.subtotal.x, 
    POSITIONS.totales.subtotal.y, 
    { align: 'right' }
  )

  // Liquidación IVA 10% (AQUI SI VA EL IVA - posición 924, 432)
  doc.text(formatearNumero(totalIva10), 
    POSITIONS.totales.liquidacionIva10.x, 
    POSITIONS.totales.liquidacionIva10.y, 
    { align: 'right' }
  )

  // Total IVA (a la derecha - posición 943, 432)
  doc.text(formatearNumero(totalIva), 
    POSITIONS.totales.totalIva.x, 
    POSITIONS.totales.totalIva.y, 
    { align: 'right' }
  )

  // TOTAL A PAGAR (ejemplo verde: "35.000" en posición 970, 861)
  doc.setFontSize(12)
  doc.text(formatearNumero(Math.round(subtotal)), 
    POSITIONS.totales.totalPagar.x, 
    POSITIONS.totales.totalPagar.y, 
    { align: 'right' }
  )

  // Total en LETRAS (AQUI COLOCAR EL TOTAL EN LETRAS - posición 883, 307)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const totalEnLetras = numeroALetras(Math.round(subtotal))
  doc.text(totalEnLetras, 
    POSITIONS.totales.totalPagarLetras.x, 
    POSITIONS.totales.totalPagarLetras.y
  )

  return doc.output('blob')
}

/**
 * Formatea un número con separador de miles
 */
function formatearNumero(numero) {
  if (!numero) return '0'
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numero)
}

/**
 * Calcula los totales de IVA
 */
export function calcularTotalesFactura(items) {
  const subtotal = items.reduce((sum, item) => 
    sum + (item.precioUnitario * item.cantidad), 0
  )

  const totalIva10 = Math.round(subtotal / 11)
  const totalIva = totalIva10

  return {
    subtotal: Math.round(subtotal),
    liquidacionIva10: totalIva10,
    totalIva: totalIva,
    totalPagar: Math.round(subtotal)
  }
}
