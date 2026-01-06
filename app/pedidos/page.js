'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useTheme } from '@/contexts/ThemeContext'
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
import { Plus, Minus, ShoppingCart, Search, Trash2, Edit, Play, CheckCircle, Volume2, VolumeX, Users, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'

export default function PedidosPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const { formatCurrency } = useCurrency()
  const { colors: themeColors } = useTheme()
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

  // Estados para Cuentas Separadas
  const [cuentasSeparadas, setCuentasSeparadas] = useState(false)
  const [cuentas, setCuentas] = useState([]) // Array de {nombre: string, productos: array}
  const [cuentaActiva, setCuentaActiva] = useState(0) // Índice de la cuenta activa
  const [nombreCuentaDialog, setNombreCuentaDialog] = useState(false)
  const [nuevoNombreCuenta, setNuevoNombreCuenta] = useState('')
  const [grupoMesaId, setGrupoMesaId] = useState(null)

  const [orderForm, setOrderForm] = useState({
    tipo: 'SALA',
    mesa: '',
    customer_id: '',
    nota_cliente: '',
    nota_cocina: ''
  })

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addItemsDialogOpen, setAddItemsDialogOpen] = useState(false)
  const [addingToOrder, setAddingToOrder] = useState(null) // Pedido al que se agregará más productos

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

  // Reproducir sonido cuando hay nuevo pedido - SONIDO MÁS LARGO
  const playNotificationSound = () => {
    if (!soundEnabled) return
    
    try {
      // Crear un sonido más largo de notificación usando Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      // Secuencia de tonos para sonido más largo y notorio
      const playTone = (frequency, startTime, duration) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime + startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration)
        
        oscillator.start(audioContext.currentTime + startTime)
        oscillator.stop(audioContext.currentTime + startTime + duration)
      }
      
      // Secuencia de 6 tonos para hacer el sonido más largo (~3 segundos)
      playTone(800, 0, 0.3)
      playTone(1000, 0.35, 0.3)
      playTone(1200, 0.7, 0.3)
      playTone(800, 1.05, 0.3)
      playTone(1000, 1.4, 0.3)
      playTone(1200, 1.75, 0.5)
      
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
        // PENDIENTE, NUEVO y PREPARANDO van a preparación
        if (order.estado === 'PENDIENTE' || order.estado === 'NUEVO' || order.estado === 'PREPARANDO') {
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

  const handleEliminarPedido = async (orderId) => {
    if (!confirm('¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      // Primero eliminar items del pedido
      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      // Luego eliminar el pedido
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (error) throw error
      toast.success('Pedido eliminado correctamente')
      loadOrders()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar pedido')
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

  // Función para abrir dialog de agregar más items a pedido entregado
  const openAddItemsDialog = (order) => {
    setAddingToOrder(order)
    setCart([])
    setAddItemsDialogOpen(true)
  }

  // Función para agregar más items a un pedido existente (entregado)
  const handleAddItemsToOrder = async () => {
    if (!addingToOrder || cart.length === 0) {
      toast.error('Agrega productos al carrito')
      return
    }

    try {
      // Crear nuevos order_items con marca de "adicional" en el nombre
      const orderItems = cart.map(item => ({
        order_id: addingToOrder.id,
        menu_item_id: item.id,
        nombre_item_snapshot: `🆕 ${item.nombre}`, // Marcar como nuevo con emoji
        precio_unitario: parseFloat(item.precio_base),
        cantidad: item.cantidad,
        total_item: parseFloat(item.precio_base) * item.cantidad
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error insertando items:', itemsError)
        throw itemsError
      }

      // Calcular nuevo total
      const newItemsTotal = cart.reduce((sum, item) => sum + (parseFloat(item.precio_base) * item.cantidad), 0)
      const currentTotal = parseFloat(addingToOrder.total) || 0
      const newTotal = currentTotal + newItemsTotal

      // Actualizar el pedido: cambiar estado a PENDIENTE y actualizar total
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          estado: 'PENDIENTE',
          total: newTotal,
          subtotal: newTotal
        })
        .eq('id', addingToOrder.id)

      if (updateError) {
        console.error('Error actualizando pedido:', updateError)
        throw updateError
      }

      // Reproducir sonido de nuevo pedido
      playNotificationSound()

      toast.success('Productos agregados al pedido. El pedido volvió a preparación.')
      setAddItemsDialogOpen(false)
      setAddingToOrder(null)
      setCart([])
      loadOrders()
    } catch (error) {
      console.error('Error agregando items:', error)
      toast.error('Error al agregar productos al pedido: ' + (error.message || 'Error desconocido'))
    }
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
    PENDIENTE: 'bg-orange-500',
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
          <div className="flex items-center space-x-3">
            {/* Toggle de sonido */}
            <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border">
              <button onClick={toggleSound} className="flex items-center space-x-2">
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5 text-green-600" />
                ) : (
                  <VolumeX className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm">{soundEnabled ? 'Sonido ON' : 'Sonido OFF'}</span>
              </button>
            </div>
            <Button 
              className="hover:opacity-90" 
              style={{ backgroundColor: themeColors.secondary }}
              onClick={openCreateDialog}
            >
              <Plus className="mr-2 h-4 w-4" /> Nuevo Pedido
            </Button>
          </div>
        </div>

        <Tabs defaultValue="preparacion" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preparacion">
              🔥 En Preparación
              {orders.preparacion.length > 0 && (
                <Badge className="ml-2" style={{ backgroundColor: themeColors.secondary }}>{orders.preparacion.length}</Badge>
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
                <Card key={order.id} className={`${order.estado === 'NUEVO' ? 'border-2 border-blue-400' : 'border-2 border-yellow-400'} ${order.origen === 'DIGITAL' ? 'ring-2 ring-purple-400' : ''}`}>
                  <CardHeader className={order.estado === 'NUEVO' ? 'bg-blue-50' : 'bg-yellow-50'}>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          Pedido #{order.id.slice(0, 8)}
                          {order.origen === 'DIGITAL' && (
                            <Badge className="ml-2 bg-purple-500 text-xs">📱 Cliente</Badge>
                          )}
                        </CardTitle>
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
                      {order.nota_cliente && (
                        <div className="bg-gray-100 p-2 rounded text-xs">
                          <span className="font-semibold">Nota:</span> {order.nota_cliente}
                        </div>
                      )}
                      {order.nota_cocina && (
                        <div className="bg-orange-100 p-2 rounded text-xs border border-orange-300">
                          <span className="font-semibold text-orange-700">🔔 Cocina:</span> 
                          <span className="text-orange-800">{order.nota_cocina}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <p className="font-semibold mb-1">Items:</p>
                        {order.order_items?.map(item => {
                          const esNuevo = item.nombre_item_snapshot?.startsWith('🆕') || item.es_adicional
                          return (
                            <div key={item.id} className={`flex justify-between text-xs py-1 ${esNuevo ? 'bg-green-100 px-2 rounded border-l-4 border-green-500 my-1' : ''}`}>
                              <span className={esNuevo ? 'font-bold text-green-700' : ''}>
                                {item.cantidad}x {item.nombre_item_snapshot}
                              </span>
                              <span className={esNuevo ? 'font-bold text-green-700' : ''}>
                                {formatCurrency(item.precio_unitario * item.cantidad)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-orange-600">{formatCurrency(order.total)}</span>
                      </div>
                      
                      {/* Botones de acción */}
                      <div className="flex flex-col space-y-2 mt-3">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditOrder(order)}>
                            <Edit className="h-4 w-4 mr-1" /> Editar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleEliminarPedido(order.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {order.estado === 'NUEVO' && (
                          <Button 
                            size="sm" 
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                            onClick={() => handleIniciarPreparacion(order.id)}
                          >
                            <Play className="h-4 w-4 mr-1" /> Iniciar Preparación
                          </Button>
                        )}
                        
                        {order.estado === 'PENDIENTE' && (
                          <Button 
                            size="sm" 
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                            onClick={() => handleIniciarPreparacion(order.id)}
                          >
                            <Play className="h-4 w-4 mr-1" /> Iniciar Preparación
                          </Button>
                        )}
                        
                        {order.estado === 'PREPARANDO' && (
                          <Button 
                            size="sm" 
                            className="w-full bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => handleMarcarListo(order.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Marcar Listo
                          </Button>
                        )}
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
                <Card key={order.id} className={order.origen === 'DIGITAL' ? 'ring-2 ring-purple-400' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          Pedido #{order.id.slice(0, 8)}
                          {order.origen === 'DIGITAL' && (
                            <Badge className="ml-2 bg-purple-500 text-xs">📱 Cliente</Badge>
                          )}
                        </CardTitle>
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
                      {order.nota_cliente && (
                        <div className="bg-gray-100 p-2 rounded text-xs">
                          <span className="font-semibold">Nota:</span> {order.nota_cliente}
                        </div>
                      )}
                      {order.nota_cocina && (
                        <div className="bg-orange-100 p-2 rounded text-xs border border-orange-300">
                          <span className="font-semibold text-orange-700">🔔 Cocina:</span> 
                          <span className="text-orange-800">{order.nota_cocina}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <p className="font-semibold mb-1">Items:</p>
                        {order.order_items?.map(item => {
                          const esNuevo = item.nombre_item_snapshot?.startsWith('🆕') || item.es_adicional
                          return (
                            <div key={item.id} className={`flex justify-between text-xs py-1 ${esNuevo ? 'bg-green-100 px-2 rounded border-l-4 border-green-500 my-1' : ''}`}>
                              <span className={esNuevo ? 'font-bold text-green-700' : ''}>
                                {item.cantidad}x {item.nombre_item_snapshot}
                              </span>
                              <span className={esNuevo ? 'font-bold text-green-700' : ''}>
                                {formatCurrency(item.precio_unitario * item.cantidad)}
                              </span>
                            </div>
                          )
                        })}
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
                        <Button size="sm" variant="destructive" onClick={() => handleEliminarPedido(order.id)}>
                          <Trash2 className="h-4 w-4" />
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
                <Card key={order.id} className="border-2 border-purple-200 hover:border-purple-400 transition-all">
                  <CardHeader className="bg-purple-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          Pedido #{order.id.slice(0, 8)}
                          {order.origen === 'DIGITAL' && (
                            <Badge className="ml-2 bg-purple-500 text-xs">📱 Cliente</Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(order.created_at).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <Badge className="bg-purple-500">ENTREGADO</Badge>
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
                      
                      {/* Botones de acción para pedidos entregados */}
                      <div className="flex flex-col space-y-2 mt-3">
                        <Button 
                          size="sm" 
                          className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                          onClick={() => openAddItemsDialog(order)}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Agregar más productos
                        </Button>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditOrder(order)}>
                            <Edit className="h-4 w-4 mr-1" /> Editar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleEliminarPedido(order.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${themeColors.secondary}15` }}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">TOTAL:</span>
                      <span className="font-bold text-2xl" style={{ color: themeColors.secondary }}>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full hover:opacity-90" 
                    style={{ backgroundColor: themeColors.secondary }}
                    onClick={handleCreateOrder} 
                    disabled={cart.length === 0}
                  >
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
                          <Button size="sm" variant="outline" onClick={() => updateCartQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-bold">{item.cantidad}</span>
                          <Button size="sm" variant="outline" onClick={() => updateCartQuantity(item.id, 1)}>
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

                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${themeColors.secondary}15` }}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">TOTAL:</span>
                      <span className="font-bold text-2xl" style={{ color: themeColors.secondary }}>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full hover:opacity-90" 
                    style={{ backgroundColor: themeColors.secondary }}
                    onClick={handleUpdateOrder} 
                    disabled={cart.length === 0}
                  >
                    Actualizar Pedido
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para Agregar Items a Pedido Entregado */}
        <Dialog open={addItemsDialogOpen} onOpenChange={(open) => {
          setAddItemsDialogOpen(open)
          if (!open) {
            setAddingToOrder(null)
            setCart([])
          }
        }}>
          <DialogContent className="max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] p-0 flex flex-col">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0 bg-purple-50">
              <DialogTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2 text-purple-600" />
                Agregar más productos al Pedido #{addingToOrder?.id?.slice(0, 8)}
              </DialogTitle>
              <p className="text-sm text-purple-600">
                Mesa: {addingToOrder?.mesa} | Total actual: {formatCurrency(addingToOrder?.total || 0)}
              </p>
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

                  <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                    {filteredProducts.map(product => (
                      <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow border-purple-100 hover:border-purple-300" onClick={() => addToCart(product)}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{product.nombre}</h4>
                              <p className="text-lg font-bold text-purple-600 mt-1">{formatCurrency(product.precio_base)}</p>
                            </div>
                            <Plus className="h-5 w-5 text-purple-500" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* Carrito de nuevos items */}
              <div className="lg:border-l lg:pl-4 flex flex-col mt-4 lg:mt-0">
                <h3 className="font-bold text-lg mb-3 flex items-center text-purple-700">
                  <ShoppingCart className="mr-2 h-5 w-5" /> Nuevos Items ({cart.length})
                </h3>

                {/* Items actuales del pedido */}
                {addingToOrder?.order_items?.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                    <p className="font-semibold text-sm mb-2 text-gray-600">Items actuales:</p>
                    {addingToOrder.order_items.map(item => (
                      <div key={item.id} className="flex justify-between text-xs py-1 text-gray-500">
                        <span>{item.cantidad}x {item.nombre_item_snapshot}</span>
                        <span>{formatCurrency(item.precio_unitario * item.cantidad)}</span>
                      </div>
                    ))}
                    <div className="border-t mt-2 pt-2 flex justify-between font-medium text-sm">
                      <span>Subtotal anterior:</span>
                      <span>{formatCurrency(addingToOrder.total)}</span>
                    </div>
                  </div>
                )}

                {/* Nuevos items */}
                <div className="space-y-2 mb-4 flex-1 overflow-y-auto max-h-[200px]">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Agrega productos para añadir al pedido</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="bg-purple-50 p-2 rounded-lg border border-purple-200">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-sm">{item.nombre}</span>
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
                          <span className="font-bold text-purple-600">{formatCurrency(parseFloat(item.precio_base) * item.cantidad)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t pt-3 space-y-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span>Pedido anterior:</span>
                      <span>{formatCurrency(addingToOrder?.total || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span>Nuevos items:</span>
                      <span className="text-purple-600">+ {formatCurrency(calculateTotal())}</span>
                    </div>
                    <div className="border-t border-purple-200 pt-2 flex justify-between items-center">
                      <span className="font-bold text-lg">NUEVO TOTAL:</span>
                      <span className="font-bold text-2xl text-purple-600">
                        {formatCurrency((parseFloat(addingToOrder?.total) || 0) + calculateTotal())}
                      </span>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-800">
                      ⚠️ Al agregar items, el pedido volverá a estado &quot;PENDIENTE&quot; para preparación
                    </p>
                  </div>

                  <Button 
                    className="w-full bg-purple-500 hover:bg-purple-600" 
                    onClick={handleAddItemsToOrder} 
                    disabled={cart.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar al Pedido
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
