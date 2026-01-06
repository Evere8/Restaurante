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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { CreditCard, DollarSign, X, Tag, CheckCircle, FileText, Receipt, Coins } from 'lucide-react'
import { toast } from 'sonner'

export default function CobroPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const { formatCurrency, currency } = useCurrency()
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
    cupon_codigo: '',
    generar_factura: false,
    generar_recibo: false,
    factura_ruc: '',
    factura_nombre: '',
    factura_condicion: 'CONTADO',
    monto_recibido: ''
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
      const interval = setInterval(loadOrders, 30000)
      return () => clearInterval(interval)
    }
  }, [user, restaurant])

  const loadOrders = async () => {
    const { data: aCobrar } = await supabase
      .from('orders')
      .select('*, order_items(*), customers(nombre, telefono)')
      .eq('restaurant_id', restaurant.id)
      .eq('estado', 'ENTREGADO')
      .order('created_at', { ascending: false })

    setOrdersACobrar(aCobrar || [])

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
      cupon_codigo: '',
      generar_factura: false,
      generar_recibo: false,
      factura_ruc: '',
      factura_nombre: '',
      factura_condicion: 'CONTADO',
      monto_recibido: ''
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

      if (coupon.fecha_vencimiento) {
        const today = new Date()
        const vencimiento = new Date(coupon.fecha_vencimiento)
        if (today > vencimiento) {
          toast.error('Cupón vencido')
          setCouponLoading(false)
          return
        }
      }

      if (coupon.limite_usos && coupon.veces_usado >= coupon.limite_usos) {
        toast.error('Cupón alcanzó el límite de usos')
        setCouponLoading(false)
        return
      }

      if (coupon.monto_minimo && selectedOrder.total < coupon.monto_minimo) {
        toast.error(`El pedido debe ser mínimo de ${formatCurrency(coupon.monto_minimo)}`)
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

  // Calcular vuelto
  const calculateVuelto = () => {
    const montoRecibido = parseFloat(paymentForm.monto_recibido) || 0
    const total = calculateFinalTotal()
    return montoRecibido - total
  }

  const buscarClientePorRUC = async (ruc) => {
    if (!ruc || ruc.length < 3) return

    try {
      let { data: cliente, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('ruc', ruc)
        .limit(1)
        .single()

      if (error || !cliente) {
        const { data: clienteTel } = await supabase
          .from('customers')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .eq('telefono', ruc)
          .limit(1)
          .single()
        
        cliente = clienteTel
      }

      if (cliente) {
        setPaymentForm({
          ...paymentForm,
          factura_ruc: ruc,
          factura_nombre: cliente.nombre || '',
          customer_nombre: cliente.nombre || '',
          customer_telefono: cliente.telefono || ''
        })
        toast.success('Cliente encontrado')
      } else {
        setPaymentForm({
          ...paymentForm,
          factura_ruc: ruc,
          factura_nombre: ''
        })
        toast.info('Cliente no encontrado. Complete los datos para registrarlo.')
      }
    } catch (error) {
      console.error('Error buscando cliente:', error)
    }
  }

  // Generar Recibo PDF
  const generarReciboPDF = async (orderItems, total) => {
    try {
      const { jsPDF } = await import('jspdf')
      
      // Cargar configuración del recibo
      let config = {
        pageWidth: 80,
        pageHeight: 200,
        marginLeft: 5,
        marginTop: 5,
        fontSize: 8,
        lineHeight: 4
      }
      
      try {
        const savedConfig = localStorage.getItem('reciboConfig')
        if (savedConfig) {
          config = { ...config, ...JSON.parse(savedConfig) }
        }
      } catch (e) {
        console.log('Usando configuración de recibo por defecto')
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [config.pageWidth, config.pageHeight]
      })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(config.fontSize)
      
      let y = config.marginTop

      // Nombre del restaurante
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(restaurant?.nombre || 'Restaurante', config.pageWidth / 2, y, { align: 'center' })
      y += 5

      // Dirección y teléfono
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      if (restaurant?.direccion) {
        doc.text(restaurant.direccion, config.pageWidth / 2, y, { align: 'center' })
        y += 4
      }
      if (restaurant?.telefono) {
        doc.text(`Tel: ${restaurant.telefono}`, config.pageWidth / 2, y, { align: 'center' })
        y += 4
      }

      // Línea separadora
      y += 2
      doc.line(config.marginLeft, y, config.pageWidth - config.marginLeft, y)
      y += 4

      // Fecha y hora
      const fecha = new Date()
      doc.text(`Fecha: ${fecha.toLocaleDateString('es-PY')}`, config.marginLeft, y)
      y += 4
      doc.text(`Hora: ${fecha.toLocaleTimeString('es-PY')}`, config.marginLeft, y)
      y += 4

      // Cliente
      doc.text('Cliente: Sin Nombre', config.marginLeft, y)
      y += 6

      // Línea separadora
      doc.line(config.marginLeft, y, config.pageWidth - config.marginLeft, y)
      y += 4

      // Encabezado de productos
      doc.setFont('helvetica', 'bold')
      doc.text('Cant.', config.marginLeft, y)
      doc.text('Descripción', config.marginLeft + 10, y)
      doc.text('Total', config.pageWidth - config.marginLeft, y, { align: 'right' })
      y += 4
      doc.setFont('helvetica', 'normal')

      // Productos
      orderItems.forEach(item => {
        const descripcion = item.nombre_item_snapshot.substring(0, 20)
        const subtotal = item.cantidad * item.precio_unitario
        
        doc.text(item.cantidad.toString(), config.marginLeft, y)
        doc.text(descripcion, config.marginLeft + 10, y)
        doc.text(formatearNumeroRecibo(subtotal), config.pageWidth - config.marginLeft, y, { align: 'right' })
        y += 4
      })

      // Línea separadora
      y += 2
      doc.line(config.marginLeft, y, config.pageWidth - config.marginLeft, y)
      y += 4

      // Total
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('TOTAL:', config.marginLeft, y)
      doc.text(formatearNumeroRecibo(total), config.pageWidth - config.marginLeft, y, { align: 'right' })
      y += 6

      // Mensaje de agradecimiento
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('¡Gracias por su compra!', config.pageWidth / 2, y, { align: 'center' })

      return doc.output('blob')
    } catch (error) {
      console.error('Error generando recibo:', error)
      throw error
    }
  }

  const formatearNumeroRecibo = (numero) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(numero))
  }

  // Función para convertir unidades de medida
  const convertirUnidades = (cantidad, unidadOrigen, unidadDestino) => {
    // Si son iguales, no hay conversión
    if (unidadOrigen === unidadDestino) {
      return cantidad
    }

    // Conversiones de peso
    if (unidadOrigen === 'gramo' && unidadDestino === 'kg') {
      return cantidad / 1000 // 1000g = 1kg
    }
    if (unidadOrigen === 'kg' && unidadDestino === 'gramo') {
      return cantidad * 1000
    }

    // Conversiones de volumen
    if (unidadOrigen === 'ml' && unidadDestino === 'litro') {
      return cantidad / 1000 // 1000ml = 1L
    }
    if (unidadOrigen === 'litro' && unidadDestino === 'ml') {
      return cantidad * 1000
    }

    // Si no hay conversión conocida, devolver la cantidad original
    console.log(`⚠️ No hay conversión de ${unidadOrigen} a ${unidadDestino}, usando cantidad original`)
    return cantidad
  }

  // Función para procesar descuento de stock al cobrar
  const procesarDescuentoStock = async (orderId) => {
    const alertas = []
    let productosDescontados = []
    
    try {
      console.log('🔄 Iniciando descuento de stock para pedido:', orderId)
      
      // Obtener items del pedido con información del menu_item
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*, menu_items(id, nombre, usar_stock_avanzado, crear_en_stock)')
        .eq('order_id', orderId)
      
      if (itemsError) {
        console.error('❌ Error obteniendo items del pedido:', itemsError)
        toast.error('Error al obtener items del pedido para stock')
        return alertas
      }

      if (!orderItems || orderItems.length === 0) {
        console.log('⚠️ No hay items en el pedido')
        return alertas
      }

      console.log(`📦 Items encontrados: ${orderItems.length}`)

      // Procesar cada item del pedido
      for (const item of orderItems) {
        const menuItem = item.menu_items
        
        if (!menuItem) {
          console.log(`⚠️ Item ${item.nombre_item_snapshot} no tiene menu_item asociado (menu_item_id: ${item.menu_item_id})`)
          continue
        }

        console.log(`📍 Procesando: ${item.cantidad}x ${menuItem.nombre} (stock_avanzado: ${menuItem.usar_stock_avanzado}, crear_en_stock: ${menuItem.crear_en_stock})`)

        // Caso 1: Producto usa stock avanzado (tiene receta)
        if (menuItem.usar_stock_avanzado) {
          // Obtener la receta del producto con unidad_medida
          const { data: recetas, error: recetaError } = await supabase
            .from('menu_receta')
            .select('*, stock_items(id, nombre, cantidad, stock_minimo_alerta, unidad_medida)')
            .eq('menu_item_id', menuItem.id)
          
          if (recetaError) {
            console.error(`❌ Error obteniendo receta para ${menuItem.nombre}:`, recetaError)
            continue
          }

          if (!recetas || recetas.length === 0) {
            console.log(`⚠️ Producto ${menuItem.nombre} tiene stock avanzado pero no tiene receta configurada`)
            continue
          }

          console.log(`🍳 Recetas encontradas: ${recetas.length}`)

          // Descontar cada insumo de la receta
          for (const receta of recetas) {
            const stockItem = receta.stock_items
            if (!stockItem) {
              console.log('⚠️ Receta sin stock_item asociado')
              continue
            }

            // Obtener unidades
            const unidadStock = stockItem.unidad_medida || 'unidad'
            
            // Calcular cantidad a descontar con conversión de unidades
            // La receta siempre se guarda en la unidad más pequeña (gramos, ml, unidades)
            let cantidadBase = receta.cantidad_usada * item.cantidad
            let cantidadADescontar = cantidadBase
            
            // Conversión automática: si stock está en kg/litro, la receta está en g/ml
            if (unidadStock === 'kg') {
              cantidadADescontar = cantidadBase / 1000 // gramos a kg
              console.log(`   → Conversión: ${cantidadBase}g = ${cantidadADescontar}kg`)
            } else if (unidadStock === 'litro') {
              cantidadADescontar = cantidadBase / 1000 // ml a litros
              console.log(`   → Conversión: ${cantidadBase}ml = ${cantidadADescontar}L`)
            }
            
            const nuevaCantidad = stockItem.cantidad - cantidadADescontar

            console.log(`   → ${stockItem.nombre}: ${stockItem.cantidad} - ${cantidadADescontar} = ${nuevaCantidad} ${unidadStock}`)

            // Actualizar stock
            const { error: updateError } = await supabase
              .from('stock_items')
              .update({ 
                cantidad: nuevaCantidad
              })
              .eq('id', stockItem.id)

            if (updateError) {
              console.error(`❌ Error actualizando stock de ${stockItem.nombre}:`, updateError)
              toast.error(`Error al descontar ${stockItem.nombre}`)
              continue
            }

            // Registrar movimiento
            const { error: movError } = await supabase
              .from('stock_movimientos')
              .insert({
                stock_item_id: stockItem.id,
                tipo: 'egreso',
                cantidad: cantidadADescontar,
                motivo: `Venta - Pedido cobrado (${menuItem.nombre})`,
                order_id: orderId
              })
            
            if (movError) {
              console.log('⚠️ Error registrando movimiento:', movError)
            }

            productosDescontados.push(`${stockItem.nombre}: -${cantidadADescontar}`)

            // Verificar si quedó por debajo del mínimo
            if (nuevaCantidad <= stockItem.stock_minimo_alerta) {
              alertas.push({
                tipo: 'stock_bajo',
                producto: stockItem.nombre,
                cantidad_actual: nuevaCantidad
              })
            }

            console.log(`✅ Descontado ${cantidadADescontar} de ${stockItem.nombre}`)
          }
        }
        
        // Caso 2: Producto creado directamente en stock (vendible entero)
        else if (menuItem.crear_en_stock) {
          console.log(`📦 Buscando producto vendible: ${menuItem.nombre}`)
          
          // Buscar el producto en stock_items por nombre
          const { data: stockItems, error: stockError } = await supabase
            .from('stock_items')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .eq('nombre', menuItem.nombre)
            .limit(1)
          
          if (stockError) {
            console.error(`❌ Error buscando stock para ${menuItem.nombre}:`, stockError)
            continue
          }

          if (!stockItems || stockItems.length === 0) {
            console.log(`⚠️ Producto ${menuItem.nombre} no encontrado en stock_items`)
            continue
          }

          const stockItem = stockItems[0]
          const nuevaCantidad = stockItem.cantidad - item.cantidad

          console.log(`   → Descontando ${item.cantidad} de ${stockItem.nombre} (actual: ${stockItem.cantidad}, nuevo: ${nuevaCantidad})`)

          // Actualizar stock
          const { error: updateError } = await supabase
            .from('stock_items')
            .update({ 
              cantidad: nuevaCantidad
            })
            .eq('id', stockItem.id)

          if (updateError) {
            console.error(`❌ Error actualizando stock de ${stockItem.nombre}:`, updateError)
            toast.error(`Error al descontar ${stockItem.nombre}`)
            continue
          }

          // Registrar movimiento
          const { error: movError } = await supabase
            .from('stock_movimientos')
            .insert({
              stock_item_id: stockItem.id,
              tipo: 'egreso',
              cantidad: item.cantidad,
              motivo: 'Venta - Pedido cobrado',
              order_id: orderId
            })
          
          if (movError) {
            console.log('⚠️ Error registrando movimiento:', movError)
          }

          productosDescontados.push(`${stockItem.nombre}: -${item.cantidad}`)

          // Verificar si quedó por debajo del mínimo
          if (nuevaCantidad <= stockItem.stock_minimo_alerta) {
            alertas.push({
              tipo: 'stock_bajo',
              producto: stockItem.nombre,
              cantidad_actual: nuevaCantidad
            })
          }

          console.log(`✅ Descontado ${item.cantidad} de ${stockItem.nombre}`)
        } else {
          console.log(`ℹ️ Producto ${menuItem.nombre} no usa stock avanzado ni está en stock`)
        }
      }

      // Mostrar resumen de lo descontado
      if (productosDescontados.length > 0) {
        console.log(`✅ Stock actualizado: ${productosDescontados.join(', ')}`)
        toast.success(`Stock actualizado: ${productosDescontados.join(', ')}`)
      } else {
        console.log('ℹ️ No se descontó ningún producto del stock')
      }
      
    } catch (error) {
      console.error('❌ Error general procesando stock:', error)
      toast.error('Error procesando descuento de stock')
    }

    return alertas
  }

  const handleProcessPayment = async () => {
    if (!paymentForm.metodo_pago) {
      toast.error('Selecciona un método de pago')
      return
    }

    // Validar vuelto si es efectivo
    if (paymentForm.metodo_pago === 'EFECTIVO' && paymentForm.monto_recibido) {
      const vuelto = calculateVuelto()
      if (vuelto < 0) {
        toast.error('El monto recibido es menor al total')
        return
      }
    }

    try {
      let customerId = selectedOrder.customer_id

      if (paymentForm.generar_factura && paymentForm.factura_nombre && paymentForm.factura_ruc) {
        let { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .eq('ruc', paymentForm.factura_ruc)
          .single()

        if (!existingCustomer) {
          const { data: customerByTel } = await supabase
            .from('customers')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .eq('telefono', paymentForm.factura_ruc)
            .single()
          
          existingCustomer = customerByTel
        }

        if (existingCustomer) {
          const updateData = {
            nombre: paymentForm.factura_nombre,
            acepta_marketing_whatsapp: paymentForm.acepta_promociones
          }
          
          try {
            await supabase
              .from('customers')
              .update({ ...updateData, ruc: paymentForm.factura_ruc })
              .eq('id', existingCustomer.id)
          } catch (e) {
            await supabase
              .from('customers')
              .update(updateData)
              .eq('id', existingCustomer.id)
          }
          
          customerId = existingCustomer.id
        } else {
          const newCustomerData = {
            restaurant_id: restaurant.id,
            nombre: paymentForm.factura_nombre,
            telefono: paymentForm.factura_ruc,
            acepta_marketing_whatsapp: paymentForm.acepta_promociones
          }
          
          try {
            newCustomerData.ruc = paymentForm.factura_ruc
          } catch (e) {
            console.log('Campo RUC no disponible')
          }
          
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert([newCustomerData])
            .select()
            .single()
          
          customerId = newCustomer?.id
        }
      } else if (paymentForm.customer_nombre && paymentForm.customer_telefono) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .eq('telefono', paymentForm.customer_telefono)
          .single()

        if (existingCustomer) {
          await supabase
            .from('customers')
            .update({
              nombre: paymentForm.customer_nombre,
              acepta_marketing_whatsapp: paymentForm.acepta_promociones
            })
            .eq('id', existingCustomer.id)
          customerId = existingCustomer.id
        } else {
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
          customerId = newCustomer?.id
        }
      }

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

      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ veces_usado: appliedCoupon.veces_usado + 1 })
          .eq('id', appliedCoupon.id)
      }

      // Procesar descuento de stock
      try {
        const alertasStock = await procesarDescuentoStock(selectedOrder.id)
        if (alertasStock.length > 0) {
          const alertasTexto = alertasStock.map(a => `${a.producto}: ${a.cantidad_actual}`).join(', ')
          toast.warning(`Stock bajo detectado: ${alertasTexto}`)
        }
      } catch (stockErr) {
        console.error('Error en descuento de stock:', stockErr)
        toast.warning('El pago se procesó pero hubo un error al actualizar el stock')
      }

      // Obtener items para factura/recibo
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', selectedOrder.id)

      // Generar factura si está marcada
      if (paymentForm.generar_factura && orderItems && orderItems.length > 0) {
        try {
          const { generarFacturaPDF, calcularTotalesFactura, DEFAULT_CONFIG } = await import('@/lib/facturaGenerator')
          
          let facturaConfig = DEFAULT_CONFIG
          try {
            const savedConfig = localStorage.getItem('facturaConfig')
            if (savedConfig) {
              facturaConfig = JSON.parse(savedConfig)
            }
          } catch (e) {
            console.log('Usando configuración por defecto')
          }

          const itemsFactura = orderItems.map((item, index) => ({
            codigo: String(index + 1).padStart(3, '0'),
            cantidad: item.cantidad,
            descripcion: item.nombre_item_snapshot,
            precioUnitario: Math.round(item.precio_unitario),
            tipoIva: 'IVA_10',
            valorVenta: Math.round(item.precio_unitario * item.cantidad)
          }))

          const totales = calcularTotalesFactura(itemsFactura)

          const facturaData = {
            cliente: {
              nombre: paymentForm.factura_nombre || paymentForm.customer_nombre,
              ruc: paymentForm.factura_ruc,
              telefono: paymentForm.customer_telefono
            },
            fecha: new Date().toISOString(),
            condicionVenta: paymentForm.factura_condicion,
            items: itemsFactura,
            ...totales
          }

          const pdfBlob = generarFacturaPDF(facturaData, facturaConfig)
          const url = URL.createObjectURL(pdfBlob)
          const link = document.createElement('a')
          link.href = url
          link.download = `factura_${selectedOrder.id.slice(0, 8)}_${Date.now()}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        } catch (facturaError) {
          console.error('Error generando factura:', facturaError)
          toast.warning('Error al generar factura')
        }
      }

      // Generar recibo si está marcado
      if (paymentForm.generar_recibo && orderItems && orderItems.length > 0) {
        try {
          const pdfBlob = await generarReciboPDF(orderItems, finalTotal)
          const url = URL.createObjectURL(pdfBlob)
          const link = document.createElement('a')
          link.href = url
          link.download = `recibo_${selectedOrder.id.slice(0, 8)}_${Date.now()}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        } catch (reciboError) {
          console.error('Error generando recibo:', reciboError)
          toast.warning('Error al generar recibo')
        }
      }

      // Mostrar vuelto si es efectivo
      if (paymentForm.metodo_pago === 'EFECTIVO' && paymentForm.monto_recibido) {
        const vuelto = calculateVuelto()
        if (vuelto > 0) {
          toast.success(`¡Pago procesado! Vuelto: ${formatCurrency(vuelto)}`, { duration: 5000 })
        } else {
          toast.success('¡Pago procesado exitosamente!')
        }
      } else {
        toast.success('¡Pago procesado exitosamente!')
      }

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
            <TabsTrigger value="rapido" className="bg-green-100 text-green-700 data-[state=active]:bg-green-500 data-[state=active]:text-white">
              ⚡ Cobro Rápido
            </TabsTrigger>
          </TabsList>

          <TabsContent value="acobrar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ordersACobrar.map(order => {
                // Identificar items nuevos (tienen 🆕 o es_adicional)
                const itemsOriginales = order.order_items?.filter(i => !i.nombre_item_snapshot?.startsWith('🆕') && !i.es_adicional) || []
                const itemsNuevos = order.order_items?.filter(i => i.nombre_item_snapshot?.startsWith('🆕') || i.es_adicional) || []
                
                return (
                <Card key={order.id} className={`border-2 ${itemsNuevos.length > 0 ? 'border-green-400 shadow-lg' : 'border-orange-200'}`}>
                  <CardHeader className={itemsNuevos.length > 0 ? 'bg-green-50' : 'bg-orange-50'}>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          Pedido #{order.id.slice(0, 8)}
                          {itemsNuevos.length > 0 && (
                            <span className="ml-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                              +{itemsNuevos.length} NUEVO
                            </span>
                          )}
                        </CardTitle>
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

                    {/* Nota de cocina si hay items nuevos */}
                    {order.nota_cocina && (
                      <div className="bg-yellow-100 p-2 rounded text-xs border border-yellow-300">
                        <span className="font-bold text-yellow-800">⚠️ Nota:</span>
                        <span className="text-yellow-900 ml-1">{order.nota_cocina}</span>
                      </div>
                    )}

                    <div className="border-t pt-2">
                      <p className="font-semibold mb-1 text-sm">Productos:</p>
                      
                      {/* Items originales */}
                      {itemsOriginales.map(item => (
                        <div key={item.id} className="flex justify-between text-xs mb-1">
                          <span>{item.cantidad}x {item.nombre_item_snapshot}</span>
                          <span className="font-medium">{formatCurrency(item.precio_unitario * item.cantidad)}</span>
                        </div>
                      ))}
                      
                      {/* Items nuevos separados */}
                      {itemsNuevos.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-green-300 bg-green-50 rounded p-2">
                          <p className="text-xs font-bold text-green-700 mb-1">🆕 NUEVOS ITEMS:</p>
                          {itemsNuevos.map(item => (
                            <div key={item.id} className="flex justify-between text-xs mb-1 text-green-800 font-medium">
                              <span>{item.cantidad}x {item.nombre_item_snapshot?.replace('🆕 ', '')}</span>
                              <span>{formatCurrency(item.precio_unitario * item.cantidad)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="text-lg font-bold">TOTAL:</span>
                      <span className="text-2xl font-bold text-orange-600">{formatCurrency(order.total)}</span>
                    </div>

                    <Button 
                      className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-6"
                      onClick={() => openPaymentDialog(order)}
                    >
                      <CreditCard className="mr-2 h-5 w-5" /> Cobrar
                    </Button>
                  </CardContent>
                </Card>
              )})}
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
                      <span className="text-xl font-bold text-gray-700">{formatCurrency(order.total)}</span>
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

          {/* Pestaña Cobro Rápido */}
          <TabsContent value="rapido">
            <CobroRapidoSection restaurant={restaurant} formatCurrency={formatCurrency} />
          </TabsContent>
        </Tabs>

        {/* Dialog de Pago */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Procesar Pago</DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Pedido #{selectedOrder.id.slice(0, 8)}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Subtotal:</span>
                    <span className="text-xl font-bold">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>

                {/* Solo mostrar campos de cliente si NO está activada la factura */}
                {!paymentForm.generar_factura && (
                  <>
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
                        placeholder="+595 900 000 000"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={paymentForm.acepta_promociones}
                        onCheckedChange={(checked) => setPaymentForm({...paymentForm, acepta_promociones: checked})}
                      />
                      <Label>Acepta recibir promociones por WhatsApp</Label>
                    </div>
                  </>
                )}

                {/* Opciones de Factura y Recibo */}
                <div className="border-t pt-4 space-y-3">
                  {/* Opción Recibo */}
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Receipt className="h-5 w-5 text-green-600" />
                      <Label className="font-semibold cursor-pointer">Generar Recibo</Label>
                    </div>
                    <Checkbox 
                      checked={paymentForm.generar_recibo}
                      onCheckedChange={(checked) => setPaymentForm({
                        ...paymentForm, 
                        generar_recibo: checked,
                        generar_factura: checked ? false : paymentForm.generar_factura
                      })}
                    />
                  </div>

                  {/* Opción Factura */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <Label className="font-semibold cursor-pointer">Generar Factura</Label>
                    </div>
                    <Checkbox 
                      checked={paymentForm.generar_factura}
                      onCheckedChange={(checked) => setPaymentForm({
                        ...paymentForm, 
                        generar_factura: checked,
                        generar_recibo: checked ? false : paymentForm.generar_recibo
                      })}
                    />
                  </div>
                </div>

                {/* Campos de Factura */}
                {paymentForm.generar_factura && (
                  <div className="space-y-3 border border-blue-200 p-4 rounded-lg bg-blue-50/50">
                    <p className="text-sm font-semibold text-blue-800 mb-2">📋 Datos para la Factura</p>
                    
                    <div className="space-y-2">
                      <Label>RUC / C.I. N° *</Label>
                      <Input 
                        value={paymentForm.factura_ruc}
                        onChange={(e) => setPaymentForm({...paymentForm, factura_ruc: e.target.value})}
                        onBlur={(e) => buscarClientePorRUC(e.target.value)}
                        placeholder="12345678-9"
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Nombre / Razón Social *</Label>
                      <Input 
                        value={paymentForm.factura_nombre}
                        onChange={(e) => setPaymentForm({...paymentForm, factura_nombre: e.target.value})}
                        placeholder="JUAN PÉREZ"
                        className="bg-white"
                      />
                    </div>

                    <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                      <span className="font-semibold">Condición de Venta:</span> CONTADO
                    </div>
                  </div>
                )}

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
                          : formatCurrency(appliedCoupon.valor)}
                      </p>
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="bg-orange-50 p-3 rounded-lg space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(selectedOrder.total)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600 font-semibold">
                        <span>Descuento:</span>
                        <span>-{formatCurrency(calculateDiscount())}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-1">
                        <span>Total:</span>
                        <span className="text-orange-600">{formatCurrency(calculateFinalTotal())}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Método de Pago */}
                <div className="space-y-2 border-t pt-4">
                  <Label>Método de Pago *</Label>
                  <Select value={paymentForm.metodo_pago} onValueChange={(val) => setPaymentForm({...paymentForm, metodo_pago: val, monto_recibido: ''})}>
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

                {/* Calculadora de Vuelto - Solo para Efectivo */}
                {paymentForm.metodo_pago === 'EFECTIVO' && (
                  <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Coins className="h-5 w-5 text-yellow-600" />
                      <Label className="font-semibold text-yellow-800">Calcular Vuelto</Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Monto Recibido (Gs)</Label>
                      <Input 
                        type="number"
                        value={paymentForm.monto_recibido}
                        onChange={(e) => setPaymentForm({...paymentForm, monto_recibido: e.target.value})}
                        placeholder="Ej: 50000"
                        className="bg-white text-lg font-bold"
                      />
                    </div>

                    {paymentForm.monto_recibido && (
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Total a pagar:</span>
                          <span className="font-semibold">{formatCurrency(calculateFinalTotal())}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Monto recibido:</span>
                          <span className="font-semibold">{formatCurrency(parseFloat(paymentForm.monto_recibido) || 0)}</span>
                        </div>
                        <div className={`flex justify-between text-lg font-bold pt-2 border-t ${calculateVuelto() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span>VUELTO:</span>
                          <span>{formatCurrency(Math.abs(calculateVuelto()))} {calculateVuelto() < 0 ? '(Falta)' : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600 py-6 text-lg"
                  onClick={handleProcessPayment}
                  disabled={paymentForm.generar_factura && (!paymentForm.factura_ruc || !paymentForm.factura_nombre)}
                >
                  {paymentForm.generar_factura ? (
                    <>
                      <FileText className="mr-2 h-5 w-5" /> 
                      Procesar Pago - {formatCurrency(calculateFinalTotal())} y Descargar Factura
                    </>
                  ) : paymentForm.generar_recibo ? (
                    <>
                      <Receipt className="mr-2 h-5 w-5" /> 
                      Procesar Pago - {formatCurrency(calculateFinalTotal())} y Descargar Recibo
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" /> 
                      Procesar Pago - {formatCurrency(calculateFinalTotal())}
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  )
}

// Componente separado para Cobro Rápido
function CobroRapidoSection({ restaurant, formatCurrency }) {
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [cart, setCart] = useState([])
  const [metodoPago, setMetodoPago] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (restaurant?.id) {
      loadProducts()
    }
  }, [restaurant?.id])

  const loadProducts = async () => {
    if (!restaurant?.id) {
      console.log('No restaurant ID for cobro rapido')
      setIsLoading(false)
      return
    }
    
    try {
      console.log('Loading products for restaurant:', restaurant.id)
      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select('*, menu_categories(nombre)')
        .eq('restaurant_id', restaurant.id)
        .eq('activo', true)

      if (itemsError) {
        console.error('Error loading items:', itemsError)
      }

      const { data: cats, error: catsError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)

      if (catsError) {
        console.error('Error loading categories:', catsError)
      }

      console.log('Loaded items:', items?.length, 'categories:', cats?.length)
      setMenuItems(items || [])
      setCategories(cats || [])
    } catch (e) {
      console.error('Error in loadProducts:', e)
    }
    setIsLoading(false)
  }

  const filteredProducts = menuItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || item.categoria_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = (product) => {
    const existing = cart.find(i => i.id === product.id)
    if (existing) {
      setCart(cart.map(i => i.id === product.id ? {...i, cantidad: i.cantidad + 1} : i))
    } else {
      setCart([...cart, { ...product, cantidad: 1 }])
    }
    toast.success(`${product.nombre} agregado`)
  }

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.cantidad + delta
        return newQty > 0 ? { ...item, cantidad: newQty } : item
      }
      return item
    }).filter(i => i.cantidad > 0))
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(i => i.id !== id))
  }

  const total = cart.reduce((sum, item) => sum + (parseFloat(item.precio_base) * item.cantidad), 0)

  const handleCobroRapido = async () => {
    if (cart.length === 0) {
      toast.error('Agrega productos al carrito')
      return
    }
    if (!metodoPago) {
      toast.error('Selecciona un método de pago')
      return
    }

    setProcesando(true)
    try {
      // Crear pedido directamente como PAGADO
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          tipo: 'PARA_LLEVAR',
          estado: 'PAGADO',
          subtotal: total,
          total: total,
          descuento: 0,
          metodo_pago: metodoPago,
          fecha_pago: new Date().toISOString(),
          origen: 'COBRO_RAPIDO'
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Crear items del pedido
      const orderItems = cart.map(item => ({
        order_id: order.id,
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

      toast.success(`¡Cobro exitoso! Total: ${formatCurrency(total)}`)
      setCart([])
      setMetodoPago('')
    } catch (error) {
      console.error('Error en cobro rápido:', error)
      toast.error('Error al procesar el cobro')
    }
    setProcesando(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Panel de productos */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-green-700">
              <Coins className="h-5 w-5 mr-2" />
              Seleccionar Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <Select value={selectedCategory || 'all'} onValueChange={(val) => setSelectedCategory(val === 'all' ? null : val)}>
                <SelectTrigger className="w-[180px]">
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-3 bg-white border rounded-lg hover:bg-green-50 hover:border-green-400 transition-all text-left"
                >
                  <p className="font-medium text-sm truncate">{product.nombre}</p>
                  <p className="text-green-600 font-bold">{formatCurrency(product.precio_base)}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Carrito de cobro rápido */}
      <div className="space-y-4">
        <Card className="border-2 border-green-400">
          <CardHeader className="bg-green-50 pb-2">
            <CardTitle className="text-green-700">🛒 Carrito Rápido</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {cart.length === 0 ? (
              <p className="text-center text-gray-400 py-6">Selecciona productos para cobrar</p>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.nombre}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.precio_base)} c/u</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.id, -1)}>-</Button>
                      <span className="w-6 text-center font-bold">{item.cantidad}</span>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.id, 1)}>+</Button>
                      <Button size="sm" variant="destructive" className="h-7 w-7 p-0 ml-1" onClick={() => removeFromCart(item.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t mt-4 pt-4 space-y-3">
              <div className="flex justify-between text-xl font-bold">
                <span>TOTAL:</span>
                <span className="text-green-600">{formatCurrency(total)}</span>
              </div>

              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger>
                  <SelectValue placeholder="Método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">💵 Efectivo</SelectItem>
                  <SelectItem value="TARJETA">💳 Tarjeta</SelectItem>
                  <SelectItem value="TRANSFERENCIA">📱 Transferencia</SelectItem>
                  <SelectItem value="QR">📷 QR</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                className="w-full bg-green-500 hover:bg-green-600 py-6 text-lg"
                onClick={handleCobroRapido}
                disabled={cart.length === 0 || !metodoPago || procesando}
              >
                {procesando ? 'Procesando...' : `⚡ Cobrar ${formatCurrency(total)}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
