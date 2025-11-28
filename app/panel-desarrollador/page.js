'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Building, Key, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function PanelDesarrolladorPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [restaurants, setRestaurants] = useState([])
  const [developers, setDevelopers] = useState([])
  const [editingRestaurant, setEditingRestaurant] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [developerDialogOpen, setDeveloperDialogOpen] = useState(false)

  const [restaurantForm, setRestaurantForm] = useState({
    nombre: '',
    slug: '',
    telefono: '',
    direccion: '',
    admin_nombre: '',
    admin_email: '',
    admin_password: '',
    tipo_pago: 'CONTADO',
    activo: true
  })

  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
    new_email: ''
  })

  const [developerForm, setDeveloperForm] = useState({
    nombre: '',
    email: '',
    password: ''
  })

  useEffect(() => {
    if (!authLoading && (!user || user.rol !== 'DESARROLLADOR')) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && user.rol === 'DESARROLLADOR') {
      loadRestaurants()
      loadDevelopers()
    }
  }, [user])

  const loadRestaurants = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false })
    setRestaurants(data || [])
  }

  const loadDevelopers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('rol', 'DESARROLLADOR')
      .order('created_at', { ascending: false })
    setDevelopers(data || [])
  }

  const handleSaveRestaurant = async () => {
    try {
      if (editingRestaurant) {
        // Actualizar restaurante existente
        const { error } = await supabase
          .from('restaurants')
          .update({
            nombre: restaurantForm.nombre,
            slug: restaurantForm.slug,
            telefono: restaurantForm.telefono,
            direccion: restaurantForm.direccion,
            tipo_pago: restaurantForm.tipo_pago,
            activo: restaurantForm.activo
          })
          .eq('id', editingRestaurant.id)
        if (error) throw error
        toast.success('Cliente actualizado')
      } else {
        // Validar campos obligatorios
        if (!restaurantForm.nombre || !restaurantForm.slug || !restaurantForm.admin_email || !restaurantForm.admin_password || !restaurantForm.admin_nombre) {
          toast.error('Complete todos los campos obligatorios')
          return
        }

        // Crear nuevo restaurante
        const { data: newRestaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .insert([{
            nombre: restaurantForm.nombre,
            slug: restaurantForm.slug,
            telefono: restaurantForm.telefono,
            direccion: restaurantForm.direccion,
            tipo_pago: restaurantForm.tipo_pago,
            activo: restaurantForm.activo
          }])
          .select()
          .single()

        if (restaurantError) throw restaurantError

        // Crear usuario admin para el restaurante
        const { error: adminError } = await supabase
          .from('users')
          .insert([{
            restaurant_id: newRestaurant.id,
            nombre: restaurantForm.admin_nombre,
            email: restaurantForm.admin_email,
            password: restaurantForm.admin_password,
            rol: 'ADMIN',
            activo: true,
            permisos: {
              dashboard: true,
              menu: true,
              pedidos: true,
              kds: true,
              cobro: true,
              clientes: true,
              cupones: true,
              reportes: true,
              configuracion: true
            }
          }])

        if (adminError) throw adminError
        toast.success('Restaurante y administrador creados exitosamente')
      }
      
      setDialogOpen(false)
      resetRestaurantForm()
      loadRestaurants()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar: ' + error.message)
    }
  }

  const handleToggleActive = async (restaurant) => {
    try {
      const newStatus = !restaurant.activo
      const { error } = await supabase
        .from('restaurants')
        .update({ activo: newStatus })
        .eq('id', restaurant.id)
      if (error) throw error
      toast.success(newStatus ? 'Cliente activado' : 'Cliente desactivado')
      loadRestaurants()
    } catch (error) {
      toast.error('Error al cambiar estado')
    }
  }

  const handleDeleteRestaurant = async (id) => {
    if (!confirm('¿Eliminar este cliente y todos sus datos?')) return
    const { error } = await supabase.from('restaurants').delete().eq('id', id)
    if (error) {
      toast.error('Error eliminando cliente')
    } else {
      toast.success('Cliente eliminado')
      loadRestaurants()
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.new_password) {
      toast.error('Ingresa la nueva contraseña')
      return
    }
    try {
      const updateData = { password: passwordForm.new_password }
      if (passwordForm.new_email) {
        updateData.email = passwordForm.new_email
      }
      const { error } = await supabase.from('users').update(updateData).eq('id', user.id)
      if (error) throw error
      toast.success('Datos actualizados. Inicia sesión nuevamente.')
      setTimeout(() => logout(), 2000)
    } catch (error) {
      toast.error('Error al actualizar datos')
    }
  }

  const handleAddDeveloper = async () => {
    if (!developerForm.nombre || !developerForm.email || !developerForm.password) {
      toast.error('Todos los campos son obligatorios')
      return
    }
    try {
      const { error } = await supabase.from('users').insert([{
        nombre: developerForm.nombre,
        email: developerForm.email,
        password: developerForm.password,
        rol: 'DESARROLLADOR',
        activo: true,
        restaurant_id: null
      }])
      if (error) throw error
      toast.success('Desarrollador añadido')
      setDeveloperDialogOpen(false)
      resetDeveloperForm()
      loadDevelopers()
    } catch (error) {
      toast.error('Error al añadir desarrollador')
    }
  }

  const resetRestaurantForm = () => {
    setRestaurantForm({
      nombre: '',
      slug: '',
      telefono: '',
      direccion: '',
      admin_nombre: '',
      admin_email: '',
      admin_password: '',
      tipo_pago: 'CONTADO',
      activo: true
    })
    setEditingRestaurant(null)
  }

  const resetDeveloperForm = () => {
    setDeveloperForm({ nombre: '', email: '', password: '' })
  }

  const openEditRestaurant = (restaurant) => {
    setEditingRestaurant(restaurant)
    setRestaurantForm({
      nombre: restaurant.nombre,
      email: restaurant.email || '',
      telefono: restaurant.telefono || '',
      contacto_numero: restaurant.contacto_numero || '',
      tipo_pago_plan: restaurant.tipo_pago_plan || 'CONTADO'
    })
    setDialogOpen(true)
  }

  if (authLoading || !user || user.rol !== 'DESARROLLADOR') {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header del Panel Desarrollador */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Panel Desarrollador</h1>
            <p className="text-purple-100 text-sm">{user?.nombre} - {user?.email}</p>
          </div>
          <Button
            variant="ghost"
            onClick={logout}
            className="text-white hover:bg-purple-600"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Panel de Desarrollador</h1>
            <p className="text-gray-600">Gestión de clientes y desarrolladores</p>
          </div>

          <Tabs defaultValue="clientes" className="space-y-4">
            <TabsList>
              <TabsTrigger value="clientes">Clientes ({restaurants.length})</TabsTrigger>
              <TabsTrigger value="developers">Desarrolladores ({developers.length})</TabsTrigger>
              <TabsTrigger value="mi-cuenta">Mi Cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="clientes">
              <Card>
                <CardHeader>
                  <CardTitle>Clientes (Restaurantes)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {restaurants.map(restaurant => (
                          <tr key={restaurant.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <Building className="h-5 w-5 text-gray-400 mr-3" />
                                <div>
                                  <div className="font-semibold">{restaurant.nombre}</div>
                                  <div className="text-sm text-gray-500">{restaurant.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {restaurant.email && <div>{restaurant.email}</div>}
                              {restaurant.contacto_numero && <div>{restaurant.contacto_numero}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={restaurant.tipo_pago_plan === 'CONTADO' ? 'default' : 'secondary'}>
                                {restaurant.tipo_pago_plan || 'CONTADO'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <Switch checked={restaurant.activo} onCheckedChange={() => handleToggleActive(restaurant)} />
                                <span className="text-sm">{restaurant.activo ? 'Activo' : 'Inactivo'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end space-x-2">
                                <Button size="sm" variant="outline" onClick={() => openEditRestaurant(restaurant)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteRestaurant(restaurant.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="developers">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Otros Desarrolladores</CardTitle>
                    <Dialog open={developerDialogOpen} onOpenChange={setDeveloperDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-orange-500 hover:bg-orange-600">
                          <UserPlus className="mr-2 h-4 w-4" /> Añadir Desarrollador
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nuevo Desarrollador</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input value={developerForm.nombre} onChange={(e) => setDeveloperForm({...developerForm, nombre: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={developerForm.email} onChange={(e) => setDeveloperForm({...developerForm, email: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Contraseña</Label>
                            <Input type="password" value={developerForm.password} onChange={(e) => setDeveloperForm({...developerForm, password: e.target.value})} />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button variant="outline" onClick={() => setDeveloperDialogOpen(false)}>Cancelar</Button>
                          <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleAddDeveloper}>Añadir</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {developers.filter(dev => dev.id !== user.id).map(dev => (
                      <div key={dev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">{dev.nombre}</p>
                          <p className="text-sm text-gray-600">{dev.email}</p>
                        </div>
                        <Badge>{dev.activo ? 'Activo' : 'Inactivo'}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mi-cuenta">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="mr-2 h-5 w-5" /> Mi Cuenta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <p className="font-semibold">Usuario actual:</p>
                    <p className="text-sm">{user.nombre}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nuevo Email (opcional)</Label>
                    <Input type="email" value={passwordForm.new_email} onChange={(e) => setPasswordForm({...passwordForm, new_email: e.target.value})} placeholder={user.email} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nueva Contraseña</Label>
                    <Input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})} placeholder="Nueva contraseña" />
                  </div>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handleChangePassword}>
                    Actualizar Datos
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetRestaurantForm(); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={restaurantForm.nombre} onChange={(e) => setRestaurantForm({...restaurantForm, nombre: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={restaurantForm.email} onChange={(e) => setRestaurantForm({...restaurantForm, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={restaurantForm.telefono} onChange={(e) => setRestaurantForm({...restaurantForm, telefono: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Número de Contacto</Label>
                  <Input value={restaurantForm.contacto_numero} onChange={(e) => setRestaurantForm({...restaurantForm, contacto_numero: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Plan</Label>
                  <Select value={restaurantForm.tipo_pago_plan} onValueChange={(val) => setRestaurantForm({...restaurantForm, tipo_pago_plan: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTADO">Al Contado</SelectItem>
                      <SelectItem value="CUOTAS">En Cuotas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSaveRestaurant}>Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
    </div>
  )
}
