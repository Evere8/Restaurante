'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Minus, ShoppingCart, Search, Trash2, Edit, Play, CheckCircle, Volume2, VolumeX } from 'lucide-react'
import { toast } from 'sonner'

export default function PedidosPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const { formatCurrency } = useCurrency()
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState({
    preparacion: [],
    paraEntregar: [],
    entregados: []
  })
  const [editingOrder, setEditingOrder] = useState(null)
  const [previousOrderCount, setPreviousOrderCount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audioRef = useRef(null)

  const [orderForm, setOrderForm] = useState({
    tipo: 'SALA',
    mesa: '',
    customer_id: '',
    nota_cliente: '',
    nota_cocina: ''
  })

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    // Cargar preferencia de sonido
    const saved = localStorage.getItem('pedidosSoundEnabled')
    if (saved !== null) {
      setSoundEnabled(saved === 'true')
    }
  }, [])

  useEffect(() => {
    if (user && restaurant) {
      loadCategories()
      loadProducts()
      loadCustomers()
      loadOrders()
      
      // Auto-refresh cada 15 segundos para detectar nuevos pedidos
      const interval = setInterval(loadOrders, 15000)
      return () => clearInterval(interval)
    }
  }, [user, restaurant])

  // Reproducir sonido cuando hay nuevo pedido
  const playNotificationSound = () => {
    if (!soundEnabled) return
    
    try {
      // Crear un sonido simple de notificación usando Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
      
      // Segundo beep
      setTimeout(() => {
        const osc2 = audioContext.createOscillator()
        const gain2 = audioContext.createGain()
        osc2.connect(gain2)
        gain2.connect(audioContext.destination)
        osc2.frequency.value = 1000
        osc2.type = 'sine'
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime)
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        osc2.start(audioContext.currentTime)
        osc2.stop(audioContext.currentTime + 0.5)
      }, 200)
    } catch (error) {
      console.log('Audio not supported:', error)
    }
  }

  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    localStorage.setItem('pedidosSoundEnabled', String(newValue))
    toast.success(newValue ? 'Sonido activado' : 'Sonido desactivado')
  }

  const loadCategories = async () => {
    const { data } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('activo', true)
      .order('orden', { ascending: true })
    setCategories(data || [])
  }

  const loadProducts = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('disponible', true)
    setProducts(data || [])
  }

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('nombre', { ascending: true })
    setCustomers(data || [])
  }

  const loadOrders = async () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', twoDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    // Categorizar pedidos por estado
    const categorized = {
      preparacion: [],
      paraEntregar: [],
      entregados: []
    }

    if (data) {
      data.forEach(order => {
        if (order.estado === 'NUEVO' || order.estado === 'PREPARANDO') {
          categorized.preparacion.push(order)
        } else if (order.estado === 'LISTO') {
          categorized.paraEntregar.push(order)
        } else if (order.estado === 'ENTREGADO') {
          categorized.entregados.push(order)
        }
      })
    }

    // Detectar si hay nuevos pedidos
    const currentPrepCount = categorized.preparacion.length
    if (previousOrderCount > 0 && currentPrepCount > previousOrderCount) {
      playNotificationSound()
      toast.info('🔔 ¡Nuevo pedido recibido!')
    }
    setPreviousOrderCount(currentPrepCount)

    setOrders(categorized)
  }

  // Funciones para cambiar estado del pedido
  const handleIniciarPreparacion = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ estado: 'PREPARANDO' })
        .eq('id', orderId)

      if (error) throw error
      toast.success('Pedido en preparación')
      loadOrders()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar pedido')
    }
  }

  const handleMarcarListo = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ estado: 'LISTO' })
        .eq('id', orderId)

      if (error) throw error
      toast.success('Pedido marcado como listo')
      loadOrders()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar pedido')
    }
  }

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...product, cantidad: 1 }])
    }
    toast.success(`${product.nombre} agregado al carrito`)
  }

  const updateCartQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.cantidad + delta
        return newQuantity > 0 ? { ...item, cantidad: newQuantity } : null
      }
      return item
    }).filter(Boolean))
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (parseFloat(item.precio_base) * item.cantidad), 0)
  }

  const handleMarcarEntregado = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ estado: 'ENTREGADO' })
        .eq('id', orderId)

      if (error) throw error
      toast.success('Pedido marcado como entregado')
      loadOrders()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar pedido')
    }
  }

  const openEditOrder = (order) => {
    setEditingOrder(order)
    setCart(order.order_items.map(item => ({
      id: item.menu_item_id,
      nombre: item.nombre_item_snapshot,
      precio_base: item.precio_unitario,
      cantidad: item.cantidad
    })))
    setOrderForm({
      tipo: order.tipo,
      mesa: order.mesa || '',
      customer_id: order.customer_id || '',
      nota_cliente: order.nota_cliente || '',
      nota_cocina: order.nota_cocina || ''
    })
    setEditDialogOpen(true)
  }

  const handleUpdateOrder = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    try {
      const subtotal = calculateTotal()
      const total = subtotal

      // Actualizar orden
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          tipo: orderForm.tipo,
          mesa: orderForm.mesa,
          customer_id: orderForm.customer_id || null,
          nota_cliente: orderForm.nota_cliente,
          nota_cocina: orderForm.nota_cocina,
          total: total
        })
        .eq('id', editingOrder.id)

      if (orderError) throw orderError

      // Eliminar items viejos
      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', editingOrder.id)

      // Insertar items nuevos
      const orderItems = cart.map(item => ({
        order_id: editingOrder.id,
        menu_item_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: parseFloat(item.precio_base),
        nombre_item_snapshot: item.nombre
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      toast.success('Pedido actualizado exitosamente')
      setEditDialogOpen(false)
      setEditingOrder(null)
      setCart([])
      setOrderForm({
        tipo: 'SALA',
        mesa: '',
        customer_id: '',
        nota_cliente: '',
        nota_cocina: ''
      })
      loadOrders()
    } catch (error) {
      console.error('Error actualizando pedido:', error)
      toast.error('Error al actualizar pedido')
    }
  }

  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    if (orderForm.tipo === 'SALA' && !orderForm.mesa) {
      toast.error('Debes especificar el número de mesa')
      return
    }

    try {
      const subtotal = calculateTotal()
      const total = subtotal

      // Crear pedido
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([{
          restaurant_id: restaurant.id,
          customer_id: orderForm.customer_id || null,
          tipo: orderForm.tipo,
          mesa: orderForm.mesa,
          subtotal,
          total,
          estado: 'NUEVO',
          nota_cliente: orderForm.nota_cliente,
          nota_cocina: orderForm.nota_cocina
        }])
        .select()
        .single()

      if (orderError) throw orderError

      // Crear items del pedido
      const orderItems = cart.map(item => ({
        order_id: newOrder.id,
        menu_item_id: item.id,
        nombre_item_snapshot: item.nombre,
        precio_unitario: parseFloat(item.precio_base),
        cantidad: item.cantidad,
        total_item: parseFloat(item.precio_base) * item.cantidad
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      toast.success('Pedido creado exitosamente')
      setCreateDialogOpen(false)
      resetForm()
      loadOrders()
    } catch (error) {
      console.error('Error creando pedido:', error)
      toast.error('Error al crear pedido')
    }
  }

  const resetForm = () => {
    setCart([])
    setOrderForm({
      tipo: 'SALA',
      mesa: '',
      customer_id: '',
      nota_cliente: '',
      nota_cocina: ''
    })
    setEditingOrder(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory
    const matchesSearch = !searchTerm || p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const estadoColors = {
    NUEVO: 'bg-blue-500',
    PREPARANDO: 'bg-yellow-500',
    LISTO: 'bg-green-500',
    ENTREGADO: 'bg-purple-500',
    PAGADO: 'bg-gray-500'
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gestión de Pedidos</h1>
            <p className="text-gray-600">Crea y administra pedidos</p>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Pedido
          </Button>
        </div>

        <Tabs defaultValue="preparacion" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preparacion">
              🔥 En Preparación
              {orders.preparacion.length > 0 && (
                <Badge className="ml-2 bg-orange-500">{orders.preparacion.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="paraEntregar">
              📦 Para Entregar
              {orders.paraEntregar.length > 0 && (
                <Badge className="ml-2 bg-blue-500">{orders.paraEntregar.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="entregados">
              ✅ Entregados
              {orders.entregados.length > 0 && (
                <Badge className="ml-2 bg-green-500">{orders.entregados.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preparacion">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.preparacion.map(order => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(order.created_at).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <Badge className={estadoColors[order.estado]}>{order.estado}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium">{order.tipo}</span>
                      </div>
                      {order.mesa && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mesa:</span>
                          <span className="font-medium">{order.mesa}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <p className="font-semibold mb-1">Items:</p>
                        {order.order_items?.map(item => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <span>{item.cantidad}x {item.nombre_item_snapshot}</span>
                            <span>{formatCurrency(item.precio_unitario * item.cantidad)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-orange-600">{formatCurrency(order.total)}</span>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditOrder(order)}>
                          <Edit className="h-4 w-4 mr-1" /> Editar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {orders.preparacion.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No hay pedidos en preparación
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="paraEntregar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.paraEntregar.map(order => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(order.created_at).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <Badge className="bg-blue-500">LISTO</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium">{order.tipo}</span>
                      </div>
                      {order.mesa && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mesa:</span>
                          <span className="font-medium">{order.mesa}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <p className="font-semibold mb-1">Items:</p>
                        {order.order_items?.map(item => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <span>{item.cantidad}x {item.nombre_item_snapshot}</span>
                            <span>{formatCurrency(item.precio_unitario * item.cantidad)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-orange-600">{formatCurrency(order.total)}</span>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditOrder(order)}>
                          <Edit className="h-4 w-4 mr-1" /> Editar
                        </Button>
                        <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600" onClick={() => handleMarcarEntregado(order.id)}>
                          ✅ Entregado
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {orders.paraEntregar.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No hay pedidos listos para entregar
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="entregados">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.entregados.map(order => (
                <Card key={order.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(order.created_at).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <Badge className="bg-green-500">ENTREGADO</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium">{order.tipo}</span>
                      </div>
                      {order.mesa && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mesa:</span>
                          <span className="font-medium">{order.mesa}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <p className="font-semibold mb-1">Items:</p>
                        {order.order_items?.map(item => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <span>{item.cantidad}x {item.nombre_item_snapshot}</span>
                            <span>{formatCurrency(item.precio_unitario * item.cantidad)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-orange-600">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {orders.entregados.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No hay pedidos entregados en las últimas 48 horas
                </div>
              )}
            </div>

            {orders.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay pedidos en los últimos 2 días</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog Crear Pedido */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogContent className="max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] p-0 flex flex-col">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
              <DialogTitle>Nuevo Pedido</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-scroll p-4 sm:p-6" style={{WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain'}}>
              {/* Productos */}
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Buscar producto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={selectedCategory || 'all'} onValueChange={(val) => setSelectedCategory(val === 'all' ? null : val)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {filteredProducts.map(product => (
                      <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => addToCart(product)}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{product.nombre}</h4>
                              <p className="text-lg font-bold text-orange-600 mt-1">{formatCurrency(product.precio_base)}</p>
                            </div>
                            <Plus className="h-5 w-5 text-orange-500" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* Carrito */}
              <div className="lg:border-l lg:pl-4 flex flex-col mt-4 lg:mt-0">
                <h3 className="font-bold text-lg mb-3 flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" /> Carrito ({cart.length})
                </h3>

                <div className="space-y-2 mb-4">
                  {cart.map(item => (
                    <div key={item.id} className="bg-gray-50 p-2 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium">{item.nombre}</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" onClick={() => updateCartQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-bold w-8 text-center">{item.cantidad}</span>
                          <Button size="sm" variant="outline" onClick={() => updateCartQuantity(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-bold text-orange-600">{formatCurrency(parseFloat(item.precio_base) * item.cantidad)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 space-y-3">
                  <div className="space-y-2">
                    <Label>Tipo de Pedido</Label>
                    <Select value={orderForm.tipo} onValueChange={(val) => setOrderForm({...orderForm, tipo: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALA">Sala</SelectItem>
                        <SelectItem value="PARA_LLEVAR">Para Llevar</SelectItem>
                        <SelectItem value="DELIVERY">Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {orderForm.tipo === 'SALA' && (
                    <div className="space-y-2">
                      <Label>Mesa *</Label>
                      <Input value={orderForm.mesa} onChange={(e) => setOrderForm({...orderForm, mesa: e.target.value})} placeholder="Ej: 5" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Cliente (opcional)</Label>
                    <Select value={orderForm.customer_id} onValueChange={(val) => setOrderForm({...orderForm, customer_id: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>{customer.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notas para cocina</Label>
                    <Textarea value={orderForm.nota_cocina} onChange={(e) => setOrderForm({...orderForm, nota_cocina: e.target.value})} rows={2} />
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">TOTAL:</span>
                      <span className="font-bold text-2xl text-orange-600">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>

                  <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handleCreateOrder} disabled={cart.length === 0}>
                    Crear Pedido
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edición */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] p-0 flex flex-col">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
              <DialogTitle>Editar Pedido #{editingOrder?.id?.slice(0, 8)}</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-scroll p-4 sm:p-6" style={{WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain'}}>
              {/* Productos */}
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Buscar producto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={selectedCategory || 'all'} onValueChange={(val) => setSelectedCategory(val === 'all' ? null : val)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {filteredProducts.map(product => (
                      <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => addToCart(product)}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{product.nombre}</h4>
                              <p className="text-lg font-bold text-orange-600 mt-1">{formatCurrency(product.precio_base)}</p>
                            </div>
                            <Plus className="h-5 w-5 text-orange-500" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* Carrito */}
              <div className="lg:border-l lg:pl-4 flex flex-col mt-4 lg:mt-0">
                <h3 className="font-bold text-lg mb-3 flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" /> Carrito ({cart.length})
                </h3>

                <div className="space-y-2 mb-4">
                  {cart.map(item => (
                    <div key={item.id} className="bg-gray-50 p-2 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">{item.nombre}</span>
                        <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-bold">{item.cantidad}</span>
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-bold text-orange-600">{formatCurrency(parseFloat(item.precio_base) * item.cantidad)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Tipo de Pedido</Label>
                    <Select value={orderForm.tipo} onValueChange={(val) => setOrderForm({...orderForm, tipo: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALA">Sala</SelectItem>
                        <SelectItem value="DELIVERY">Delivery</SelectItem>
                        <SelectItem value="RECOGER">Para Recoger</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {orderForm.tipo === 'SALA' && (
                    <div className="space-y-2">
                      <Label>Mesa</Label>
                      <Input value={orderForm.mesa} onChange={(e) => setOrderForm({...orderForm, mesa: e.target.value})} placeholder="Número de mesa" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Notas para cocina</Label>
                    <Textarea value={orderForm.nota_cocina} onChange={(e) => setOrderForm({...orderForm, nota_cocina: e.target.value})} rows={2} />
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">TOTAL:</span>
                      <span className="font-bold text-2xl text-orange-600">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>

                  <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handleUpdateOrder} disabled={cart.length === 0}>
                    Actualizar Pedido
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  )
}
