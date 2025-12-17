'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Edit, Trash2, Users, Phone, Mail, Download } from 'lucide-react'
import { toast } from 'sonner'

export default function ClientesPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [customerForm, setCustomerForm] = useState({
    nombre: '',
    ruc: '',
    telefono: '',
    email: '',
    direccion_principal: '',
    notas: '',
    acepta_marketing_whatsapp: false
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && restaurant) {
      loadCustomers()
    }
  }, [user, restaurant])

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('nombre', { ascending: true })

    if (error) {
      toast.error('Error cargando clientes')
    } else {
      setCustomers(data || [])
    }
  }

  const handleSaveCustomer = async () => {
    if (!customerForm.nombre) {
      toast.error('El nombre es obligatorio')
      return
    }

    try {
      const dataToSave = {
        ...customerForm,
        restaurant_id: restaurant.id
      }

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(dataToSave)
          .eq('id', editingCustomer.id)

        if (error) throw error
        toast.success('Cliente actualizado')
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([dataToSave])

        if (error) throw error
        toast.success('Cliente creado')
      }

      setDialogOpen(false)
      resetCustomerForm()
      loadCustomers()
    } catch (error) {
      console.error('Error guardando cliente:', error)
      toast.error('Error al guardar cliente')
    }
  }

  const handleDeleteCustomer = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error eliminando cliente')
    } else {
      toast.success('Cliente eliminado')
      loadCustomers()
    }
  }

  const resetCustomerForm = () => {
    setCustomerForm({
      nombre: '',
      ruc: '',
      telefono: '',
      email: '',
      direccion_principal: '',
      notas: '',
      acepta_marketing_whatsapp: false
    })
    setEditingCustomer(null)
  }

  const exportToCSV = () => {
    const csv = 'Nombre,Telefono,Email\n' + customers.map(c => `"${c.nombre}","${c.telefono || ''}","${c.email || ''}"`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clientes.csv'
    a.click()
    toast.success('Exportado')
  }

  const openEditCustomer = (customer) => {
    setEditingCustomer(customer)
    setCustomerForm({
      nombre: customer.nombre,
      ruc: customer.ruc || '',
      telefono: customer.telefono || '',
      email: customer.email || '',
      direccion_principal: customer.direccion_principal || '',
      notas: customer.notas || '',
      acepta_marketing_whatsapp: customer.acepta_marketing_whatsapp
    })
    setDialogOpen(true)
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Gestión de Clientes</h1>
              <p className="text-gray-600">Administra tu base de clientes</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={exportToCSV} disabled={customers.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetCustomerForm(); }}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingCustomer ? 'Editar' : 'Nuevo'} Cliente</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Nombre *</Label>
                      <Input value={customerForm.nombre} onChange={(e) => setCustomerForm({...customerForm, nombre: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>RUC / C.I. N°</Label>
                      <Input value={customerForm.ruc} onChange={(e) => setCustomerForm({...customerForm, ruc: e.target.value})} placeholder="12345678-9" />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input value={customerForm.telefono} onChange={(e) => setCustomerForm({...customerForm, telefono: e.target.value})} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Dirección</Label>
                      <Input value={customerForm.direccion_principal} onChange={(e) => setCustomerForm({...customerForm, direccion_principal: e.target.value})} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Notas</Label>
                      <Textarea value={customerForm.notas} onChange={(e) => setCustomerForm({...customerForm, notas: e.target.value})} rows={3} />
                    </div>
                    <div className="col-span-2 flex items-center space-x-2">
                      <Checkbox id="marketing" checked={customerForm.acepta_marketing_whatsapp} onCheckedChange={(checked) => setCustomerForm({...customerForm, acepta_marketing_whatsapp: checked})} />
                      <Label htmlFor="marketing">Acepta marketing por WhatsApp</Label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSaveCustomer}>Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marketing</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{customer.nombre}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.telefono}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{customer.direccion_principal}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.acepta_marketing_whatsapp ? (
                            <Badge className="bg-green-500">Sí</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <Button size="sm" variant="outline" onClick={() => openEditCustomer(customer)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteCustomer(customer.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {customers.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay clientes aún. Crea tu primer cliente.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
