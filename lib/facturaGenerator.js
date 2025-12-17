import { jsPDF } from 'jspdf'
import { numeroALetras } from './numeroALetras'

/**
 * Generador de PDF para facturas pre-impresas paraguayas
 * Posiciones ajustadas EXACTAMENTE según factura de referencia
 * Coordenadas convertidas de píxeles a milímetros (1mm ≈ 3.78px)
 */

const POSITIONS = {
  // Fecha de emisión (arriba a la derecha)
  fecha: { x: 153, y: 57 },
  
  // Datos del cliente (lado izquierdo)
  cliente: {
    nombre: { x: 55, y: 75 },      // Nombre o Razón Social
    ruc: { x: 55, y: 83 }           // RUC/C.I. N°
  },
  
  // Condición de venta - X dentro del paréntesis
  condicionContado: { x: 97, y: 53 },
  
  // Tabla de productos
  tabla: {
    inicioY: 97,
    altoFila: 6,
    maxFilas: 10,
    columnas: {
      cantidad: { x: 39 },          // CANT
      descripcion: { x: 87 },       // DESCRIPCIÓN
      precioUnitario: { x: 139 },   // Precio Unitario
      iva10: { x: 178 }             // Columna 10%
    }
  },
  
  // Totales (parte inferior derecha)
  totales: {
    subtotal: { x: 180, y: 232 },           // Sub Total
    liquidacionIva10: { x: 153, y: 239 },   // Liquidación IVA 10%
    totalIva: { x: 206, y: 239 },           // Total IVA
    totalPagar: { x: 180, y: 250 },         // TOTAL A PAGAR (número)
    totalPagarLetras: { x: 25, y: 257 }     // Total en letras
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

  // ====== FECHA DE EMISIÓN ======
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

  // ====== NOMBRE O RAZÓN SOCIAL ======
  if (facturaData.cliente && facturaData.cliente.nombre) {
    doc.setFontSize(9)
    doc.text(facturaData.cliente.nombre.toUpperCase(), 
      POSITIONS.cliente.nombre.x, 
      POSITIONS.cliente.nombre.y
    )
  }

  // ====== RUC/C.I. N° ======
  if (facturaData.cliente && facturaData.cliente.ruc) {
    doc.setFontSize(9)
    doc.text(facturaData.cliente.ruc, 
      POSITIONS.cliente.ruc.x, 
      POSITIONS.cliente.ruc.y
    )
  }

  // ====== CONDICIÓN DE VENTA - X en CONTADO ======
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

      // Cantidad
      doc.text(item.cantidad.toString(), 
        POSITIONS.tabla.columnas.cantidad.x, 
        currentY,
        { align: 'center' }
      )

      // Descripción (máximo 35 caracteres)
      const descripcion = item.descripcion.substring(0, 35).toUpperCase()
      doc.text(descripcion, 
        POSITIONS.tabla.columnas.descripcion.x, 
        currentY
      )

      // Precio Unitario (alineado derecha)
      const precioStr = formatearNumero(item.precioUnitario)
      doc.text(precioStr, 
        POSITIONS.tabla.columnas.precioUnitario.x + 30, 
        currentY, 
        { align: 'right' }
      )

      // Columna 10% - Total del producto
      const totalProducto = item.precioUnitario * item.cantidad
      const totalStr = formatearNumero(totalProducto)
      doc.text(totalStr, 
        POSITIONS.tabla.columnas.iva10.x + 25, 
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

  // Total IVA 10% = Total / 11 (según leyes de Paraguay)
  const totalIva10 = Math.round(subtotal / 11)
  
  // Total IVA = mismo valor
  const totalIva = totalIva10

  // ====== TOTALES ======
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)

  // Sub Total
  doc.text(formatearNumero(Math.round(subtotal)), 
    POSITIONS.totales.subtotal.x, 
    POSITIONS.totales.subtotal.y, 
    { align: 'right' }
  )

  // Liquidación IVA 10%
  doc.text(formatearNumero(totalIva10), 
    POSITIONS.totales.liquidacionIva10.x, 
    POSITIONS.totales.liquidacionIva10.y, 
    { align: 'right' }
  )

  // Total IVA (a la derecha de Liquidación)
  doc.text(formatearNumero(totalIva), 
    POSITIONS.totales.totalIva.x, 
    POSITIONS.totales.totalIva.y, 
    { align: 'right' }
  )

  // TOTAL A PAGAR (más grande)
  doc.setFontSize(12)
  doc.text(formatearNumero(Math.round(subtotal)), 
    POSITIONS.totales.totalPagar.x, 
    POSITIONS.totales.totalPagar.y, 
    { align: 'right' }
  )

  // Total en LETRAS
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
