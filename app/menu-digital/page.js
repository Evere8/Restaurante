'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { QrCode, Link2, Copy, Download, Palette, Image, Eye, Save, ExternalLink, Settings, Smartphone, Gift, Plus, Trash2, Percent } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'

export default function MenuDigitalPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const router = useRouter()
  const qrRef = useRef(null)

  const [config, setConfig] = useState({
    descripcion: '',
    imagen_portada: '',
    colores: {
      primary: '#f97316',
      secondary: '#1e3a5f',
      background: '#ffffff',
      text: '#1f2937'
    },
    horario_apertura: '',
    horario_cierre: '',
    mostrar_precios: true,
    permitir_pedidos: true
  })

  const [slug, setSlug] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // Promociones
  const [promotions, setPromotions] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [promoDialogOpen, setPromoDialogOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [promoForm, setPromoForm] = useState({
    nombre: '',
    tipo_descuento: 'porcentaje', // porcentaje, 2x1, precio_fijo
    porcentaje_descuento: 10,
    motivo: '',
    items_ids: [],
    imagen_url: '',
    activa: true
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (restaurant) {
      // Usar el ID del restaurante para el slug único
      const generatedSlug = restaurant.slug || restaurant.id
      setSlug(generatedSlug)
      loadConfig()
      loadPromotions()
      loadMenuItems()
      generateQR(generatedSlug)
    }
  }, [restaurant])

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_digital_config')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .single()

      if (data && !error) {
        setConfig({
          descripcion: data.descripcion || '',
          imagen_portada: data.imagen_portada || '',
          colores: data.colores || config.colores,
          horario_apertura: data.horario_apertura || '',
          horario_cierre: data.horario_cierre || '',
          mostrar_precios: data.mostrar_precios ?? true,
          permitir_pedidos: data.permitir_pedidos ?? true
        })
      }
    } catch (err) {
      console.log('No hay configuración previa o tabla no existe aún')
    }
  }

  const loadPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promociones')
        .select('*, promocion_items(*, menu_items(id, nombre, precio_base))')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })

      if (data && !error) {
        setPromotions(data)
      }
    } catch (err) {
      console.log('Tabla promociones no existe')
    }
  }

  const loadMenuItems = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('id, nombre, precio_base')
      .eq('restaurant_id', restaurant.id)
      .eq('disponible', true)
      .order('nombre')

    setMenuItems(data || [])
  }

  const generateQR = async (slugValue) => {
    try {
      const menuUrl = getMenuUrl(slugValue)
      const qrUrl = await QRCode.toDataURL(menuUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      setQrDataUrl(qrUrl)
    } catch (err) {
      console.error('Error generando QR:', err)
    }
  }

  const getMenuUrl = (slugValue = slug) => {
    // Usar NEXT_PUBLIC_BASE_URL o window.location.origin
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (typeof window !== 'undefined' ? window.location.origin : '')
    // Usar el ID del restaurante como slug si no hay slug personalizado
    const finalSlug = slugValue || restaurant?.id
    return `${baseUrl}/delivery/${finalSlug}`
  }

  const handleSaveConfig = async () => {
    try {
      setSaving(true)

      // Actualizar slug en el restaurante
      await supabase
        .from('restaurants')
        .update({ slug: slug || restaurant.id })
        .eq('id', restaurant.id)

      // Guardar o actualizar configuración
      const { data: existing } = await supabase
        .from('menu_digital_config')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .single()

      if (existing) {
        await supabase
          .from('menu_digital_config')
          .update({
            ...config,
            updated_at: new Date().toISOString()
          })
          .eq('restaurant_id', restaurant.id)
      } else {
        await supabase
          .from('menu_digital_config')
          .insert({
            restaurant_id: restaurant.id,
            ...config
          })
      }

      toast.success('Configuración guardada correctamente')
      generateQR(slug)

    } catch (err) {
      console.error('Error guardando configuración:', err)
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getMenuUrl())
    toast.success('Link copiado al portapapeles')
  }

  const handleDownloadQR = () => {
    if (!qrDataUrl) return

    const link = document.createElement('a')
    link.download = `qr-menu-${restaurant?.nombre || 'restaurante'}.png`
    link.href = qrDataUrl
    link.click()
    toast.success('QR descargado')
  }

  const handleImageUpload = async (e, type = 'portada') => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)

      // Convertir imagen a base64 como fallback si storage no funciona
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result
        
        // Intentar subir a Supabase Storage
        try {
          const fileExt = file.name.split('.').pop()
          const fileName = `${restaurant.id}-${type}-${Date.now()}.${fileExt}`
          const filePath = `menu-portadas/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('public')
            .upload(filePath, file, { upsert: true })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('public')
              .getPublicUrl(filePath)

            if (type === 'portada') {
              setConfig({ ...config, imagen_portada: urlData.publicUrl })
            } else if (type === 'logo') {
              // Actualizar logo del restaurante
              await supabase
                .from('restaurants')
                .update({ logo_url: urlData.publicUrl })
                .eq('id', restaurant.id)
              toast.success('Logo actualizado')
            }
            toast.success('Imagen subida correctamente')
          } else {
            // Fallback: usar base64 directamente (no recomendado para producción)
            console.log('Storage error, usando URL directa')
            if (type === 'portada') {
              setConfig({ ...config, imagen_portada: base64 })
            }
            toast.warning('Imagen cargada localmente. Usa una URL externa para mejor rendimiento.')
          }
        } catch (storageErr) {
          console.log('Storage no disponible, usa una URL directa')
          toast.error('Error al subir. Por favor usa una URL de imagen externa.')
        }
        
        setUploadingImage(false)
      }
      reader.readAsDataURL(file)

    } catch (err) {
      console.error('Error subiendo imagen:', err)
      toast.error('Error al subir la imagen. Usa una URL externa.')
      setUploadingImage(false)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)
      
      const reader = new FileReader()
      reader.onloadend = async () => {
        // Intentar actualizar con la URL
        const base64 = reader.result
        
        try {
          const fileExt = file.name.split('.').pop()
          const fileName = `${restaurant.id}-logo-${Date.now()}.${fileExt}`
          const filePath = `logos/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('public')
            .upload(filePath, file, { upsert: true })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('public')
              .getPublicUrl(filePath)

            await supabase
              .from('restaurants')
              .update({ logo_url: urlData.publicUrl })
              .eq('id', restaurant.id)
            
            toast.success('Logo actualizado correctamente')
            // Recargar para ver el cambio
            window.location.reload()
          } else {
            toast.error('Error al subir logo. Usa una URL externa.')
          }
        } catch (err) {
          toast.error('Error al subir logo')
        }
        
        setUploadingImage(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error al subir el logo')
      setUploadingImage(false)
    }
  }

  // PROMOCIONES
  const openPromoDialog = (promo = null) => {
    if (promo) {
      setEditingPromo(promo)
      setPromoForm({
        nombre: promo.nombre,
        tipo_descuento: promo.tipo_descuento,
        porcentaje_descuento: promo.porcentaje_descuento || 10,
        motivo: promo.motivo || '',
        items_ids: promo.promocion_items?.map(pi => pi.menu_item_id) || [],
        imagen_url: promo.imagen_url || '',
        activa: promo.activa
      })
    } else {
      setEditingPromo(null)
      setPromoForm({
        nombre: '',
        tipo_descuento: 'porcentaje',
        porcentaje_descuento: 10,
        motivo: '',
        items_ids: [],
        imagen_url: '',
        activa: true
      })
    }
    setPromoDialogOpen(true)
  }

  const handleSavePromotion = async () => {
    if (!promoForm.nombre || promoForm.items_ids.length === 0) {
      toast.error('Completa el nombre y selecciona al menos un producto')
      return
    }

    try {
      // Calcular precio original y final
      const selectedItems = menuItems.filter(m => promoForm.items_ids.includes(m.id))
      const precioOriginal = selectedItems.reduce((sum, item) => sum + item.precio_base, 0)
      
      let precioFinal = precioOriginal
      if (promoForm.tipo_descuento === 'porcentaje') {
        precioFinal = precioOriginal * (1 - promoForm.porcentaje_descuento / 100)
      } else if (promoForm.tipo_descuento === '2x1') {
        // Para 2x1, el precio es el del item más caro
        precioFinal = Math.max(...selectedItems.map(i => i.precio_base))
      }

      if (editingPromo) {
        // Actualizar
        await supabase
          .from('promociones')
          .update({
            nombre: promoForm.nombre,
            tipo_descuento: promoForm.tipo_descuento,
            porcentaje_descuento: promoForm.porcentaje_descuento,
            motivo: promoForm.motivo,
            imagen_url: promoForm.imagen_url,
            activa: promoForm.activa,
            precio_original: precioOriginal,
            precio_final: Math.round(precioFinal)
          })
          .eq('id', editingPromo.id)

        // Eliminar items anteriores y agregar nuevos
        await supabase
          .from('promocion_items')
          .delete()
          .eq('promocion_id', editingPromo.id)

        await supabase
          .from('promocion_items')
          .insert(promoForm.items_ids.map(id => ({
            promocion_id: editingPromo.id,
            menu_item_id: id
          })))

      } else {
        // Crear nueva
        const { data: newPromo, error: promoError } = await supabase
          .from('promociones')
          .insert({
            restaurant_id: restaurant.id,
            nombre: promoForm.nombre,
            tipo_descuento: promoForm.tipo_descuento,
            porcentaje_descuento: promoForm.porcentaje_descuento,
            motivo: promoForm.motivo,
            imagen_url: promoForm.imagen_url,
            activa: promoForm.activa,
            precio_original: precioOriginal,
            precio_final: Math.round(precioFinal)
          })
          .select()
          .single()

        if (promoError) throw promoError

        // Agregar items
        await supabase
          .from('promocion_items')
          .insert(promoForm.items_ids.map(id => ({
            promocion_id: newPromo.id,
            menu_item_id: id
          })))
      }

      toast.success(editingPromo ? 'Promoción actualizada' : 'Promoción creada')
      setPromoDialogOpen(false)
      loadPromotions()

    } catch (err) {
      console.error('Error guardando promoción:', err)
      toast.error('Error al guardar la promoción')
    }
  }

  const handleDeletePromotion = async (promoId) => {
    if (!confirm('¿Eliminar esta promoción?')) return

    try {
      await supabase.from('promocion_items').delete().eq('promocion_id', promoId)
      await supabase.from('promociones').delete().eq('id', promoId)
      toast.success('Promoción eliminada')
      loadPromotions()
    } catch (err) {
      toast.error('Error al eliminar')
    }
  }

  const togglePromoItem = (itemId) => {
    if (promoForm.items_ids.includes(itemId)) {
      setPromoForm({ ...promoForm, items_ids: promoForm.items_ids.filter(id => id !== itemId) })
    } else {
      setPromoForm({ ...promoForm, items_ids: [...promoForm.items_ids, itemId] })
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-4 lg:p-8 lg:ml-0">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Smartphone className="h-8 w-8 mr-3 text-orange-500" />
              Menú Digital
            </h1>
            <p className="text-gray-600 mt-2">
              Configura tu menú interactivo para que tus clientes puedan hacer pedidos desde su celular
            </p>
          </div>

          <Tabs defaultValue="qr" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="qr" className="flex items-center">
                <QrCode className="h-4 w-4 mr-2" />
                QR y Link
              </TabsTrigger>
              <TabsTrigger value="promociones" className="flex items-center">
                <Gift className="h-4 w-4 mr-2" />
                Promociones
              </TabsTrigger>
              <TabsTrigger value="apariencia" className="flex items-center">
                <Palette className="h-4 w-4 mr-2" />
                Apariencia
              </TabsTrigger>
              <TabsTrigger value="configuracion" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </TabsTrigger>
            </TabsList>

            {/* Tab QR y Link */}
            <TabsContent value="qr">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <QrCode className="h-5 w-5 mr-2 text-orange-500" />
                      Tu Código QR
                    </CardTitle>
                    <CardDescription>
                      Imprime este código para las mesas de tu restaurante
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    {qrDataUrl ? (
                      <div className="inline-block p-4 bg-white rounded-xl shadow-lg border-2 border-gray-200">
                        <img 
                          ref={qrRef}
                          src={qrDataUrl} 
                          alt="QR Code" 
                          className="w-64 h-64 mx-auto"
                        />
                        <p className="mt-4 font-bold text-lg">{restaurant?.nombre}</p>
                        <p className="text-gray-500 text-sm">Escanea para ver el menú</p>
                      </div>
                    ) : (
                      <div className="w-64 h-64 bg-gray-100 rounded-xl mx-auto flex items-center justify-center">
                        <span className="text-gray-400">Generando QR...</span>
                      </div>
                    )}

                    <div className="mt-6 flex justify-center space-x-3">
                      <Button onClick={handleDownloadQR} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                      <Button onClick={handleCopyLink} variant="outline">
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Link2 className="h-5 w-5 mr-2 text-orange-500" />
                      Link de tu Menú
                    </CardTitle>
                    <CardDescription>
                      Este es el link único de tu restaurante
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <Label className="text-orange-800 font-semibold">Link de tu menú:</Label>
                      <div className="flex items-center mt-2 space-x-2">
                        <Input
                          value={getMenuUrl()}
                          readOnly
                          className="bg-white text-sm font-mono"
                        />
                        <Button size="icon" variant="outline" onClick={handleCopyLink}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-blue-800 text-sm">
                        <strong>💡 Tip:</strong> Este link funcionará tanto en desarrollo como en producción (Vercel). 
                        El QR siempre apuntará al dominio correcto.
                      </p>
                    </div>

                    <Button 
                      className="w-full bg-orange-500 hover:bg-orange-600" 
                      onClick={() => window.open(getMenuUrl(), '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Menú
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab Promociones */}
            <TabsContent value="promociones">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Gift className="h-5 w-5 mr-2 text-red-500" />
                        Promociones y Combos
                      </CardTitle>
                      <CardDescription>
                        Crea ofertas especiales para atraer más clientes
                      </CardDescription>
                    </div>
                    <Button onClick={() => openPromoDialog()} className="bg-red-500 hover:bg-red-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Promoción
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {promotions.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <Gift className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 mb-4">No tienes promociones activas</p>
                      <Button onClick={() => openPromoDialog()} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear primera promoción
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {promotions.map(promo => (
                        <div key={promo.id} className={`border rounded-xl overflow-hidden ${promo.activa ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                          <div className="relative h-32 bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center">
                            {promo.imagen_url ? (
                              <img src={promo.imagen_url} alt={promo.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <Gift className="h-12 w-12 text-white" />
                            )}
                            <Badge className={`absolute top-2 right-2 ${promo.activa ? 'bg-green-500' : 'bg-gray-500'}`}>
                              {promo.activa ? 'Activa' : 'Inactiva'}
                            </Badge>
                            <Badge className="absolute top-2 left-2 bg-red-600">
                              {promo.tipo_descuento === '2x1' ? '2x1' : `-${promo.porcentaje_descuento}%`}
                            </Badge>
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold text-lg">{promo.nombre}</h3>
                            {promo.motivo && (
                              <p className="text-sm text-red-600 font-medium">{promo.motivo}</p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <div>
                                <span className="text-gray-400 line-through text-sm">
                                  Gs. {formatPrice(promo.precio_original)}
                                </span>
                                <span className="ml-2 font-bold text-red-600">
                                  Gs. {formatPrice(promo.precio_final)}
                                </span>
                              </div>
                            </div>
                            <div className="flex space-x-2 mt-3">
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => openPromoDialog(promo)}>
                                Editar
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeletePromotion(promo.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Apariencia */}
            <TabsContent value="apariencia">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Logo del Restaurante */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Image className="h-5 w-5 mr-2 text-orange-500" />
                      Logo del Restaurante
                    </CardTitle>
                    <CardDescription>
                      El logo se mostrará en el menú digital
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                      {restaurant?.logo_url ? (
                        <img 
                          src={restaurant.logo_url} 
                          alt="Logo"
                          className="w-24 h-24 object-contain rounded-lg border bg-white p-2"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed">
                          <span className="text-3xl">🍽️</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">
                          Sube el logo de tu restaurante
                        </p>
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUpload} 
                          disabled={uploadingImage}
                        />
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="text-xs text-yellow-800">
                        💡 <strong>Tip:</strong> Usa una imagen cuadrada (ej: 200x200px) para mejor visualización
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Imagen de Portada */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Image className="h-5 w-5 mr-2 text-orange-500" />
                      Imagen de Portada
                    </CardTitle>
                    <CardDescription>
                      Imagen de fondo del encabezado del menú
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {config.imagen_portada ? (
                      <div className="relative">
                        <img 
                          src={config.imagen_portada} 
                          alt="Portada"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => setConfig({ ...config, imagen_portada: '' })}
                        >
                          Eliminar
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed">
                        <span className="text-gray-400">Sin imagen de portada</span>
                      </div>
                    )}

                    <div>
                      <Label>Usar URL de imagen (recomendado)</Label>
                      <Input
                        value={config.imagen_portada}
                        onChange={(e) => setConfig({ ...config, imagen_portada: e.target.value })}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Puedes usar imágenes de Unsplash, Pexels o cualquier URL pública
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Colores */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Palette className="h-5 w-5 mr-2 text-orange-500" />
                      Colores del Menú
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Color Principal</Label>
                        <div className="flex items-center mt-2 space-x-2">
                          <input
                            type="color"
                            value={config.colores.primary}
                            onChange={(e) => setConfig({
                              ...config,
                              colores: { ...config.colores, primary: e.target.value }
                            })}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input value={config.colores.primary} onChange={(e) => setConfig({ ...config, colores: { ...config.colores, primary: e.target.value }})} className="flex-1" />
                        </div>
                      </div>

                      <div>
                        <Label>Color Secundario</Label>
                        <div className="flex items-center mt-2 space-x-2">
                          <input
                            type="color"
                            value={config.colores.secondary}
                            onChange={(e) => setConfig({
                              ...config,
                              colores: { ...config.colores, secondary: e.target.value }
                            })}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input value={config.colores.secondary} onChange={(e) => setConfig({ ...config, colores: { ...config.colores, secondary: e.target.value }})} className="flex-1" />
                        </div>
                      </div>
                    </div>

                    {/* Vista previa */}
                    <div className="mt-4 p-4 rounded-lg border bg-white">
                      <p className="text-sm font-medium mb-3">Vista previa:</p>
                      <div className="rounded-lg overflow-hidden shadow-md" style={{ maxWidth: '300px' }}>
                        <div className="h-16" style={{ backgroundColor: config.colores.secondary }}></div>
                        <div className="p-3 bg-white">
                          <div className="flex space-x-2 mb-2">
                            <div className="px-3 py-1 rounded-full text-white text-xs" style={{ backgroundColor: config.colores.primary }}>
                              Categoría
                            </div>
                            <div className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
                              Otra
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Producto</span>
                            <span className="font-bold text-sm" style={{ color: config.colores.primary }}>Gs. 15.000</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab Configuración */}
            <TabsContent value="configuracion">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Descripción del restaurante</Label>
                    <Textarea
                      value={config.descripcion}
                      onChange={(e) => setConfig({ ...config, descripcion: e.target.value })}
                      placeholder="Ej: Café de especialidad y empanadas artesanales"
                      className="mt-2"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Horario de Apertura</Label>
                      <Input type="time" value={config.horario_apertura} onChange={(e) => setConfig({ ...config, horario_apertura: e.target.value })} className="mt-2" />
                    </div>
                    <div>
                      <Label>Horario de Cierre</Label>
                      <Input type="time" value={config.horario_cierre} onChange={(e) => setConfig({ ...config, horario_cierre: e.target.value })} className="mt-2" />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Mostrar precios</Label>
                        <p className="text-sm text-gray-500">Los clientes verán los precios</p>
                      </div>
                      <input type="checkbox" checked={config.mostrar_precios} onChange={(e) => setConfig({ ...config, mostrar_precios: e.target.checked })} className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Permitir pedidos</Label>
                        <p className="text-sm text-gray-500">Los clientes pueden hacer pedidos</p>
                      </div>
                      <input type="checkbox" checked={config.permitir_pedidos} onChange={(e) => setConfig({ ...config, permitir_pedidos: e.target.checked })} className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Botón Guardar */}
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={handleSaveConfig} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog para crear/editar promoción */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPromo ? 'Editar Promoción' : 'Nueva Promoción'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nombre de la promoción *</Label>
              <Input
                value={promoForm.nombre}
                onChange={(e) => setPromoForm({ ...promoForm, nombre: e.target.value })}
                placeholder="Ej: Combo Desayuno, 2x1 en Empanadas"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Tipo de descuento</Label>
              <Select value={promoForm.tipo_descuento} onValueChange={(val) => setPromoForm({ ...promoForm, tipo_descuento: val })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="porcentaje">Porcentaje de descuento</SelectItem>
                  <SelectItem value="2x1">2x1 (Paga uno, lleva dos)</SelectItem>
                  <SelectItem value="precio_fijo">Precio fijo especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {promoForm.tipo_descuento === 'porcentaje' && (
              <div>
                <Label>Porcentaje de descuento: {promoForm.porcentaje_descuento}%</Label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={promoForm.porcentaje_descuento}
                  onChange={(e) => setPromoForm({ ...promoForm, porcentaje_descuento: parseInt(e.target.value) })}
                  className="w-full mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5%</span>
                  <span>50%</span>
                </div>
              </div>
            )}

            <div>
              <Label>Motivo de la promoción (opcional)</Label>
              <Input
                value={promoForm.motivo}
                onChange={(e) => setPromoForm({ ...promoForm, motivo: e.target.value })}
                placeholder="Ej: Día de los enamorados, Día del niño, Aniversario"
                className="mt-1"
              />
            </div>

            <div>
              <Label>URL de imagen (opcional)</Label>
              <Input
                value={promoForm.imagen_url}
                onChange={(e) => setPromoForm({ ...promoForm, imagen_url: e.target.value })}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Selecciona los productos del combo/promoción *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
                {menuItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => togglePromoItem(item.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      promoForm.items_ids.includes(item.id)
                        ? 'bg-orange-100 border-2 border-orange-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <p className="font-medium text-sm capitalize">{item.nombre}</p>
                    <p className="text-xs text-gray-500">Gs. {formatPrice(item.precio_base)}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Seleccionados: {promoForm.items_ids.length} productos
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={promoForm.activa}
                onChange={(e) => setPromoForm({ ...promoForm, activa: e.target.checked })}
                className="w-4 h-4"
              />
              <Label>Promoción activa (visible en el menú)</Label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setPromoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePromotion} className="bg-orange-500 hover:bg-orange-600">
                {editingPromo ? 'Actualizar' : 'Crear'} Promoción
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
