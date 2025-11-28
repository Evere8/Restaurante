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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { CreditCard, DollarSign, X, Tag, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function CobroPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const router = useRouter()
  const [ordersACobrar, setOrdersACobrar] = useState([])
  const [ordersCobrados, setOrdersCobrados] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  const [paymentForm, setPaymentForm] = useState({
    customer_nombre: '',
    customer_telefono: '',
    acepta_promociones: false,
    metodo_pago: '',
    cupon_codigo: ''
  })

  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && restaurant) {
      loadOrders()
      const interval = setInterval(loadOrders, 30000) // Auto-refresh
      return () => clearInterval(interval)
    }
  }, [user, restaurant])

  const loadOrders = async () => {
    // Pedidos a cobrar (ENTREGADO)
    const { data: aCobrar } = await supabase
      .from('orders')
      .select('*, order_items(*), customers(nombre, telefono)')
      .eq('restaurant_id', restaurant.id)
      .eq('estado', 'ENTREGADO')
      .order('created_at', { ascending: false })

    setOrdersACobrar(aCobrar || [])

    // Pedidos cobrados (últimos 2 días)
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const { data: cobrados } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', restaurant.id)
      .eq('estado', 'PAGADO')
      .gte('created_at', twoDaysAgo.toISOString())
      .order('fecha_pago', { ascending: false })

    setOrdersCobrados(cobrados || [])
  }

  const openPaymentDialog = (order) => {
    setSelectedOrder(order)
    setPaymentForm({
      customer_nombre: order.customers?.nombre || order.customer_nombre || '',
      customer_telefono: order.customers?.telefono || '',
      acepta_promociones: false,
      metodo_pago: '',
      cupon_codigo: ''
    })
    setAppliedCoupon(null)
    setPaymentDialogOpen(true)
  }

  const validateAndApplyCoupon = async () => {
    if (!paymentForm.cupon_codigo) {
      toast.error('Ingresa un código de cupón')
      return
    }

    setCouponLoading(true)
    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('codigo', paymentForm.cupon_codigo.toUpperCase())
        .eq('activo', true)
        .single()

      if (error || !coupon) {
        toast.error('Cupón no válido o no existe')
        setCouponLoading(false)
        return
      }

      // Validar fecha de vencimiento
      if (coupon.fecha_vencimiento) {
        const today = new Date()
        const vencimiento = new Date(coupon.fecha_vencimiento)
        if (today > vencimiento) {
          toast.error('Cupón vencido')
          setCouponLoading(false)
          return
        }
      }

      // Validar límite de usos
      if (coupon.limite_usos && coupon.veces_usado >= coupon.limite_usos) {
        toast.error('Cupón alcanzó el límite de usos')
        setCouponLoading(false)
        return
      }

      // Validar monto mínimo
      if (coupon.monto_minimo && selectedOrder.total < coupon.monto_minimo) {
        toast.error(`El pedido debe ser mínimo de €${coupon.monto_minimo}`)
        setCouponLoading(false)
        return
      }

      setAppliedCoupon(coupon)
      toast.success('¡Cupón aplicado!')
    } catch (error) {
      console.error('Error validando cupón:', error)
      toast.error('Error al validar cupón')
    }
    setCouponLoading(false)
  }

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0

    if (appliedCoupon.tipo === 'PORCENTAJE') {
      return (selectedOrder.total * appliedCoupon.valor) / 100
    } else {
      return appliedCoupon.valor
    }
  }

  const calculateFinalTotal = () => {
    if (!selectedOrder) return 0
    const discount = calculateDiscount()
    return Math.max(0, selectedOrder.total - discount)
  }

  const handleProcessPayment = async () => {
    if (!paymentForm.metodo_pago) {
      toast.error('Selecciona un método de pago')
      return
    }

    try {
      // 1. Crear o actualizar cliente si se proporcionó info
      let customerId = selectedOrder.customer_id

      if (paymentForm.customer_nombre && paymentForm.customer_telefono) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .eq('telefono', paymentForm.customer_telefono)
          .single()

        if (existingCustomer) {
          // Actualizar cliente existente
          await supabase
            .from('customers')
            .update({
              nombre: paymentForm.customer_nombre,
              acepta_marketing_whatsapp: paymentForm.acepta_promociones
            })
            .eq('id', existingCustomer.id)
          customerId = existingCustomer.id
        } else {
          // Crear nuevo cliente
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert([{
              restaurant_id: restaurant.id,
              nombre: paymentForm.customer_nombre,
              telefono: paymentForm.customer_telefono,
              acepta_marketing_whatsapp: paymentForm.acepta_promociones
            }])
            .select()
            .single()
          customerId = newCustomer.id
        }
      }

      // 2. Actualizar pedido
      const finalTotal = calculateFinalTotal()
      
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_id: customerId,
          customer_nombre: paymentForm.customer_nombre || null,
          estado: 'PAGADO',
          metodo_pago: paymentForm.metodo_pago,
          fecha_pago: new Date().toISOString(),
          total: finalTotal
        })
        .eq('id', selectedOrder.id)

      if (orderError) throw orderError

      // 3. Incrementar uso de cupón si se aplicó
      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ veces_usado: appliedCoupon.veces_usado + 1 })
          .eq('id', appliedCoupon.id)
      }

      toast.success('¡Pago procesado exitosamente!')
      setPaymentDialogOpen(false)
      loadOrders()
    } catch (error) {
      console.error('Error procesando pago:', error)
      toast.error('Error al procesar pago')
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Sistema de Cobro</h1>
          <p className="text-gray-600">Gestiona los pagos de pedidos</p>
        </div>

        <Tabs defaultValue="acobrar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="acobrar">A Cobrar ({ordersACobrar.length})</TabsTrigger>
            <TabsTrigger value="cobrados">Cobrados ({ordersCobrados.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="acobrar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ordersACobrar.map(order => (
                <Card key={order.id} className="border-2 border-orange-200">
                  <CardHeader className="bg-orange-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(order.created_at).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <Badge className="bg-orange-500">ENTREGADO</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
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
                      {order.customers && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cliente:</span>
                          <span className="font-medium">{order.customers.nombre}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-2">
                      <p className="font-semibold mb-1 text-sm">Productos:</p>
                      {order.order_items?.map(item => (
                        <div key={item.id} className="flex justify-between text-xs mb-1">
                          <span>{item.cantidad}x {item.nombre_item_snapshot}</span>
                          <span className="font-medium">€{(item.precio_unitario * item.cantidad).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="text-lg font-bold">TOTAL:</span>
                      <span className="text-2xl font-bold text-orange-600">€{parseFloat(order.total).toFixed(2)}</span>
                    </div>

                    <Button 
                      className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-6"
                      onClick={() => openPaymentDialog(order)}
                    >
                      <CreditCard className="mr-2 h-5 w-5" /> Cobrar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {ordersACobrar.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay pedidos pendientes de cobro</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cobrados">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ordersCobrados.map(order => (
                <Card key={order.id} className="opacity-75">
                  <CardHeader className="bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          Pagado: {new Date(order.fecha_pago).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <Badge className="bg-gray-500">PAGADO</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium">{order.tipo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Método:</span>
                        <Badge variant="outline">{order.metodo_pago}</Badge>
                      </div>
                      {order.mesa && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mesa:</span>
                          <span className="font-medium">{order.mesa}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-2 flex justify-between items-center">
                      <span className="font-bold">Total:</span>
                      <span className="text-xl font-bold text-gray-700">€{parseFloat(order.total).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {ordersCobrados.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay pedidos cobrados en los últimos 2 días</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog de Pago */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Procesar Pago</DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Pedido #{selectedOrder.id.slice(0, 8)}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Subtotal:</span>
                    <span className="text-xl font-bold">€{parseFloat(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nombre del Cliente (opcional)</Label>
                  <Input 
                    value={paymentForm.customer_nombre}
                    onChange={(e) => setPaymentForm({...paymentForm, customer_nombre: e.target.value})}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Teléfono/WhatsApp (opcional)</Label>
                  <Input 
                    value={paymentForm.customer_telefono}
                    onChange={(e) => setPaymentForm({...paymentForm, customer_telefono: e.target.value})}
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={paymentForm.acepta_promociones}
                    onCheckedChange={(checked) => setPaymentForm({...paymentForm, acepta_promociones: checked})}
                  />
                  <Label>Acepta recibir promociones por WhatsApp</Label>
                </div>

                {/* Sistema de Cupones */}
                <div className="border-t pt-4 space-y-3">
                  <Label className="flex items-center">
                    <Tag className="mr-2 h-4 w-4" /> Aplicar Cupón
                  </Label>
                  <div className="flex space-x-2">
                    <Input 
                      value={paymentForm.cupon_codigo}
                      onChange={(e) => setPaymentForm({...paymentForm, cupon_codigo: e.target.value})}
                      placeholder="Código del cupón"
                      disabled={!!appliedCoupon}
                      className="uppercase"
                    />
                    {!appliedCoupon ? (
                      <Button 
                        variant="outline"
                        onClick={validateAndApplyCoupon}
                        disabled={couponLoading}
                      >
                        {couponLoading ? 'Validando...' : 'Aplicar'}
                      </Button>
                    ) : (
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          setAppliedCoupon(null)
                          setPaymentForm({...paymentForm, cupon_codigo: ''})
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {appliedCoupon && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <p className="font-semibold text-green-800 flex items-center">
                        <Tag className="mr-2 h-4 w-4" /> Cupón "{appliedCoupon.codigo}" aplicado
                      </p>
                      <p className="text-sm text-green-700">
                        Descuento: {appliedCoupon.tipo === 'PORCENTAJE' 
                          ? `${appliedCoupon.valor}%` 
                          : `€${appliedCoupon.valor}`}
                      </p>
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="bg-orange-50 p-3 rounded-lg space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>€{parseFloat(selectedOrder.total).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600 font-semibold">
                        <span>Descuento:</span>
                        <span>-€{calculateDiscount().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-1">
                        <span>Total:</span>
                        <span className="text-orange-600">€{calculateFinalTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Método de Pago *</Label>
                  <Select value={paymentForm.metodo_pago} onValueChange={(val) => setPaymentForm({...paymentForm, metodo_pago: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="TARJETA_DEBITO">Tarjeta de Débito</SelectItem>
                      <SelectItem value="TARJETA_CREDITO">Tarjeta de Crédito</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      <SelectItem value="QR">Código QR</SelectItem>
                      <SelectItem value="MIXTO">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600 py-6 text-lg"
                  onClick={handleProcessPayment}
                >
                  <CreditCard className="mr-2 h-5 w-5" /> Procesar Pago - €{calculateFinalTotal().toFixed(2)}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
