'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Settings, Users as UsersIcon, Building } from 'lucide-react'
import { toast } from 'sonner'

export default function ConfiguracionPage() {
  const { user, restaurant: currentRestaurant, loading: authLoading } = useAuth()
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [users, setUsers] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [userDialogOpen, setUserDialogOpen] = useState(false)

  const [restaurantForm, setRestaurantForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    logo_url: ''
  })

  const [userForm, setUserForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'CAJERO',
    activo: true
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && currentRestaurant) {
      loadRestaurantData()
      loadUsers()
    }
  }, [user, currentRestaurant])

  const loadRestaurantData = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', currentRestaurant.id)
      .single()

    if (data) {
      setRestaurant(data)
      setRestaurantForm({
        nombre: data.nombre || '',
        telefono: data.telefono || '',
        email: data.email || '',
        direccion: data.direccion || '',
        logo_url: data.logo_url || ''
      })
    }
  }

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('restaurant_id', currentRestaurant.id)
      .order('nombre', { ascending: true })

    if (data) {
      setUsers(data)
    }
  }

  const handleSaveRestaurant = async () => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update(restaurantForm)
        .eq('id', currentRestaurant.id)

      if (error) throw error
      toast.success('Restaurante actualizado')
      loadRestaurantData()
    } catch (error) {
      console.error('Error actualizando restaurante:', error)
      toast.error('Error al actualizar restaurante')
    }
  }

  const handleSaveUser = async () => {
    if (!userForm.nombre || !userForm.email) {
      toast.error('Nombre y email son obligatorios')
      return
    }

    if (!editingUser && !userForm.password) {
      toast.error('La contraseña es obligatoria para nuevos usuarios')
      return
    }

    try {
      const dataToSave = {
        nombre: userForm.nombre,
        email: userForm.email,
        rol: userForm.rol,
        activo: userForm.activo,
        restaurant_id: currentRestaurant.id
      }

      if (userForm.password) {
        dataToSave.password = userForm.password
      }

      if (editingUser) {
        const { error } = await supabase
          .from('users')
          .update(dataToSave)
          .eq('id', editingUser.id)

        if (error) throw error
        toast.success('Usuario actualizado')
      } else {
        const { error } = await supabase
          .from('users')
          .insert([dataToSave])

        if (error) throw error
        toast.success('Usuario creado')
      }

      setUserDialogOpen(false)
      resetUserForm()
      loadUsers()
    } catch (error) {
      console.error('Error guardando usuario:', error)
      toast.error('Error al guardar usuario')
    }
  }

  const handleDeleteUser = async (id) => {
    if (id === user.id) {
      toast.error('No puedes eliminar tu propio usuario')
      return
    }

    if (!confirm('¿Estás seguro de eliminar este usuario?')) return

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error eliminando usuario')
    } else {
      toast.success('Usuario eliminado')
      loadUsers()
    }
  }

  const resetUserForm = () => {
    setUserForm({
      nombre: '',
      email: '',
      password: '',
      rol: 'CAJERO',
      activo: true
    })
    setEditingUser(null)
  }

  const openEditUser = (userToEdit) => {
    setEditingUser(userToEdit)
    setUserForm({
      nombre: userToEdit.nombre,
      email: userToEdit.email,
      password: '',
      rol: userToEdit.rol,
      activo: userToEdit.activo
    })
    setUserDialogOpen(true)
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  const rolColors = {
    ADMIN: 'bg-red-100 text-red-800',
    CAJERO: 'bg-blue-100 text-blue-800',
    COCINERO: 'bg-green-100 text-green-800',
    MESERO: 'bg-yellow-100 text-yellow-800',
    DESARROLLADOR: 'bg-purple-100 text-purple-800'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Configuración</h1>
          <p className="text-gray-600">Administra la configuración de tu restaurante</p>
        </div>

        <Tabs defaultValue="restaurant" className="space-y-4">
          <TabsList>
            <TabsTrigger value="restaurant">Restaurante</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="preferences">Preferencias</TabsTrigger>
          </TabsList>

          <TabsContent value="restaurant" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Información del Restaurante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input 
                      value={restaurantForm.nombre}
                      onChange={(e) => setRestaurantForm({...restaurantForm, nombre: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input 
                      value={restaurantForm.telefono}
                      onChange={(e) => setRestaurantForm({...restaurantForm, telefono: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={restaurantForm.email}
                      onChange={(e) => setRestaurantForm({...restaurantForm, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input 
                      value={restaurantForm.direccion}
                      onChange={(e) => setRestaurantForm({...restaurantForm, direccion: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Logo URL</Label>
                    <Input 
                      value={restaurantForm.logo_url}
                      onChange={(e) => setRestaurantForm({...restaurantForm, logo_url: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSaveRestaurant}>
                    Guardar Cambios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <UsersIcon className="mr-2 h-5 w-5" />
                    Gestión de Usuarios
                  </CardTitle>
                  <Dialog open={userDialogOpen} onOpenChange={(open) => {
                    setUserDialogOpen(open)
                    if (!open) resetUserForm()
                  }}>
                    <DialogTrigger asChild>
                      <Button className="bg-orange-500 hover:bg-orange-600">
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingUser ? 'Editar' : 'Nuevo'} Usuario</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nombre *</Label>
                          <Input 
                            value={userForm.nombre}
                            onChange={(e) => setUserForm({...userForm, nombre: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input 
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Contraseña {editingUser && '(dejar vacío para no cambiar)'}</Label>
                          <Input 
                            type="password"
                            value={userForm.password}
                            onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                            placeholder={editingUser ? 'Nueva contraseña' : 'Contraseña'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rol</Label>
                          <Select value={userForm.rol} onValueChange={(val) => setUserForm({...userForm, rol: val})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="CAJERO">Cajero</SelectItem>
                              <SelectItem value="COCINERO">Cocinero</SelectItem>
                              <SelectItem value="MESERO">Mesero</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancelar</Button>
                        <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSaveUser}>Guardar</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map(userItem => (
                        <tr key={userItem.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium">{userItem.nombre}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{userItem.email}</td>
                          <td className="px-6 py-4">
                            <Badge className={rolColors[userItem.rol]}>{userItem.rol}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            {userItem.activo ? (
                              <Badge className="bg-green-100 text-green-800">Activo</Badge>
                            ) : (
                              <Badge variant="secondary">Inactivo</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <Button size="sm" variant="outline" onClick={() => openEditUser(userItem)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => handleDeleteUser(userItem.id)}
                                disabled={userItem.id === user.id}
                              >
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

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Preferencias del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select defaultValue="EUR">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="USD">Dólar ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Zona Horaria</Label>
                    <Select defaultValue="Europe/Madrid">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Madrid">Madrid (UTC+1)</SelectItem>
                        <SelectItem value="America/New_York">New York (UTC-5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">Más opciones de configuración próximamente...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
