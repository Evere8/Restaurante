'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { generarFacturaPDF, calcularTotalesFactura } from '@/lib/facturaGenerator'
import { toast } from 'sonner'
import { FileText, Plus, Trash2, Download } from 'lucide-react'

export default function FacturaTestPage() {
  const [cliente, setCliente] = useState({
    nombre: '',
    ruc: '',
    telefono: ''
  })

  const [condicionVenta, setCondicionVenta] = useState('CONTADO')
  const [notaRemision, setNotaRemision] = useState('')
  
  const [items, setItems] = useState([
    { codigo: '001', cantidad: 2, descripcion: 'Hamburguesa Doble', precioUnitario: 45000, tipoIva: 'IVA_10' }
  ])

  const agregarItem = () => {
    setItems([...items, {
      codigo: '',
      cantidad: 1,
      descripcion: '',
      precioUnitario: 0,
      tipoIva: 'IVA_10'
    }])
  }

  const eliminarItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const actualizarItem = (index, campo, valor) => {
    const nuevosItems = [...items]
    nuevosItems[index][campo] = valor
    setItems(nuevosItems)
  }

  const generarPDF = () => {
    try {
      // Preparar items con valor de venta calculado
      const itemsConValores = items.map(item => ({
        ...item,
        valorVenta: item.precioUnitario * item.cantidad
      }))

      // Calcular totales
      const totales = calcularTotalesFactura(itemsConValores)

      // Datos de la factura
      const facturaData = {
        cliente: cliente,
        fecha: new Date().toISOString(),
        condicionVenta: condicionVenta,
        notaRemision: notaRemision,
        items: itemsConValores,
        ...totales
      }

      // Generar PDF
      const pdfBlob = generarFacturaPDF(facturaData)

      // Descargar PDF
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `factura_${Date.now()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('¡Factura generada! Lista para imprimir sobre factura pre-impresa')
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar la factura')
    }
  }

  const totales = calcularTotalesFactura(items.map(item => ({
    ...item,
    valorVenta: item.precioUnitario * item.cantidad
  })))

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">🧾 Generador de Factura Pre-Impresa</h1>
          <p className="text-gray-600">Genera el PDF con datos para imprimir sobre tu factura física</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Datos del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre o Razón Social *</Label>
                  <Input 
                    value={cliente.nombre}
                    onChange={(e) => setCliente({...cliente, nombre: e.target.value})}
                    placeholder="JUAN PÉREZ"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>RUC / C.I. N° *</Label>
                    <Input 
                      value={cliente.ruc}
                      onChange={(e) => setCliente({...cliente, ruc: e.target.value})}
                      placeholder="12345678-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input 
                      value={cliente.telefono}
                      onChange={(e) => setCliente({...cliente, telefono: e.target.value})}
                      placeholder="0981-123456"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Condición de Venta */}
            <Card>
              <CardHeader>
                <CardTitle>Condición de Venta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Condición *</Label>
                    <Select value={condicionVenta} onValueChange={setCondicionVenta}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONTADO">CONTADO</SelectItem>
                        <SelectItem value="CREDITO">CRÉDITO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nota de Remisión N°</Label>
                    <Input 
                      value={notaRemision}
                      onChange={(e) => setNotaRemision(e.target.value)}
                      placeholder="001-001-0000001"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Productos / Servicios</CardTitle>
                <Button size="sm" onClick={agregarItem} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" /> Agregar
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-1">
                      <Label className="text-xs">Cód.</Label>
                      <Input 
                        size="sm"
                        value={item.codigo}
                        onChange={(e) => actualizarItem(index, 'codigo', e.target.value)}
                        placeholder="001"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Cant.</Label>
                      <Input 
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => actualizarItem(index, 'cantidad', parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Descripción</Label>
                      <Input 
                        value={item.descripcion}
                        onChange={(e) => actualizarItem(index, 'descripcion', e.target.value)}
                        placeholder="Producto o servicio"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">P. Unit.</Label>
                      <Input 
                        type="number"
                        value={item.precioUnitario}
                        onChange={(e) => actualizarItem(index, 'precioUnitario', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">IVA</Label>
                      <Select 
                        value={item.tipoIva} 
                        onValueChange={(val) => actualizarItem(index, 'tipoIva', val)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXENTA">Exenta</SelectItem>
                          <SelectItem value="IVA_5">5%</SelectItem>
                          <SelectItem value="IVA_10">10%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-transparent">.</Label>
                      <div className="font-bold text-sm pt-1">
                        {(item.precioUnitario * item.cantidad).toLocaleString('es-PY')}
                      </div>
                    </div>
                    <div className="col-span-1 flex items-end justify-end">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => eliminarItem(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Preview y Totales */}
          <div className="space-y-6">
            {/* Totales */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Totales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Exentas:</span>
                  <span className="font-medium">{totales.totalExentas.toLocaleString('es-PY')} Gs.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA 5%:</span>
                  <span className="font-medium">{totales.totalIva5.toLocaleString('es-PY')} Gs.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA 10%:</span>
                  <span className="font-medium">{totales.totalIva10.toLocaleString('es-PY')} Gs.</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">{totales.subtotal.toLocaleString('es-PY')} Gs.</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Liquidación IVA 5%:</span>
                    <span className="font-medium">{totales.liquidacionIva5.toLocaleString('es-PY')} Gs.</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Liquidación IVA 10%:</span>
                    <span className="font-medium">{totales.liquidacionIva10.toLocaleString('es-PY')} Gs.</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Total IVA:</span>
                    <span className="font-semibold">{totales.totalIva.toLocaleString('es-PY')} Gs.</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-lg">TOTAL A PAGAR:</span>
                    <span className="font-bold text-lg text-orange-600">{totales.totalPagar.toLocaleString('es-PY')} Gs.</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600 mt-4"
                  onClick={generarPDF}
                  disabled={!cliente.nombre || !cliente.ruc || items.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generar PDF para Imprimir
                </Button>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                  <p className="font-semibold mb-1">📌 Instrucciones:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Completa todos los datos</li>
                    <li>Click "Generar PDF"</li>
                    <li>Coloca la factura pre-impresa en la impresora</li>
                    <li>Imprime el PDF generado</li>
                    <li>Los datos se alinearán perfectamente</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
