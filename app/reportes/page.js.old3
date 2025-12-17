'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { FileText, Download } from 'lucide-react'
import { toast } from 'sonner'

export default function ReportesPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    // Establecer fechas por defecto (últimos 7 días)
    const today = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    setDateTo(today.toISOString().split('T')[0])
    setDateFrom(weekAgo.toISOString().split('T')[0])
  }, [])

  const generateReport = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Selecciona rango de fechas')
      return
    }

    setLoading(true)
    try {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)

      // Obtener pedidos del periodo
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurant.id)
        .eq('estado', 'PAGADO')
        .gte('fecha_pago', from.toISOString())
        .lte('fecha_pago', to.toISOString())

      if (error) throw error

      // Calcular totales
      const totalVentas = orders.reduce((sum, o) => sum + parseFloat(o.total), 0)
      const totalPedidos = orders.length
      const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0

      // Productos más vendidos
      const productSales = {}
      orders.forEach(order => {
        order.order_items.forEach(item => {
          if (!productSales[item.nombre_item_snapshot]) {
            productSales[item.nombre_item_snapshot] = {
              nombre: item.nombre_item_snapshot,
              cantidad: 0,
              total: 0
            }
          }
          productSales[item.nombre_item_snapshot].cantidad += item.cantidad
          productSales[item.nombre_item_snapshot].total += parseFloat(item.total_item)
        })
      })

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10)

      // Métodos de pago
      const paymentMethods = {}
      orders.forEach(order => {
        const method = order.metodo_pago || 'Sin especificar'
        if (!paymentMethods[method]) {
          paymentMethods[method] = { nombre: method, cantidad: 0, total: 0 }
        }
        paymentMethods[method].cantidad++
        paymentMethods[method].total += parseFloat(order.total)
      })

      const paymentMethodsData = Object.values(paymentMethods)

      // Ventas por día
      const salesByDay = {}
      orders.forEach(order => {
        const date = new Date(order.fecha_pago).toLocaleDateString('es-ES')
        if (!salesByDay[date]) {
          salesByDay[date] = { fecha: date, ventas: 0, pedidos: 0 }
        }
        salesByDay[date].ventas += parseFloat(order.total)
        salesByDay[date].pedidos++
      })

      const salesChartData = Object.values(salesByDay).sort((a, b) => {
        return new Date(a.fecha) - new Date(b.fecha)
      })

      setReportData({
        totalVentas,
        totalPedidos,
        ticketPromedio,
        topProducts,
        paymentMethods: paymentMethodsData,
        salesByDay: salesChartData
      })

      toast.success('Reporte generado')
    } catch (error) {
      console.error('Error generando reporte:', error)
      toast.error('Error al generar reporte')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user && restaurant && dateFrom && dateTo) {
      generateReport()
    }
  }, [user, restaurant])

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Reportes y Análisis</h1>
          <p className="text-gray-600">Analiza el rendimiento de tu restaurante</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end space-x-4">
              <div className="space-y-2 flex-1">
                <Label>Fecha Desde</Label>
                <Input 
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label>Fecha Hasta</Label>
                <Input 
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <Button 
                className="bg-orange-500 hover:bg-orange-600"
                onClick={generateReport}
                disabled={loading}
              >
                <FileText className="mr-2 h-4 w-4" />
                {loading ? 'Generando...' : 'Generar Reporte'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {reportData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">€{reportData.totalVentas.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{reportData.totalPedidos}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Ticket Promedio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">€{reportData.ticketPromedio.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas por Día</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="ventas" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métodos de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.paymentMethods}
                        dataKey="cantidad"
                        nameKey="nombre"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.nombre} (${entry.cantidad})`}
                      >
                        {reportData.paymentMethods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Productos Más Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.topProducts.map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium">{product.nombre}</p>
                            <p className="text-sm text-gray-600">{product.cantidad} unidades</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">€{product.total.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Desglose Métodos de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.paymentMethods.map((method, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{method.nombre}</p>
                          <p className="text-sm text-gray-600">{method.cantidad} transacciones</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">€{method.total.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">
                            {((method.total / reportData.totalVentas) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Exportar Reporte (Próximamente)
              </Button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
