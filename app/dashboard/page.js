'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, ShoppingCart, TrendingUp, Users, Clock, Package } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'

export default function DashboardPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const router = useRouter()
  const [kpis, setKpis] = useState({
    ventasHoy: 0,
    pedidosHoy: 0,
    ticketPromedio: 0,
    clientesNuevos: 0,
    pedidosActivos: 0,
    productosStock: 0
  })
  const [salesData, setSalesData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [expiringProducts, setExpiringProducts] = useState([])
  const [recentOrders, setRecentOrders] = useState([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && restaurant) {
      loadDashboardData()
      const interval = setInterval(loadDashboardData, 30000) // Auto-refresh cada 30s
      return () => clearInterval(interval)
    }
  }, [user, restaurant])

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        loadKPIs(),
        loadSalesChart(),
        loadTopProducts(),
        loadExpiringProducts(),
        loadRecentOrders()
      ])
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    }
  }

  const loadKPIs = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Ventas y pedidos de hoy
    const { data: ordersToday } = await supabase
      .from('orders')
      .select('total, created_at')
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', today.toISOString())
      .eq('estado', 'PAGADO')

    const ventasHoy = ordersToday?.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) || 0
    const pedidosHoy = ordersToday?.length || 0
    const ticketPromedio = pedidosHoy > 0 ? ventasHoy / pedidosHoy : 0

    // Clientes nuevos hoy
    const { count: clientesNuevos } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', today.toISOString())

    // Pedidos activos
    const { count: pedidosActivos } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .in('estado', ['NUEVO', 'PREPARANDO', 'LISTO', 'ENTREGADO'])

    // Productos con stock bajo (disponibles)
    const { count: productosStock } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .eq('disponible', true)

    setKpis({
      ventasHoy,
      pedidosHoy,
      ticketPromedio,
      clientesNuevos: clientesNuevos || 0,
      pedidosActivos: pedidosActivos || 0,
      productosStock: productosStock || 0
    })
  }

  const loadSalesChart = async () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      days.push(date)
    }

    const chartData = await Promise.all(
      days.map(async (date) => {
        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)

        const { data: orders } = await supabase
          .from('orders')
          .select('total')
          .eq('restaurant_id', restaurant.id)
          .eq('estado', 'PAGADO')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDay.toISOString())

        const total = orders?.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) || 0
        
        return {
          fecha: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          ventas: Math.round(total * 100) / 100
        }
      })
    )

    setSalesData(chartData)
  }

  const loadTopProducts = async () => {
    const { data: items } = await supabase
      .from('order_items')
      .select(`
        nombre_item_snapshot,
        cantidad,
        orders!inner(restaurant_id, estado)
      `)
      .eq('orders.restaurant_id', restaurant.id)
      .eq('orders.estado', 'PAGADO')

    if (items) {
      const grouped = items.reduce((acc, item) => {
        const name = item.nombre_item_snapshot
        if (!acc[name]) {
          acc[name] = { nombre: name, cantidad: 0 }
        }
        acc[name].cantidad += item.cantidad
        return acc
      }, {})

      const sorted = Object.values(grouped)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)

      setTopProducts(sorted)
    }
  }

  const loadExpiringProducts = async () => {
    const { data: products } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .not('fecha_compra', 'is', null)
      .not('dias_para_vencer', 'is', null)

    if (products) {
      const now = new Date()
      const expiring = products
        .map(p => {
          const compra = new Date(p.fecha_compra)
          const vencimiento = new Date(compra)
          vencimiento.setDate(vencimiento.getDate() + p.dias_para_vencer)
          const diasRestantes = Math.ceil((vencimiento - now) / (1000 * 60 * 60 * 24))
          return { ...p, diasRestantes, fechaVencimiento: vencimiento }
        })
        .filter(p => p.diasRestantes <= p.dias_alerta_vencimiento && p.diasRestantes >= 0)
        .sort((a, b) => a.diasRestantes - b.diasRestantes)

      setExpiringProducts(expiring)
    }
  }

  const loadRecentOrders = async () => {
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(5)

    setRecentOrders(orders || [])
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  const estadoColors = {
    NUEVO: 'bg-blue-500',
    PREPARANDO: 'bg-yellow-500',
    LISTO: 'bg-green-500',
    ENTREGADO: 'bg-purple-500',
    PAGADO: 'bg-gray-500'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Resumen general del restaurante</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Ventas Hoy</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{kpis.ventasHoy.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pedidos Hoy</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.pedidosHoy}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Ticket Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{kpis.ticketPromedio.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Clientes Nuevos</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.clientesNuevos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pedidos Activos</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.pedidosActivos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Productos Stock</CardTitle>
              <Package className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.productosStock}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Ventas */}
          <Card>
            <CardHeader>
              <CardTitle>Ventas Últimos 7 Días</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="ventas" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top 5 Productos */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Productos Más Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600">
                          {idx + 1}
                        </div>
                        <span className="font-medium">{product.nombre}</span>
                      </div>
                      <Badge variant="secondary">{product.cantidad} vendidos</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay datos de ventas aún</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Productos por vencer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-orange-600" />
                <span>Productos Próximos a Vencer</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringProducts.length > 0 ? (
                <div className="space-y-2">
                  {expiringProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="font-medium">{product.nombre}</p>
                        <p className="text-sm text-gray-600">
                          Vence: {product.fechaVencimiento.toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <Badge variant="destructive">{product.diasRestantes} días</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay productos próximos a vencer</p>
              )}
            </CardContent>
          </Card>

          {/* Pedidos Recientes */}
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length > 0 ? (
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">#{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-600">{order.tipo} - Mesa {order.mesa || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={estadoColors[order.estado]}>{order.estado}</Badge>
                        <p className="text-sm font-bold mt-1">€{parseFloat(order.total).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay pedidos recientes</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
