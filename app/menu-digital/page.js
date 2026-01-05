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
import { QrCode, Link2, Copy, Download, Palette, Image, Eye, Save, ExternalLink, Settings, Smartphone } from 'lucide-react'
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (restaurant) {
      // Generar slug a partir del nombre del restaurante
      const generatedSlug = restaurant.slug || restaurant.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      setSlug(generatedSlug)
      loadConfig()
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

      if (data) {
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
      console.log('No hay configuración previa')
    }
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
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/delivery/${slugValue || restaurant?.id}`
  }

  const handleSaveConfig = async () => {
    try {
      setSaving(true)

      // Actualizar slug en el restaurante
      await supabase
        .from('restaurants')
        .update({ slug })
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
    link.download = `qr-menu-${slug}.png`
    link.href = qrDataUrl
    link.click()
    toast.success('QR descargado')
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)

      // Subir a Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${restaurant.id}-portada.${fileExt}`
      const filePath = `menu-portadas/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(filePath)

      setConfig({ ...config, imagen_portada: urlData.publicUrl })
      toast.success('Imagen subida correctamente')

    } catch (err) {
      console.error('Error subiendo imagen:', err)
      toast.error('Error al subir la imagen')
    } finally {
      setUploadingImage(false)
    }
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="qr" className="flex items-center">
                <QrCode className="h-4 w-4 mr-2" />
                QR y Link
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
                {/* QR Code */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <QrCode className="h-5 w-5 mr-2 text-orange-500" />
                      Tu Código QR
                    </CardTitle>
                    <CardDescription>
                      Imprime o comparte este código para que tus clientes accedan a tu menú
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    {qrDataUrl ? (
                      <div className="inline-block p-4 bg-white rounded-xl shadow-lg">
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
                        Compartir
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Link del menú */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Link2 className="h-5 w-5 mr-2 text-orange-500" />
                      Link de tu Menú
                    </CardTitle>
                    <CardDescription>
                      Personaliza la URL de tu menú digital
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Slug (parte final del link)</Label>
                      <div className="flex mt-2">
                        <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-500 text-sm">
                          /delivery/
                        </span>
                        <Input
                          value={slug}
                          onChange={(e) => {
                            const newSlug = e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, '')
                            setSlug(newSlug)
                          }}
                          className="rounded-l-none"
                          placeholder="mi-restaurante"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <Label className="text-orange-800">Link completo:</Label>
                      <div className="flex items-center mt-2 space-x-2">
                        <Input
                          value={getMenuUrl()}
                          readOnly
                          className="bg-white text-sm"
                        />
                        <Button size="icon" variant="outline" onClick={handleCopyLink}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
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

            {/* Tab Apariencia */}
            <TabsContent value="apariencia">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Image className="h-5 w-5 mr-2 text-orange-500" />
                      Imagen de Portada
                    </CardTitle>
                    <CardDescription>
                      Imagen que se mostrará en la cabecera del menú
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {config.imagen_portada ? (
                      <div className="relative">
                        <img 
                          src={config.imagen_portada} 
                          alt="Portada"
                          className="w-full h-48 object-cover rounded-lg"
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
                      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                        <span className="text-gray-400">Sin imagen de portada</span>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="portada">Subir imagen</Label>
                      <Input
                        id="portada"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="mt-2"
                      />
                      {uploadingImage && <p className="text-sm text-gray-500 mt-1">Subiendo...</p>}
                    </div>

                    <div>
                      <Label>O usa una URL</Label>
                      <Input
                        value={config.imagen_portada}
                        onChange={(e) => setConfig({ ...config, imagen_portada: e.target.value })}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Palette className="h-5 w-5 mr-2 text-orange-500" />
                      Colores
                    </CardTitle>
                    <CardDescription>
                      Personaliza los colores de tu menú
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                          <Input
                            value={config.colores.primary}
                            onChange={(e) => setConfig({
                              ...config,
                              colores: { ...config.colores, primary: e.target.value }
                            })}
                            className="flex-1"
                          />
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
                          <Input
                            value={config.colores.secondary}
                            onChange={(e) => setConfig({
                              ...config,
                              colores: { ...config.colores, secondary: e.target.value }
                            })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vista previa de colores */}
                    <div className="p-4 rounded-lg border" style={{ backgroundColor: config.colores.background }}>
                      <div className="h-16 rounded-lg mb-3" style={{ backgroundColor: config.colores.secondary }}></div>
                      <div className="flex space-x-2">
                        <div 
                          className="px-4 py-2 rounded-full text-white text-sm"
                          style={{ backgroundColor: config.colores.primary }}
                        >
                          Botón Principal
                        </div>
                        <div 
                          className="px-4 py-2 rounded-full border text-sm"
                          style={{ borderColor: config.colores.primary, color: config.colores.primary }}
                        >
                          Botón Secundario
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
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-orange-500" />
                    Configuración General
                  </CardTitle>
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
                      <Input
                        type="time"
                        value={config.horario_apertura}
                        onChange={(e) => setConfig({ ...config, horario_apertura: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Horario de Cierre</Label>
                      <Input
                        type="time"
                        value={config.horario_cierre}
                        onChange={(e) => setConfig({ ...config, horario_cierre: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Mostrar precios</Label>
                        <p className="text-sm text-gray-500">Los clientes verán los precios de los productos</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.mostrar_precios}
                        onChange={(e) => setConfig({ ...config, mostrar_precios: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Permitir pedidos</Label>
                        <p className="text-sm text-gray-500">Los clientes pueden hacer pedidos desde el menú</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.permitir_pedidos}
                        onChange={(e) => setConfig({ ...config, permitir_pedidos: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Botón Guardar */}
          <div className="mt-6 flex justify-end">
            <Button 
              size="lg"
              onClick={handleSaveConfig}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
