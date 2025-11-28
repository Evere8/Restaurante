'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building, Users, ShoppingCart, AlertCircle } from 'lucide-react'

export default function PanelDesarrolladorPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [restaurants, setRestaurants] = useState([])
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    totalUsers: 0,
    totalOrders: 0
  })

  useEffect(() => {
    if (!authLoading && (!user || user.rol !== 'DESARROLLADOR')) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && user.rol === 'DESARROLLADOR') {
      loadDeveloperData()
    }
  }, [user])

  const loadDeveloperData = async () => {
    // Cargar todos los restaurantes
    const { data: restaurantsData } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false })

    setRestaurants(restaurantsData || [])

    // Cargar estadísticas globales
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    setStats({
      totalRestaurants: restaurantsData?.length || 0,
      totalUsers: usersCount || 0,
      totalOrders: ordersCount || 0
    })
  }

  if (authLoading || !user || user.rol !== 'DESARROLLADOR') {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Panel de Desarrollador</h1>
          <p className="text-gray-600">Vista global del sistema</p>
        </div>

        {/* Estadísticas Globales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Restaurantes</CardTitle>
              <Building className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRestaurants}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Pedidos</CardTitle>
              <ShoppingCart className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Restaurantes */}
        <Card>
          <CardHeader>
            <CardTitle>Restaurantes en el Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {restaurants.map(restaurant => (
                <div key={restaurant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Building className="h-5 w-5 text-gray-500" />
                      <div>
                        <h3 className="font-semibold">{restaurant.nombre}</h3>
                        <p className="text-sm text-gray-600">{restaurant.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {restaurant.activo ? (
                      <Badge className="bg-green-100 text-green-800">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                    {restaurant.en_mantenimiento && (
                      <Badge className="bg-yellow-100 text-yellow-800">Mantenimiento</Badge>
                    )}
                  </div>
                </div>
              ))}

              {restaurants.length === 0 && (
                <div className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay restaurantes en el sistema</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Este panel proporciona una vista de solo lectura del sistema.
            Para funciones administrativas avanzadas, accede directamente a Supabase.
          </p>
        </div>
      </div>
    </div>
  )
}
