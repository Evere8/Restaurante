'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Save, RotateCcw, FileText, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { generarFacturaPDF, DEFAULT_CONFIG } from '@/lib/facturaGenerator'
import { supabase } from '@/lib/supabase'

// Configuración por defecto del recibo
const DEFAULT_RECIBO_CONFIG = {
  pageWidth: 210,
  pageHeight: 148,
  marginLeft: 5,
  marginTop: 5,
  restaurante: {
    nombre: { y: 8, fontSize: 12 },
    direccion: { y: 14, fontSize: 8 },
    telefono: { y: 18, fontSize: 8 }
  },
  fecha: { y: 26, fontSize: 8 },
  hora: { y: 30, fontSize: 8 },
  cliente: { y: 36, fontSize: 8 },
  tabla: {
    inicioY: 45,
    altoFila: 5,
    columnas: {
      cantidad: { x: 5 },
      descripcion: { x: 15 },
      total: { x: 75 }
    }
  },
  totalLabel: { fontSize: 10 },
  mensaje: { fontSize: 8, texto: '¡Gracias por su compra!' }
}

// Datos de ejemplo
const EJEMPLO_DATA = {
  fecha: new Date().toISOString(),
  cliente: { nombre: 'EDGAR LOPEZ', ruc: '4126977-2' },
  items: [
    { cantidad: 1, descripcion: 'batido', precioUnitario: 20000 },
    { cantidad: 1, descripcion: 'empanada', precioUnitario: 5000 },
    { cantidad: 1, descripcion: 'cafe', precioUnitario: 20000 }
  ]
}

export default function ConfiguracionFacturaPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const router = useRouter()

  const [facturaConfig, setFacturaConfig] = useState(DEFAULT_CONFIG)
  const [reciboConfig, setReciboConfig] = useState(DEFAULT_RECIBO_CONFIG)
  const [activeTab, setActiveTab] = useState('factura')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (restaurant?.id) {
      loadConfigFromSupabase()
    }
  }, [restaurant])

  // Cargar configuración desde Supabase
  const loadConfigFromSupabase = async () => {
    try {
      // Cargar config de factura
      const { data: facturaData } = await supabase
        .from('factura_config')
        .select('config')
        .eq('restaurant_id', restaurant.id)
        .eq('tipo', 'factura')
        .single()

      if (facturaData?.config) {
        setFacturaConfig(facturaData.config)
      } else {
        // Fallback a localStorage
        const savedFactura = localStorage.getItem('facturaConfig')
        if (savedFactura) {
          try {
            setFacturaConfig(JSON.parse(savedFactura))
          } catch (e) {
            console.error('Error cargando config factura:', e)
          }
        }
      }

      // Cargar config de recibo
      const { data: reciboData } = await supabase
        .from('factura_config')
        .select('config')
        .eq('restaurant_id', restaurant.id)
        .eq('tipo', 'recibo')
        .single()

      if (reciboData?.config) {
        setReciboConfig(reciboData.config)
      } else {
        // Fallback a localStorage
        const savedRecibo = localStorage.getItem('reciboConfig')
        if (savedRecibo) {
          try {
            setReciboConfig(JSON.parse(savedRecibo))
          } catch (e) {
            console.error('Error cargando config recibo:', e)
          }
        }
      }
    } catch (error) {
      console.error('Error cargando configuración de Supabase:', error)
      // Fallback a localStorage
      const savedFactura = localStorage.getItem('facturaConfig')
      if (savedFactura) {
        try {
          setFacturaConfig(JSON.parse(savedFactura))
        } catch (e) {
          console.error('Error cargando config factura:', e)
        }
      }

      const savedRecibo = localStorage.getItem('reciboConfig')
      if (savedRecibo) {
        try {
          setReciboConfig(JSON.parse(savedRecibo))
        } catch (e) {
          console.error('Error cargando config recibo:', e)
        }
      }
    }
  }

  // Funciones para Factura
  const updateFacturaConfig = (path, value) => {
    const newConfig = { ...facturaConfig }
    const keys = path.split('.')
    let obj = newConfig
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]]
    }
    obj[keys[keys.length - 1]] = parseFloat(value) || 0
    setFacturaConfig(newConfig)
  }

  const saveFacturaConfig = async () => {
    setSaving(true)
    try {
      // Guardar en Supabase
      const { error } = await supabase
        .from('factura_config')
        .upsert({
          restaurant_id: restaurant.id,
          tipo: 'factura',
          config: facturaConfig
        }, { onConflict: 'restaurant_id,tipo' })

      if (error) throw error

      // También guardar en localStorage como backup
      localStorage.setItem('facturaConfig', JSON.stringify(facturaConfig))
      toast.success('Configuración de factura guardada en la nube')
    } catch (error) {
      console.error('Error guardando en Supabase:', error)
      // Fallback a localStorage
      localStorage.setItem('facturaConfig', JSON.stringify(facturaConfig))
      toast.success('Configuración guardada localmente')
    }
    setSaving(false)
  }

  const resetFacturaConfig = () => {
    setFacturaConfig(DEFAULT_CONFIG)
    localStorage.removeItem('facturaConfig')
    toast.success('Configuración de factura restaurada')
  }

  const downloadTestFacturaPDF = () => {
    try {
      const pdfBlob = generarFacturaPDF(EJEMPLO_DATA, facturaConfig)
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `factura_prueba_${Date.now()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF de factura de prueba descargado')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error generando PDF de factura')
    }
  }

  // Funciones para Recibo
  const updateReciboConfig = (path, value) => {
    const newConfig = JSON.parse(JSON.stringify(reciboConfig))
    const keys = path.split('.')
    let obj = newConfig
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]]
    }

    // Si es texto, no convertir a número
    if (path.includes('texto')) {
      obj[keys[keys.length - 1]] = value
    } else {
      obj[keys[keys.length - 1]] = parseFloat(value) || 0
    }
    setReciboConfig(newConfig)
  }

  const saveReciboConfig = async () => {
    setSaving(true)
    try {
      // Guardar en Supabase
      const { error } = await supabase
        .from('factura_config')
        .upsert({
          restaurant_id: restaurant.id,
          tipo: 'recibo',
          config: reciboConfig
        }, { onConflict: 'restaurant_id,tipo' })

      if (error) throw error

      // También guardar en localStorage como backup
      localStorage.setItem('reciboConfig', JSON.stringify(reciboConfig))
      toast.success('Configuración de recibo guardada en la nube')
    } catch (error) {
      console.error('Error guardando en Supabase:', error)
      // Fallback a localStorage
      localStorage.setItem('reciboConfig', JSON.stringify(reciboConfig))
      toast.success('Configuración guardada localmente')
    }
    setSaving(false)
  }

  const resetReciboConfig = () => {
    setReciboConfig(DEFAULT_RECIBO_CONFIG)
    localStorage.removeItem('reciboConfig')
    toast.success('Configuración de recibo restaurada')
  }

  const downloadTestReciboPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')

      const config = reciboConfig
      const doc = new jsPDF({
  orientation: 'landscape',
  unit: 'mm',
  format: [config.pageWidth, config.pageHeight]
})

      doc.setFont('helvetica', 'normal')

      let y = config.marginTop

      // Nombre del restaurante
      doc.setFontSize(config.restaurante.nombre.fontSize)
      doc.setFont('helvetica', 'bold')
      doc.text(restaurant?.nombre || 'Mi Restaurante', config.pageWidth / 2, config.restaurante.nombre.y, { align: 'center' })

      // Dirección
      doc.setFontSize(config.restaurante.direccion.fontSize)
      doc.setFont('helvetica', 'normal')
      doc.text(restaurant?.direccion || 'Calle Principal 123', config.pageWidth / 2, config.restaurante.direccion.y, { align: 'center' })

      // Teléfono
      doc.setFontSize(config.restaurante.telefono.fontSize)
      doc.text(`Tel: ${restaurant?.telefono || '0981 123 456'}`, config.pageWidth / 2, config.restaurante.telefono.y, { align: 'center' })

      // Línea separadora
      const lineY = config.restaurante.telefono.y + 3
      doc.line(config.marginLeft, lineY, config.pageWidth - config.marginLeft, lineY)

      // Fecha
      doc.setFontSize(config.fecha.fontSize)
      const fecha = new Date()
      doc.text(`Fecha: ${fecha.toLocaleDateString('es-PY')}`, config.marginLeft, config.fecha.y)

      // Hora
      doc.text(`Hora: ${fecha.toLocaleTimeString('es-PY')}`, config.marginLeft, config.hora.y)

      // Cliente
      doc.text('Cliente: Sin Nombre', config.marginLeft, config.cliente.y)

      // Línea separadora
      const lineY2 = config.cliente.y + 3
      doc.line(config.marginLeft, lineY2, config.pageWidth - config.marginLeft, lineY2)

      // Encabezado tabla
      y = config.tabla.inicioY
      doc.setFont('helvetica', 'bold')
      doc.text('Cant.', config.tabla.columnas.cantidad.x, y)
      doc.text('Descripción', config.tabla.columnas.descripcion.x, y)
      doc.text('Total', config.tabla.columnas.total.x, y, { align: 'right' })
      y += config.tabla.altoFila
      doc.setFont('helvetica', 'normal')

      // Items de ejemplo
      let totalGeneral = 0
      EJEMPLO_DATA.items.forEach(item => {
        const subtotal = item.cantidad * item.precioUnitario
        totalGeneral += subtotal

        doc.text(item.cantidad.toString(), config.tabla.columnas.cantidad.x, y)
        doc.text(item.descripcion, config.tabla.columnas.descripcion.x, y)
        doc.text(formatNum(subtotal), config.tabla.columnas.total.x, y, { align: 'right' })
        y += config.tabla.altoFila
      })

      // Línea antes del total
      y += 2
      doc.line(config.marginLeft, y, config.pageWidth - config.marginLeft, y)
      y += 4

      // Total
      doc.setFontSize(config.totalLabel.fontSize)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL:', config.marginLeft, y)
      doc.text(formatNum(totalGeneral), config.tabla.columnas.total.x, y, { align: 'right' })
      y += 6

      // Mensaje
      doc.setFontSize(config.mensaje.fontSize)
      doc.setFont('helvetica', 'normal')
      doc.text(config.mensaje.texto, config.pageWidth / 2, y, { align: 'center' })

      const pdfBlob = doc.output('blob')
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `recibo_prueba_${Date.now()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF de recibo de prueba descargado')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error generando PDF de recibo')
    }
  }

  const formatNum = (num) => {
    return new Intl.NumberFormat('es-PY').format(Math.round(num))
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Configuración de Documentos</h1>
            <p className="text-gray-600">Ajusta las posiciones del PDF para factura y recibo</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="factura" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" /> Factura
              </TabsTrigger>
              <TabsTrigger value="recibo" className="flex items-center">
                <Receipt className="mr-2 h-4 w-4" /> Recibo
              </TabsTrigger>
            </TabsList>

            {/* TAB FACTURA */}
            <TabsContent value="factura">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  Página: <strong>140mm x 215mm</strong>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={resetFacturaConfig}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                  </Button>
                  <Button variant="outline" size="sm" onClick={saveFacturaConfig}>
                    <Save className="mr-2 h-4 w-4" /> Guardar
                  </Button>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={downloadTestFacturaPDF}>
                    <Download className="mr-2 h-4 w-4" /> Descargar Prueba
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Posiciones (en mm)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="encabezado">
                      <TabsList className="grid w-full grid-cols-4 mb-4">
                        <TabsTrigger value="encabezado">Encabezado</TabsTrigger>
                        <TabsTrigger value="tabla">Tabla</TabsTrigger>
                        <TabsTrigger value="totales">Totales</TabsTrigger>
                        <TabsTrigger value="iva">IVA</TabsTrigger>
                      </TabsList>

                      <TabsContent value="encabezado" className="space-y-4">
                        {/* Fecha */}
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <Label className="font-bold text-blue-800">📅 Fecha</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">X</Label>
                              <Input type="number" value={facturaConfig.fecha.x} onChange={(e) => updateFacturaConfig('fecha.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Y</Label>
                              <Input type="number" value={facturaConfig.fecha.y} onChange={(e) => updateFacturaConfig('fecha.y', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Tamaño</Label>
                              <Input type="number" value={facturaConfig.fecha.fontSize} onChange={(e) => updateFacturaConfig('fecha.fontSize', e.target.value)} />
                            </div>
                          </div>
                        </div>

                        {/* Nombre Cliente */}
                        <div className="p-3 bg-green-50 rounded-lg">
                          <Label className="font-bold text-green-800">👤 Nombre Cliente</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">X</Label>
                              <Input type="number" value={facturaConfig.clienteNombre.x} onChange={(e) => updateFacturaConfig('clienteNombre.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Y</Label>
                              <Input type="number" value={facturaConfig.clienteNombre.y} onChange={(e) => updateFacturaConfig('clienteNombre.y', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Tamaño</Label>
                              <Input type="number" value={facturaConfig.clienteNombre.fontSize} onChange={(e) => updateFacturaConfig('clienteNombre.fontSize', e.target.value)} />
                            </div>
                          </div>
                        </div>

                        {/* RUC */}
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <Label className="font-bold text-purple-800">🆔 RUC</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">X</Label>
                              <Input type="number" value={facturaConfig.clienteRuc.x} onChange={(e) => updateFacturaConfig('clienteRuc.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Y</Label>
                              <Input type="number" value={facturaConfig.clienteRuc.y} onChange={(e) => updateFacturaConfig('clienteRuc.y', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Tamaño</Label>
                              <Input type="number" value={facturaConfig.clienteRuc.fontSize} onChange={(e) => updateFacturaConfig('clienteRuc.fontSize', e.target.value)} />
                            </div>
                          </div>
                        </div>

                        {/* X CONTADO */}
                        <div className="p-3 bg-red-50 rounded-lg">
                          <Label className="font-bold text-red-800">✓ "X" CONTADO</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">X</Label>
                              <Input type="number" value={facturaConfig.contadoX.x} onChange={(e) => updateFacturaConfig('contadoX.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Y</Label>
                              <Input type="number" value={facturaConfig.contadoX.y} onChange={(e) => updateFacturaConfig('contadoX.y', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Tamaño</Label>
                              <Input type="number" value={facturaConfig.contadoX.fontSize} onChange={(e) => updateFacturaConfig('contadoX.fontSize', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="tabla" className="space-y-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <Label className="font-bold">📋 Inicio de Tabla</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">Y inicial</Label>
                              <Input type="number" value={facturaConfig.tabla.inicioY} onChange={(e) => updateFacturaConfig('tabla.inicioY', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Alto fila</Label>
                              <Input type="number" value={facturaConfig.tabla.altoFila} onChange={(e) => updateFacturaConfig('tabla.altoFila', e.target.value)} />
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-orange-50 rounded-lg">
                          <Label className="font-bold text-orange-800">📊 Columnas (X)</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">Cantidad</Label>
                              <Input type="number" value={facturaConfig.tabla.columnas.cantidad.x} onChange={(e) => updateFacturaConfig('tabla.columnas.cantidad.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Descripción</Label>
                              <Input type="number" value={facturaConfig.tabla.columnas.descripcion.x} onChange={(e) => updateFacturaConfig('tabla.columnas.descripcion.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Precio Unit.</Label>
                              <Input type="number" value={facturaConfig.tabla.columnas.precioUnitario.x} onChange={(e) => updateFacturaConfig('tabla.columnas.precioUnitario.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Exentas</Label>
                              <Input type="number" value={facturaConfig.tabla.columnas.exentas.x} onChange={(e) => updateFacturaConfig('tabla.columnas.exentas.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">5%</Label>
                              <Input type="number" value={facturaConfig.tabla.columnas.iva5.x} onChange={(e) => updateFacturaConfig('tabla.columnas.iva5.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">10%</Label>
                              <Input type="number" value={facturaConfig.tabla.columnas.iva10.x} onChange={(e) => updateFacturaConfig('tabla.columnas.iva10.x', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="totales" className="space-y-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <Label className="font-bold text-blue-800">📊 Subtotal 10%</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">X</Label>
                              <Input type="number" value={facturaConfig.subtotal10.x} onChange={(e) => updateFacturaConfig('subtotal10.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Y</Label>
                              <Input type="number" value={facturaConfig.subtotal10.y} onChange={(e) => updateFacturaConfig('subtotal10.y', e.target.value)} />
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-green-50 rounded-lg">
                          <Label className="font-bold text-green-800">📝 Total en Letras</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">X</Label>
                              <Input type="number" value={facturaConfig.totalLetras.x} onChange={(e) => updateFacturaConfig('totalLetras.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Y</Label>
                              <Input type="number" value={facturaConfig.totalLetras.y} onChange={(e) => updateFacturaConfig('totalLetras.y', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Tamaño</Label>
                              <Input type="number" value={facturaConfig.totalLetras.fontSize} onChange={(e) => updateFacturaConfig('totalLetras.fontSize', e.target.value)} />
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-orange-50 rounded-lg">
                          <Label className="font-bold text-orange-800">💰 TOTAL FINAL</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">X</Label>
                              <Input type="number" value={facturaConfig.totalFinal.x} onChange={(e) => updateFacturaConfig('totalFinal.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Y</Label>
                              <Input type="number" value={facturaConfig.totalFinal.y} onChange={(e) => updateFacturaConfig('totalFinal.y', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Tamaño</Label>
                              <Input type="number" value={facturaConfig.totalFinal.fontSize} onChange={(e) => updateFacturaConfig('totalFinal.fontSize', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="iva" className="space-y-4">
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <Label className="font-bold text-purple-800">🧾 Liquidación IVA 10%</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">X</Label>
                              <Input type="number" value={facturaConfig.liquidacionIva10.x} onChange={(e) => updateFacturaConfig('liquidacionIva10.x', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Y</Label>
                              <Input type="number" value={facturaConfig.liquidacionIva10.y} onChange={(e) => updateFacturaConfig('liquidacionIva10.y', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vista Previa de Datos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white border-2 border-dashed border-gray-300 p-4 rounded-lg font-mono text-sm">
                      <p className="font-bold mb-2">Datos que se imprimirán:</p>
                      <p>Fecha: {new Date().toLocaleDateString('es-PY')}</p>
                      <p>Cliente: EDGAR LOPEZ</p>
                      <p>RUC: 4126977-2</p>
                      <p>Condición: X (CONTADO)</p>
                      <hr className="my-2" />
                      <p className="font-bold">Items:</p>
                      <p className="pl-2">1 | batido | 20.000 | 0 | 0 | 20.000</p>
                      <p className="pl-2">1 | empanada | 5.000 | 0 | 0 | 5.000</p>
                      <p className="pl-2">1 | cafe | 20.000 | 0 | 0 | 20.000</p>
                      <hr className="my-2" />
                      <p>Subtotal 10%: 45.000</p>
                      <p>Total letras: cuarenta y cinco mil guaraníes</p>
                      <p>IVA 10%: 4.091</p>
                      <p className="font-bold">TOTAL: 45.000</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB RECIBO */}
            <TabsContent value="recibo">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  Página: <strong>{reciboConfig.pageWidth}mm x {reciboConfig.pageHeight}mm</strong>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={resetReciboConfig}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                  </Button>
                  <Button variant="outline" size="sm" onClick={saveReciboConfig}>
                    <Save className="mr-2 h-4 w-4" /> Guardar
                  </Button>
                  <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={downloadTestReciboPDF}>
                    <Download className="mr-2 h-4 w-4" /> Descargar Prueba
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Configuración del Recibo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tamaño de página */}
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <Label className="font-bold">📄 Tamaño de Página (mm)</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">Ancho</Label>
                          <Input type="number" value={reciboConfig.pageWidth} onChange={(e) => updateReciboConfig('pageWidth', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Alto</Label>
                          <Input type="number" value={reciboConfig.pageHeight} onChange={(e) => updateReciboConfig('pageHeight', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* Márgenes */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Label className="font-bold text-blue-800">📐 Márgenes</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">Izquierdo</Label>
                          <Input type="number" value={reciboConfig.marginLeft} onChange={(e) => updateReciboConfig('marginLeft', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Superior</Label>
                          <Input type="number" value={reciboConfig.marginTop} onChange={(e) => updateReciboConfig('marginTop', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* Restaurante */}
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Label className="font-bold text-green-800">🏪 Datos del Restaurante</Label>
                      <div className="space-y-2 mt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Nombre Y</Label>
                            <Input type="number" value={reciboConfig.restaurante.nombre.y} onChange={(e) => updateReciboConfig('restaurante.nombre.y', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Nombre Tamaño</Label>
                            <Input type="number" value={reciboConfig.restaurante.nombre.fontSize} onChange={(e) => updateReciboConfig('restaurante.nombre.fontSize', e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Dirección Y</Label>
                            <Input type="number" value={reciboConfig.restaurante.direccion.y} onChange={(e) => updateReciboConfig('restaurante.direccion.y', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Teléfono Y</Label>
                            <Input type="number" value={reciboConfig.restaurante.telefono.y} onChange={(e) => updateReciboConfig('restaurante.telefono.y', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fecha y Cliente */}
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Label className="font-bold text-purple-800">📅 Fecha y Cliente</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">Fecha Y</Label>
                          <Input type="number" value={reciboConfig.fecha.y} onChange={(e) => updateReciboConfig('fecha.y', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Hora Y</Label>
                          <Input type="number" value={reciboConfig.hora.y} onChange={(e) => updateReciboConfig('hora.y', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Cliente Y</Label>
                          <Input type="number" value={reciboConfig.cliente.y} onChange={(e) => updateReciboConfig('cliente.y', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* Tabla */}
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <Label className="font-bold text-orange-800">📊 Tabla de Productos</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">Inicio Y</Label>
                          <Input type="number" value={reciboConfig.tabla.inicioY} onChange={(e) => updateReciboConfig('tabla.inicioY', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Alto Fila</Label>
                          <Input type="number" value={reciboConfig.tabla.altoFila} onChange={(e) => updateReciboConfig('tabla.altoFila', e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">Cantidad X</Label>
                          <Input type="number" value={reciboConfig.tabla.columnas.cantidad.x} onChange={(e) => updateReciboConfig('tabla.columnas.cantidad.x', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Descripción X</Label>
                          <Input type="number" value={reciboConfig.tabla.columnas.descripcion.x} onChange={(e) => updateReciboConfig('tabla.columnas.descripcion.x', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Total X</Label>
                          <Input type="number" value={reciboConfig.tabla.columnas.total.x} onChange={(e) => updateReciboConfig('tabla.columnas.total.x', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* Mensaje */}
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <Label className="font-bold text-yellow-800">💬 Mensaje Final</Label>
                      <div className="mt-2">
                        <Input
                          value={reciboConfig.mensaje.texto}
                          onChange={(e) => updateReciboConfig('mensaje.texto', e.target.value)}
                          placeholder="¡Gracias por su compra!"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vista Previa del Recibo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white border-2 border-gray-300 p-4 rounded-lg font-mono text-xs mx-auto" style={{ maxWidth: '200px' }}>
                      <p className="text-center font-bold text-sm">{restaurant?.nombre || 'Mi Restaurante'}</p>
                      <p className="text-center text-xs">{restaurant?.direccion || 'Calle Principal 123'}</p>
                      <p className="text-center text-xs">Tel: {restaurant?.telefono || '0981 123 456'}</p>
                      <hr className="my-2" />
                      <p>Fecha: {new Date().toLocaleDateString('es-PY')}</p>
                      <p>Hora: {new Date().toLocaleTimeString('es-PY')}</p>
                      <p>Cliente: Sin Nombre</p>
                      <hr className="my-2" />
                      <div className="flex justify-between text-xs font-bold">
                        <span>Cant.</span>
                        <span>Desc.</span>
                        <span>Total</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>1</span>
                        <span>batido</span>
                        <span>20.000</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>1</span>
                        <span>empanada</span>
                        <span>5.000</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>1</span>
                        <span>cafe</span>
                        <span>20.000</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-bold">
                        <span>TOTAL:</span>
                        <span>45.000</span>
                      </div>
                      <p className="text-center mt-2 text-xs">{reciboConfig.mensaje.texto}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
