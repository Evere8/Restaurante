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
 * 
 * Las coordenadas son ABSOLUTAS desde la esquina superior izquierda
 */

// Configuración de página
const PAGE = {
  width: 140,    // mm
  height: 215    // mm
}

// =============================================================
// CONFIGURACIÓN DE POSICIONES - AJUSTAR ESTOS VALORES
// Todas las coordenadas son en mm desde esquina superior izquierda
// =============================================================
export const DEFAULT_CONFIG = {
  // FECHA DE EMISIÓN
  fecha: { x: 105, y: 20, fontSize: 9 },
  
  // NOMBRE DEL CLIENTE  
  clienteNombre: { x: 20, y: 28, fontSize: 9 },
  
  // RUC / CI DEL CLIENTE
  clienteRuc: { x: 20, y: 35, fontSize: 9 },
  
  // "X" DE CONTADO (dentro del paréntesis)
  contadoX: { x: 70, y: 16, fontSize: 10 },
  
  // TABLA DE ITEMS
  tabla: {
    inicioY: 50,           // Y donde empieza la primera fila
    altoFila: 7,           // Separación entre filas
    columnas: {
      cantidad: { x: 18 },      // Columna CANT
      descripcion: { x: 27 },   // Columna DESCRIPCIÓN  
      precioUnitario: { x: 90 }, // Columna Precio Unit (alinear derecha)
      exentas: { x: 100 },      // Columna Exentas
      iva5: { x: 110 },         // Columna 5%
      iva10: { x: 123 }         // Columna 10% (alinear derecha)
    }
  },
  
  // SUBTOTAL (columna 10%)
  subtotal10: { x: 123, y: 125 },
  
  // TOTAL EN LETRAS
  totalLetras: { x: 20, y: 135, fontSize: 8 },
  
  // LIQUIDACIÓN IVA 10%
  liquidacionIva10: { x: 123, y: 150 },
  
  // TOTAL FINAL
  totalFinal: { x: 123, y: 160, fontSize: 10 }
}

/**
 * Formatea un número con separador de miles (formato paraguayo)
 */
function formatearNumero(numero) {
  if (numero === null || numero === undefined) return '0'
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(numero))
}

/**
 * Genera el PDF con los datos de la factura
 * @param {Object} facturaData - Datos de la factura
 * @param {Object} config - Configuración de posiciones (opcional)
 * @returns {Blob} - PDF como blob para descargar
 */
export function generarFacturaPDF(facturaData, config = DEFAULT_CONFIG) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  
  // Crear documento PDF con tamaño personalizado
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE.width, PAGE.height]
  })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  // 1) FECHA DE EMISIÓN
  if (facturaData.fecha) {
    doc.setFontSize(cfg.fecha.fontSize || 9)
    const fecha = new Date(facturaData.fecha)
    const fechaStr = fecha.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    doc.text(fechaStr, cfg.fecha.x, cfg.fecha.y)
  }

  // 2) NOMBRE DEL CLIENTE
  if (facturaData.cliente?.nombre) {
    doc.setFontSize(cfg.clienteNombre.fontSize || 9)
    doc.text(facturaData.cliente.nombre.toUpperCase(), cfg.clienteNombre.x, cfg.clienteNombre.y)
  }

  // 3) RUC / CI
  if (facturaData.cliente?.ruc) {
    doc.setFontSize(cfg.clienteRuc.fontSize || 9)
    doc.text(facturaData.cliente.ruc, cfg.clienteRuc.x, cfg.clienteRuc.y)
  }

  // 4) "X" DE CONTADO
  doc.setFontSize(cfg.contadoX.fontSize || 10)
  doc.text('X', cfg.contadoX.x, cfg.contadoX.y)

  // 5) TABLA DE ITEMS
  if (facturaData.items && facturaData.items.length > 0) {
    doc.setFontSize(9)
    
    facturaData.items.forEach((item, index) => {
      const rowY = cfg.tabla.inicioY + (index * cfg.tabla.altoFila)
      
      // Cantidad
      doc.text(item.cantidad.toString(), cfg.tabla.columnas.cantidad.x, rowY)
      
      // Descripción
      doc.text(item.descripcion.toLowerCase(), cfg.tabla.columnas.descripcion.x, rowY)
      
      // Precio Unitario (alineado derecha)
      doc.text(formatearNumero(item.precioUnitario), cfg.tabla.columnas.precioUnitario.x, rowY, { align: 'right' })
      
      // Exentas = 0
      doc.text('0', cfg.tabla.columnas.exentas.x, rowY)
      
      // 5% = 0
      doc.text('0', cfg.tabla.columnas.iva5.x, rowY)
      
      // 10% = valor total del item (alineado derecha)
      const valorItem = item.precioUnitario * item.cantidad
      doc.text(formatearNumero(valorItem), cfg.tabla.columnas.iva10.x, rowY, { align: 'right' })
    })
  }

  // CALCULAR TOTALES
  const subtotal = facturaData.items?.reduce((sum, item) => 
    sum + (item.precioUnitario * item.cantidad), 0
  ) || 0
  const iva10 = Math.round(subtotal / 11)

  // 6) SUBTOTAL 10%
  doc.setFontSize(9)
  doc.text(formatearNumero(subtotal), cfg.subtotal10.x, cfg.subtotal10.y, { align: 'right' })

  // 7) TOTAL EN LETRAS
  doc.setFontSize(cfg.totalLetras.fontSize || 8)
  const totalEnLetras = numeroALetras(Math.round(subtotal)).toLowerCase()
  doc.text(totalEnLetras, cfg.totalLetras.x, cfg.totalLetras.y)

  // 8) LIQUIDACIÓN IVA 10%
  doc.setFontSize(9)
  doc.text(formatearNumero(iva10), cfg.liquidacionIva10.x, cfg.liquidacionIva10.y, { align: 'right' })

  // 9) TOTAL FINAL
  doc.setFontSize(cfg.totalFinal.fontSize || 10)
  doc.text(formatearNumero(subtotal), cfg.totalFinal.x, cfg.totalFinal.y, { align: 'right' })

  return doc.output('blob')
}

/**
 * Calcula los totales de una factura
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
