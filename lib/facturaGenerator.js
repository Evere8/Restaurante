import { jsPDF } from 'jspdf'

/**
 * Generador de PDF para facturas pre-impresas paraguayas
 * Posiciones ajustadas EXACTAMENTE según la factura de referencia
 */

// Configuración de posiciones (en mm desde la esquina superior izquierda)
const POSITIONS = {
  // Fecha de emisión
  fecha: { x: 155, y: 52 },
  
  // Datos del cliente
  cliente: {
    nombre: { x: 25, y: 64 },      // Nombre o Razón Social
  },
  
  // Condición de venta - X dentro del paréntesis de CONTADO
  condicionContado: { x: 148, y: 74 },
  
  // Tabla de productos
  tabla: {
    inicioY: 95,
    altoFila: 6,
    maxFilas: 10,
    columnas: {
      codigo: { x: 15 },          // Dejar vacío
      cantidad: { x: 30 },
      descripcion: { x: 45 },
      precioUnitario: { x: 110 },
      iva10: { x: 175 }            // Solo columna 10%
    }
  },
  
  // Totales (parte inferior derecha)
  totales: {
    subtotal: { x: 180, y: 232 },           // Sub total
    liquidacionIva10: { x: 180, y: 238 },   // Liquidación IVA 10%
    totalIva: { x: 180, y: 244 },           // Total IVA
    totalPagar: { x: 180, y: 255 }          // TOTAL A PAGAR
  }
}

/**
 * Genera un PDF con los datos para imprimir sobre factura pre-impresa
 * @param {Object} facturaData - Datos de la factura
 * @returns {Blob} - PDF generado
 */
export function generarFacturaPDF(facturaData) {
  // Crear PDF tamaño carta (216mm x 279mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  })

  // Configurar fuente
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // ====== FECHA DE EMISIÓN ======
  if (facturaData.fecha) {
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
    doc.text(facturaData.cliente.nombre.toUpperCase(), 
      POSITIONS.cliente.nombre.x, 
      POSITIONS.cliente.nombre.y
    )
  }

  // ====== CONDICIÓN DE VENTA - X en CONTADO ======
  // Siempre marca CONTADO con una X
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('X', POSITIONS.condicionContado.x, POSITIONS.condicionContado.y)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // ====== PRODUCTOS (máximo 10) ======
  if (facturaData.items && facturaData.items.length > 0) {
    let currentY = POSITIONS.tabla.inicioY
    const maxItems = Math.min(facturaData.items.length, POSITIONS.tabla.maxFilas)

    for (let i = 0; i < maxItems; i++) {
      const item = facturaData.items[i]

      // Cantidad (alineado al centro)
      doc.text(item.cantidad.toString(), 
        POSITIONS.tabla.columnas.cantidad.x, 
        currentY,
        { align: 'center' }
      )

      // Descripción (máximo 50 caracteres)
      const descripcion = item.descripcion.substring(0, 50)
      doc.text(descripcion, 
        POSITIONS.tabla.columnas.descripcion.x, 
        currentY
      )

      // Precio Unitario (alineado a la derecha)
      const precioStr = formatearNumero(item.precioUnitario)
      doc.text(precioStr, 
        POSITIONS.tabla.columnas.precioUnitario.x + 20, 
        currentY, 
        { align: 'right' }
      )

      // Columna 10% - Total del producto (precio * cantidad)
      const totalProducto = item.precioUnitario * item.cantidad
      const totalStr = formatearNumero(totalProducto)
      doc.text(totalStr, 
        POSITIONS.tabla.columnas.iva10.x + 20, 
        currentY, 
        { align: 'right' }
      )

      currentY += POSITIONS.tabla.altoFila
    }
  }

  // ====== CALCULAR TOTALES ======
  // Total de la columna 10% (suma de todos los productos)
  const subtotal = facturaData.items.reduce((sum, item) => 
    sum + (item.precioUnitario * item.cantidad), 0
  )

  // Liquidación IVA 10% = Base Gravada * 10%
  // Base Gravada = Total / 1.10 (porque el precio ya incluye IVA)
  const baseGravada = subtotal / 1.10
  const liquidacionIva10 = baseGravada * 0.10

  // Total IVA = Liquidación IVA 10%
  const totalIva = liquidacionIva10

  // ====== TOTALES ======
  doc.setFont('helvetica', 'bold')

  // Subtotal (en la primera línea)
  doc.text(formatearNumero(Math.round(subtotal)), 
    POSITIONS.totales.subtotal.x, 
    POSITIONS.totales.subtotal.y, 
    { align: 'right' }
  )

  // Liquidación IVA 10%
  doc.text(formatearNumero(Math.round(liquidacionIva10)), 
    POSITIONS.totales.liquidacionIva10.x, 
    POSITIONS.totales.liquidacionIva10.y, 
    { align: 'right' }
  )

  // Total IVA (mismo que liquidación IVA 10%)
  doc.text(formatearNumero(Math.round(totalIva)), 
    POSITIONS.totales.totalIva.x, 
    POSITIONS.totales.totalIva.y, 
    { align: 'right' }
  )

  // TOTAL A PAGAR (más grande y destacado)
  doc.setFontSize(12)
  doc.text(formatearNumero(Math.round(subtotal)), 
    POSITIONS.totales.totalPagar.x, 
    POSITIONS.totales.totalPagar.y, 
    { align: 'right' }
  )

  return doc.output('blob')
}

/**
 * Formatea un número con separador de miles (estilo paraguayo)
 * @param {number} numero
 * @returns {string}
 */
function formatearNumero(numero) {
  if (!numero) return '0'
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numero)
}

/**
 * Calcula los totales de IVA de una factura (NO SE USA, se calcula directo en generarFacturaPDF)
 * @param {Array} items - Items de la factura
 * @returns {Object} - Totales calculados
 */
export function calcularTotalesFactura(items) {
  const subtotal = items.reduce((sum, item) => 
    sum + (item.precioUnitario * item.cantidad), 0
  )

  const baseGravada10 = subtotal / 1.10
  const liquidacionIva10 = baseGravada10 * 0.10
  const totalIva = liquidacionIva10

  return {
    subtotal: Math.round(subtotal),
    liquidacionIva10: Math.round(liquidacionIva10),
    totalIva: Math.round(totalIva),
    totalPagar: Math.round(subtotal)
  }
}
