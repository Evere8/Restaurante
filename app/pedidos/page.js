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
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, ShoppingCart, Search, Trash2, Edit } from 'lucide-react'
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
  const [orders, setOrders] = useState([])
  const [editingOrder, setEditingOrder] = useState(null)

  const [orderForm, setOrderForm] = useState({
    tipo: 'SALA',
    mesa: '',
    customer_id: '',
    nota_cliente: '',
    nota_cocina: ''
  })

  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && restaurant) {
      loadCategories()
      loadProducts()
      loadCustomers()
      loadOrders()
    }
  }, [user, restaurant])

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
    setOrders(data || [])
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

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Lista de Pedidos</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map(order => (
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
                    </div>
                  </CardContent>
                </Card>
              ))}
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
          <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-3 border-b">
              <DialogTitle>Nuevo Pedido</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto p-6" style={{WebkitOverflowScrolling: 'touch'}}>
              {/* Productos */}
              <div className="lg:col-span-2 space-y-4 overflow-y-auto pr-2 mobile-scroll">
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
              <div className="lg:border-l lg:pl-4 flex flex-col overflow-hidden mt-4 lg:mt-0">
                <h3 className="font-bold text-lg mb-3 flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" /> Carrito ({cart.length})
                </h3>

                <div className="flex-1 overflow-y-auto space-y-2 mb-4 mobile-scroll max-h-[40vh] lg:max-h-full">
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
        </div>
      </div>
    </div>
  )
}
