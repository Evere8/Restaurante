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
import { ArrowRight, Edit } from 'lucide-react'
import { toast } from 'sonner'

export default function KDSPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState({
    NUEVO: [],
    PREPARANDO: [],
    LISTO: []
  })

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
      .in('estado', ['NUEVO', 'PREPARANDO', 'LISTO'])
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error cargando pedidos:', error)
      return
    }

    const grouped = {
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
      NUEVO: 'Iniciar Preparación',
      PREPARANDO: 'Marcar Listo',
      LISTO: 'Entregar'
    }
    return buttons[status]
  }

  const tipoColors = {
    SALA: 'bg-blue-100 text-blue-800',
    PARA_LLEVAR: 'bg-green-100 text-green-800',
    DELIVERY: 'bg-purple-100 text-purple-800'
  }

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
              {orders.NUEVO.length > 0 && (
                <Badge className="ml-2 bg-blue-500">{orders.NUEVO.length}</Badge>
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
            {orders.NUEVO.map(order => (
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
                      {order.order_items?.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                          <span className="font-semibold">{item.cantidad}x</span>
                          <span className="flex-1 ml-2">{item.nombre_item_snapshot}</span>
                        </div>
                      ))}
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
                        onClick={() => router.push(`/pedidos?edit=${order.id}`)}
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
                      {order.order_items?.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                          <span className="font-semibold">{item.cantidad}x</span>
                          <span className="flex-1 ml-2">{item.nombre_item_snapshot}</span>
                        </div>
                      ))}
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
                        onClick={() => router.push(`/pedidos?edit=${order.id}`)}
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
            </div>
          </div>

          {/* Columna LISTO */}
          <div className="space-y-4">
            <div className="bg-green-500 text-white p-4 rounded-lg">
              <h2 className="text-xl font-bold flex items-center justify-between">
                <span>✅ LISTO</span>
                <Badge variant="secondary" className="bg-green-600 text-white">
                  {orders.LISTO.length}
                </Badge>
              </h2>
            </div>

            <div className="space-y-3">
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
                      {order.order_items?.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                          <span className="font-semibold">{item.cantidad}x</span>
                          <span className="flex-1 ml-2">{item.nombre_item_snapshot}</span>
                        </div>
                      ))}
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
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
