/**
 * Convierte un número a letras en español (Paraguay)
 * Ejemplo: 150000 → "CIENTO CINCUENTA MIL GUARANÍES"
 */

const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

function convertirGrupo(numero) {
  if (numero === 0) return ''
  if (numero === 100) return 'CIEN'
  
  let resultado = ''
  
  // Centenas
  const c = Math.floor(numero / 100)
  if (c > 0) resultado += centenas[c]
  
  // Decenas y unidades
  const du = numero % 100
  
  if (du >= 10 && du < 20) {
    // Casos especiales 10-19
    if (resultado) resultado += ' '
    resultado += especiales[du - 10]
  } else {
    // Decenas normales
    const d = Math.floor(du / 10)
    const u = du % 10
    
    if (d > 0) {
      if (resultado) resultado += ' '
      resultado += decenas[d]
    }
    
    if (u > 0) {
      if (d > 0) resultado += ' Y '
      else if (resultado) resultado += ' '
      resultado += unidades[u]
    }
  }
  
  return resultado
}

export function numeroALetras(numero) {
  if (numero === 0) return 'CERO GUARANÍES'
  
  numero = Math.round(numero)
  
  // Millones
  const millones = Math.floor(numero / 1000000)
  numero = numero % 1000000
  
  // Miles
  const miles = Math.floor(numero / 1000)
  numero = numero % 1000
  
  // Centenas
  const centenas = numero
  
  let resultado = ''
  
  if (millones > 0) {
    if (millones === 1) {
      resultado = 'UN MILLÓN'
    } else {
      resultado = convertirGrupo(millones) + ' MILLONES'
    }
  }
  
  if (miles > 0) {
    if (resultado) resultado += ' '
    if (miles === 1) {
      resultado += 'MIL'
    } else {
      resultado += convertirGrupo(miles) + ' MIL'
    }
  }
  
  if (centenas > 0) {
    if (resultado) resultado += ' '
    resultado += convertirGrupo(centenas)
  }
  
  return resultado + ' GUARANÍES'
}
