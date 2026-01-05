'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Plus, Minus, X, Check, Clock, MapPin, Phone, ChevronLeft, Send, Store, Package, Gift, MessageSquare } from 'lucide-react'
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

  // Modales
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productQuantity, setProductQuantity] = useState(1)
  const [productComment, setProductComment] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [whatsappModal, setWhatsappModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState(false)
  const [addedModal, setAddedModal] = useState(false)

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

  useEffect(() => {
    if (slug) {
      loadRestaurant()
    }
  }, [slug])

  const loadRestaurant = async () => {
    try {
      setLoading(true)
      
      let activeRest = null
      
      // Primero intentar por slug
      const { data: restBySlug } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .single()

      if (restBySlug) {
        activeRest = restBySlug
      } else {
        // Intentar por ID
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
      console.log('Restaurante cargado:', activeRest.nombre, activeRest.id)

      // Cargar configuración del menú digital
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

      // Cargar promociones
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

      // Cargar categorías del restaurante (menu_categories)
      const { data: cats, error: catsError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', activeRest.id)
        .eq('activo', true)
        .order('orden')

      if (catsError) {
        console.log('Error cargando categorías:', catsError)
      }
      setCategories(cats || [])
      console.log('Categorías cargadas:', cats?.length || 0)

      // Cargar productos activos
      const { data: prods, error: prodsError } = await supabase
        .from('menu_items')
        .select('*, menu_categories(id, nombre)')
        .eq('restaurant_id', activeRest.id)
        .eq('disponible', true)
        .order('nombre')

      if (prodsError) {
        console.log('Error cargando productos:', prodsError)
      }
      
      console.log('Productos cargados:', prods?.length || 0)
      setProducts(prods || [])
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

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category_id === selectedCategory)

  // Productos populares (los primeros 4)
  const popularProducts = products.slice(0, 4)

  // Abrir modal de producto para seleccionar cantidad
  const openProductModal = (product, isPromotion = false, promoData = null) => {
    setSelectedProduct({
      ...product,
      isPromotion,
      promoData,
      precio: isPromotion ? promoData.precio_final : product.precio_base
    })
    setProductQuantity(1)
    setProductComment('')
  }

  // Agregar al carrito desde el modal
  const addToCartFromModal = () => {
    if (!selectedProduct) return

    const cartItem = {
      id: selectedProduct.isPromotion ? `promo-${selectedProduct.promoData.id}` : selectedProduct.id,
      nombre: selectedProduct.isPromotion ? selectedProduct.promoData.nombre : selectedProduct.nombre,
      precio: selectedProduct.precio,
      precio_original: selectedProduct.isPromotion ? selectedProduct.promoData.precio_original : selectedProduct.precio_base,
      img_url: selectedProduct.isPromotion ? selectedProduct.promoData.imagen_url : selectedProduct.img_url,
      cantidad: productQuantity,
      comentario: productComment,
      isPromotion: selectedProduct.isPromotion,
      promoData: selectedProduct.promoData
    }

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
    
    setSelectedProduct(null)
    setAddedModal(true)
  }

  const updateCartQuantity = (index, delta) => {
    setCart(cart.map((item, i) => {
      if (i === index) {
        const newCantidad = item.cantidad + delta
        return newCantidad > 0 ? { ...item, cantidad: newCantidad } : item
      }
      return item
    }).filter(item => item.cantidad > 0))
  }

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.cantidad, 0)

  const handleCheckout = async () => {
    if (!checkoutForm.mesa) {
      toast.error('Por favor ingresa el número de mesa')
      return
    }

    try {
      // Crear el pedido
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

      if (orderError) {
        console.error('Error creando orden:', orderError)
        throw orderError
      }

      // Crear los items del pedido con los campos correctos
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

      if (itemsError) {
        console.error('Error creando items:', itemsError)
        throw itemsError
      }

      // Limpiar y mostrar confirmación
      setCart([])
      setCheckoutOpen(false)
      setConfirmModal(true)
      setCheckoutForm({ mesa: '', tipo: 'LOCAL', nombre_cliente: '' })

    } catch (err) {
      console.error('Error creando pedido:', err)
      toast.error('Error al enviar el pedido: ' + (err.message || 'Intenta de nuevo'))
    }
  }

  const handleWhatsappSubmit = async () => {
    if (!whatsappForm.nombre || !whatsappForm.telefono) {
      toast.error('Por favor completa todos los campos')
      return
    }

    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('telefono', whatsappForm.telefono)
        .single()

      if (existing) {
        // Actualizar
        await supabase
          .from('customers')
          .update({ 
            nombre: whatsappForm.nombre,
            acepta_marketing_whatsapp: true 
          })
          .eq('id', existing.id)
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('customers')
          .insert({
            restaurant_id: restaurant.id,
            nombre: whatsappForm.nombre,
            telefono: whatsappForm.telefono,
            acepta_marketing_whatsapp: true
          })

        if (error) throw error
      }

      toast.success('¡Gracias! Te enviaremos promociones por WhatsApp')
      setWhatsappModal(false)
      setWhatsappForm({ nombre: '', telefono: '' })

    } catch (err) {
      console.error('Error guardando datos:', err)
      toast.error('Error al guardar tus datos')
    }
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

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: colors.background }}>
      <Toaster position="top-center" richColors />
      
      {/* Header con imagen de portada */}
      <div 
        className="relative h-48 bg-cover bg-center"
        style={{ 
          backgroundColor: colors.secondary,
          backgroundImage: config?.imagen_portada ? `url(${config.imagen_portada})` : 'none'
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end space-x-4">
            {restaurant?.logo_url && (
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.nombre}
                className="w-20 h-20 rounded-xl bg-white p-1 object-contain shadow-lg"
              />
            )}
            <div className="text-white pb-1">
              <h1 className="text-2xl font-bold">{restaurant?.nombre}</h1>
              <p className="text-white/80 text-sm">{config?.descripcion || restaurant?.tipo_cocina || 'Restaurante'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info del restaurante */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" style={{ color: colors.primary }} />
            <span className="text-green-600 font-medium">Abierto</span>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setWhatsappModal(true)}
          className="text-xs border-green-500 text-green-600 hover:bg-green-50"
        >
          <Phone className="h-3 w-3 mr-1" />
          Recibir promociones
        </Button>
      </div>

      {/* Sección de PROMOCIONES */}
      {promotions.length > 0 && (
        <div className="px-4 py-4 bg-gradient-to-r from-red-50 to-orange-50">
          <h2 className="text-lg font-bold mb-3 flex items-center text-red-600">
            <Gift className="h-5 w-5 mr-2" />
            🔥 Promociones Especiales
          </h2>
          <div className="flex overflow-x-auto space-x-3 pb-2 -mx-4 px-4 scrollbar-hide">
            {promotions.map(promo => (
              <div 
                key={promo.id}
                className="flex-shrink-0 w-48 bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition hover:scale-105 border-2 border-red-200"
                onClick={() => openProductModal(null, true, promo)}
              >
                <div className="relative">
                  {promo.imagen_url ? (
                    <img 
                      src={promo.imagen_url} 
                      alt={promo.nombre}
                      className="w-full h-28 object-cover"
                    />
                  ) : (
                    <div className="w-full h-28 bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center">
                      <Gift className="h-12 w-12 text-white" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-red-500 text-white animate-pulse">
                    {promo.tipo_descuento === '2x1' ? '2x1' : `-${promo.porcentaje_descuento}%`}
                  </Badge>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm text-gray-800">{promo.nombre}</h3>
                  {promo.motivo && (
                    <p className="text-xs text-red-500 font-medium">{promo.motivo}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-400 line-through text-xs">
                      {formatPrice(promo.precio_original)}
                    </span>
                    <span className="font-bold text-red-600">
                      {formatPrice(promo.precio_final)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección de productos populares */}
      {popularProducts.length > 0 && (
        <div className="px-4 py-4">
          <h2 className="text-lg font-bold mb-3 flex items-center">
            <span className="text-yellow-500 mr-2">⭐</span>
            Los más pedidos
          </h2>
          <div className="flex overflow-x-auto space-x-3 pb-2 -mx-4 px-4 scrollbar-hide">
            {popularProducts.map(product => (
              <div 
                key={product.id}
                className="flex-shrink-0 w-40 bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transform transition hover:scale-105"
                onClick={() => openProductModal(product)}
              >
                <div className="relative">
                  {product.img_url ? (
                    <img 
                      src={product.img_url} 
                      alt={product.nombre}
                      className="w-full h-24 object-cover"
                    />
                  ) : (
                    <div 
                      className="w-full h-24 flex items-center justify-center"
                      style={{ backgroundColor: `${colors.primary}20` }}
                    >
                      <span className="text-3xl">🍽️</span>
                    </div>
                  )}
                  <Badge 
                    className="absolute top-2 left-2 text-xs"
                    style={{ backgroundColor: colors.primary }}
                  >
                    Popular
                  </Badge>
                </div>
                <div className="p-2">
                  <h3 className="font-medium text-sm truncate capitalize">{product.nombre}</h3>
                  <p className="font-bold text-sm" style={{ color: colors.primary }}>
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
        <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === 'all' 
                ? 'text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={selectedCategory === 'all' ? { backgroundColor: colors.primary } : {}}
          >
            🍴 Todo
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
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

      {/* Lista de productos */}
      <div className="px-4 py-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-gray-500">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => {
              const inCart = cart.filter(item => item.id === product.id)
              const totalInCart = inCart.reduce((sum, item) => sum + item.cantidad, 0)
              return (
                <div 
                  key={product.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer"
                  onClick={() => openProductModal(product)}
                >
                  <div className="relative">
                    {product.img_url ? (
                      <img 
                        src={product.img_url} 
                        alt={product.nombre}
                        className="w-full h-28 object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-28 flex items-center justify-center"
                        style={{ backgroundColor: `${colors.primary}15` }}
                      >
                        <span className="text-4xl">🍽️</span>
                      </div>
                    )}
                    {totalInCart > 0 && (
                      <div 
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: colors.primary }}
                      >
                        {totalInCart}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm mb-1 line-clamp-2 capitalize">{product.nombre}</h3>
                    {product.descripcion && (
                      <p className="text-xs text-gray-500 mb-1 line-clamp-1">{product.descripcion}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="font-bold" style={{ color: colors.primary }}>
                        {formatPrice(product.precio_base)}
                      </p>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Plus className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Barra del carrito fija */}
      {cart.length > 0 && (
        <div 
          className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg"
          style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}
        >
          <button
            onClick={() => setCartOpen(true)}
            className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-between px-4 transition transform hover:scale-[1.02]"
            style={{ backgroundColor: colors.primary }}
          >
            <div className="flex items-center">
              <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                <ShoppingCart className="h-5 w-5" />
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
              {/* Imagen del producto */}
              {(selectedProduct.img_url || selectedProduct.promoData?.imagen_url) ? (
                <img 
                  src={selectedProduct.isPromotion ? selectedProduct.promoData.imagen_url : selectedProduct.img_url}
                  alt={selectedProduct.isPromotion ? selectedProduct.promoData.nombre : selectedProduct.nombre}
                  className="w-full h-48 object-cover rounded-lg -mt-6 -mx-6 mb-4"
                  style={{ width: 'calc(100% + 48px)', maxWidth: 'none' }}
                />
              ) : (
                <div 
                  className="w-full h-32 flex items-center justify-center rounded-lg mb-4"
                  style={{ backgroundColor: `${colors.primary}15` }}
                >
                  <span className="text-5xl">🍽️</span>
                </div>
              )}

              <DialogHeader>
                <DialogTitle className="text-xl capitalize">
                  {selectedProduct.isPromotion ? selectedProduct.promoData.nombre : selectedProduct.nombre}
                </DialogTitle>
              </DialogHeader>

              {selectedProduct.descripcion && !selectedProduct.isPromotion && (
                <p className="text-gray-600 text-sm">{selectedProduct.descripcion}</p>
              )}

              {selectedProduct.isPromotion && selectedProduct.promoData.motivo && (
                <Badge className="bg-red-100 text-red-600 w-fit">
                  {selectedProduct.promoData.motivo}
                </Badge>
              )}

              <div className="flex items-center justify-between py-2">
                <span className="text-2xl font-bold" style={{ color: colors.primary }}>
                  {formatPrice(selectedProduct.precio)}
                </span>
                {selectedProduct.isPromotion && (
                  <span className="text-gray-400 line-through">
                    {formatPrice(selectedProduct.promoData.precio_original)}
                  </span>
                )}
              </div>

              {/* Selector de cantidad */}
              <div className="flex items-center justify-center space-x-4 py-4 bg-gray-50 rounded-xl">
                <button
                  onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                  className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center hover:border-gray-300 transition"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="text-3xl font-bold w-16 text-center">{productQuantity}</span>
                <button
                  onClick={() => setProductQuantity(productQuantity + 1)}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white transition"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* Comentario/Nota especial */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center text-gray-700">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  ¿Alguna indicación especial? (opcional)
                </label>
                <Textarea
                  value={productComment}
                  onChange={(e) => setProductComment(e.target.value)}
                  placeholder="Escribe aquí si tienes alguna preferencia..."
                  className="resize-none"
                  rows={2}
                />
              </div>

              {/* Botón agregar */}
              <Button 
                className="w-full text-white py-6 text-lg mt-4"
                style={{ backgroundColor: colors.primary }}
                onClick={addToCartFromModal}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Agregar {formatPrice(selectedProduct.precio * productQuantity)}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de producto agregado */}
      <Dialog open={addedModal} onOpenChange={setAddedModal}>
        <DialogContent className="max-w-sm mx-auto">
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">¡Agregado al carrito!</h3>
            
            <div className="space-y-3 mt-6">
              <Button 
                className="w-full text-white"
                style={{ backgroundColor: colors.primary }}
                onClick={() => {
                  setAddedModal(false)
                  setCartOpen(true)
                }}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ver Carrito ({cartCount})
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setAddedModal(false)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Seguir Comprando
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal del carrito */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" style={{ color: colors.primary }} />
              Tu Pedido
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🛒</div>
              <p className="text-gray-500">Tu carrito está vacío</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {cart.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium capitalize">{item.nombre}</h4>
                        {item.isPromotion && (
                          <Badge className="bg-red-100 text-red-600 text-xs">Promoción</Badge>
                        )}
                        {item.comentario && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{item.comentario}"</p>
                        )}
                        <p className="text-sm mt-1" style={{ color: colors.primary }}>
                          {formatPrice(item.precio)} x {item.cantidad}
                        </p>
                      </div>
                      <span className="font-bold" style={{ color: colors.primary }}>
                        {formatPrice(item.precio * item.cantidad)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQuantity(index, -1)}
                          className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-medium">{item.cantidad}</span>
                        <button
                          onClick={() => updateCartQuantity(index, 1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: colors.primary }}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium">Total:</span>
                  <span className="text-xl font-bold" style={{ color: colors.primary }}>
                    {formatPrice(cartTotal)}
                  </span>
                </div>
                <Button 
                  className="w-full text-white py-6"
                  style={{ backgroundColor: colors.primary }}
                  onClick={() => {
                    setCartOpen(false)
                    setCheckoutOpen(true)
                  }}
                >
                  Continuar con el Pedido
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
            <DialogTitle>Finalizar Pedido</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Número de Mesa *</label>
              <Input
                type="text"
                placeholder="Ej: 5"
                value={checkoutForm.mesa}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, mesa: e.target.value })}
                className="text-center text-2xl font-bold h-14"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">¿Dónde consumirás?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCheckoutForm({ ...checkoutForm, tipo: 'LOCAL' })}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                    checkoutForm.tipo === 'LOCAL' 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Store className={`h-8 w-8 mb-2 ${checkoutForm.tipo === 'LOCAL' ? 'text-orange-500' : 'text-gray-400'}`} />
                  <span className="font-medium">En el local</span>
                </button>
                <button
                  onClick={() => setCheckoutForm({ ...checkoutForm, tipo: 'LLEVAR' })}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                    checkoutForm.tipo === 'LLEVAR' 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Package className={`h-8 w-8 mb-2 ${checkoutForm.tipo === 'LLEVAR' ? 'text-orange-500' : 'text-gray-400'}`} />
                  <span className="font-medium">Para llevar</span>
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

            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Productos ({cartCount})</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span style={{ color: colors.primary }}>{formatPrice(cartTotal)}</span>
              </div>
            </div>

            <Button 
              className="w-full text-white py-6 text-lg"
              style={{ backgroundColor: colors.primary }}
              onClick={handleCheckout}
            >
              <Send className="h-5 w-5 mr-2" />
              Enviar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación */}
      <Dialog open={confirmModal} onOpenChange={setConfirmModal}>
        <DialogContent className="max-w-sm mx-auto text-center">
          <div className="py-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">¡Pedido Enviado!</h3>
            <p className="text-gray-600 mb-6">
              Tu pedido fue recibido y está siendo preparado. 
              Te avisaremos cuando esté listo.
            </p>
            <Button 
              className="w-full text-white"
              style={{ backgroundColor: colors.primary }}
              onClick={() => setConfirmModal(false)}
            >
              Entendido
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
              Recibir Promociones por WhatsApp
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-center text-gray-600 mb-6">
              Déjanos tus datos y te enviaremos ofertas exclusivas por WhatsApp
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre *</label>
                <Input
                  type="text"
                  placeholder="Tu nombre completo"
                  value={whatsappForm.nombre}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Número de WhatsApp *</label>
                <Input
                  type="tel"
                  placeholder="Ej: 0981123456"
                  value={whatsappForm.telefono}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, telefono: e.target.value })}
                />
              </div>

              <Button 
                className="w-full text-white bg-green-500 hover:bg-green-600"
                onClick={handleWhatsappSubmit}
              >
                <Phone className="h-4 w-4 mr-2" />
                Guardar y recibir promociones
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
