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
import { Download, Save, RotateCcw, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { generarFacturaPDF, DEFAULT_CONFIG } from '@/lib/facturaGenerator'

// Datos de ejemplo para la vista previa
const EJEMPLO_DATA = {
  fecha: new Date().toISOString(),
  cliente: {
    nombre: 'EDGAR LOPEZ',
    ruc: '4126977-2'
  },
  items: [
    { cantidad: 1, descripcion: 'batido', precioUnitario: 20000 },
    { cantidad: 1, descripcion: 'empanada', precioUnitario: 5000 },
    { cantidad: 1, descripcion: 'cafe', precioUnitario: 20000 }
  ]
}

export default function ConfiguracionFacturaPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [previewKey, setPreviewKey] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    // Cargar configuración guardada
    const saved = localStorage.getItem('facturaConfig')
    if (saved) {
      try {
        setConfig(JSON.parse(saved))
      } catch (e) {
        console.error('Error cargando config:', e)
      }
    }
  }, [])

  const updateConfig = (path, value) => {
    const newConfig = { ...config }
    const keys = path.split('.')
    let obj = newConfig
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]]
    }
    obj[keys[keys.length - 1]] = parseFloat(value) || 0
    setConfig(newConfig)
  }

  const saveConfig = () => {
    localStorage.setItem('facturaConfig', JSON.stringify(config))
    toast.success('Configuración guardada')
  }

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG)
    localStorage.removeItem('facturaConfig')
    toast.success('Configuración restaurada')
  }

  const downloadTestPDF = () => {
    try {
      const pdfBlob = generarFacturaPDF(EJEMPLO_DATA, config)
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `factura_prueba_${Date.now()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF de prueba descargado')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error generando PDF')
    }
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Configuración de Factura</h1>
              <p className="text-gray-600">Ajusta las posiciones del PDF para tu factura pre-impresa</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={resetConfig}>
                <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
              </Button>
              <Button variant="outline" onClick={saveConfig}>
                <Save className="mr-2 h-4 w-4" /> Guardar
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={downloadTestPDF}>
                <Download className="mr-2 h-4 w-4" /> Descargar PDF Prueba
              </Button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
            <p className="text-yellow-800">
              <strong>📐 Instrucciones:</strong> Ajusta los valores X (horizontal) e Y (vertical) en milímetros. 
              El punto (0,0) es la esquina superior izquierda de la página. 
              Página: <strong>140mm x 215mm</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel de Configuración */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Posiciones (en mm)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="encabezado">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="encabezado">Encabezado</TabsTrigger>
                    <TabsTrigger value="tabla">Tabla</TabsTrigger>
                    <TabsTrigger value="totales">Totales</TabsTrigger>
                    <TabsTrigger value="iva">IVA</TabsTrigger>
                  </TabsList>

                  <TabsContent value="encabezado" className="space-y-4 mt-4">
                    {/* Fecha */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Label className="font-bold text-blue-800">📅 Fecha de Emisión</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">X (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.fecha.x} 
                            onChange={(e) => updateConfig('fecha.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.fecha.y} 
                            onChange={(e) => updateConfig('fecha.y', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tamaño</Label>
                          <Input 
                            type="number" 
                            value={config.fecha.fontSize} 
                            onChange={(e) => updateConfig('fecha.fontSize', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Nombre Cliente */}
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Label className="font-bold text-green-800">👤 Nombre del Cliente</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">X (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.clienteNombre.x} 
                            onChange={(e) => updateConfig('clienteNombre.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.clienteNombre.y} 
                            onChange={(e) => updateConfig('clienteNombre.y', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tamaño</Label>
                          <Input 
                            type="number" 
                            value={config.clienteNombre.fontSize} 
                            onChange={(e) => updateConfig('clienteNombre.fontSize', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* RUC */}
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Label className="font-bold text-purple-800">🆔 RUC / C.I.</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">X (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.clienteRuc.x} 
                            onChange={(e) => updateConfig('clienteRuc.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.clienteRuc.y} 
                            onChange={(e) => updateConfig('clienteRuc.y', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tamaño</Label>
                          <Input 
                            type="number" 
                            value={config.clienteRuc.fontSize} 
                            onChange={(e) => updateConfig('clienteRuc.fontSize', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* X de CONTADO */}
                    <div className="p-3 bg-red-50 rounded-lg">
                      <Label className="font-bold text-red-800">✓ "X" de CONTADO</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">X (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.contadoX.x} 
                            onChange={(e) => updateConfig('contadoX.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.contadoX.y} 
                            onChange={(e) => updateConfig('contadoX.y', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tamaño</Label>
                          <Input 
                            type="number" 
                            value={config.contadoX.fontSize} 
                            onChange={(e) => updateConfig('contadoX.fontSize', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="tabla" className="space-y-4 mt-4">
                    {/* Configuración de tabla */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Label className="font-bold">📋 Inicio de Tabla</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">Y inicial (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.tabla.inicioY} 
                            onChange={(e) => updateConfig('tabla.inicioY', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Alto por fila (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.tabla.altoFila} 
                            onChange={(e) => updateConfig('tabla.altoFila', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-orange-50 rounded-lg">
                      <Label className="font-bold text-orange-800">📊 Columnas (X en mm)</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">Cantidad</Label>
                          <Input 
                            type="number" 
                            value={config.tabla.columnas.cantidad.x} 
                            onChange={(e) => updateConfig('tabla.columnas.cantidad.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Descripción</Label>
                          <Input 
                            type="number" 
                            value={config.tabla.columnas.descripcion.x} 
                            onChange={(e) => updateConfig('tabla.columnas.descripcion.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Precio Unit.</Label>
                          <Input 
                            type="number" 
                            value={config.tabla.columnas.precioUnitario.x} 
                            onChange={(e) => updateConfig('tabla.columnas.precioUnitario.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Exentas</Label>
                          <Input 
                            type="number" 
                            value={config.tabla.columnas.exentas.x} 
                            onChange={(e) => updateConfig('tabla.columnas.exentas.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">5%</Label>
                          <Input 
                            type="number" 
                            value={config.tabla.columnas.iva5.x} 
                            onChange={(e) => updateConfig('tabla.columnas.iva5.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">10%</Label>
                          <Input 
                            type="number" 
                            value={config.tabla.columnas.iva10.x} 
                            onChange={(e) => updateConfig('tabla.columnas.iva10.x', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="totales" className="space-y-4 mt-4">
                    {/* Subtotal 10% */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Label className="font-bold text-blue-800">📊 Subtotal 10%</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">X (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.subtotal10.x} 
                            onChange={(e) => updateConfig('subtotal10.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.subtotal10.y} 
                            onChange={(e) => updateConfig('subtotal10.y', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Total en letras */}
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Label className="font-bold text-green-800">📝 Total en Letras</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">X (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.totalLetras.x} 
                            onChange={(e) => updateConfig('totalLetras.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.totalLetras.y} 
                            onChange={(e) => updateConfig('totalLetras.y', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tamaño</Label>
                          <Input 
                            type="number" 
                            value={config.totalLetras.fontSize} 
                            onChange={(e) => updateConfig('totalLetras.fontSize', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Total Final */}
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <Label className="font-bold text-orange-800">💰 TOTAL FINAL</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">X (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.totalFinal.x} 
                            onChange={(e) => updateConfig('totalFinal.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.totalFinal.y} 
                            onChange={(e) => updateConfig('totalFinal.y', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tamaño</Label>
                          <Input 
                            type="number" 
                            value={config.totalFinal.fontSize} 
                            onChange={(e) => updateConfig('totalFinal.fontSize', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="iva" className="space-y-4 mt-4">
                    {/* Liquidación IVA */}
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Label className="font-bold text-purple-800">🧾 Liquidación IVA 10%</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label className="text-xs">X (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.liquidacionIva10.x} 
                            onChange={(e) => updateConfig('liquidacionIva10.x', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y (mm)</Label>
                          <Input 
                            type="number" 
                            value={config.liquidacionIva10.y} 
                            onChange={(e) => updateConfig('liquidacionIva10.y', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Vista Previa */}
            <Card>
              <CardHeader>
                <CardTitle>Vista Previa de Datos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white border-2 border-dashed border-gray-300 p-4 rounded-lg font-mono text-sm">
                  <p className="text-gray-500 mb-4">Datos que se imprimirán:</p>
                  
                  <div className="space-y-2">
                    <p><strong>Fecha:</strong> {new Date().toLocaleDateString('es-PY')}</p>
                    <p><strong>Cliente:</strong> EDGAR LOPEZ</p>
                    <p><strong>RUC:</strong> 4126977-2</p>
                    <p><strong>Condición:</strong> X (CONTADO)</p>
                    
                    <hr className="my-3" />
                    
                    <p className="font-bold">Items:</p>
                    <div className="pl-4 space-y-1">
                      <p>1 | batido | 20.000 | 0 | 0 | 20.000</p>
                      <p>1 | empanada | 5.000 | 0 | 0 | 5.000</p>
                      <p>1 | cafe | 20.000 | 0 | 0 | 20.000</p>
                    </div>
                    
                    <hr className="my-3" />
                    
                    <p><strong>Subtotal 10%:</strong> 45.000</p>
                    <p><strong>Total letras:</strong> cuarenta y cinco mil guaraníes</p>
                    <p><strong>IVA 10%:</strong> 4.091</p>
                    <p><strong>TOTAL:</strong> 45.000</p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Dimensiones de página:</strong> 140mm x 215mm
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Tip:</strong> Descarga el PDF de prueba e imprímelo sobre tu factura 
                    pre-impresa para verificar las posiciones. Luego ajusta los valores según sea necesario.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* JSON Config para debug */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Configuración Actual (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs max-h-64">
                {JSON.stringify(config, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
