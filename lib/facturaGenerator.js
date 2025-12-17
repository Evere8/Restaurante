import { jsPDF } from 'jspdf'
import { numeroALetras } from './numeroALetras'

/**
 * GENERADOR DE PDF PARA FACTURAS PRE-IMPRESAS PARAGUAYAS
 * ======================================================
 * 
 * Este archivo genera SOLO los datos variables para imprimir
 * sobre formularios de factura pre-impresos.
 * 
 * TAMAÑO: Carta (Letter) = 216mm x 279mm
 * COORDENADAS: jsPDF usa origen en esquina SUPERIOR IZQUIERDA
 * 
 * ESTRUCTURA TÍPICA DE FACTURA PARAGUAYA PRE-IMPRESA:
 * ---------------------------------------------------
 * [0-40mm]   Encabezado: Logo, datos del emisor, timbrado
 * [40-55mm]  FECHA DE EMISIÓN (derecha)
 * [55-85mm]  Datos del cliente: Nombre, RUC, Dirección, Condición Venta
 * [85-200mm] Tabla de productos
 * [200-260mm] Totales, IVA, Total en letras
 * 
 * AJUSTES BASADOS EN PDF ANOTADO DEL USUARIO:
 * - "aqui si va la fecha" = fecha debe ir en zona correcta
 * - "aqui si va la X" = X de CONTADO en su paréntesis
 * - "AQUI SI VA EL IVA" = liquidación IVA en zona correcta
 * - "AQUI COLOCAR EL TOTAL EN LETRAS" = total en palabras
 */

// ============================================================
// CONFIGURACIÓN DE POSICIONES (en milímetros desde arriba-izquierda)
// Ajustar estos valores para alinear con tu factura pre-impresa
// ============================================================

const CONFIG = {
  // Página tamaño carta
  pageWidth: 216,
  pageHeight: 279,
  
  // ============================================
  // FECHA DE EMISIÓN
  // Típicamente en la parte superior, a la derecha
  // Formato: DD/MM/YYYY
  // ============================================
  fecha: {
    x: 170,    // Posición horizontal (desde izquierda)
    y: 47,     // Posición vertical (desde arriba)
    fontSize: 10
  },
  
  // ============================================
  // DATOS DEL CLIENTE
  // Campos: Nombre/Razón Social, RUC/CI
  // ============================================
  cliente: {
    // "Nombre o Razón Social:" - el valor va después de la etiqueta pre-impresa
    nombre: {
      x: 55,     // Después de "Nombre o Razón Social:"
      y: 62,     // Aprox. línea de nombre
      fontSize: 9,
      maxWidth: 140
    },
    // "RUC / C.I. N°:" - el valor va después de la etiqueta
    ruc: {
      x: 55,     // Después de "RUC/C.I. N°:"
      y: 71,     // Aprox. línea de RUC
      fontSize: 9
    }
  },
  
  // ============================================
  // CONDICIÓN DE VENTA
  // La "X" va DENTRO del paréntesis de CONTADO
  // Formato pre-impreso: "CONTADO ( )  CRÉDITO ( )"
  // ============================================
  condicionVenta: {
    contadoX: {
      x: 72,     // Dentro del paréntesis de CONTADO
      y: 80,     // Línea de condición de venta
      fontSize: 11
    },
    creditoX: {
      x: 115,    // Dentro del paréntesis de CRÉDITO
      y: 80
    }
  },
  
  // ============================================
  // TABLA DE PRODUCTOS
  // Columnas típicas: CANT | DESCRIPCIÓN | P.UNIT | EXENTAS | 5% | 10%
  // ============================================
  tabla: {
    inicioY: 100,       // Donde empieza la primera fila de productos
    altoFila: 6,        // Espaciado vertical entre filas
    maxFilas: 12,       // Máximo de productos visibles
    
    columnas: {
      cantidad: {
        x: 25,          // Columna CANTIDAD
        align: 'center',
        fontSize: 9
      },
      descripcion: {
        x: 45,          // Columna DESCRIPCIÓN
        align: 'left',
        fontSize: 9,
        maxWidth: 80
      },
      precioUnitario: {
        x: 140,         // Columna PRECIO UNITARIO
        align: 'right',
        fontSize: 9
      },
      exentas: {
        x: 160,         // Columna EXENTAS (sin IVA)
        align: 'right',
        fontSize: 9
      },
      iva5: {
        x: 180,         // Columna IVA 5%
        align: 'right',
        fontSize: 9
      },
      iva10: {
        x: 200,         // Columna IVA 10%
        align: 'right',
        fontSize: 9
      }
    }
  },
  
  // ============================================
  // TOTALES Y LIQUIDACIÓN DE IVA
  // Parte inferior de la factura
  // ============================================
  totales: {
    // Sub-Total (suma de columnas)
    subtotalExentas: { x: 160, y: 205, align: 'right', fontSize: 9 },
    subtotalIva5: { x: 180, y: 205, align: 'right', fontSize: 9 },
    subtotalIva10: { x: 200, y: 205, align: 'right', fontSize: 9 },
    
    // TOTAL A PAGAR (número grande)
    totalPagar: {
      x: 200,         // Alineado a la derecha
      y: 215,
      align: 'right',
      fontSize: 11,
      bold: true
    },
    
    // Total en LETRAS (ej: "TREINTA Y CINCO MIL GUARANÍES")
    totalEnLetras: {
      x: 25,          // Empieza a la izquierda
      y: 225,
      fontSize: 8,
      maxWidth: 180
    },
    
    // LIQUIDACIÓN DEL IVA (parte inferior derecha)
    liquidacion: {
      // "Total IVA 5%:" valor
      iva5: { x: 180, y: 235, align: 'right', fontSize: 8 },
      // "Total IVA 10%:" valor  
      iva10: { x: 180, y: 243, align: 'right', fontSize: 8 },
      // "TOTAL IVA:" valor final
      totalIva: { x: 180, y: 251, align: 'right', fontSize: 9, bold: true }
    }
  }
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
 * Genera el PDF con los datos de la factura
 * @param {Object} facturaData - Datos de la factura
 * @returns {Blob} - PDF como blob para descargar
 */
export function generarFacturaPDF(facturaData) {
  // Crear documento PDF tamaño carta
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  })

  doc.setFont('helvetica', 'normal')

  // =====================================
  // 1. FECHA DE EMISIÓN
  // =====================================
  if (facturaData.fecha) {
    doc.setFontSize(CONFIG.fecha.fontSize)
    const fecha = new Date(facturaData.fecha)
    const fechaStr = fecha.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    doc.text(fechaStr, CONFIG.fecha.x, CONFIG.fecha.y)
  }

  // =====================================
  // 2. NOMBRE O RAZÓN SOCIAL DEL CLIENTE
  // =====================================
  if (facturaData.cliente?.nombre) {
    doc.setFontSize(CONFIG.cliente.nombre.fontSize)
    const nombre = facturaData.cliente.nombre.toUpperCase()
    // Si el nombre es muy largo, truncar
    const nombreTruncado = nombre.length > 50 ? nombre.substring(0, 50) + '...' : nombre
    doc.text(nombreTruncado, CONFIG.cliente.nombre.x, CONFIG.cliente.nombre.y)
  }

  // =====================================
  // 3. RUC / C.I. N° DEL CLIENTE
  // =====================================
  if (facturaData.cliente?.ruc) {
    doc.setFontSize(CONFIG.cliente.ruc.fontSize)
    doc.text(facturaData.cliente.ruc, CONFIG.cliente.ruc.x, CONFIG.cliente.ruc.y)
  }

  // =====================================
  // 4. CONDICIÓN DE VENTA - "X" EN CONTADO
  // =====================================
  doc.setFontSize(CONFIG.condicionVenta.contadoX.fontSize)
  doc.setFont('helvetica', 'bold')
  // Siempre marcamos CONTADO con una X
  doc.text('X', CONFIG.condicionVenta.contadoX.x, CONFIG.condicionVenta.contadoX.y)
  doc.setFont('helvetica', 'normal')

  // =====================================
  // 5. TABLA DE PRODUCTOS
  // =====================================
  if (facturaData.items && facturaData.items.length > 0) {
    let currentY = CONFIG.tabla.inicioY
    const maxItems = Math.min(facturaData.items.length, CONFIG.tabla.maxFilas)

    for (let i = 0; i < maxItems; i++) {
      const item = facturaData.items[i]
      doc.setFontSize(CONFIG.tabla.columnas.cantidad.fontSize)

      // CANTIDAD
      doc.text(
        item.cantidad.toString(),
        CONFIG.tabla.columnas.cantidad.x,
        currentY,
        { align: 'center' }
      )

      // DESCRIPCIÓN (truncar si es muy larga)
      const descripcion = item.descripcion.toUpperCase()
      const descTruncada = descripcion.length > 35 ? descripcion.substring(0, 35) + '...' : descripcion
      doc.text(
        descTruncada,
        CONFIG.tabla.columnas.descripcion.x,
        currentY,
        { align: 'left' }
      )

      // PRECIO UNITARIO
      doc.text(
        formatearNumero(item.precioUnitario),
        CONFIG.tabla.columnas.precioUnitario.x,
        currentY,
        { align: 'right' }
      )

      // VALOR EN COLUMNA IVA 10% (todos los productos van a esta columna)
      const valorTotal = item.precioUnitario * item.cantidad
      doc.text(
        formatearNumero(valorTotal),
        CONFIG.tabla.columnas.iva10.x,
        currentY,
        { align: 'right' }
      )

      currentY += CONFIG.tabla.altoFila
    }
  }

  // =====================================
  // 6. CALCULAR TOTALES
  // =====================================
  const subtotal = facturaData.items?.reduce((sum, item) => 
    sum + (item.precioUnitario * item.cantidad), 0
  ) || 0

  // IVA 10% en Paraguay = Total / 11
  const totalIva10 = Math.round(subtotal / 11)
  const totalIva = totalIva10

  // =====================================
  // 7. SUB-TOTAL COLUMNA IVA 10%
  // =====================================
  doc.setFontSize(CONFIG.totales.subtotalIva10.fontSize)
  doc.text(
    formatearNumero(subtotal),
    CONFIG.totales.subtotalIva10.x,
    CONFIG.totales.subtotalIva10.y,
    { align: 'right' }
  )

  // =====================================
  // 8. TOTAL A PAGAR (NÚMERO)
  // =====================================
  doc.setFontSize(CONFIG.totales.totalPagar.fontSize)
  doc.setFont('helvetica', 'bold')
  doc.text(
    formatearNumero(subtotal),
    CONFIG.totales.totalPagar.x,
    CONFIG.totales.totalPagar.y,
    { align: 'right' }
  )

  // =====================================
  // 9. TOTAL EN LETRAS
  // =====================================
  doc.setFontSize(CONFIG.totales.totalEnLetras.fontSize)
  doc.setFont('helvetica', 'normal')
  const totalEnLetras = numeroALetras(Math.round(subtotal))
  doc.text(
    totalEnLetras,
    CONFIG.totales.totalEnLetras.x,
    CONFIG.totales.totalEnLetras.y
  )

  // =====================================
  // 10. LIQUIDACIÓN DEL IVA
  // =====================================
  // IVA 10%
  doc.setFontSize(CONFIG.totales.liquidacion.iva10.fontSize)
  doc.text(
    formatearNumero(totalIva10),
    CONFIG.totales.liquidacion.iva10.x,
    CONFIG.totales.liquidacion.iva10.y,
    { align: 'right' }
  )

  // TOTAL IVA
  doc.setFontSize(CONFIG.totales.liquidacion.totalIva.fontSize)
  doc.setFont('helvetica', 'bold')
  doc.text(
    formatearNumero(totalIva),
    CONFIG.totales.liquidacion.totalIva.x,
    CONFIG.totales.liquidacion.totalIva.y,
    { align: 'right' }
  )

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

  const totalIva10 = Math.round(subtotal / 11)

  return {
    subtotal: Math.round(subtotal),
    liquidacionIva10: totalIva10,
    totalIva: totalIva10,
    totalPagar: Math.round(subtotal)
  }
}

/**
 * INSTRUCCIONES PARA AJUSTAR POSICIONES:
 * =====================================
 * 
 * Si los datos no están alineados correctamente con tu factura pre-impresa:
 * 
 * 1. Imprime una factura de prueba
 * 2. Mide con regla desde el borde izquierdo y superior
 * 3. Ajusta los valores en el objeto CONFIG arriba
 * 
 * EJEMPLOS DE AJUSTES COMUNES:
 * 
 * - Si la fecha sale muy a la derecha: reducir CONFIG.fecha.x
 * - Si el nombre sale muy abajo: reducir CONFIG.cliente.nombre.y
 * - Si la X de CONTADO no cae en el paréntesis: ajustar CONFIG.condicionVenta.contadoX.x y .y
 * - Si los productos no alinean: ajustar CONFIG.tabla.columnas.*.x
 * 
 * MEDIDAS EN MILÍMETROS:
 * - Página carta: 216mm ancho x 279mm alto
 * - 1 pulgada = 25.4mm
 */
