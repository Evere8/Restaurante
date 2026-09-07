'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import OrderTimer from '@/components/OrderTimer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowRight, Edit, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function KDSPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState({
    PENDIENTE: [],
    NUEVO: [],
    PREPARANDO: [],
    LISTO: []
  })
  const [viewingOrder, setViewingOrder] = useState(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && restaurant) {
      loadOrders()
      
      // Suscripción a cambios en tiempo real
      const channel = supabase
        .channel('kds-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurant.id}`
          },
          (payload) => {
            console.log('Cambio detectado:', payload)
            loadOrders()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, restaurant])

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), customers(nombre)')
      .eq('restaurant_id', restaurant.id)
      .in('estado', ['PENDIENTE', 'NUEVO', 'PREPARANDO', 'LISTO'])
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error cargando pedidos:', error)
      return
    }

    const grouped = {
      PENDIENTE: [],
      NUEVO: [],
      PREPARANDO: [],
      LISTO: []
    }

    data.forEach(order => {
      if (grouped[order.estado]) {
        grouped[order.estado].push(order)
      }
    })

    setOrders(grouped)
  }

  const updateOrderStatus = async (orderId, currentStatus) => {
    const statusFlow = {
      PENDIENTE: 'PREPARANDO',
      NUEVO: 'PREPARANDO',
      PREPARANDO: 'LISTO',
      LISTO: 'ENTREGADO'
    }

    const newStatus = statusFlow[currentStatus]
    if (!newStatus) return

    const updateData = { estado: newStatus }
    
    // Registrar tiempo de inicio de preparación
    if (newStatus === 'PREPARANDO') {
      updateData.tiempo_inicio_preparacion = new Date().toISOString()
    }
    
    // Registrar tiempo de finalización
    if (newStatus === 'LISTO') {
      updateData.tiempo_listo = new Date().toISOString()
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (error) {
      toast.error('Error actualizando pedido')
    } else {
      toast.success(`Pedido movido a ${newStatus}`)
      loadOrders()
    }
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  const getStatusButtonText = (status) => {
    const buttons = {
      PENDIENTE: 'Iniciar Preparación',
      NUEVO: 'Iniciar Preparación',
      PREPARANDO: 'Marcar Listo',
      LISTO: 'Entregar'
    }
    return buttons[status]
  }

  // Helper para detectar si un item es nuevo (agregado después del pedido original)
  const isNewItem = (itemName) => {
    return itemName && itemName.startsWith('🆕')
  }

  // Renderizar item de orden con estilo especial para items nuevos
  const renderOrderItem = (item) => {
    const itemIsNew = isNewItem(item.nombre_item_snapshot)
    const displayName = itemIsNew 
      ? item.nombre_item_snapshot.replace('🆕 ', '') 
      : item.nombre_item_snapshot

    return (
      <div 
        key={item.id} 
        className={`flex items-center justify-between text-sm p-2 rounded transition-all ${
          itemIsNew 
            ? 'bg-gradient-to-r from-green-100 to-emerald-50 border-2 border-green-400 animate-pulse shadow-sm' 
            : 'bg-gray-50'
        }`}
      >
        <span className="font-semibold">{item.cantidad}x</span>
        <span className="flex-1 ml-2 flex items-center">
          {itemIsNew && (
            <span className="inline-flex items-center mr-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
              <Sparkles className="h-3 w-3 mr-1" />
              NUEVO
            </span>
          )}
          {displayName}
        </span>
      </div>
    )
  }

  const tipoColors = {
    SALA: 'bg-blue-100 text-blue-800',
    PARA_LLEVAR: 'bg-green-100 text-green-800',
    DELIVERY: 'bg-purple-100 text-purple-800'
  }

  // Combinar PENDIENTE y NUEVO para mostrar juntos
  const pedidosNuevos = [...(orders.PENDIENTE || []), ...(orders.NUEVO || [])]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">KDS - Kitchen Display System</h1>
          <p className="text-gray-600">Sistema de pantalla para cocina (Actualización en tiempo real)</p>
        </div>

        <Tabs defaultValue="NUEVO" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="NUEVO" className="relative">
              🆕 Nuevos
              {pedidosNuevos.length > 0 && (
                <Badge className="ml-2 bg-blue-500">{pedidosNuevos.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="PREPARANDO" className="relative">
              🔥 En Preparación
              {orders.PREPARANDO.length > 0 && (
                <Badge className="ml-2 bg-yellow-500">{orders.PREPARANDO.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="LISTO" className="relative">
              ✅ Listos
              {orders.LISTO.length > 0 && (
                <Badge className="ml-2 bg-green-500">{orders.LISTO.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="NUEVO" className="space-y-4">
            {pedidosNuevos.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <span className="text-5xl">📭</span>
                <p className="mt-4">No hay pedidos nuevos</p>
              </div>
            )}
            {pedidosNuevos.map(order => (
                <Card key={order.id} className="border-blue-200 border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">#{order.id.slice(0, 8)}</CardTitle>
                        <Badge className={tipoColors[order.tipo]} variant="outline">
                          {order.tipo}
                        </Badge>
                      </div>
                      <OrderTimer 
                        createdAt={order.created_at}
                        estado={order.estado}
                        tiempoInicio={order.tiempo_inicio_preparacion}
                        tiempoListo={order.tiempo_listo}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {order.mesa && (
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="font-semibold">Mesa: {order.mesa}</span>
                      </div>
                    )}
                    
                    {order.customers && (
                      <div className="text-sm">
                        <span className="text-gray-600">Cliente: </span>
                        <span className="font-medium">{order.customers.nombre}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      {order.order_items?.map(item => renderOrderItem(item))}
                    </div>

                    {order.nota_cocina && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 text-sm">
                        <p className="font-semibold text-yellow-800">📝 Nota Cocina:</p>
                        <p className="text-yellow-900">{order.nota_cocina}</p>
                      </div>
                    )}

                    {order.nota_cliente && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-2 text-sm">
                        <p className="font-semibold text-blue-800">💬 Nota Cliente:</p>
                        <p className="text-blue-900">{order.nota_cliente}</p>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button 
                        className="flex-1 bg-blue-500 hover:bg-blue-600"
                        onClick={() => updateOrderStatus(order.id, 'NUEVO')}
                      >
                        {getStatusButtonText('NUEVO')} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewingOrder(order)
                          setViewDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {orders.NUEVO.length === 0 && (
                <Card className="bg-gray-50">
                  <CardContent className="py-8 text-center text-gray-500">
                    No hay pedidos nuevos
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          <TabsContent value="PREPARANDO" className="space-y-4">
            {orders.PREPARANDO.map(order => (
                <Card key={order.id} className="border-yellow-200 border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">#{order.id.slice(0, 8)}</CardTitle>
                        <Badge className={tipoColors[order.tipo]} variant="outline">
                          {order.tipo}
                        </Badge>
                      </div>
                      <OrderTimer 
                        createdAt={order.created_at}
                        estado={order.estado}
                        tiempoInicio={order.tiempo_inicio_preparacion}
                        tiempoListo={order.tiempo_listo}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {order.mesa && (
                      <div className="bg-yellow-50 p-2 rounded">
                        <span className="font-semibold">Mesa: {order.mesa}</span>
                      </div>
                    )}

                    {order.customers && (
                      <div className="text-sm">
                        <span className="text-gray-600">Cliente: </span>
                        <span className="font-medium">{order.customers.nombre}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      {order.order_items?.map(item => renderOrderItem(item))}
                    </div>

                    {order.nota_cocina && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 text-sm">
                        <p className="font-semibold text-yellow-800">📝 Nota Cocina:</p>
                        <p className="text-yellow-900">{order.nota_cocina}</p>
                      </div>
                    )}

                    {order.nota_cliente && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-2 text-sm">
                        <p className="font-semibold text-blue-800">💬 Nota Cliente:</p>
                        <p className="text-blue-900">{order.nota_cliente}</p>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button 
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                        onClick={() => updateOrderStatus(order.id, 'PREPARANDO')}
                      >
                        {getStatusButtonText('PREPARANDO')} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewingOrder(order)
                          setViewDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {orders.PREPARANDO.length === 0 && (
                <Card className="bg-gray-50">
                  <CardContent className="py-8 text-center text-gray-500">
                    No hay pedidos en preparación
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          <TabsContent value="LISTO" className="space-y-4">
            {orders.LISTO.map(order => (
                <Card key={order.id} className="border-green-200 border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">#{order.id.slice(0, 8)}</CardTitle>
                        <Badge className={tipoColors[order.tipo]} variant="outline">
                          {order.tipo}
                        </Badge>
                      </div>
                      <OrderTimer 
                        createdAt={order.created_at}
                        estado={order.estado}
                        tiempoInicio={order.tiempo_inicio_preparacion}
                        tiempoListo={order.tiempo_listo}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {order.mesa && (
                      <div className="bg-green-50 p-2 rounded">
                        <span className="font-semibold">Mesa: {order.mesa}</span>
                      </div>
                    )}

                    {order.customers && (
                      <div className="text-sm">
                        <span className="text-gray-600">Cliente: </span>
                        <span className="font-medium">{order.customers.nombre}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      {order.order_items?.map(item => renderOrderItem(item))}
                    </div>

                    <Button 
                      className="w-full bg-green-500 hover:bg-green-600"
                      onClick={() => updateOrderStatus(order.id, 'LISTO')}
                    >
                      {getStatusButtonText('LISTO')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {orders.LISTO.length === 0 && (
                <Card className="bg-gray-50">
                  <CardContent className="py-8 text-center text-gray-500">
                    No hay pedidos listos
                  </CardContent>
                </Card>
              )}
          </TabsContent>
        </Tabs>

        {/* Dialog de Vista de Detalles */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles del Pedido #{viewingOrder?.id?.slice(0, 8)}</DialogTitle>
            </DialogHeader>
            {viewingOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <p className="font-medium">{viewingOrder.tipo}</p>
                  </div>
                  {viewingOrder.mesa && (
                    <div>
                      <span className="text-gray-600">Mesa:</span>
                      <p className="font-medium">{viewingOrder.mesa}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Estado:</span>
                    <p className="font-medium">
                      <Badge className={
                        viewingOrder.estado === 'NUEVO' ? 'bg-blue-500' :
                        viewingOrder.estado === 'PREPARANDO' ? 'bg-yellow-500' : 'bg-green-500'
                      }>
                        {viewingOrder.estado}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Creado:</span>
                    <p className="font-medium">{new Date(viewingOrder.created_at).toLocaleString('es-ES')}</p>
                  </div>
                </div>

                {viewingOrder.nota_cocina && (
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800">Notas de cocina:</p>
                    <p className="text-sm text-yellow-700">{viewingOrder.nota_cocina}</p>
                  </div>
                )}

                {viewingOrder.nota_cliente && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-blue-800">Notas del cliente:</p>
                    <p className="text-sm text-blue-700">{viewingOrder.nota_cliente}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="font-semibold mb-3">Items del pedido:</p>
                  <div className="space-y-2">
                    {viewingOrder.order_items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-orange-500">{item.cantidad}x</span>
                          <span>{item.nombre_item_snapshot}</span>
                        </div>
                        <span className="font-medium">${(item.precio_unitario * item.cantidad).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-2xl font-bold text-orange-600">${parseFloat(viewingOrder.total).toFixed(2)}</span>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setViewDialogOpen(false)
                      router.push('/pedidos')
                    }}
                  >
                    Ir a Pedidos para Editar
                  </Button>
                  <Button 
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                    onClick={() => setViewDialogOpen(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  )
}
