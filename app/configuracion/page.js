'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Settings, Users as UsersIcon, Building, Palette, Image, Upload } from 'lucide-react'
import { toast } from 'sonner'

export default function ConfiguracionPage() {
  const { user, restaurant: currentRestaurant, loading: authLoading, reloadRestaurant } = useAuth()
  const { currency, updateCurrency } = useCurrency()
  const { colors: themeColors } = useTheme()
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [users, setUsers] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState('EUR')
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [restaurantForm, setRestaurantForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    logo_url: '',
    tipo_negocio: '',
    descripcion: ''
  })

  // Colores del panel admin
  const [adminColors, setAdminColors] = useState({
    primary: '#f97316', // naranja por defecto
    secondary: '#1e3a5f'
  })

  const [userForm, setUserForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'CAJERO',
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
      configuracion: false
    }
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
      loadAdminColors()
    }
  }, [user, currentRestaurant])

  useEffect(() => {
    if (currency) {
      setSelectedCurrency(currency)
    }
  }, [currency])

  const loadRestaurantData = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', currentRestaurant.id)
      .single()

    if (data) {
      setRestaurant(data)
      
      // Cargar datos extra desde localStorage
      const extraDataStr = localStorage.getItem(`restaurant_extra_${currentRestaurant.id}`)
      const extraData = extraDataStr ? JSON.parse(extraDataStr) : {}
      
      setRestaurantForm({
        nombre: data.nombre || '',
        telefono: data.telefono || '',
        email: data.email || '',
        direccion: data.direccion || '',
        logo_url: data.logo_url || '',
        tipo_negocio: extraData.tipo_negocio || data.tipo_negocio || '',
        descripcion: extraData.descripcion || data.descripcion || ''
      })
    }
  }

  const loadAdminColors = () => {
    // Cargar colores guardados en localStorage
    const savedColors = localStorage.getItem('adminColors')
    if (savedColors) {
      setAdminColors(JSON.parse(savedColors))
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

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo_${currentRestaurant.id}_${Date.now()}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        // Si falla Supabase Storage, convertir a base64 como alternativa
        const reader = new FileReader()
        reader.onload = (event) => {
          const base64 = event.target?.result
          setRestaurantForm({...restaurantForm, logo_url: base64})
          toast.success('Logo cargado (local)')
        }
        reader.readAsDataURL(file)
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('imagenes')
          .getPublicUrl(filePath)
        
        setRestaurantForm({...restaurantForm, logo_url: publicUrl})
        toast.success('Logo subido correctamente')
      }
    } catch (error) {
      console.error('Error subiendo logo:', error)
      toast.error('Error al subir el logo')
    }
    setUploadingLogo(false)
  }

  const handleSaveRestaurant = async () => {
    try {
      // Solo actualizar campos básicos que existen en la tabla
      const updateData = {
        nombre: restaurantForm.nombre,
        telefono: restaurantForm.telefono,
        email: restaurantForm.email,
        direccion: restaurantForm.direccion,
        logo_url: restaurantForm.logo_url
      }

      const { error } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', currentRestaurant.id)

      if (error) throw error

      // Guardar tipo_negocio y descripcion en localStorage como alternativa local
      const extraData = {
        tipo_negocio: restaurantForm.tipo_negocio,
        descripcion: restaurantForm.descripcion
      }
      localStorage.setItem(`restaurant_extra_${currentRestaurant.id}`, JSON.stringify(extraData))

      // También guardar en menu_digital_config para que aparezca en el menú del cliente
      try {
        const { data: existingConfig } = await supabase
          .from('menu_digital_config')
          .select('id, colores')
          .eq('restaurant_id', currentRestaurant.id)
          .single()

        // Guardar tipo_negocio dentro del objeto colores para evitar error de columna inexistente
        const updatedColores = {
          ...(existingConfig?.colores || {}),
          tipo_negocio: restaurantForm.tipo_negocio
        }

        if (existingConfig) {
          await supabase
            .from('menu_digital_config')
            .update({
              descripcion: restaurantForm.descripcion,
              colores: updatedColores
            })
            .eq('restaurant_id', currentRestaurant.id)
        } else {
          await supabase
            .from('menu_digital_config')
            .insert({
              restaurant_id: currentRestaurant.id,
              descripcion: restaurantForm.descripcion,
              colores: updatedColores
            })
        }
      } catch (configError) {
        console.log('menu_digital_config update skipped:', configError.message)
      }

      toast.success('Restaurante actualizado')
      await loadRestaurantData()
      await reloadRestaurant()
    } catch (error) {
      console.error('Error actualizando restaurante:', error)
      toast.error('Error al actualizar restaurante')
    }
  }

  const handleSaveAdminColors = () => {
    localStorage.setItem('adminColors', JSON.stringify(adminColors))
    
    // Aplicar colores inmediatamente
    document.documentElement.style.setProperty('--admin-primary', adminColors.primary)
    document.documentElement.style.setProperty('--admin-secondary', adminColors.secondary)
    
    toast.success('Colores del panel guardados. Recarga la página para ver los cambios completos.')
  }

  const handleSavePreferences = async () => {
    try {
      const result = await updateCurrency(selectedCurrency)
      
      if (result.success) {
        toast.success('Preferencias guardadas correctamente')
      } else {
        toast.error('Error al guardar preferencias')
      }
    } catch (error) {
      console.error('Error guardando preferencias:', error)
      toast.error('Error al guardar preferencias')
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
        restaurant_id: currentRestaurant.id,
        permisos: userForm.permisos
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
        configuracion: false
      }
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
      activo: userToEdit.activo,
      permisos: userToEdit.permisos || {
        dashboard: true,
        menu: true,
        pedidos: true,
        kds: true,
        cobro: true,
        clientes: true,
        cupones: true,
        reportes: true,
        configuracion: false
      }
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

  const tiposNegocio = [
    { value: 'restaurante', label: 'Restaurante' },
    { value: 'cafeteria', label: 'Cafetería' },
    { value: 'lomiteria', label: 'Lomitería' },
    { value: 'pizzeria', label: 'Pizzería' },
    { value: 'bar', label: 'Bar' },
    { value: 'panaderia', label: 'Panadería' },
    { value: 'heladeria', label: 'Heladería' },
    { value: 'food_truck', label: 'Food Truck' },
    { value: 'otro', label: 'Otro' }
  ]

  const colorPresets = [
    { name: 'Naranja', primary: '#f97316', secondary: '#1e3a5f' },
    { name: 'Azul', primary: '#3b82f6', secondary: '#1e3a5f' },
    { name: 'Verde', primary: '#22c55e', secondary: '#14532d' },
    { name: 'Rojo', primary: '#ef4444', secondary: '#7f1d1d' },
    { name: 'Morado', primary: '#a855f7', secondary: '#581c87' },
    { name: 'Rosa', primary: '#ec4899', secondary: '#831843' },
    { name: 'Café', primary: '#a16207', secondary: '#422006' },
    { name: 'Negro', primary: '#374151', secondary: '#111827' }
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Configuración</h1>
          <p className="text-gray-600">Administra la configuración de tu restaurante</p>
        </div>

        <Tabs defaultValue="restaurant" className="space-y-4">
          <TabsList>
            <TabsTrigger value="restaurant">Restaurante</TabsTrigger>
            <TabsTrigger value="apariencia">Apariencia</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="preferences">Preferencias</TabsTrigger>
          </TabsList>

          <TabsContent value="restaurant" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Información del Negocio
                </CardTitle>
                <CardDescription>
                  Configura los datos básicos de tu negocio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Logo del Negocio</Label>
                  <div className="flex items-start space-x-4">
                    <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                      {restaurantForm.logo_url ? (
                        <img 
                          src={restaurantForm.logo_url} 
                          alt="Logo" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Image className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex space-x-2">
                        <Label 
                          htmlFor="logo-upload" 
                          className="cursor-pointer inline-flex items-center px-4 py-2 text-white rounded-md hover:opacity-90 transition-colors"
                          style={{ backgroundColor: themeColors.secondary }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                        </Label>
                        <Input 
                          id="logo-upload"
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                        />
                        {restaurantForm.logo_url && (
                          <Button 
                            variant="outline" 
                            onClick={() => setRestaurantForm({...restaurantForm, logo_url: ''})}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG o WEBP. Tamaño recomendado: 200x200px</p>
                      <div className="pt-2">
                        <Label className="text-xs">O usar URL:</Label>
                        <Input 
                          value={restaurantForm.logo_url}
                          onChange={(e) => setRestaurantForm({...restaurantForm, logo_url: e.target.value})}
                          placeholder="https://ejemplo.com/logo.png"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del Negocio</Label>
                    <Input 
                      value={restaurantForm.nombre}
                      onChange={(e) => setRestaurantForm({...restaurantForm, nombre: e.target.value})}
                      placeholder="Mi Restaurante"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Negocio</Label>
                    <Select 
                      value={restaurantForm.tipo_negocio} 
                      onValueChange={(val) => setRestaurantForm({...restaurantForm, tipo_negocio: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposNegocio.map(tipo => (
                          <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción del Negocio</Label>
                  <Textarea 
                    value={restaurantForm.descripcion}
                    onChange={(e) => setRestaurantForm({...restaurantForm, descripcion: e.target.value})}
                    placeholder="El mejor café de la ciudad, especialistas en café de especialidad y repostería artesanal..."
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">Esta descripción aparecerá en tu menú digital</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input 
                      value={restaurantForm.telefono}
                      onChange={(e) => setRestaurantForm({...restaurantForm, telefono: e.target.value})}
                      placeholder="+595 900 000 000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={restaurantForm.email}
                      onChange={(e) => setRestaurantForm({...restaurantForm, email: e.target.value})}
                      placeholder="contacto@minegocio.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input 
                    value={restaurantForm.direccion}
                    onChange={(e) => setRestaurantForm({...restaurantForm, direccion: e.target.value})}
                    placeholder="Av. Principal 123, Ciudad"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    className="hover:opacity-90" 
                    style={{ backgroundColor: themeColors.secondary }}
                    onClick={handleSaveRestaurant}
                  >
                    Guardar Cambios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nueva pestaña de Apariencia */}
          <TabsContent value="apariencia" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="mr-2 h-5 w-5" />
                  Colores del Panel de Administración
                </CardTitle>
                <CardDescription>
                  Personaliza los colores de tu sistema de gestión
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Presets de colores */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Temas Predefinidos</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {colorPresets.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => setAdminColors({ primary: preset.primary, secondary: preset.secondary })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          adminColors.primary === preset.primary 
                            ? 'border-gray-900 ring-2 ring-gray-300' 
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex space-x-1 mb-2">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.primary }}></div>
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.secondary }}></div>
                        </div>
                        <p className="text-xs font-medium">{preset.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colores personalizados */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base font-semibold">Colores Personalizados</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Color Principal</Label>
                      <div className="flex space-x-2">
                        <input 
                          type="color" 
                          value={adminColors.primary}
                          onChange={(e) => setAdminColors({...adminColors, primary: e.target.value})}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <Input 
                          value={adminColors.primary}
                          onChange={(e) => setAdminColors({...adminColors, primary: e.target.value})}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-gray-500">Botones, enlaces y elementos destacados</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Color Secundario</Label>
                      <div className="flex space-x-2">
                        <input 
                          type="color" 
                          value={adminColors.secondary}
                          onChange={(e) => setAdminColors({...adminColors, secondary: e.target.value})}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <Input 
                          value={adminColors.secondary}
                          onChange={(e) => setAdminColors({...adminColors, secondary: e.target.value})}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-gray-500">Sidebar y fondos oscuros</p>
                    </div>
                  </div>
                </div>

                {/* Vista previa */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base font-semibold">Vista Previa</Label>
                  <div className="flex space-x-4">
                    <div className="flex-1 p-4 rounded-lg" style={{ backgroundColor: adminColors.secondary }}>
                      <div className="text-white text-sm mb-3 font-semibold">Sidebar</div>
                      <div className="space-y-2">
                        <div className="p-2 rounded text-white text-xs opacity-70">Dashboard</div>
                        <div className="p-2 rounded text-white text-xs" style={{ backgroundColor: adminColors.primary }}>
                          Pedidos (activo)
                        </div>
                        <div className="p-2 rounded text-white text-xs opacity-70">Cobro</div>
                      </div>
                    </div>
                    <div className="flex-1 p-4 bg-gray-100 rounded-lg">
                      <div className="text-gray-700 text-sm mb-3 font-semibold">Contenido</div>
                      <button 
                        className="px-4 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: adminColors.primary }}
                      >
                        Botón Principal
                      </button>
                      <div className="mt-3 flex space-x-2">
                        <div className="w-8 h-8 rounded" style={{ backgroundColor: adminColors.primary }}></div>
                        <div className="w-8 h-8 rounded" style={{ backgroundColor: adminColors.secondary }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={handleSaveAdminColors}
                    style={{ backgroundColor: adminColors.primary }}
                    className="hover:opacity-90"
                  >
                    Guardar Colores
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
                      <Button 
                        className="hover:opacity-90"
                        style={{ backgroundColor: themeColors.secondary }}
                      >
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
                        
                        {/* Sistema de Permisos */}
                        <div className="space-y-2 pt-4 border-t">
                          <Label className="text-base font-semibold">Permisos - Selecciona qué puede ver:</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(userForm.permisos).map(([key, value]) => (
                              <div key={key} className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={value}
                                  onCheckedChange={(checked) => setUserForm({
                                    ...userForm, 
                                    permisos: {...userForm.permisos, [key]: checked}
                                  })}
                                />
                                <Label className="cursor-pointer capitalize">{key}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancelar</Button>
                        <Button 
                          className="hover:opacity-90" 
                          style={{ backgroundColor: themeColors.secondary }}
                          onClick={handleSaveUser}
                        >
                          Guardar
                        </Button>
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
                    <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="USD">Dólar ($)</SelectItem>
                        <SelectItem value="PYG">Guaraníes (Gs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Zona Horaria</Label>
                    <Select defaultValue="America/Asuncion">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Asuncion">Asunción (UTC-4)</SelectItem>
                        <SelectItem value="Europe/Madrid">Madrid (UTC+1)</SelectItem>
                        <SelectItem value="America/New_York">New York (UTC-5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button 
                    className="hover:opacity-90" 
                    style={{ backgroundColor: themeColors.secondary }}
                    onClick={handleSavePreferences}
                  >
                    Guardar Preferencias
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  )
}
