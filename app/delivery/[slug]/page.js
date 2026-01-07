'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Plus, Minus, X, Check, Clock, Phone, ChevronLeft, Send, Store, Package, Gift, MessageSquare, Search, Timer, ChefHat, Utensils, CreditCard, Users, UserPlus } from 'lucide-react'
import { toast, Toaster } from 'sonner'

export default function MenuPublicoPage() {
  const params = useParams()
  const slug = params.slug

  const [restaurant, setRestaurant] = useState(null)
  const [config, setConfig] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [promotions, setPromotions] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Estado del pedido activo (para seguimiento)
  const [activeOrder, setActiveOrder] = useState(null)
  const [activeOrders, setActiveOrders] = useState([]) // Para cuentas separadas
  const [activeOrderTab, setActiveOrderTab] = useState(0) // Pestaña activa en seguimiento
  const [orderTimer, setOrderTimer] = useState(0)
  const [timerStartTime, setTimerStartTime] = useState(null) // Para reiniciar el timer cuando se agregan items
  const [showOrderStatus, setShowOrderStatus] = useState(false)
  const timerRef = useRef(null)

  // Estados para Cuentas Separadas
  const [cuentasSeparadas, setCuentasSeparadas] = useState(false)
  const [cuentas, setCuentas] = useState([]) // Array de {nombre: string, productos: array}
  const [cuentaActiva, setCuentaActiva] = useState(0)
  const [nombreCuentaDialog, setNombreCuentaDialog] = useState(false)
  const [nuevoNombreCuenta, setNuevoNombreCuenta] = useState('')
  const [grupoMesaId, setGrupoMesaId] = useState(null)

  // Modales
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productQuantity, setProductQuantity] = useState(1)
  const [productComment, setProductComment] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [whatsappModal, setWhatsappModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState(false)
  const [addedModal, setAddedModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) // Prevenir doble envío

  // Formularios
  const [checkoutForm, setCheckoutForm] = useState({
    mesa: '',
    tipo: 'LOCAL',
    nombre_cliente: ''
  })

  const [whatsappForm, setWhatsappForm] = useState({
    nombre: '',
    telefono: ''
  })

  // Colores por defecto
  const defaultColors = {
    primary: '#f97316',
    secondary: '#1e3a5f',
    background: '#ffffff',
    text: '#1f2937'
  }

  const colors = config?.colores || defaultColors

  // Cargar pedido activo desde localStorage y verificar que aún existe
  useEffect(() => {
    const checkSavedOrder = async () => {
      // Primero verificar si hay múltiples pedidos (cuentas separadas)
      const savedOrders = localStorage.getItem(`activeOrders_${slug}`)
      
      if (savedOrders) {
        const orders = JSON.parse(savedOrders)
        const orderIds = orders.map(o => o.id)
        
        // Verificar que los pedidos aún existen
        const { data: updatedOrders, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .in('id', orderIds)
        
        if (error || !updatedOrders || updatedOrders.length === 0) {
          console.log('Pedidos guardados ya no existen, limpiando...')
          localStorage.removeItem(`activeOrder_${slug}`)
          localStorage.removeItem(`activeOrders_${slug}`)
          setActiveOrder(null)
          setActiveOrders([])
          setShowOrderStatus(false)
          return
        }
        
        // Si todos están pagados, limpiar
        if (updatedOrders.every(o => o.estado === 'PAGADO')) {
          localStorage.removeItem(`activeOrder_${slug}`)
          localStorage.removeItem(`activeOrders_${slug}`)
          setActiveOrder(null)
          setActiveOrders([])
          setShowOrderStatus(false)
          return
        }
        
        // Los pedidos existen y están activos
        setActiveOrders(updatedOrders)
        setActiveOrder(updatedOrders[0])
        setShowOrderStatus(true)
        setCheckoutForm(prev => ({ ...prev, mesa: updatedOrders[0].mesa || '' }))
        return
      }
      
      // Modo normal - un solo pedido
      const savedOrder = localStorage.getItem(`activeOrder_${slug}`)
      if (savedOrder) {
        const order = JSON.parse(savedOrder)
        
        // Verificar que el pedido aún existe en la base de datos
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', order.id)
          .single()
        
        if (error || !data) {
          // El pedido fue eliminado, limpiar localStorage
          console.log('Pedido guardado ya no existe, limpiando...')
          localStorage.removeItem(`activeOrder_${slug}`)
          setActiveOrder(null)
          setShowOrderStatus(false)
          return
        }
        
        // Si el pedido está PAGADO, también limpiar
        if (data.estado === 'PAGADO') {
          localStorage.removeItem(`activeOrder_${slug}`)
          setActiveOrder(null)
          setShowOrderStatus(false)
          return
        }
        
        // El pedido existe y está activo
        setActiveOrder(data)
        setShowOrderStatus(true)
        setCheckoutForm(prev => ({ ...prev, mesa: data.mesa || '' }))
      }
    }
    
    if (slug) {
      checkSavedOrder()
    }
  }, [slug])

  // Timer para el pedido
  useEffect(() => {
    if (activeOrder && activeOrder.estado !== 'PAGADO' && activeOrder.estado !== 'ENTREGADO') {
      // Usar timerStartTime si existe, sino usar created_at del pedido
      const startTime = timerStartTime || new Date(activeOrder.created_at).getTime()
      
      timerRef.current = setInterval(() => {
        const now = Date.now()
        setOrderTimer(Math.floor((now - startTime) / 1000))
      }, 1000)
    } else if (activeOrder?.estado === 'ENTREGADO') {
      // Si está entregado, detener el timer
      setOrderTimer(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeOrder, timerStartTime])

  // Polling para actualizar estado del pedido (incluyendo cuentas separadas)
  useEffect(() => {
    if (!activeOrder) return

    const pollOrders = async () => {
      // Verificar si hay múltiples pedidos (cuentas separadas)
      const savedOrders = localStorage.getItem(`activeOrders_${slug}`)
      
      if (savedOrders) {
        // Modo cuentas separadas - actualizar todos los pedidos
        const ordersData = JSON.parse(savedOrders)
        const orderIds = ordersData.map(o => o.id)
        
        const { data: updatedOrders, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .in('id', orderIds)
        
        if (error || !updatedOrders || updatedOrders.length === 0) {
          console.log('Pedidos eliminados o no encontrados, limpiando estado...')
          localStorage.removeItem(`activeOrder_${slug}`)
          localStorage.removeItem(`activeOrders_${slug}`)
          setActiveOrder(null)
          setActiveOrders([])
          setShowOrderStatus(false)
          setCart([])
          toast.info('Los pedidos ya no están disponibles')
          return
        }

        // Actualizar localStorage y estado
        localStorage.setItem(`activeOrders_${slug}`, JSON.stringify(updatedOrders))
        setActiveOrders(updatedOrders)
        
        // Actualizar el pedido activo si es uno de los del grupo
        const currentActiveIndex = activeOrderTab < updatedOrders.length ? activeOrderTab : 0
        setActiveOrder(updatedOrders[currentActiveIndex])
        localStorage.setItem(`activeOrder_${slug}`, JSON.stringify(updatedOrders[currentActiveIndex]))

        // Si todos están pagados, limpiar
        if (updatedOrders.every(o => o.estado === 'PAGADO')) {
          localStorage.removeItem(`activeOrder_${slug}`)
          localStorage.removeItem(`activeOrders_${slug}`)
          setActiveOrder(null)
          setActiveOrders([])
          setShowOrderStatus(false)
          setCart([])
          toast.success('¡Gracias por tu compra!')
        }
      } else {
        // Modo normal - un solo pedido
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', activeOrder.id)
          .single()

        // Si el pedido fue eliminado o no existe
        if (error || !data) {
          console.log('Pedido eliminado o no encontrado, limpiando estado...')
          localStorage.removeItem(`activeOrder_${slug}`)
          setActiveOrder(null)
          setShowOrderStatus(false)
          setCart([])
          toast.info('El pedido ya no está disponible')
          return
        }

        setActiveOrder(data)
        localStorage.setItem(`activeOrder_${slug}`, JSON.stringify(data))
        
        // Si está pagado, limpiar
        if (data.estado === 'PAGADO') {
          localStorage.removeItem(`activeOrder_${slug}`)
          setActiveOrder(null)
          setShowOrderStatus(false)
          setCart([])
          toast.success('¡Gracias por tu compra!')
        }
      }
    }

    // Primera carga inmediata
    pollOrders()
    
    const interval = setInterval(pollOrders, 3000) // Cada 3 segundos para mejor respuesta
    return () => clearInterval(interval)
  }, [activeOrder?.id, slug, activeOrderTab])

  useEffect(() => {
    if (slug) {
      loadRestaurant()
    }
  }, [slug])

  const loadRestaurant = async () => {
    try {
      setLoading(true)
      
      let activeRest = null
      
      const { data: restBySlug } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .single()

      if (restBySlug) {
        activeRest = restBySlug
      } else {
        const { data: restById } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', slug)
          .single()
        
        if (restById) {
          activeRest = restById
        }
      }

      if (!activeRest) {
        setError('Restaurante no encontrado')
        setLoading(false)
        return
      }

      setRestaurant(activeRest)

      try {
        const { data: configData } = await supabase
          .from('menu_digital_config')
          .select('*')
          .eq('restaurant_id', activeRest.id)
          .single()

        if (configData) {
          setConfig(configData)
        }
      } catch (configErr) {
        console.log('Sin configuración de menú digital')
      }

      try {
        const { data: promoData } = await supabase
          .from('promociones')
          .select('*, promocion_items(*, menu_items(id, nombre, precio_base, img_url))')
          .eq('restaurant_id', activeRest.id)
          .eq('activa', true)

        if (promoData) {
          setPromotions(promoData)
        }
      } catch (promoErr) {
        console.log('Sin promociones')
      }

      const { data: cats } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', activeRest.id)
        .eq('activo', true)
        .order('orden')

      // Separar categorías principales de subcategorías (si el campo parent_id existe)
      const mainCategories = (cats || []).filter(c => !c.parent_id)
      const subCategories = (cats || []).filter(c => c.parent_id)
      
      // Si no hay subcategorías, usar todas las categorías
      setCategories(mainCategories.length > 0 ? mainCategories : (cats || []))

      const { data: prods, error: prodsError } = await supabase
        .from('menu_items')
        .select('*, menu_categories(id, nombre)')
        .eq('restaurant_id', activeRest.id)
        .eq('disponible', true)
        .order('nombre')

      if (prodsError) {
        console.error('Error cargando productos:', prodsError)
      }

      // Agregar info de subcategoría a cada producto (si existe)
      const productsWithSubcat = (prods || []).map(p => ({
        ...p,
        subcategory: p.subcategory_id ? subCategories.find(sc => sc.id === p.subcategory_id) : null,
        mainCategory: p.menu_categories
      }))
      
      setProducts(productsWithSubcat)
      setLoading(false)

    } catch (err) {
      console.error('Error cargando restaurante:', err)
      setError('Error al cargar el menú')
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price).replace('PYG', 'Gs.')
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Obtener promoción activa para un producto específico
  const getProductPromotion = (productId) => {
    for (const promo of promotions) {
      const hasProduct = promo.promocion_items?.some(pi => pi.menu_item_id === productId)
      if (hasProduct && promo.activa) {
        return promo
      }
    }
    return null
  }

  // Calcular precio con descuento para un producto
  const getDiscountedPrice = (product) => {
    const promo = getProductPromotion(product.id)
    if (!promo) return null
    
    if (promo.tipo_descuento === 'porcentaje') {
      return {
        precioOriginal: product.precio_base,
        precioFinal: Math.round(product.precio_base * (1 - promo.porcentaje_descuento / 100)),
        tipo: 'porcentaje',
        descuento: promo.porcentaje_descuento,
        promo
      }
    } else if (promo.tipo_descuento === '2x1') {
      return {
        precioOriginal: product.precio_base,
        precioFinal: product.precio_base, // El precio unitario es el mismo, pero llevas 2
        tipo: '2x1',
        descuento: 50, // Efectivamente 50% al llevar 2
        promo
      }
    }
    return null
  }

  // Filtrar productos por categoría y búsqueda
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory
    const matchesSearch = !searchQuery || 
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Agrupar productos por subcategoría para mejor visualización
  const groupedProducts = () => {
    if (searchQuery) return { 'Resultados de búsqueda': filteredProducts }
    
    const groups = {}
    const noSubcat = []
    
    filteredProducts.forEach(p => {
      if (p.subcategory) {
        const subcatName = p.subcategory.nombre
        if (!groups[subcatName]) {
          groups[subcatName] = { orden: p.subcategory.orden || 999, products: [] }
        }
        groups[subcatName].products.push(p)
      } else {
        noSubcat.push(p)
      }
    })
    
    // Ordenar subcategorías por su orden
    const sortedGroups = Object.entries(groups)
      .sort((a, b) => a[1].orden - b[1].orden)
      .reduce((acc, [key, val]) => {
        acc[key] = val.products
        return acc
      }, {})
    
    // Si hay productos sin subcategoría, agregarlos al final o inicio
    if (noSubcat.length > 0) {
      if (Object.keys(sortedGroups).length > 0) {
        sortedGroups['Otros Productos'] = noSubcat
      } else {
        // Si no hay subcategorías, mostrar todos sin título
        return { '': filteredProducts }
      }
    }
    
    return Object.keys(sortedGroups).length > 0 ? sortedGroups : { '': filteredProducts }
  }

  const popularProducts = products.filter(p => p.destacado).slice(0, 6) || products.slice(0, 6)

  const openProductModal = (product, isPromotion = false, promoData = null) => {
    // Si el producto tiene promoción individual, aplicarla
    const productPromo = !isPromotion ? getDiscountedPrice(product) : null
    
    setSelectedProduct({
      ...product,
      isPromotion: isPromotion || !!productPromo,
      promoData: promoData || productPromo?.promo,
      productPromo: productPromo,
      precio: isPromotion ? promoData.precio_final : 
              productPromo ? productPromo.precioFinal : product.precio_base
    })
    setProductQuantity(productPromo?.tipo === '2x1' ? 2 : 1) // Para 2x1, empezar con 2
    setProductComment('')
  }

  // Funciones para Cuentas Separadas del Cliente
  const iniciarCuentasSeparadasCliente = () => {
    setCuentasSeparadas(true)
    setGrupoMesaId(crypto.randomUUID())
    setNombreCuentaDialog(true)
  }

  const agregarNuevaCuentaCliente = () => {
    setNuevoNombreCuenta('')
    setNombreCuentaDialog(true)
  }

  const confirmarNuevaCuentaCliente = () => {
    if (!nuevoNombreCuenta.trim()) {
      toast.error('Ingresa un nombre para la cuenta')
      return
    }
    
    const nuevaCuenta = {
      nombre: nuevoNombreCuenta.trim(),
      productos: []
    }
    
    setCuentas([...cuentas, nuevaCuenta])
    setCuentaActiva(cuentas.length)
    setNombreCuentaDialog(false)
    setNuevoNombreCuenta('')
    toast.success(`Cuenta de "${nuevaCuenta.nombre}" creada`)
  }

  const eliminarCuentaCliente = (index) => {
    if (cuentas.length <= 1) {
      toast.error('Debe haber al menos una cuenta')
      return
    }
    
    const nuevasCuentas = cuentas.filter((_, i) => i !== index)
    setCuentas(nuevasCuentas)
    
    if (cuentaActiva >= nuevasCuentas.length) {
      setCuentaActiva(nuevasCuentas.length - 1)
    }
  }

  const cancelarCuentasSeparadasCliente = () => {
    setCuentasSeparadas(false)
    setCuentas([])
    setCuentaActiva(0)
    setGrupoMesaId(null)
    setCart([])
  }

  const addToCartFromModal = () => {
    if (!selectedProduct) return

    // Calcular precio correcto considerando promociones
    let precioFinal = selectedProduct.precio
    let cantidadFinal = productQuantity
    let nombrePromo = ''
    
    // Si es promoción 2x1, ajustar el precio
    if (selectedProduct.productPromo?.tipo === '2x1') {
      // Para 2x1: por cada 2 unidades, cobras 1
      const pares = Math.floor(productQuantity / 2)
      const impares = productQuantity % 2
      // El precio total sería: (pares * precio) + (impares * precio)
      // Efectivamente pagas la mitad por los pares
      precioFinal = selectedProduct.precio_base // Precio unitario normal
      nombrePromo = ' (2x1)'
    } else if (selectedProduct.productPromo?.tipo === 'porcentaje') {
      precioFinal = selectedProduct.productPromo.precioFinal
      nombrePromo = ` (-${selectedProduct.productPromo.descuento}%)`
    }

    const cartItem = {
      id: selectedProduct.isPromotion && !selectedProduct.productPromo 
        ? `promo-${selectedProduct.promoData.id}` 
        : selectedProduct.id,
      nombre: (selectedProduct.isPromotion && !selectedProduct.productPromo 
        ? selectedProduct.promoData.nombre 
        : selectedProduct.nombre) + nombrePromo,
      precio: precioFinal,
      precio_original: selectedProduct.precio_base,
      img_url: selectedProduct.isPromotion && !selectedProduct.productPromo 
        ? selectedProduct.promoData?.imagen_url 
        : selectedProduct.img_url,
      cantidad: cantidadFinal,
      comentario: productComment,
      isPromotion: selectedProduct.isPromotion,
      promoData: selectedProduct.promoData,
      productPromo: selectedProduct.productPromo // Guardar info de promoción
    }

    if (cuentasSeparadas && cuentas.length > 0) {
      // Modo cuentas separadas
      const nuevasCuentas = [...cuentas]
      const cuentaActual = nuevasCuentas[cuentaActiva]
      const existing = cuentaActual.productos.find(item => item.id === cartItem.id && item.comentario === cartItem.comentario)
      
      if (existing) {
        cuentaActual.productos = cuentaActual.productos.map(item =>
          (item.id === cartItem.id && item.comentario === cartItem.comentario)
            ? { ...item, cantidad: item.cantidad + productQuantity }
            : item
        )
      } else {
        cuentaActual.productos.push(cartItem)
      }
      
      setCuentas(nuevasCuentas)
      toast.success(`${cartItem.nombre} agregado a cuenta de ${cuentaActual.nombre}`)
    } else {
      // Modo normal
      const existing = cart.find(item => item.id === cartItem.id && item.comentario === cartItem.comentario)
      if (existing) {
        setCart(cart.map(item => 
          (item.id === cartItem.id && item.comentario === cartItem.comentario)
            ? { ...item, cantidad: item.cantidad + productQuantity }
            : item
        ))
      } else {
        setCart([...cart, cartItem])
      }
    }
    
    setSelectedProduct(null)
    setAddedModal(true)
  }

  const updateCartQuantity = (index, delta) => {
    if (cuentasSeparadas && cuentas.length > 0) {
      const nuevasCuentas = [...cuentas]
      nuevasCuentas[cuentaActiva].productos = nuevasCuentas[cuentaActiva].productos
        .map((item, i) => {
          if (i === index) {
            const newCantidad = item.cantidad + delta
            return newCantidad > 0 ? { ...item, cantidad: newCantidad } : item
          }
          return item
        })
        .filter(item => item.cantidad > 0)
      setCuentas(nuevasCuentas)
    } else {
      setCart(cart.map((item, i) => {
        if (i === index) {
          const newCantidad = item.cantidad + delta
          return newCantidad > 0 ? { ...item, cantidad: newCantidad } : item
        }
        return item
      }).filter(item => item.cantidad > 0))
    }
  }

  const removeFromCart = (index) => {
    if (cuentasSeparadas && cuentas.length > 0) {
      const nuevasCuentas = [...cuentas]
      nuevasCuentas[cuentaActiva].productos = nuevasCuentas[cuentaActiva].productos.filter((_, i) => i !== index)
      setCuentas(nuevasCuentas)
    } else {
      setCart(cart.filter((_, i) => i !== index))
    }
  }

  // Calcular precio de un item considerando promociones 2x1
  const calculateItemTotal = (item) => {
    if (item.productPromo?.tipo === '2x1') {
      // Para 2x1: por cada 2 unidades, cobras 1
      const pares = Math.floor(item.cantidad / 2)
      const impares = item.cantidad % 2
      return (pares * item.precio_original) + (impares * item.precio_original)
    }
    return item.precio * item.cantidad
  }

  // Funciones de cálculo actualizadas
  const getCurrentCartItems = () => {
    if (cuentasSeparadas && cuentas.length > 0) {
      return cuentas[cuentaActiva]?.productos || []
    }
    return cart
  }

  const calculateCuentaTotal = (cuenta) => {
    return cuenta.productos.reduce((sum, item) => sum + calculateItemTotal(item), 0)
  }

  const calculateTotalGeneral = () => {
    if (cuentasSeparadas && cuentas.length > 0) {
      return cuentas.reduce((total, cuenta) => total + calculateCuentaTotal(cuenta), 0)
    }
    return cart.reduce((sum, item) => sum + calculateItemTotal(item), 0)
  }

  const cartTotal = cuentasSeparadas && cuentas.length > 0 
    ? calculateCuentaTotal(cuentas[cuentaActiva] || { productos: [] })
    : cart.reduce((sum, item) => sum + calculateItemTotal(item), 0)
    
  const cartCount = cuentasSeparadas && cuentas.length > 0
    ? cuentas.reduce((total, cuenta) => total + cuenta.productos.reduce((sum, item) => sum + item.cantidad, 0), 0)
    : cart.reduce((sum, item) => sum + item.cantidad, 0)

  // Total del pedido activo + carrito nuevo
  const activeOrderTotal = activeOrder?.order_items?.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0) || 0
  const grandTotal = activeOrderTotal + (cuentasSeparadas ? calculateTotalGeneral() : cartTotal)

  const handleCheckout = async () => {
    if (!checkoutForm.mesa && !activeOrder) {
      toast.error('Por favor ingresa el número de mesa')
      return
    }

    // Prevenir doble envío
    if (isSubmitting) {
      console.log('Ya se está enviando el pedido...')
      return
    }
    setIsSubmitting(true)

    try {
      // Si hay un pedido activo y está ENTREGADO, agregar más items (modo normal, sin cuentas separadas)
      if (activeOrder && activeOrder.estado === 'ENTREGADO' && !cuentasSeparadas) {
        // Agregar nuevos items al pedido existente - marcados como nuevos con emoji
        const newItems = cart.map(item => ({
          order_id: activeOrder.id,
          menu_item_id: item.isPromotion ? null : item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
          total_item: item.precio * item.cantidad,
          nombre_item_snapshot: `🆕 ${item.comentario ? `${item.nombre} (${item.comentario})` : item.nombre}`
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(newItems)

        if (itemsError) {
          console.error('Error insertando items:', itemsError)
          throw itemsError
        }

        // Actualizar total del pedido y cambiar estado a PENDIENTE
        const newTotal = activeOrderTotal + cartTotal
        
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            estado: 'PENDIENTE',
            subtotal: newTotal,
            total: newTotal
          })
          .eq('id', activeOrder.id)

        if (updateError) {
          console.error('Error actualizando pedido:', updateError)
          throw updateError
        }

        // Recargar pedido
        const { data: updatedOrder } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', activeOrder.id)
          .single()

        setActiveOrder(updatedOrder)
        setTimerStartTime(Date.now()) // Reiniciar el timer cuando se agregan nuevos items
        localStorage.setItem(`activeOrder_${slug}`, JSON.stringify(updatedOrder))
        setCart([])
        setCheckoutOpen(false)
        toast.success('¡Productos agregados a tu pedido!')
        return
      }

      // MODO CUENTAS SEPARADAS: Crear un pedido por cada cuenta
      if (cuentasSeparadas && cuentas.length > 0) {
        const tieneCuentasConProductos = cuentas.some(c => c.productos.length > 0)
        if (!tieneCuentasConProductos) {
          toast.error('Todas las cuentas están vacías')
          return
        }

        const pedidosCreados = []
        
        for (const cuenta of cuentas) {
          if (cuenta.productos.length === 0) continue
          
          const cuentaTotal = calculateCuentaTotal(cuenta)

          // Crear pedido con nombre_cuenta y grupo_mesa_id
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              restaurant_id: restaurant.id,
              tipo: checkoutForm.tipo === 'LOCAL' ? 'SALA' : 'PARA_LLEVAR',
              mesa: checkoutForm.mesa,
              estado: 'PENDIENTE',
              origen: 'DIGITAL',
              nota_cliente: `Cuenta de: ${cuenta.nombre}${checkoutForm.nombre_cliente ? ` - ${checkoutForm.nombre_cliente}` : ''}`,
              subtotal: cuentaTotal,
              total: cuentaTotal,
              nombre_cuenta: cuenta.nombre,
              grupo_mesa_id: grupoMesaId
            })
            .select()
            .single()

          if (orderError) throw orderError

          const orderItems = cuenta.productos.map(item => ({
            order_id: order.id,
            menu_item_id: item.isPromotion ? null : item.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio,
            total_item: item.precio * item.cantidad,
            nombre_item_snapshot: item.comentario ? `${item.nombre} (${item.comentario})` : item.nombre
          }))

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems)

          if (itemsError) throw itemsError

          // Cargar pedido completo
          const { data: fullOrder } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', order.id)
            .single()
          
          pedidosCreados.push(fullOrder)
        }

        // Guardar todos los pedidos para seguimiento
        setActiveOrders(pedidosCreados)
        setActiveOrder(pedidosCreados[0]) // El primero como principal
        localStorage.setItem(`activeOrders_${slug}`, JSON.stringify(pedidosCreados))
        localStorage.setItem(`activeOrder_${slug}`, JSON.stringify(pedidosCreados[0]))
        
        // Limpiar
        setCuentasSeparadas(false)
        setCuentas([])
        setCuentaActiva(0)
        setGrupoMesaId(null)
        setCart([])
        setCheckoutOpen(false)
        setConfirmModal(true)
        setShowOrderStatus(true)
        
        toast.success(`¡${pedidosCreados.length} pedidos creados!`)
        return
      }

      // MODO NORMAL: Crear un solo pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          tipo: checkoutForm.tipo === 'LOCAL' ? 'SALA' : 'PARA_LLEVAR',
          mesa: checkoutForm.mesa,
          estado: 'PENDIENTE',
          origen: 'DIGITAL',
          nota_cliente: checkoutForm.nombre_cliente ? `Cliente: ${checkoutForm.nombre_cliente}` : null,
          subtotal: cartTotal,
          total: cartTotal
        })
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.isPromotion ? null : item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        total_item: item.precio * item.cantidad,
        nombre_item_snapshot: item.comentario ? `${item.nombre} (${item.comentario})` : item.nombre
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Guardar pedido activo
      const { data: fullOrder } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', order.id)
        .single()

      setActiveOrder(fullOrder)
      localStorage.setItem(`activeOrder_${slug}`, JSON.stringify(fullOrder))
      setCart([])
      setCheckoutOpen(false)
      setConfirmModal(true)
      setShowOrderStatus(true)

    } catch (err) {
      console.error('Error creando pedido:', err)
      toast.error('Error al enviar el pedido: ' + (err.message || 'Intenta de nuevo'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWhatsappSubmit = async () => {
    if (!whatsappForm.nombre || !whatsappForm.telefono) {
      toast.error('Por favor completa todos los campos')
      return
    }

    try {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('telefono', whatsappForm.telefono)
        .single()

      if (existing) {
        await supabase
          .from('customers')
          .update({ nombre: whatsappForm.nombre, acepta_marketing_whatsapp: true })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('customers')
          .insert({
            restaurant_id: restaurant.id,
            nombre: whatsappForm.nombre,
            telefono: whatsappForm.telefono,
            acepta_marketing_whatsapp: true
          })
      }

      toast.success('¡Gracias! Te enviaremos promociones por WhatsApp')
      setWhatsappModal(false)
      setWhatsappForm({ nombre: '', telefono: '' })
    } catch (err) {
      toast.error('Error al guardar tus datos')
    }
  }

  const getStatusInfo = (estado) => {
    const statusMap = {
      PENDIENTE: { label: 'Pedido Recibido', icon: Clock, color: 'bg-orange-500', message: 'Tu pedido ha sido recibido' },
      NUEVO: { label: 'Pedido Recibido', icon: Clock, color: 'bg-blue-500', message: 'Tu pedido ha sido recibido' },
      PREPARANDO: { label: 'En Preparación', icon: ChefHat, color: 'bg-yellow-500', message: 'Estamos preparando tu pedido' },
      LISTO: { label: 'Listo para entregar', icon: Check, color: 'bg-green-500', message: '¡Tu pedido está listo!' },
      ENTREGADO: { label: 'Entregado', icon: Utensils, color: 'bg-purple-500', message: 'Disfruta tu comida. ¿Deseas pedir algo más?' },
      PAGADO: { label: 'Pagado', icon: CreditCard, color: 'bg-gray-500', message: '¡Gracias por tu compra!' }
    }
    return statusMap[estado] || statusMap.PENDIENTE
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando menú...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{error}</h1>
          <p className="text-gray-600">El menú que buscas no está disponible</p>
        </div>
      </div>
    )
  }

  // Calcular tiempo por etapa
  const getStageTimer = (stage) => {
    if (!activeOrder) return 0
    const now = Date.now()
    const createdAt = new Date(activeOrder.created_at).getTime()
    const stages = ['PENDIENTE', 'PREPARANDO', 'LISTO', 'ENTREGADO']
    const currentIndex = stages.indexOf(activeOrder.estado)
    const stageIndex = stages.indexOf(stage)
    
    if (stageIndex > currentIndex) return 0
    if (stageIndex === currentIndex) {
      // Etapa actual: mostrar tiempo transcurrido
      return Math.floor((now - createdAt) / 1000)
    }
    return 0 // Etapas completadas podrían mostrar tiempo guardado si lo tuviéramos
  }

  // Vista de seguimiento de pedido
  if (showOrderStatus && activeOrder && activeOrder.estado !== 'PAGADO') {
    // Usar activeOrders del estado (se actualiza con el polling)
    const ordersToShow = activeOrders.length > 0 ? activeOrders : [activeOrder]
    const currentOrder = ordersToShow[activeOrderTab] || activeOrder
    
    const statusInfo = getStatusInfo(currentOrder.estado)
    const StatusIcon = statusInfo.icon
    const stages = [
      { key: 'PENDIENTE', label: 'Recibido', icon: Clock },
      { key: 'PREPARANDO', label: 'Preparando', icon: ChefHat },
      { key: 'LISTO', label: 'Listo', icon: Check },
      { key: 'ENTREGADO', label: 'Entregado', icon: Utensils }
    ]

    return (
      <div className="min-h-screen pb-24" style={{ backgroundColor: colors.background }}>
        <Toaster position="top-center" richColors />
        
        {/* Header */}
        <div className="p-4 text-white" style={{ backgroundColor: colors.primary }}>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">
              {ordersToShow.length > 1 ? 'Tus Pedidos' : 'Tu Pedido'}
            </h1>
            {/* Solo mostrar cronómetro si NO está entregado */}
            {currentOrder.estado !== 'ENTREGADO' && (
              <div className="flex items-center bg-white/20 px-3 py-1 rounded-full">
                <Timer className="h-4 w-4 mr-2" />
                <span className="font-mono text-lg">{formatTime(orderTimer)}</span>
              </div>
            )}
            {currentOrder.estado === 'ENTREGADO' && (
              <div className="flex items-center bg-green-500 px-3 py-1 rounded-full">
                <Check className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Entregado</span>
              </div>
            )}
          </div>
          <p className="text-sm text-white/80">Mesa {currentOrder.mesa}</p>
          
          {/* Pestañas de cuentas separadas */}
          {ordersToShow.length > 1 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {ordersToShow.map((order, index) => (
                <button
                  key={order.id}
                  onClick={() => setActiveOrderTab(index)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    activeOrderTab === index 
                      ? 'bg-white text-gray-900' 
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {order.nombre_cuenta || `Pedido ${index + 1}`}
                  {order.estado === 'ENTREGADO' && ' ✓'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Estado del pedido con cronómetros por etapa */}
        <div className="p-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            {/* Indicador de cuenta si hay múltiples */}
            {ordersToShow.length > 1 && currentOrder.nombre_cuenta && (
              <div className="mb-4 pb-3 border-b">
                <span className="text-sm text-gray-500">Cuenta de</span>
                <h3 className="text-lg font-bold" style={{ color: colors.primary }}>
                  {currentOrder.nombre_cuenta}
                </h3>
              </div>
            )}
            
            <div className={`w-20 h-20 rounded-full ${statusInfo.color} flex items-center justify-center mx-auto mb-4 animate-pulse`}>
              <StatusIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{statusInfo.label}</h2>
            <p className="text-gray-600 mb-6">{statusInfo.message}</p>
            
            {/* Timeline detallado con cronómetro por etapa */}
            <div className="flex justify-between items-start mb-6 px-2">
              {stages.map((stage, i) => {
                const stageStates = ['PENDIENTE', 'NUEVO']
                const isActive = stageStates.includes(currentOrder.estado) ? i === 0 :
                               currentOrder.estado === 'PREPARANDO' ? i <= 1 :
                               currentOrder.estado === 'LISTO' ? i <= 2 :
                               currentOrder.estado === 'ENTREGADO' ? i <= 3 : false
                const isCurrent = (stageStates.includes(currentOrder.estado) && i === 0) ||
                                  (currentOrder.estado === stage.key)
                const StageIcon = stage.icon
                
                return (
                  <div key={stage.key} className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all ${
                      isActive ? statusInfo.color : 'bg-gray-200'
                    } ${isCurrent && currentOrder.estado !== 'ENTREGADO' ? 'ring-4 ring-offset-2 animate-pulse' : ''}`}
                    style={isCurrent ? { ringColor: statusInfo.color.replace('bg-', '') } : {}}>
                      <StageIcon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <span className={`text-xs font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                      {stage.label}
                    </span>
                    {/* Solo mostrar cronómetro si NO está entregado */}
                    {isCurrent && currentOrder.estado !== 'ENTREGADO' && (
                      <div className="flex items-center mt-1 bg-gray-100 rounded-full px-2 py-0.5">
                        <Timer className="h-3 w-3 mr-1 text-gray-500" />
                        <span className="text-xs font-mono text-gray-700">{formatTime(orderTimer)}</span>
                      </div>
                    )}
                    {i < stages.length - 1 && (
                      <div className={`hidden sm:block absolute h-0.5 w-12 ${isActive ? statusInfo.color : 'bg-gray-200'}`} 
                           style={{ left: `${(i + 1) * 25}%`, top: '20px' }}></div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Línea de progreso horizontal */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${statusInfo.color}`}
                style={{ 
                  width: currentOrder.estado === 'PENDIENTE' || currentOrder.estado === 'NUEVO' ? '25%' :
                         currentOrder.estado === 'PREPARANDO' ? '50%' :
                         currentOrder.estado === 'LISTO' ? '75%' :
                         currentOrder.estado === 'ENTREGADO' ? '100%' : '0%'
                }}
              ></div>
            </div>
          </div>

          {/* Items del pedido */}
          <div className="mt-6 bg-white rounded-2xl shadow-lg p-4">
            <h3 className="font-bold mb-3">Detalle del pedido</h3>
            <div className="space-y-3">
              {currentOrder.order_items?.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium capitalize">{item.nombre_item_snapshot}</p>
                    <p className="text-sm text-gray-500">x{item.cantidad}</p>
                  </div>
                  <span className="font-bold" style={{ color: colors.primary }}>
                    {formatPrice(item.precio_unitario * item.cantidad)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t mt-3 pt-3 flex justify-between items-center">
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-xl" style={{ color: colors.primary }}>
                {formatPrice(currentOrder.total)}
              </span>
            </div>
          </div>

          {/* Resumen de todas las cuentas si hay múltiples */}
          {ordersToShow.length > 1 && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-sm text-gray-600 mb-2">Resumen de todas las cuentas</h4>
              {ordersToShow.map((order, i) => (
                <div key={order.id} className="flex justify-between text-sm py-1">
                  <span>{order.nombre_cuenta || `Pedido ${i + 1}`}</span>
                  <span className="font-medium">{formatPrice(order.total)}</span>
                </div>
              ))}
              <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                <span>Total General</span>
                <span style={{ color: colors.primary }}>
                  {formatPrice(ordersToShow.reduce((sum, o) => sum + o.total, 0))}
                </span>
              </div>
            </div>
          )}

          {/* Botón para agregar más productos (solo si está entregado) */}
          {currentOrder.estado === 'ENTREGADO' && (
            <div className="mt-6">
              <Button 
                className="w-full py-6 text-white text-lg"
                style={{ backgroundColor: colors.primary }}
                onClick={() => setShowOrderStatus(false)}
              >
                <Plus className="h-5 w-5 mr-2" />
                Pedir más productos
              </Button>
              <p className="text-center text-sm text-gray-500 mt-2">
                Todos los productos se agregarán a tu cuenta actual
              </p>
            </div>
          )}
        </div>

        {/* Botón ver menú si no está entregado */}
        {currentOrder.estado !== 'ENTREGADO' && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
            <Button 
              variant="outline"
              className="w-full py-4"
              onClick={() => setShowOrderStatus(false)}
            >
              Ver Menú
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: colors.background }}>
      <Toaster position="top-center" richColors />
      
      {/* Header con imagen de portada */}
      <div 
        className="relative h-40 bg-cover bg-center overflow-hidden"
        style={{ 
          backgroundColor: colors.secondary
        }}
      >
        {/* Imagen de portada como img para mejor control de errores */}
        {config?.imagen_portada && (
          <img 
            src={config.imagen_portada}
            alt="Portada"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
              console.log('Error cargando imagen de portada')
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end space-x-4">
            {restaurant?.logo_url && (
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.nombre}
                className="w-16 h-16 rounded-xl bg-white p-1 object-contain shadow-lg"
              />
            )}
            <div className="text-white pb-1">
              <h1 className="text-xl font-bold">{restaurant?.nombre}</h1>
              {(config?.colores?.tipo_negocio || restaurant?.tipo_negocio) && (
                <p className="text-white/90 text-xs font-medium capitalize">
                  {(config?.colores?.tipo_negocio || restaurant?.tipo_negocio || '').replace('_', ' ')}
                </p>
              )}
              {(config?.descripcion || restaurant?.descripcion) && (
                <p className="text-white/70 text-sm mt-0.5">{config?.descripcion || restaurant?.descripcion}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Botón ver pedido activo */}
        {activeOrder && activeOrder.estado !== 'PAGADO' && (
          <button
            onClick={() => setShowOrderStatus(true)}
            className="absolute top-4 right-4 bg-white rounded-full px-4 py-2 shadow-lg flex items-center"
          >
            <Clock className="h-4 w-4 mr-2" style={{ color: colors.primary }} />
            <span className="text-sm font-medium">Ver pedido</span>
          </button>
        )}
      </div>

      {/* Barra de búsqueda y promociones */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-0"
            />
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setWhatsappModal(true)}
            className="text-xs border-green-500 text-green-600 hover:bg-green-50 whitespace-nowrap"
          >
            <Phone className="h-3 w-3 mr-1" />
            Promociones
          </Button>
        </div>
      </div>

      {/* Sección de PROMOCIONES */}
      {promotions.length > 0 && !searchQuery && (
        <div className="px-4 py-4 bg-gradient-to-r from-red-50 to-orange-50">
          <h2 className="text-lg font-bold mb-3 flex items-center text-red-600">
            <Gift className="h-5 w-5 mr-2" />
            🔥 Promociones
          </h2>
          <div className="flex overflow-x-auto space-x-3 pb-2 -mx-4 px-4 scrollbar-hide">
            {promotions.map(promo => (
              <div 
                key={promo.id}
                className="flex-shrink-0 w-36 bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition hover:scale-105 border-2 border-red-200"
                onClick={() => openProductModal(null, true, promo)}
              >
                <div className="relative">
                  {promo.imagen_url ? (
                    <img src={promo.imagen_url} alt={promo.nombre} className="w-full h-20 object-cover" />
                  ) : (
                    <div className="w-full h-20 bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center">
                      <Gift className="h-8 w-8 text-white" />
                    </div>
                  )}
                  <Badge className="absolute top-1 left-1 bg-red-500 text-white text-xs">
                    {promo.tipo_descuento === '2x1' ? '2x1' : `-${promo.porcentaje_descuento}%`}
                  </Badge>
                </div>
                <div className="p-2">
                  <h3 className="font-bold text-xs text-gray-800 truncate">{promo.nombre}</h3>
                  <span className="font-bold text-sm text-red-600">{formatPrice(promo.precio_final)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Productos populares */}
      {popularProducts.length > 0 && !searchQuery && (
        <div className="px-4 py-3">
          <h2 className="text-base font-bold mb-2 flex items-center">
            <span className="text-yellow-500 mr-2">⭐</span>
            Los más pedidos
          </h2>
          <div className="flex overflow-x-auto space-x-2 pb-2 -mx-4 px-4 scrollbar-hide">
            {popularProducts.map(product => (
              <div 
                key={product.id}
                className="flex-shrink-0 w-28 bg-white rounded-xl shadow-md overflow-hidden cursor-pointer"
                onClick={() => openProductModal(product)}
              >
                {product.img_url ? (
                  <img src={product.img_url} alt={product.nombre} className="w-full h-20 object-cover" />
                ) : (
                  <div className="w-full h-20 bg-gray-100 flex items-center justify-center">
                    <span className="text-2xl">🍽️</span>
                  </div>
                )}
                <div className="p-2">
                  <h3 className="font-medium text-xs truncate capitalize">{product.nombre}</h3>
                  <p className="font-bold text-xs" style={{ color: colors.primary }}>
                    {formatPrice(product.precio_base)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros de categorías */}
      <div className="px-4 py-2 sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex overflow-x-auto space-x-2 pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedCategory === 'all' 
                ? 'text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={selectedCategory === 'all' ? { backgroundColor: colors.primary } : {}}
          >
            Todo
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat.id 
                  ? 'text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={selectedCategory === cat.id ? { backgroundColor: colors.primary } : {}}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de productos - Agrupados por subcategoría */}
      <div className="px-3 py-3">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500">No se encontraron productos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedProducts()).map(([groupName, groupProducts]) => (
              <div key={groupName || 'all'}>
                {/* Título de subcategoría */}
                {groupName && (
                  <div className="mb-2 pb-1 border-b border-gray-200">
                    <h3 className="font-bold text-sm text-gray-700 flex items-center">
                      <span className="w-1 h-4 rounded mr-2" style={{ backgroundColor: colors.primary }}></span>
                      {groupName}
                    </h3>
                  </div>
                )}
                
                {/* Grid de productos */}
                <div className="grid grid-cols-3 gap-2">
                  {groupProducts.map(product => {
                    const inCart = cart.filter(item => item.id === product.id)
                    const totalInCart = inCart.reduce((sum, item) => sum + item.cantidad, 0)
                    const productPromo = getDiscountedPrice(product)
              
              return (
                <div 
                  key={product.id}
                  className={`bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer ${productPromo ? 'ring-2 ring-red-400' : ''}`}
                  onClick={() => openProductModal(product)}
                >
                  <div className="relative">
                    {product.img_url ? (
                      <img src={product.img_url} alt={product.nombre} className="w-full h-20 object-cover" />
                    ) : (
                      <div className="w-full h-20 bg-gray-50 flex items-center justify-center">
                        <span className="text-2xl">🍽️</span>
                      </div>
                    )}
                    {/* Badge de promoción */}
                    {productPromo && (
                      <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {productPromo.tipo === '2x1' ? '2x1' : `-${productPromo.descuento}%`}
                      </div>
                    )}
                    {totalInCart > 0 && (
                      <div 
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: colors.primary }}
                      >
                        {totalInCart}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="font-medium text-xs line-clamp-2 capitalize leading-tight">{product.nombre}</h3>
                    {productPromo ? (
                      <div className="mt-1">
                        <span className="text-[10px] text-gray-400 line-through mr-1">
                          {formatPrice(product.precio_base)}
                        </span>
                        <span className="font-bold text-xs text-red-600">
                          {productPromo.tipo === '2x1' 
                            ? `2x ${formatPrice(product.precio_base)}`
                            : formatPrice(productPromo.precioFinal)
                          }
                        </span>
                      </div>
                    ) : (
                      <p className="font-bold text-xs mt-1" style={{ color: colors.primary }}>
                        {formatPrice(product.precio_base)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra del carrito fija */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t shadow-lg">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-between px-4"
            style={{ backgroundColor: colors.primary }}
          >
            <div className="flex items-center">
              <div className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center mr-2">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span>Ver Pedido ({cartCount})</span>
            </div>
            <span className="font-bold">{formatPrice(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Modal de selección de producto */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md mx-auto">
          {selectedProduct && (
            <>
              {(selectedProduct.img_url || selectedProduct.promoData?.imagen_url) && (
                <div className="relative">
                  <img 
                    src={selectedProduct.isPromotion && selectedProduct.promoData?.imagen_url 
                      ? selectedProduct.promoData.imagen_url 
                      : selectedProduct.img_url}
                    alt={selectedProduct.nombre}
                    className="w-full h-40 object-cover rounded-lg -mt-6 -mx-6 mb-4"
                    style={{ width: 'calc(100% + 48px)', maxWidth: 'none' }}
                  />
                  {/* Badge de promoción en el modal */}
                  {(selectedProduct.productPromo || selectedProduct.promoData) && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                      {selectedProduct.productPromo?.tipo === '2x1' || selectedProduct.promoData?.tipo_descuento === '2x1'
                        ? '🎉 2x1' 
                        : `🏷️ -${selectedProduct.productPromo?.descuento || selectedProduct.promoData?.porcentaje_descuento}%`
                      }
                    </div>
                  )}
                </div>
              )}

              <DialogHeader>
                <DialogTitle className="text-lg capitalize">
                  {selectedProduct.isPromotion && !selectedProduct.productPromo 
                    ? selectedProduct.promoData?.nombre 
                    : selectedProduct.nombre}
                </DialogTitle>
              </DialogHeader>

              {selectedProduct.descripcion && !selectedProduct.isPromotion && (
                <p className="text-gray-600 text-sm">{selectedProduct.descripcion}</p>
              )}

              {/* Mostrar info de promoción */}
              {selectedProduct.productPromo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 my-2">
                  {selectedProduct.productPromo.tipo === '2x1' ? (
                    <div className="text-center">
                      <p className="text-red-600 font-bold text-lg">🎉 ¡Promoción 2x1!</p>
                      <p className="text-sm text-red-500">Llevas 2, pagas solo 1</p>
                      <p className="text-xs text-gray-500 mt-1">Cantidad mínima: 2 unidades</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-red-600 font-bold">🏷️ ¡Descuento {selectedProduct.productPromo.descuento}%!</p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-gray-400 line-through text-sm">
                          {formatPrice(selectedProduct.productPromo.precioOriginal)}
                        </span>
                        <span className="text-red-600 font-bold text-lg">
                          {formatPrice(selectedProduct.productPromo.precioFinal)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between py-2">
                {selectedProduct.productPromo?.tipo === '2x1' ? (
                  <div>
                    <span className="text-xl font-bold text-red-600">
                      {formatPrice(selectedProduct.precio)} x 2
                    </span>
                    <p className="text-xs text-green-600">¡Pagas solo 1!</p>
                  </div>
                ) : (
                  <span className="text-xl font-bold" style={{ color: selectedProduct.productPromo ? '#dc2626' : colors.primary }}>
                    {formatPrice(selectedProduct.precio)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center space-x-4 py-3 bg-gray-50 rounded-xl">
                <button
                  onClick={() => setProductQuantity(Math.max(selectedProduct.productPromo?.tipo === '2x1' ? 2 : 1, productQuantity - 1))}
                  className="w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-2xl font-bold w-12 text-center">{productQuantity}</span>
                <button
                  onClick={() => setProductQuantity(productQuantity + 1)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {selectedProduct.productPromo?.tipo === '2x1' && (
                <p className="text-xs text-center text-gray-500">
                  Incrementa de a 2 para mantener la promoción
                </p>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center text-gray-700">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  ¿Alguna indicación especial?
                </label>
                <Textarea
                  value={productComment}
                  onChange={(e) => setProductComment(e.target.value)}
                  placeholder="Escribe aquí si tienes alguna preferencia..."
                  className="resize-none text-sm"
                  rows={2}
                />
              </div>

              <Button 
                className="w-full text-white py-5 text-base mt-2"
                style={{ backgroundColor: colors.primary }}
                onClick={addToCartFromModal}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Agregar {formatPrice(selectedProduct.precio * productQuantity)}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal producto agregado */}
      <Dialog open={addedModal} onOpenChange={setAddedModal}>
        <DialogContent className="max-w-sm mx-auto">
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check className="h-7 w-7 text-green-500" />
            </div>
            <h3 className="text-lg font-bold mb-4">¡Agregado!</h3>
            
            <div className="space-y-2">
              <Button 
                className="w-full text-white"
                style={{ backgroundColor: colors.primary }}
                onClick={() => { setAddedModal(false); setCartOpen(true) }}
              >
                Ver Carrito ({cartCount})
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setAddedModal(false)}>
                Seguir Comprando
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal del carrito */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-md mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" style={{ color: colors.primary }} />
                {cuentasSeparadas ? 'Cuentas Separadas' : 'Tu Pedido'}
              </div>
              {!activeOrder && !cuentasSeparadas && cart.length > 0 && (
                <button
                  onClick={iniciarCuentasSeparadasCliente}
                  className="text-xs px-2 py-1 rounded-full border flex items-center gap-1 hover:bg-gray-100"
                >
                  <Users className="h-3 w-3" /> Separar
                </button>
              )}
              {cuentasSeparadas && (
                <button
                  onClick={cancelarCuentasSeparadasCliente}
                  className="text-xs px-2 py-1 rounded-full border border-red-300 text-red-600 flex items-center gap-1 hover:bg-red-50"
                >
                  <X className="h-3 w-3" /> Cancelar
                </button>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Pestañas de cuentas separadas */}
          {cuentasSeparadas && cuentas.length > 0 && (
            <div className="mb-3 pb-3 border-b">
              <div className="flex flex-wrap gap-1 mb-2">
                {cuentas.map((cuenta, index) => (
                  <button
                    key={index}
                    onClick={() => setCuentaActiva(index)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                      cuentaActiva === index 
                        ? 'text-white' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    style={cuentaActiva === index ? { backgroundColor: colors.primary } : {}}
                  >
                    {cuenta.nombre}
                    <span className="bg-white/30 px-1.5 rounded-full">
                      {cuenta.productos.length}
                    </span>
                  </button>
                ))}
                <button
                  onClick={agregarNuevaCuentaCliente}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center"
                >
                  <UserPlus className="h-3 w-3 mr-1" /> Agregar
                </button>
              </div>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>Total de {cuentas[cuentaActiva]?.nombre}: {formatPrice(calculateCuentaTotal(cuentas[cuentaActiva] || { productos: [] }))}</span>
                <span className="font-medium">Total General: {formatPrice(calculateTotalGeneral())}</span>
              </div>
            </div>
          )}

          {/* Items del pedido activo */}
          {activeOrder && activeOrder.estado === 'ENTREGADO' && activeOrder.order_items?.length > 0 && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-800 mb-2">Pedido anterior</h4>
              {activeOrder.order_items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="capitalize">{item.cantidad}x {item.nombre_item_snapshot}</span>
                  <span>{formatPrice(item.precio_unitario * item.cantidad)}</span>
                </div>
              ))}
              <div className="border-t border-purple-200 mt-2 pt-2 flex justify-between font-medium">
                <span>Subtotal anterior</span>
                <span>{formatPrice(activeOrderTotal)}</span>
              </div>
            </div>
          )}

          {getCurrentCartItems().length === 0 && !cuentasSeparadas ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🛒</div>
              <p className="text-gray-500">Tu carrito está vacío</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setCartOpen(false)}
              >
                Ver Menú
              </Button>
            </div>
          ) : getCurrentCartItems().length === 0 && cuentasSeparadas ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-gray-600 font-medium">Cuenta de {cuentas[cuentaActiva]?.nombre}</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Esta cuenta no tiene productos aún</p>
              <Button 
                className="text-white"
                style={{ backgroundColor: colors.primary }}
                onClick={() => setCartOpen(false)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Productos
              </Button>
              
              {/* Mostrar resumen de otras cuentas si tienen productos */}
              {cuentas.some(c => c.productos.length > 0) && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left">
                  <p className="text-xs text-gray-500 mb-2">Otras cuentas:</p>
                  {cuentas.map((cuenta, i) => cuenta.productos.length > 0 && (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span>{cuenta.nombre}</span>
                      <span className="font-medium">{cuenta.productos.length} items</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {getCurrentCartItems().map((item, index) => {
                  const itemTotal = calculateItemTotal(item)
                  const hasPromo = item.productPromo || item.isPromotion
                  
                  return (
                    <div key={`${item.id}-${index}`} className={`p-3 rounded-lg ${hasPromo ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium capitalize text-sm flex items-center gap-1">
                            {item.nombre}
                            {item.productPromo?.tipo === '2x1' && (
                              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">2x1</span>
                            )}
                            {item.productPromo?.tipo === 'porcentaje' && (
                              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">-{item.productPromo.descuento}%</span>
                            )}
                          </h4>
                          {item.comentario && (
                            <p className="text-xs text-gray-500 italic">&quot;{item.comentario}&quot;</p>
                          )}
                          {item.productPromo?.tipo === '2x1' ? (
                            <div className="text-sm mt-1">
                              <span className="text-gray-500">{item.cantidad} unidades</span>
                              <p className="text-xs text-green-600">
                                Pagas {Math.ceil(item.cantidad / 2)} x {formatPrice(item.precio_original)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm mt-1" style={{ color: hasPromo ? '#dc2626' : colors.primary }}>
                              {formatPrice(item.precio)} x {item.cantidad}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {item.productPromo && item.precio_original !== item.precio && (
                            <span className="text-xs text-gray-400 line-through block">
                              {formatPrice(item.precio_original * item.cantidad)}
                            </span>
                          )}
                          <span className={`font-bold text-sm ${hasPromo ? 'text-red-600' : ''}`}>
                            {formatPrice(itemTotal)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => updateCartQuantity(index, -1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{item.cantidad}</span>
                          <button onClick={() => updateCartQuantity(index, 1)} className="w-6 h-6 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(index)} className="text-red-500 text-xs">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t pt-3">
                {activeOrder && activeOrder.estado === 'ENTREGADO' && (
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-gray-600">Nuevo pedido:</span>
                    <span>{formatPrice(cuentasSeparadas ? calculateTotalGeneral() : cartTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-medium">Total:</span>
                  <span className="text-xl font-bold" style={{ color: colors.primary }}>
                    {formatPrice(cuentasSeparadas ? calculateTotalGeneral() : (activeOrder?.estado === 'ENTREGADO' ? grandTotal : cartTotal))}
                  </span>
                </div>
                {cuentasSeparadas && cuentas.length > 1 && (
                  <p className="text-xs text-gray-500 mb-2 text-center">
                    Se crearán {cuentas.filter(c => c.productos.length > 0).length} pedidos separados
                  </p>
                )}
                <Button 
                  className="w-full text-white py-5"
                  style={{ backgroundColor: colors.primary }}
                  onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}
                  disabled={cuentasSeparadas ? !cuentas.some(c => c.productos.length > 0) : getCurrentCartItems().length === 0}
                >
                  Continuar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de checkout */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>
              {activeOrder?.estado === 'ENTREGADO' ? 'Agregar al pedido' : 'Finalizar Pedido'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!activeOrder && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Número de Mesa *</label>
                  <Input
                    type="text"
                    placeholder="Ej: 5"
                    value={checkoutForm.mesa}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, mesa: e.target.value })}
                    className="text-center text-xl font-bold h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">¿Dónde consumirás?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCheckoutForm({ ...checkoutForm, tipo: 'LOCAL' })}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center ${
                        checkoutForm.tipo === 'LOCAL' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                      }`}
                    >
                      <Store className={`h-6 w-6 mb-1 ${checkoutForm.tipo === 'LOCAL' ? 'text-orange-500' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium">En el local</span>
                    </button>
                    <button
                      onClick={() => setCheckoutForm({ ...checkoutForm, tipo: 'LLEVAR' })}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center ${
                        checkoutForm.tipo === 'LLEVAR' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                      }`}
                    >
                      <Package className={`h-6 w-6 mb-1 ${checkoutForm.tipo === 'LLEVAR' ? 'text-orange-500' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium">Para llevar</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tu nombre (opcional)</label>
                  <Input
                    type="text"
                    placeholder="Para identificar tu pedido"
                    value={checkoutForm.nombre_cliente}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, nombre_cliente: e.target.value })}
                  />
                </div>
              </>
            )}

            {activeOrder?.estado === 'ENTREGADO' && (
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>Mesa {activeOrder.mesa}</strong> - Los productos se agregarán a tu cuenta actual
                </p>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-xl">
              {activeOrder?.estado === 'ENTREGADO' && (
                <>
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-gray-600">Pedido anterior</span>
                    <span>{formatPrice(activeOrderTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-gray-600">Nuevo pedido</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="border-t pt-2"></div>
                </>
              )}
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span style={{ color: colors.primary }}>
                  {formatPrice(activeOrder?.estado === 'ENTREGADO' ? grandTotal : cartTotal)}
                </span>
              </div>
            </div>

            <Button 
              className="w-full text-white py-5 text-base"
              style={{ backgroundColor: colors.primary }}
              onClick={handleCheckout}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {activeOrder?.estado === 'ENTREGADO' ? 'Agregar al pedido' : 'Enviar Pedido'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación */}
      <Dialog open={confirmModal} onOpenChange={setConfirmModal}>
        <DialogContent className="max-w-sm mx-auto text-center">
          <div className="py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">¡Pedido Enviado!</h3>
            <p className="text-gray-600 mb-4">Tu pedido fue recibido. Puedes seguir el estado desde el menú.</p>
            <Button 
              className="w-full text-white"
              style={{ backgroundColor: colors.primary }}
              onClick={() => { setConfirmModal(false); setShowOrderStatus(true) }}
            >
              Ver estado del pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de WhatsApp */}
      <Dialog open={whatsappModal} onOpenChange={setWhatsappModal}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center">
              <Phone className="h-5 w-5 mr-2 text-green-500" />
              Recibir Promociones
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-center text-gray-600 text-sm">Te enviaremos ofertas exclusivas por WhatsApp</p>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <Input
                placeholder="Tu nombre"
                value={whatsappForm.nombre}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp</label>
              <Input
                placeholder="0981123456"
                value={whatsappForm.telefono}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, telefono: e.target.value })}
              />
            </div>
            <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={handleWhatsappSubmit}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para nombre de cuenta separada */}
      <Dialog open={nombreCuentaDialog} onOpenChange={setNombreCuentaDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" style={{ color: colors.primary }} />
              {cuentas.length === 0 ? 'Crear Primera Cuenta' : 'Nueva Cuenta'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              {cuentas.length === 0 
                ? '¿Quieren pagar por separado? Ingresa el nombre de la primera persona.'
                : 'Ingresa el nombre para agregar otra cuenta.'}
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <Input 
                placeholder="Ej: Juan, María..."
                value={nuevoNombreCuenta}
                onChange={(e) => setNuevoNombreCuenta(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmarNuevaCuentaCliente()}
                autoFocus
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setNombreCuentaDialog(false)
                if (cuentas.length === 0) {
                  setCuentasSeparadas(false)
                }
              }}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 text-white"
              style={{ backgroundColor: colors.primary }}
              onClick={confirmarNuevaCuentaCliente}
            >
              {cuentas.length === 0 ? 'Crear' : 'Agregar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
