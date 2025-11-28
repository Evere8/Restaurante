'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit, Trash2, Tag, Percent, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

export default function CuponesPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const router = useRouter()
  const [coupons, setCoupons] = useState([])
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [couponForm, setCouponForm] = useState({
    codigo: '',
    tipo: 'PORCENTAJE',
    valor: '',
    monto_minimo: '',
    limite_usos: '',
    fecha_vencimiento: '',
    activo: true
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && restaurant) {
      loadCoupons()
    }
  }, [user, restaurant])

  const loadCoupons = async () => {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Error cargando cupones')
    } else {
      setCoupons(data || [])
    }
  }

  const handleSaveCoupon = async () => {
    if (!couponForm.codigo || !couponForm.valor) {
      toast.error('Código y valor son obligatorios')
      return
    }

    try {
      const dataToSave = {
        ...couponForm,
        codigo: couponForm.codigo.toUpperCase(),
        restaurant_id: restaurant.id,
        valor: parseFloat(couponForm.valor),
        monto_minimo: couponForm.monto_minimo ? parseFloat(couponForm.monto_minimo) : 0,
        limite_usos: couponForm.limite_usos ? parseInt(couponForm.limite_usos) : null,
        fecha_vencimiento: couponForm.fecha_vencimiento || null
      }

      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(dataToSave)
          .eq('id', editingCoupon.id)

        if (error) throw error
        toast.success('Cupón actualizado')
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert([dataToSave])

        if (error) throw error
        toast.success('Cupón creado')
      }

      setDialogOpen(false)
      resetForm()
      loadCoupons()
    } catch (error) {
      console.error('Error guardando cupón:', error)
      toast.error('Error al guardar cupón')
    }
  }

  const handleDeleteCoupon = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este cupón?')) return

    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error eliminando cupón')
    } else {
      toast.success('Cupón eliminado')
      loadCoupons()
    }
  }

  const resetForm = () => {
    setCouponForm({
      codigo: '',
      tipo: 'PORCENTAJE',
      valor: '',
      monto_minimo: '',
      limite_usos: '',
      fecha_vencimiento: '',
      activo: true
    })
    setEditingCoupon(null)
  }

  const openEditCoupon = (coupon) => {
    setEditingCoupon(coupon)
    setCouponForm({
      codigo: coupon.codigo,
      tipo: coupon.tipo,
      valor: coupon.valor,
      monto_minimo: coupon.monto_minimo || '',
      limite_usos: coupon.limite_usos || '',
      fecha_vencimiento: coupon.fecha_vencimiento || '',
      activo: coupon.activo
    })
    setDialogOpen(true)
  }

  const calculatePreview = () => {
    const testAmount = 100
    if (!couponForm.valor) return null

    if (couponForm.tipo === 'PORCENTAJE') {
      const discount = (testAmount * parseFloat(couponForm.valor)) / 100
      return `Ejemplo: €${testAmount} - ${couponForm.valor}% = €${(testAmount - discount).toFixed(2)}`
    } else {
      const discount = parseFloat(couponForm.valor)
      return `Ejemplo: €${testAmount} - €${discount} = €${(testAmount - discount).toFixed(2)}`
    }
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
            <h1 className="text-3xl font-bold text-gray-800">Gestión de Cupones</h1>
            <p className="text-gray-600">Crea y administra cupones de descuento</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Cupón
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCoupon ? 'Editar' : 'Nuevo'} Cupón</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input 
                    value={couponForm.codigo}
                    onChange={(e) => setCouponForm({...couponForm, codigo: e.target.value.toUpperCase()})}
                    placeholder="VERANO2024"
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Descuento</Label>
                  <Select value={couponForm.tipo} onValueChange={(val) => setCouponForm({...couponForm, tipo: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PORCENTAJE">Porcentaje (%)</SelectItem>
                      <SelectItem value="MONTO_FIJO">Monto Fijo (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor del Descuento *</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      step="0.01"
                      value={couponForm.valor}
                      onChange={(e) => setCouponForm({...couponForm, valor: e.target.value})}
                      placeholder={couponForm.tipo === 'PORCENTAJE' ? '10' : '5.00'}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {couponForm.tipo === 'PORCENTAJE' ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                    </div>
                  </div>
                  {couponForm.valor && (
                    <p className="text-sm text-gray-600">{calculatePreview()}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Monto Mínimo de Compra</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={couponForm.monto_minimo}
                    onChange={(e) => setCouponForm({...couponForm, monto_minimo: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Límite de Usos (opcional)</Label>
                  <Input 
                    type="number"
                    value={couponForm.limite_usos}
                    onChange={(e) => setCouponForm({...couponForm, limite_usos: e.target.value})}
                    placeholder="Sin límite"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Vencimiento (opcional)</Label>
                  <Input 
                    type="date"
                    value={couponForm.fecha_vencimiento}
                    onChange={(e) => setCouponForm({...couponForm, fecha_vencimiento: e.target.value})}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={couponForm.activo}
                    onCheckedChange={(checked) => setCouponForm({...couponForm, activo: checked})}
                  />
                  <Label>Activo</Label>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSaveCoupon}>Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descuento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restricciones</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {coupons.map(coupon => (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 mr-2 text-orange-500" />
                          <span className="font-mono font-bold">{coupon.codigo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-orange-600">
                            {coupon.tipo === 'PORCENTAJE' ? `${coupon.valor}%` : `€${coupon.valor}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {coupon.tipo === 'PORCENTAJE' ? 'Porcentaje' : 'Monto fijo'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {coupon.monto_minimo > 0 && (
                          <div className="text-gray-600">Mín: €{coupon.monto_minimo}</div>
                        )}
                        {coupon.fecha_vencimiento && (
                          <div className="text-gray-600">
                            Vence: {new Date(coupon.fecha_vencimiento).toLocaleDateString('es-ES')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <span className="font-semibold">{coupon.veces_usado}</span>
                          {coupon.limite_usos && (
                            <span className="text-gray-500"> / {coupon.limite_usos}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {coupon.activo ? (
                          <Badge className="bg-green-100 text-green-800">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="outline" onClick={() => openEditCoupon(coupon)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteCoupon(coupon.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {coupons.length === 0 && (
              <div className="py-12 text-center">
                <Tag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay cupones aún. Crea tu primer cupón.</p>
              </div>
      </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
      </div>
    </div>
  )
}
