import { jsPDF } from 'jspdf'

/**
 * Generador de PDF para facturas pre-impresas paraguayas
 * Las medidas están en milímetros y corresponden a las posiciones exactas
 * donde se deben imprimir los datos sobre la factura pre-impresa
 */

// Configuración de posiciones (en mm desde la esquina superior izquierda)
const POSITIONS = {
  // Datos del cliente
  cliente: {
    nombre: { x: 35, y: 52 },      // Nombre o Razón Social
    ruc: { x: 35, y: 58 },          // RUC/C.I. N°
    telefono: { x: 35, y: 64 }      // Tel.
  },
  
  // Datos de la transacción
  fecha: { x: 160, y: 52 },         // Fecha de emisión
  condicionContado: { x: 160, y: 58 }, // Checkbox CONTADO
  condicionCredito: { x: 160, y: 61 }, // Checkbox CRÉDITO
  notaRemision: { x: 160, y: 67 },  // Nota de Remisión N°
  
  // Tabla de productos (primera fila empieza en Y)
  tabla: {
    inicioY: 80,
    altoFila: 6,
    columnas: {
      codigo: { x: 15, width: 20 },
      cantidad: { x: 35, width: 15 },
      descripcion: { x: 50, width: 65 },
      precioUnitario: { x: 115, width: 20 },
      valorVenta: { x: 135, width: 20 },
      exentas: { x: 155, width: 15 },
      iva5: { x: 170, width: 15 },
      iva10: { x: 185, width: 15 }
    }
  },
  
  // Totales (parte inferior)
  totales: {
    subtotal: { x: 155, y: 240 },
    liquidacionIva5: { x: 155, y: 246 },
    liquidacionIva10: { x: 155, y: 252 },
    totalIva: { x: 155, y: 258 },
    totalPagar: { x: 155, y: 264 }
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

  // ====== DATOS DEL CLIENTE ======
  if (facturaData.cliente) {
    // Nombre o Razón Social
    if (facturaData.cliente.nombre) {
      doc.text(facturaData.cliente.nombre.toUpperCase(), 
        POSITIONS.cliente.nombre.x, 
        POSITIONS.cliente.nombre.y
      )
    }

    // RUC/CI
    if (facturaData.cliente.ruc) {
      doc.text(facturaData.cliente.ruc, 
        POSITIONS.cliente.ruc.x, 
        POSITIONS.cliente.ruc.y
      )
    }

    // Teléfono
    if (facturaData.cliente.telefono) {
      doc.text(facturaData.cliente.telefono, 
        POSITIONS.cliente.telefono.x, 
        POSITIONS.cliente.telefono.y
      )
    }
  }

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

  // ====== CONDICIÓN DE VENTA ======
  if (facturaData.condicionVenta === 'CONTADO') {
    // Marcar checkbox CONTADO con una X
    doc.setFontSize(12)
    doc.text('X', POSITIONS.condicionContado.x, POSITIONS.condicionContado.y)
    doc.setFontSize(9)
  } else if (facturaData.condicionVenta === 'CREDITO') {
    // Marcar checkbox CRÉDITO con una X
    doc.setFontSize(12)
    doc.text('X', POSITIONS.condicionCredito.x, POSITIONS.condicionCredito.y)
    doc.setFontSize(9)
  }

  // ====== NOTA DE REMISIÓN ======
  if (facturaData.notaRemision) {
    doc.text(facturaData.notaRemision, 
      POSITIONS.notaRemision.x, 
      POSITIONS.notaRemision.y
    )
  }

  // ====== PRODUCTOS ======
  if (facturaData.items && facturaData.items.length > 0) {
    let currentY = POSITIONS.tabla.inicioY

    facturaData.items.forEach((item, index) => {
      // Código
      if (item.codigo) {
        doc.text(item.codigo.toString(), 
          POSITIONS.tabla.columnas.codigo.x, 
          currentY
        )
      }

      // Cantidad
      doc.text(item.cantidad.toString(), 
        POSITIONS.tabla.columnas.cantidad.x, 
        currentY
      )

      // Descripción (puede ser larga, recortar si es necesario)
      const descripcion = item.descripcion.substring(0, 50)
      doc.text(descripcion, 
        POSITIONS.tabla.columnas.descripcion.x, 
        currentY
      )

      // Precio Unitario (alineado a la derecha)
      const precioStr = formatearNumero(item.precioUnitario)
      doc.text(precioStr, 
        POSITIONS.tabla.columnas.precioUnitario.x + 18, 
        currentY, 
        { align: 'right' }
      )

      // Valor de Venta (alineado a la derecha)
      const valorStr = formatearNumero(item.valorVenta)
      doc.text(valorStr, 
        POSITIONS.tabla.columnas.valorVenta.x + 18, 
        currentY, 
        { align: 'right' }
      )

      // Columnas de IVA (según el tipo de IVA del item)
      if (item.tipoIva === 'EXENTA') {
        const exentaStr = formatearNumero(item.valorVenta)
        doc.text(exentaStr, 
          POSITIONS.tabla.columnas.exentas.x + 13, 
          currentY, 
          { align: 'right' }
        )
      } else if (item.tipoIva === 'IVA_5') {
        const iva5Str = formatearNumero(item.valorVenta)
        doc.text(iva5Str, 
          POSITIONS.tabla.columnas.iva5.x + 13, 
          currentY, 
          { align: 'right' }
        )
      } else if (item.tipoIva === 'IVA_10') {
        const iva10Str = formatearNumero(item.valorVenta)
        doc.text(iva10Str, 
          POSITIONS.tabla.columnas.iva10.x + 13, 
          currentY, 
          { align: 'right' }
        )
      }

      currentY += POSITIONS.tabla.altoFila
    })
  }

  // ====== TOTALES ======
  doc.setFont('helvetica', 'bold')

  // Subtotal
  if (facturaData.subtotal) {
    const subtotalStr = formatearNumero(facturaData.subtotal)
    doc.text(subtotalStr, 
      POSITIONS.totales.subtotal.x + 40, 
      POSITIONS.totales.subtotal.y, 
      { align: 'right' }
    )
  }

  // Liquidación IVA 5%
  if (facturaData.liquidacionIva5) {
    const iva5Str = formatearNumero(facturaData.liquidacionIva5)
    doc.text(iva5Str, 
      POSITIONS.totales.liquidacionIva5.x + 40, 
      POSITIONS.totales.liquidacionIva5.y, 
      { align: 'right' }
    )
  }

  // Liquidación IVA 10%
  if (facturaData.liquidacionIva10) {
    const iva10Str = formatearNumero(facturaData.liquidacionIva10)
    doc.text(iva10Str, 
      POSITIONS.totales.liquidacionIva10.x + 40, 
      POSITIONS.totales.liquidacionIva10.y, 
      { align: 'right' }
    )
  }

  // Total IVA
  if (facturaData.totalIva) {
    const totalIvaStr = formatearNumero(facturaData.totalIva)
    doc.text(totalIvaStr, 
      POSITIONS.totales.totalIva.x + 40, 
      POSITIONS.totales.totalIva.y, 
      { align: 'right' }
    )
  }

  // TOTAL A PAGAR
  if (facturaData.totalPagar) {
    const totalPagarStr = formatearNumero(facturaData.totalPagar)
    doc.setFontSize(11)
    doc.text(totalPagarStr, 
      POSITIONS.totales.totalPagar.x + 40, 
      POSITIONS.totales.totalPagar.y, 
      { align: 'right' }
    )
  }

  return doc.output('blob')
}

/**
 * Formatea un número con separador de miles y decimales
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
 * Calcula los totales de IVA de una factura
 * @param {Array} items - Items de la factura
 * @returns {Object} - Totales calculados
 */
export function calcularTotalesFactura(items) {
  let subtotal = 0
  let totalExentas = 0
  let totalIva5 = 0
  let totalIva10 = 0

  items.forEach(item => {
    const valorVenta = item.precioUnitario * item.cantidad
    subtotal += valorVenta

    if (item.tipoIva === 'EXENTA') {
      totalExentas += valorVenta
    } else if (item.tipoIva === 'IVA_5') {
      totalIva5 += valorVenta
    } else if (item.tipoIva === 'IVA_10') {
      totalIva10 += valorVenta
    }
  })

  // Calcular liquidación de IVA
  // Para IVA 5%: Base gravada / 21 (porque 100% + 5% = 105%, entonces base = total / 1.05, IVA = base * 0.05)
  const baseGravada5 = totalIva5 / 1.05
  const liquidacionIva5 = baseGravada5 * 0.05

  // Para IVA 10%: Base gravada / 11 (porque 100% + 10% = 110%, entonces base = total / 1.10, IVA = base * 0.10)
  const baseGravada10 = totalIva10 / 1.10
  const liquidacionIva10 = baseGravada10 * 0.10

  const totalIva = liquidacionIva5 + liquidacionIva10
  const totalPagar = subtotal

  return {
    subtotal: Math.round(subtotal),
    totalExentas: Math.round(totalExentas),
    totalIva5: Math.round(totalIva5),
    totalIva10: Math.round(totalIva10),
    liquidacionIva5: Math.round(liquidacionIva5),
    liquidacionIva10: Math.round(liquidacionIva10),
    totalIva: Math.round(totalIva),
    totalPagar: Math.round(totalPagar)
  }
}
