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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { FileText, Download, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'

export default function ReportesPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const { formatCurrency } = useCurrency()
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  // Estados para reportes
  const [ventasGeneral, setVentasGeneral] = useState(null)
  const [evolucionCostos, setEvolucionCostos] = useState([])
  const [productosRentables, setProductosRentables] = useState([])
  const [consumoInsumos, setConsumoInsumos] = useState([])
  const [productosVencidos, setProductosVencidos] = useState([])
  const [productosVendidos, setProductosVendidos] = useState([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const today = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 30)

    setDateTo(today.toISOString().split('T')[0])
    setDateFrom(weekAgo.toISOString().split('T')[0])
  }, [])

  const generateAllReports = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Selecciona rango de fechas')
      return
    }

    setLoading(true)
    try {
      await Promise.all([
        generateVentasReport(),
        generateEvolucionCostos(),
        generateProductosRentables(),
        generateConsumoInsumos(),
        generateProductosVencidos(),
        generateProductosVendidos()
      ])
      toast.success('Reportes generados exitosamente')
    } catch (error) {
      console.error('Error generando reportes:', error)
      toast.error('Error generando reportes')
    }
    setLoading(false)
  }

  const generateVentasReport = async () => {
    try {
      // Crear fechas sin conversión de zona horaria
      // Agregar T00:00:00 para evitar problemas de timezone
      const fromDate = `${dateFrom}T00:00:00`
      const toDate = `${dateTo}T23:59:59`

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('restaurant_id', restaurant.id)
        .eq('estado', 'PAGADO')
        .gte('fecha_pago', fromDate)
        .lte('fecha_pago', toDate)

      if (error) throw error

      const totalVentas = orders.reduce((sum, o) => sum + parseFloat(o.total), 0)
      const totalPedidos = orders.length
      const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0

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
          productSales[item.nombre_item_snapshot].total += parseFloat(item.total_item || 0)
        })
      })

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10)

      setVentasGeneral({
        totalVentas,
        totalPedidos,
        ticketPromedio,
        topProducts
      })
    } catch (error) {
      console.error('Error en reporte de ventas:', error)
    }
  }

  const generateEvolucionCostos = async () => {
    try {
      const { data: historial, error } = await supabase
        .from('stock_costo_historial')
        .select('*, stock_items!inner(nombre, restaurant_id)')
        .eq('stock_items.restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const evolucion = historial.map(h => ({
        nombre: h.stock_items.nombre,
        fecha: new Date(h.created_at).toLocaleDateString('es-ES'),
        costo_anterior: h.costo_anterior,
        costo_nuevo: h.costo_nuevo,
        cambio: h.costo_nuevo - h.costo_anterior,
        porcentaje: h.costo_anterior > 0 ? ((h.costo_nuevo - h.costo_anterior) / h.costo_anterior * 100).toFixed(2) : 0
      }))

      setEvolucionCostos(evolucion)
    } catch (error) {
      console.error('Error en evolución de costos:', error)
    }
  }

  const generateProductosRentables = async () => {
    try {
      // Usar formato de fecha sin conversión de zona horaria
      const fromDate = `${dateFrom}T00:00:00`
      const toDate = `${dateTo}T23:59:59`

      // Obtener productos del menú con costos
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('id, nombre, precio_base, coste')
        .eq('restaurant_id', restaurant.id)
        .not('coste', 'is', null)

      if (menuError) throw menuError

      // Obtener ventas por producto
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('order_items(menu_item_id, cantidad)')
        .eq('restaurant_id', restaurant.id)
        .eq('estado', 'PAGADO')
        .gte('fecha_pago', fromDate)
        .lte('fecha_pago', toDate)

      if (ordersError) throw ordersError

      const ventasPorProducto = {}
      orders.forEach(order => {
        if (order.order_items) {
          order.order_items.forEach(item => {
            if (!ventasPorProducto[item.menu_item_id]) {
              ventasPorProducto[item.menu_item_id] = 0
            }
            ventasPorProducto[item.menu_item_id] += item.cantidad
          })
        }
      })

      const rentabilidad = menuItems.map(item => {
        const cantidadVendida = ventasPorProducto[item.id] || 0
        const margen = parseFloat(item.precio_base) - parseFloat(item.coste)
        const gananciaTotal = margen * cantidadVendida
        const margenPorcentaje = parseFloat(item.coste) > 0 ? (margen / parseFloat(item.coste) * 100).toFixed(2) : 0

        return {
          nombre: item.nombre,
          precio: parseFloat(item.precio_base),
          costo: parseFloat(item.coste),
          margen: margen,
          margenPorcentaje: parseFloat(margenPorcentaje),
          cantidadVendida,
          gananciaTotal
        }
      }).filter(p => p.cantidadVendida > 0)
        .sort((a, b) => b.gananciaTotal - a.gananciaTotal)
        .slice(0, 15)

      setProductosRentables(rentabilidad)
    } catch (error) {
      console.error('Error en productos rentables:', error)
    }
  }

  const generateConsumoInsumos = async () => {
    try {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)

      const { data: movimientos, error } = await supabase
        .from('stock_movimientos')
        .select('*, stock_items!inner(nombre, restaurant_id)')
        .eq('stock_items.restaurant_id', restaurant.id)
        .eq('tipo', 'egreso')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())

      if (error) throw error

      const consumo = {}
      movimientos.forEach(mov => {
        const nombre = mov.stock_items.nombre
        if (!consumo[nombre]) {
          consumo[nombre] = { nombre, cantidad: 0 }
        }
        consumo[nombre].cantidad += parseFloat(mov.cantidad)
      })

      const consumoArray = Object.values(consumo)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 15)

      setConsumoInsumos(consumoArray)
    } catch (error) {
      console.error('Error en consumo de insumos:', error)
    }
  }

  const generateProductosVencidos = async () => {
    try {
      const { data: alertas, error } = await supabase
        .rpc('stock_alertas', { rest_id: restaurant.id })

      if (error) throw error

      const vencidos = (alertas.vencidos || []).map(item => ({
        nombre: item.nombre,
        fechaVencimiento: new Date(item.vencimiento).toLocaleDateString('es-ES'),
        diasVencido: item.dias_vencido
      }))

      setProductosVencidos(vencidos)
    } catch (error) {
      console.error('Error en productos vencidos:', error)
    }
  }

  // Nuevo reporte: Productos vendidos con fechas y cantidades
  const generateProductosVendidos = async () => {
    try {
      // Usar formato de fecha sin conversión de zona horaria
      const fromDate = `${dateFrom}T00:00:00`
      const toDate = `${dateTo}T23:59:59`

      // Obtener todos los pedidos pagados en el rango
      const { data: orders, error } = await supabase
        .from('orders')
        .select('fecha_pago, order_items(nombre_item_snapshot, cantidad, precio_unitario)')
        .eq('restaurant_id', restaurant.id)
        .eq('estado', 'PAGADO')
        .gte('fecha_pago', fromDate)
        .lte('fecha_pago', toDate)
        .order('fecha_pago', { ascending: false })

      if (error) throw error

      // Agrupar por producto y fecha
      const productoPorFecha = {}
      const productoTotal = {}

      orders?.forEach(order => {
        const fecha = new Date(order.fecha_pago).toLocaleDateString('es-ES')

        order.order_items?.forEach(item => {
          const nombre = (item.nombre_item_snapshot || 'Producto').replace('🆕 ', '')

          // Totales por producto
          if (!productoTotal[nombre]) {
            productoTotal[nombre] = { cantidad: 0, ingresos: 0 }
          }
          productoTotal[nombre].cantidad += item.cantidad
          productoTotal[nombre].ingresos += (item.precio_unitario * item.cantidad)

          // Desglose por fecha
          const key = `${nombre}|${fecha}`
          if (!productoPorFecha[key]) {
            productoPorFecha[key] = { nombre, fecha, cantidad: 0, ingresos: 0 }
          }
          productoPorFecha[key].cantidad += item.cantidad
          productoPorFecha[key].ingresos += (item.precio_unitario * item.cantidad)
        })
      })

      // Convertir a array y ordenar
      const detalleVentas = Object.values(productoPorFecha)
        .sort((a, b) => {
          // Primero por nombre, luego por fecha descendente
          if (a.nombre !== b.nombre) return a.nombre.localeCompare(b.nombre)
          return new Date(b.fecha.split('/').reverse().join('-')) - new Date(a.fecha.split('/').reverse().join('-'))
        })

      const resumenProductos = Object.entries(productoTotal)
        .map(([nombre, data]) => ({ nombre, ...data }))
        .sort((a, b) => b.cantidad - a.cantidad)

      setProductosVendidos({
        detalle: detalleVentas,
        resumen: resumenProductos,
        totalItems: resumenProductos.reduce((sum, p) => sum + p.cantidad, 0),
        totalIngresos: resumenProductos.reduce((sum, p) => sum + p.ingresos, 0)
      })
    } catch (error) {
      console.error('Error en productos vendidos:', error)
    }
  }

  // Función para exportar productos vendidos a CSV
  const exportProductosVendidosCSV = () => {
    if (!productosVendidos?.detalle?.length) {
      toast.error('No hay datos para exportar')
      return
    }

    let csvContent = '\ufeff'
    csvContent += 'REPORTE DE PRODUCTOS VENDIDOS\n'
    csvContent += `Período: ${dateFrom} al ${dateTo}\n\n`

    csvContent += 'RESUMEN POR PRODUCTO\n'
    csvContent += 'Producto,Cantidad Total,Ingresos Totales\n'
    productosVendidos.resumen.forEach(p => {
      csvContent += `${p.nombre.replace(/,/g, ' ')},${p.cantidad},${p.ingresos}\n`
    })

    csvContent += '\n\nDETALLE POR FECHA\n'
    csvContent += 'Producto,Fecha,Cantidad,Ingresos\n'
    productosVendidos.detalle.forEach(p => {
      csvContent += `${p.nombre.replace(/,/g, ' ')},${p.fecha},${p.cantidad},${p.ingresos}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `productos_vendidos_${dateFrom}_${dateTo}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('Reporte exportado')
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e']

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Reportes y Análisis</h1>
            <p className="text-gray-600">Análisis de ventas, costos, rentabilidad y consumo</p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Configuración de Reportes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Desde</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Hasta</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={generateAllReports}
                    disabled={loading}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {loading ? 'Generando...' : 'Generar Reportes'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="ventas" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="ventas">Ventas</TabsTrigger>
              <TabsTrigger value="productos">Productos Vendidos</TabsTrigger>
              <TabsTrigger value="costos">Costos</TabsTrigger>
              <TabsTrigger value="rentabilidad">Rentabilidad</TabsTrigger>
              <TabsTrigger value="consumo">Consumo</TabsTrigger>
              <TabsTrigger value="desperdicio">Desperdicio</TabsTrigger>
            </TabsList>

            {/* TAB VENTAS */}
            <TabsContent value="ventas">
              {ventasGeneral ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Total Ventas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-orange-600">{formatCurrency(ventasGeneral.totalVentas)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Total Pedidos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{ventasGeneral.totalPedidos}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Ticket Promedio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-green-600">{formatCurrency(ventasGeneral.ticketPromedio)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top 10 Productos Más Vendidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={ventasGeneral.topProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="cantidad" fill="#f97316" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Genera los reportes para ver estadísticas</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB PRODUCTOS VENDIDOS */}
            <TabsContent value="productos">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Reporte de Productos Vendidos</CardTitle>
                  {productosVendidos?.detalle?.length > 0 && (
                    <Button onClick={exportProductosVendidosCSV} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {productosVendidos?.resumen?.length > 0 ? (
                    <div className="space-y-6">
                      {/* Resumen General */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-blue-600">Total Items Vendidos</p>
                          <p className="text-3xl font-bold text-blue-700">{productosVendidos.totalItems}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-green-600">Ingresos Totales</p>
                          <p className="text-3xl font-bold text-green-700">{formatCurrency(productosVendidos.totalIngresos)}</p>
                        </div>
                      </div>

                      {/* Tabla Resumen por Producto */}
                      <div>
                        <h3 className="font-semibold mb-3">Resumen por Producto</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left p-2">Producto</th>
                                <th className="text-right p-2">Cantidad</th>
                                <th className="text-right p-2">Ingresos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {productosVendidos.resumen.map((item, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                  <td className="p-2 font-medium">{item.nombre}</td>
                                  <td className="p-2 text-right">{item.cantidad}</td>
                                  <td className="p-2 text-right font-semibold text-green-600">{formatCurrency(item.ingresos)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Detalle por Fecha */}
                      <div>
                        <h3 className="font-semibold mb-3">Detalle por Fecha</h3>
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                          <table className="w-full">
                            <thead className="sticky top-0 bg-white">
                              <tr className="border-b bg-gray-50">
                                <th className="text-left p-2">Producto</th>
                                <th className="text-left p-2">Fecha</th>
                                <th className="text-right p-2">Cantidad</th>
                                <th className="text-right p-2">Ingresos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {productosVendidos.detalle.map((item, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                  <td className="p-2">{item.nombre}</td>
                                  <td className="p-2">
                                    <Badge variant="outline">{item.fecha}</Badge>
                                  </td>
                                  <td className="p-2 text-right">{item.cantidad}</td>
                                  <td className="p-2 text-right">{formatCurrency(item.ingresos)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">Genera los reportes para ver productos vendidos</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB COSTOS */}
            <TabsContent value="costos">
              <Card>
                <CardHeader>
                  <CardTitle>Evolución de Costos de Insumos</CardTitle>
                </CardHeader>
                <CardContent>
                  {evolucionCostos.length > 0 ? (
                    <div className="space-y-2">
                      {evolucionCostos.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-semibold">{item.nombre}</p>
                            <p className="text-xs text-gray-500">{item.fecha}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Anterior: {formatCurrency(item.costo_anterior)}</p>
                              <p className="text-sm font-bold">Nuevo: {formatCurrency(item.costo_nuevo)}</p>
                            </div>
                            <div className="text-right">
                              {item.cambio > 0 ? (
                                <Badge className="bg-red-500">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  +{item.porcentaje}%
                                </Badge>
                              ) : (
                                <Badge className="bg-green-500">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  {item.porcentaje}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">No hay cambios de costos registrados</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB RENTABILIDAD */}
            <TabsContent value="rentabilidad">
              <Card>
                <CardHeader>
                  <CardTitle>Productos Más Rentables</CardTitle>
                </CardHeader>
                <CardContent>
                  {productosRentables.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Producto</th>
                            <th className="text-right p-2">Precio</th>
                            <th className="text-right p-2">Costo</th>
                            <th className="text-right p-2">Margen</th>
                            <th className="text-right p-2">%</th>
                            <th className="text-right p-2">Vendidos</th>
                            <th className="text-right p-2">Ganancia Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productosRentables.map((item, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-medium">{item.nombre}</td>
                              <td className="p-2 text-right">{formatCurrency(item.precio)}</td>
                              <td className="p-2 text-right">{formatCurrency(item.costo)}</td>
                              <td className="p-2 text-right font-semibold">{formatCurrency(item.margen)}</td>
                              <td className="p-2 text-right">
                                <Badge className={item.margenPorcentaje > 50 ? 'bg-green-500' : 'bg-yellow-500'}>
                                  {item.margenPorcentaje}%
                                </Badge>
                              </td>
                              <td className="p-2 text-right">{item.cantidadVendida}</td>
                              <td className="p-2 text-right font-bold text-green-600">{formatCurrency(item.gananciaTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">Genera los reportes para ver rentabilidad</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB CONSUMO */}
            <TabsContent value="consumo">
              <Card>
                <CardHeader>
                  <CardTitle>Consumo de Insumos</CardTitle>
                </CardHeader>
                <CardContent>
                  {consumoInsumos.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={consumoInsumos}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="cantidad" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-8 text-gray-500">No hay movimientos de stock en el período seleccionado</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB DESPERDICIO */}
            <TabsContent value="desperdicio">
              <Card>
                <CardHeader>
                  <CardTitle>Productos Vencidos (Desperdicio)</CardTitle>
                </CardHeader>
                <CardContent>
                  {productosVencidos.length > 0 ? (
                    <div className="space-y-2">
                      {productosVencidos.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                          <div>
                            <p className="font-semibold text-red-900">{item.nombre}</p>
                            <p className="text-sm text-red-600">Venció: {item.fechaVencimiento}</p>
                          </div>
                          <Badge className="bg-red-600">Hace {item.diasVencido} días</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-green-600 font-semibold">✅ No hay productos vencidos</p>
                      <p className="text-gray-500 text-sm">¡Excelente gestión de inventario!</p>
                    </div>
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
