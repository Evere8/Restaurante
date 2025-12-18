import { jsPDF } from 'jspdf'
import { numeroALetras } from './numeroALetras'

/**
 * GENERADOR DE PDF PARA FACTURAS PRE-IMPRESAS PARAGUAYAS
 * ======================================================
 * 
 * ESPECIFICACIONES DE PÁGINA:
 * - Ancho: 140 mm
 * - Alto: 215 mm
 * 
 * MÁRGENES:
 * - Superior: 10 mm
 * - Izquierdo: 15 mm
 * - Derecho: 15 mm
 * 
 * ÁREA ÚTIL:
 * - Ancho útil: 110 mm
 * - Alto útil: 205 mm
 * 
 * COORDENADAS: Relativas al área útil (después de márgenes)
 * FUENTE: Helvetica
 * COLOR: Negro
 */

// Configuración de página
const PAGE = {
  width: 140,           // mm
  height: 215,          // mm
  marginTop: 10,        // mm
  marginLeft: 15,       // mm
  marginRight: 15,      // mm
  usableWidth: 110,     // mm (140 - 15 - 15)
  usableHeight: 205     // mm (215 - 10)
}

// Posiciones exactas según especificaciones (coordenadas relativas al área útil)
const POSITIONS = {
  // 1) FECHA DE EMISIÓN - X=90mm, Y=10mm, 9pt
  fecha: { x: 90, y: 10, fontSize: 9 },
  
  // 2) NOMBRE O RAZÓN SOCIAL - X=5mm, Y=18mm, 9pt
  clienteNombre: { x: 5, y: 18, fontSize: 9 },
  
  // 3) RUC / CI - X=5mm, Y=25mm, 9pt
  clienteRuc: { x: 5, y: 25, fontSize: 9 },
  
  // 4) CONDICIÓN DE VENTA "X" - X=55mm, Y=6mm, 10pt
  contadoX: { x: 55, y: 6, fontSize: 10 },
  
  // DETALLE DE CONSUMO
  tabla: {
    inicioY: 40,        // Y inicial = 40mm
    altoFila: 7,        // Alto por fila = 7mm
    columnas: {
      cantidad: { x: 3, fontSize: 9 },           // Cantidad
      descripcion: { x: 12, fontSize: 9 },       // Descripción
      precioUnitario: { x: 75, fontSize: 9 },    // Precio unitario (alineación derecha)
      exentas: { x: 85, fontSize: 9 },           // Exentas (siempre 0)
      iva5: { x: 95, fontSize: 9 },              // 5% (siempre 0)
      iva10: { x: 108, fontSize: 9 }             // 10% (alineación derecha)
    }
  },
  
  // SUBTOTAL 10% - X=108mm, Y=115mm
  subtotal10: { x: 108, y: 115, fontSize: 9 },
  
  // TOTAL EN LETRAS - X=5mm, Y=125mm, 9pt
  totalLetras: { x: 5, y: 125, fontSize: 9 },
  
  // LIQUIDACIÓN IVA 10% - X=108mm, Y=140mm
  liquidacionIva10: { x: 108, y: 140, fontSize: 9 },
  
  // TOTAL FINAL - X=108mm, Y=150mm, 10pt
  totalFinal: { x: 108, y: 150, fontSize: 10 }
}

/**
 * Formatea un número con separador de miles (formato paraguayo)
 * Ejemplo: 35000 → "35.000"
 */
function formatearNumero(numero) {
  if (numero === null || numero === undefined) return '0'
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(numero))
}

/**
 * Convierte coordenadas del área útil a coordenadas absolutas de página
 */
function toAbsolute(x, y) {
  return {
    x: PAGE.marginLeft + x,
    y: PAGE.marginTop + y
  }
}

/**
 * Genera el PDF con los datos de la factura
 * @param {Object} facturaData - Datos de la factura
 * @returns {Blob} - PDF como blob para descargar
 */
export function generarFacturaPDF(facturaData) {
  // Crear documento PDF con tamaño personalizado
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE.width, PAGE.height]
  })

  // Configurar fuente
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0) // Negro

  // =====================================
  // 1) FECHA DE EMISIÓN
  // =====================================
  if (facturaData.fecha) {
    const pos = toAbsolute(POSITIONS.fecha.x, POSITIONS.fecha.y)
    doc.setFontSize(POSITIONS.fecha.fontSize)
    const fecha = new Date(facturaData.fecha)
    const fechaStr = fecha.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    doc.text(fechaStr, pos.x, pos.y)
  }

  // =====================================
  // 2) NOMBRE O RAZÓN SOCIAL
  // =====================================
  if (facturaData.cliente?.nombre) {
    const pos = toAbsolute(POSITIONS.clienteNombre.x, POSITIONS.clienteNombre.y)
    doc.setFontSize(POSITIONS.clienteNombre.fontSize)
    doc.text(facturaData.cliente.nombre.toUpperCase(), pos.x, pos.y)
  }

  // =====================================
  // 3) RUC / CI
  // =====================================
  if (facturaData.cliente?.ruc) {
    const pos = toAbsolute(POSITIONS.clienteRuc.x, POSITIONS.clienteRuc.y)
    doc.setFontSize(POSITIONS.clienteRuc.fontSize)
    doc.text(facturaData.cliente.ruc, pos.x, pos.y)
  }

  // =====================================
  // 4) CONDICIÓN DE VENTA - "X" EN CONTADO
  // =====================================
  const posContado = toAbsolute(POSITIONS.contadoX.x, POSITIONS.contadoX.y)
  doc.setFontSize(POSITIONS.contadoX.fontSize)
  doc.text('X', posContado.x, posContado.y)

  // =====================================
  // DETALLE DE CONSUMO (TABLA DE ITEMS)
  // =====================================
  if (facturaData.items && facturaData.items.length > 0) {
    let currentY = POSITIONS.tabla.inicioY
    
    facturaData.items.forEach((item, index) => {
      const rowY = currentY + (index * POSITIONS.tabla.altoFila)
      
      // Cantidad
      const posCant = toAbsolute(POSITIONS.tabla.columnas.cantidad.x, rowY)
      doc.setFontSize(POSITIONS.tabla.columnas.cantidad.fontSize)
      doc.text(item.cantidad.toString(), posCant.x, posCant.y)
      
      // Descripción
      const posDesc = toAbsolute(POSITIONS.tabla.columnas.descripcion.x, rowY)
      doc.setFontSize(POSITIONS.tabla.columnas.descripcion.fontSize)
      const descripcion = item.descripcion.toLowerCase()
      doc.text(descripcion, posDesc.x, posDesc.y)
      
      // Precio Unitario (alineación derecha)
      const posPU = toAbsolute(POSITIONS.tabla.columnas.precioUnitario.x, rowY)
      doc.setFontSize(POSITIONS.tabla.columnas.precioUnitario.fontSize)
      doc.text(formatearNumero(item.precioUnitario), posPU.x, posPU.y, { align: 'right' })
      
      // Exentas (siempre 0)
      const posExentas = toAbsolute(POSITIONS.tabla.columnas.exentas.x, rowY)
      doc.setFontSize(POSITIONS.tabla.columnas.exentas.fontSize)
      doc.text('0', posExentas.x, posExentas.y)
      
      // 5% (siempre 0)
      const pos5 = toAbsolute(POSITIONS.tabla.columnas.iva5.x, rowY)
      doc.setFontSize(POSITIONS.tabla.columnas.iva5.fontSize)
      doc.text('0', pos5.x, pos5.y)
      
      // 10% (valor del item, alineación derecha)
      const pos10 = toAbsolute(POSITIONS.tabla.columnas.iva10.x, rowY)
      doc.setFontSize(POSITIONS.tabla.columnas.iva10.fontSize)
      const valorItem = item.precioUnitario * item.cantidad
      doc.text(formatearNumero(valorItem), pos10.x, pos10.y, { align: 'right' })
    })
  }

  // =====================================
  // CALCULAR TOTALES
  // =====================================
  const subtotal = facturaData.items?.reduce((sum, item) => 
    sum + (item.precioUnitario * item.cantidad), 0
  ) || 0

  // IVA 10% = Total / 11 (ley paraguaya)
  const iva10 = Math.round(subtotal / 11)

  // =====================================
  // SUBTOTAL 10%
  // =====================================
  const posSubtotal = toAbsolute(POSITIONS.subtotal10.x, POSITIONS.subtotal10.y)
  doc.setFontSize(POSITIONS.subtotal10.fontSize)
  doc.text(formatearNumero(subtotal), posSubtotal.x, posSubtotal.y, { align: 'right' })

  // =====================================
  // TOTAL EN LETRAS
  // =====================================
  const posTotalLetras = toAbsolute(POSITIONS.totalLetras.x, POSITIONS.totalLetras.y)
  doc.setFontSize(POSITIONS.totalLetras.fontSize)
  const totalEnLetras = numeroALetras(Math.round(subtotal)).toLowerCase()
  doc.text(totalEnLetras, posTotalLetras.x, posTotalLetras.y)

  // =====================================
  // LIQUIDACIÓN IVA 10%
  // =====================================
  const posLiqIva = toAbsolute(POSITIONS.liquidacionIva10.x, POSITIONS.liquidacionIva10.y)
  doc.setFontSize(POSITIONS.liquidacionIva10.fontSize)
  doc.text(formatearNumero(iva10), posLiqIva.x, posLiqIva.y, { align: 'right' })

  // =====================================
  // TOTAL FINAL
  // =====================================
  const posTotalFinal = toAbsolute(POSITIONS.totalFinal.x, POSITIONS.totalFinal.y)
  doc.setFontSize(POSITIONS.totalFinal.fontSize)
  doc.text(formatearNumero(subtotal), posTotalFinal.x, posTotalFinal.y, { align: 'right' })

  // Devolver como blob
  return doc.output('blob')
}

/**
 * Calcula los totales de una factura
 * @param {Array} items - Lista de items
 * @returns {Object} - Totales calculados
 */
export function calcularTotalesFactura(items) {
  const subtotal = items?.reduce((sum, item) => 
    sum + (item.precioUnitario * item.cantidad), 0
  ) || 0

  const iva10 = Math.round(subtotal / 11)

  return {
    subtotal: Math.round(subtotal),
    liquidacionIva10: iva10,
    totalIva: iva10,
    totalPagar: Math.round(subtotal)
  }
}
