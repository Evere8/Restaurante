'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { FileText, ShoppingCart, Store, ArrowRight, Loader2 } from 'lucide-react'

export default function MenuLandingPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug

  const [restaurant, setRestaurant] = useState(null)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

      // Buscar por slug o por ID
      let restaurantData = null
      let query = supabase.from('restaurants').select('*')
      
      // Intentar por slug
      const { data: bySlug } = await query.eq('slug', slug).single()
      if (bySlug) {
        restaurantData = bySlug
      } else {
        // Intentar por ID
        const { data: byId } = await supabase.from('restaurants').select('*').eq('id', slug).single()
        if (byId) {
          restaurantData = byId
        }
      }

      if (!restaurantData) {
        setError('Restaurante no encontrado')
        setLoading(false)
        return
      }

      setRestaurant(restaurantData)

      // Cargar configuración del menú
      const { data: configData } = await supabase
        .from('menu_digital_config')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .single()

      if (configData) {
        // Parsear colores si vienen como string
        if (typeof configData.colores === 'string') {
          try {
            configData.colores = JSON.parse(configData.colores)
          } catch (e) {
            configData.colores = defaultColors
          }
        }
        setConfig(configData)

        // Si no hay PDF, redirigir directamente al menú interactivo
        if (!configData.menu_pdf_url) {
          router.replace(`/delivery/${slug}`)
          return
        }
      } else {
        // Si no hay configuración, redirigir al menú interactivo
        router.replace(`/delivery/${slug}`)
        return
      }

      setLoading(false)
    } catch (err) {
      console.error('Error cargando restaurante:', err)
      setError('Error al cargar el menú')
      setLoading(false)
    }
  }

  const handleViewPdf = () => {
    if (config?.menu_pdf_url) {
      // Si es un data URL (base64), abrir en nueva pestaña
      if (config.menu_pdf_url.startsWith('data:')) {
        const win = window.open()
        win.document.write(`
          <html>
            <head><title>Menú - ${restaurant?.nombre || 'Restaurante'}</title></head>
            <body style="margin:0;padding:0;">
              <embed src="${config.menu_pdf_url}" width="100%" height="100%" type="application/pdf">
            </body>
          </html>
        `)
      } else {
        window.open(config.menu_pdf_url, '_blank')
      }
    }
  }

  const handleInteractiveMenu = () => {
    router.push(`/delivery/${slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto" style={{ color: colors.primary }} />
          <p className="mt-4 text-gray-600">Cargando menú...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Restaurante no encontrado</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ 
        background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary}20 100%)`,
      }}
    >
      {/* Logo y Nombre */}
      <div className="text-center mb-10">
        {restaurant?.logo_url ? (
          <img 
            src={restaurant.logo_url} 
            alt={restaurant.nombre}
            className="w-28 h-28 object-contain mx-auto rounded-full bg-white p-2 shadow-xl mb-4"
          />
        ) : (
          <div 
            className="w-28 h-28 rounded-full flex items-center justify-center mx-auto shadow-xl mb-4"
            style={{ backgroundColor: colors.primary }}
          >
            <span className="text-5xl">🍽️</span>
          </div>
        )}
        <h1 className="text-3xl font-bold text-white drop-shadow-lg">
          {restaurant?.nombre || 'Restaurante'}
        </h1>
        {config?.descripcion && (
          <p className="text-white/80 mt-2 text-sm max-w-xs mx-auto">
            {config.descripcion}
          </p>
        )}
      </div>

      {/* Opciones de Menú */}
      <div className="w-full max-w-sm space-y-4">
        {/* Botón Ver Menú PDF */}
        <button
          onClick={handleViewPdf}
          className="w-full bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
        >
          <div className="flex items-center space-x-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${colors.secondary}15` }}
            >
              <FileText className="h-8 w-8" style={{ color: colors.secondary }} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-lg font-bold text-gray-800">Ver Menú</h3>
              <p className="text-sm text-gray-500">Consulta nuestra carta completa</p>
            </div>
            <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        </button>

        {/* Botón Menú Interactivo */}
        <button
          onClick={handleInteractiveMenu}
          className="w-full rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
          style={{ backgroundColor: colors.primary }}
        >
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-lg font-bold text-white">Hacer Pedido</h3>
              <p className="text-sm text-white/80">Crea tu pedido y envíalo al mostrador</p>
            </div>
            <ArrowRight className="h-6 w-6 text-white/60 group-hover:text-white transition-colors" />
          </div>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-white/60 text-xs">
          Powered by CRM Restaurante
        </p>
      </div>
    </div>
  )
}
