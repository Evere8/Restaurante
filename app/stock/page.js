'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit, Trash2, Package, AlertTriangle, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function StockPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const { formatCurrency } = useCurrency()
  const router = useRouter()
  const [stockItems, setStockItems] = useState([])
  const [editingItem, setEditingItem] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [alertas, setAlertas] = useState({
    stock_bajo: [],
    proximos_vencer: [],
    vencidos: []
  })

  const [stockForm, setStockForm] = useState({
    nombre: '',
    tipo: 'insumo',
    cantidad: '',
    costo: '',
    vencimiento: '',
    stock_minimo_alerta: 1,
    dias_alerta_vencimiento: 7,
    utilizable_en_receta: true,
    activo: true
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && restaurant) {
      loadStockItems()
      loadAlertas()
    }
  }, [user, restaurant])

  const loadStockItems = async () => {
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('nombre', { ascending: true })

    if (error) {
      toast.error('Error cargando stock')
      console.error('Error:', error)
    } else {
      setStockItems(data || [])
    }
  }

  const loadAlertas = async () => {
    try {
      // Llamar a la función SQL stock_alertas
      const { data, error } = await supabase
        .rpc('stock_alertas', { rest_id: restaurant.id })

      if (error) {
        console.error('Error cargando alertas:', error)
      } else {
        setAlertas(data || { stock_bajo: [], proximos_vencer: [], vencidos: [] })
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSaveItem = async () => {
    try {
      const dataToSave = {
        nombre: stockForm.nombre,
        tipo: stockForm.tipo,
        restaurant_id: restaurant.id,
        cantidad: parseFloat(stockForm.cantidad) || 0,
        costo: stockForm.costo ? parseFloat(stockForm.costo) : null,
        vencimiento: stockForm.vencimiento || null,
        stock_minimo_alerta: parseFloat(stockForm.stock_minimo_alerta),
        dias_alerta_vencimiento: parseInt(stockForm.dias_alerta_vencimiento),
        utilizable_en_receta: stockForm.utilizable_en_receta,
        activo: stockForm.activo
      }

      if (editingItem) {
        const { error } = await supabase
          .from('stock_items')
          .update(dataToSave)
          .eq('id', editingItem.id)

        if (error) throw error
        toast.success('Producto actualizado')
      } else {
        const { error } = await supabase
          .from('stock_items')
          .insert([dataToSave])

        if (error) throw error
        toast.success('Producto creado')
      }

      setDialogOpen(false)
      resetForm()
      loadStockItems()
      loadAlertas()
    } catch (error) {
      console.error('Error guardando producto:', error)
      toast.error('Error al guardar producto')
    }
  }

  const handleDeleteItem = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    const { error } = await supabase
      .from('stock_items')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error eliminando producto')
    } else {
      toast.success('Producto eliminado')
      loadStockItems()
      loadAlertas()
    }
  }

  const resetForm = () => {
    setStockForm({
      nombre: '',
      tipo: 'insumo',
      cantidad: '',
      costo: '',
      vencimiento: '',
      stock_minimo_alerta: 1,
      dias_alerta_vencimiento: 7,
      utilizable_en_receta: true,
      activo: true
    })
    setEditingItem(null)
  }

  const openEditItem = (item) => {
    setEditingItem(item)
    setStockForm({
      nombre: item.nombre,
      tipo: item.tipo,
      cantidad: item.cantidad,
      costo: item.costo || '',
      vencimiento: item.vencimiento || '',
      stock_minimo_alerta: item.stock_minimo_alerta,
      dias_alerta_vencimiento: item.dias_alerta_vencimiento,
      utilizable_en_receta: item.utilizable_en_receta,
      activo: item.activo
    })
    setDialogOpen(true)
  }

  const handleEnviarWhatsApp = () => {
    const insumosBajos = alertas.stock_bajo || []
    
    if (insumosBajos.length === 0) {
      toast.info('No hay insumos para reponer')
      return
    }

    let mensaje = '📋 *Lista de Insumos para Reponer*\n\n'
    insumosBajos.forEach((item, index) => {
      mensaje += `${index + 1}. ${item.nombre} - Stock actual: ${item.cantidad} (Mínimo: ${item.stock_minimo})\n`
    })
    mensaje += '\n_Generado desde Restaurant CRM_'

    const encoded = encodeURIComponent(mensaje)
    const whatsappUrl = `https://wa.me/?text=${encoded}`
    window.open(whatsappUrl, '_blank')
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  const insumosUtilizables = stockItems.filter(item => item.utilizable_en_receta && item.activo)
  const productosVendibles = stockItems.filter(item => item.tipo === 'vendible' && item.activo)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Gestión de Stock</h1>
              <p className="text-gray-600">Control de inventario, insumos y productos</p>
            </div>
          </div>

          <Tabs defaultValue="productos" className="space-y-4">
            <TabsList>
              <TabsTrigger value="productos">Productos</TabsTrigger>
              <TabsTrigger value="avencer">
                Próximos a Vencer
                {alertas.proximos_vencer?.length > 0 && (
                  <Badge className="ml-2 bg-yellow-500">{alertas.proximos_vencer.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="vencidos">
                Vencidos
                {alertas.vencidos?.length > 0 && (
                  <Badge className="ml-2 bg-red-500">{alertas.vencidos.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reponer">
                Reponer
                {alertas.stock_bajo?.length > 0 && (
                  <Badge className="ml-2 bg-orange-500">{alertas.stock_bajo.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="productos" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open)
                  if (!open) resetForm()
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600">
                      <Plus className="mr-2 h-4 w-4" /> Nuevo Producto/Insumo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingItem ? 'Editar' : 'Nuevo'} Producto/Insumo</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label>Nombre *</Label>
                        <Input value={stockForm.nombre} onChange={(e) => setStockForm({...stockForm, nombre: e.target.value})} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select value={stockForm.tipo} onValueChange={(val) => setStockForm({...stockForm, tipo: val})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="insumo">Insumo</SelectItem>
                            <SelectItem value="vendible">Vendible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cantidad *</Label>
                        <Input type="number" step="0.01" value={stockForm.cantidad} onChange={(e) => setStockForm({...stockForm, cantidad: e.target.value})} placeholder="Ej: 100" />
                      </div>

                      <div className="space-y-2">
                        <Label>Costo</Label>
                        <Input type="number" step="0.01" value={stockForm.costo} onChange={(e) => setStockForm({...stockForm, costo: e.target.value})} />
                      </div>

                      <div className="space-y-2">
                        <Label>Fecha de Vencimiento</Label>
                        <Input type="date" value={stockForm.vencimiento} onChange={(e) => setStockForm({...stockForm, vencimiento: e.target.value})} />
                      </div>

                      <div className="space-y-2">
                        <Label>Stock Mínimo (alerta)</Label>
                        <Input type="number" value={stockForm.stock_minimo_alerta} onChange={(e) => setStockForm({...stockForm, stock_minimo_alerta: e.target.value})} />
                      </div>

                      <div className="space-y-2">
                        <Label>Días Alerta Vencimiento</Label>
                        <Input type="number" value={stockForm.dias_alerta_vencimiento} onChange={(e) => setStockForm({...stockForm, dias_alerta_vencimiento: e.target.value})} />
                      </div>

                      <div className="col-span-2 flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={stockForm.utilizable_en_receta} 
                            onCheckedChange={(checked) => setStockForm({...stockForm, utilizable_en_receta: checked})} 
                          />
                          <Label>Utilizable en recetas</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={stockForm.activo} 
                            onCheckedChange={(checked) => setStockForm({...stockForm, activo: checked})} 
                          />
                          <Label>Activo</Label>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                      <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSaveItem}>Guardar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {stockItems.map(item => (
                  <Card key={item.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{item.nombre}</CardTitle>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant={item.tipo === 'insumo' ? 'default' : 'secondary'}>
                              {item.tipo === 'insumo' ? '🧪 Insumo' : '📦 Vendible'}
                            </Badge>
                            {item.utilizable_en_receta && (
                              <Badge variant="outline">🍳 Receta</Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant={item.activo ? 'default' : 'destructive'}>
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cantidad:</span>
                          <span className="font-bold">{item.cantidad}</span>
                        </div>
                        {item.costo && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Costo:</span>
                            <span className="font-medium">{formatCurrency(item.costo)}</span>
                          </div>
                        )}
                        {item.vencimiento && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Vence:</span>
                            <span className="font-medium">{new Date(item.vencimiento).toLocaleDateString('es-ES')}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stock mínimo:</span>
                          <span className="font-medium">{item.stock_minimo_alerta}</span>
                        </div>
                        {item.cantidad <= item.stock_minimo_alerta && (
                          <div className="bg-yellow-50 border border-yellow-200 p-2 rounded flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="text-xs text-yellow-700 font-semibold">Stock Bajo</span>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditItem(item)}>
                          <Edit className="h-4 w-4 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {stockItems.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No hay productos en stock. Crea tu primer producto.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="avencer">
              <Card className="border-yellow-500 border-2">
                <CardHeader className="bg-yellow-50">
                  <CardTitle className="flex items-center space-x-2 text-yellow-700">
                    <Package className="h-5 w-5" />
                    <span>🟡 Productos Próximos a Vencer</span>
                    {alertas.proximos_vencer?.length > 0 && (
                      <Badge className="bg-yellow-500">{alertas.proximos_vencer.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {alertas.proximos_vencer?.length > 0 ? (
                    <div className="space-y-2">
                      {alertas.proximos_vencer.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div>
                            <p className="font-medium">{item.nombre}</p>
                            <p className="text-sm text-gray-600">
                              Vence: {new Date(item.vencimiento).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <Badge className="bg-yellow-500">{item.dias_restantes} días</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No hay productos próximos a vencer</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vencidos">
              <Card className="border-red-500 border-2">
                <CardHeader className="bg-red-50">
                  <CardTitle className="flex items-center space-x-2 text-red-700">
                    <Package className="h-5 w-5" />
                    <span>🔴 Productos VENCIDOS</span>
                    {alertas.vencidos?.length > 0 && (
                      <Badge className="bg-red-600">{alertas.vencidos.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {alertas.vencidos?.length > 0 ? (
                    <div className="space-y-2">
                      {alertas.vencidos.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                          <div>
                            <p className="font-medium text-red-900">{item.nombre}</p>
                            <p className="text-sm text-red-600">
                              Venció: {new Date(item.vencimiento).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <Badge className="bg-red-600">Hace {item.dias_vencido} días</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No hay productos vencidos</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reponer">
              <Card className="border-orange-500 border-2">
                <CardHeader className="bg-orange-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-orange-700">
                      <Package className="h-5 w-5" />
                      <span>📋 Insumos para Reponer</span>
                      {alertas.stock_bajo?.length > 0 && (
                        <Badge className="bg-orange-500">{alertas.stock_bajo.length}</Badge>
                      )}
                    </CardTitle>
                    <Button 
                      className="bg-green-500 hover:bg-green-600"
                      onClick={handleEnviarWhatsApp}
                      disabled={!alertas.stock_bajo || alertas.stock_bajo.length === 0}
                    >
                      <Send className="mr-2 h-4 w-4" /> Enviar por WhatsApp
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {alertas.stock_bajo?.length > 0 ? (
                    <div className="space-y-2">
                      {alertas.stock_bajo.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div>
                            <p className="font-medium">{item.nombre}</p>
                            <p className="text-sm text-gray-600">
                              Stock actual: <strong>{item.cantidad}</strong> | Mínimo: {item.stock_minimo}
                            </p>
                          </div>
                          <Badge className="bg-orange-500">Reponer</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Todos los insumos tienen stock suficiente</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
