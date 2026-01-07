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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Users, DollarSign, Building, CreditCard, Plus, Edit, Trash2, 
  Clock, AlertTriangle, CheckCircle2, Calendar, TrendingUp, 
  TrendingDown, Wallet, Receipt, Bell, UserPlus, FileText
} from 'lucide-react'
import { toast } from 'sonner'

export default function PagosPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // Estados principales
  const [empleados, setEmpleados] = useState([])
  const [pagosEmpleados, setPagosEmpleados] = useState([])
  const [gastosFijos, setGastosFijos] = useState([])
  const [pagosGastos, setPagosGastos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modales
  const [empleadoDialogOpen, setEmpleadoDialogOpen] = useState(false)
  const [pagoEmpleadoDialogOpen, setPagoEmpleadoDialogOpen] = useState(false)
  const [gastoFijoDialogOpen, setGastoFijoDialogOpen] = useState(false)
  const [pagoGastoDialogOpen, setPagoGastoDialogOpen] = useState(false)
  
  // Edición
  const [editingEmpleado, setEditingEmpleado] = useState(null)
  const [editingGasto, setEditingGasto] = useState(null)
  const [selectedEmpleado, setSelectedEmpleado] = useState(null)
  
  // Formularios
  const [empleadoForm, setEmpleadoForm] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    telefono: '',
    email: '',
    cargo: '',
    fecha_ingreso: '',
    salario_base: '',
    tipo_pago: 'mensual',
    banco: '',
    cuenta_bancaria: '',
    notas: ''
  })
  
  const [pagoEmpleadoForm, setPagoEmpleadoForm] = useState({
    empleado_id: '',
    periodo: '',
    fecha_vencimiento: '',
    salario_base: '',
    horas_extras: '',
    monto_horas_extras: '',
    turnos_dobles: '',
    monto_turnos_dobles: '',
    bonificaciones: '',
    descuentos: '',
    adelantos: '',
    metodo_pago: 'efectivo',
    notas: ''
  })

  // Formulario para agregar extras incrementales
  const [extraDialogOpen, setExtraDialogOpen] = useState(false)
  const [selectedEmpleadoExtra, setSelectedEmpleadoExtra] = useState(null)
  const [extraForm, setExtraForm] = useState({
    tipo: 'horas_extras', // horas_extras, turno_doble, bonificacion, descuento, adelanto
    cantidad: '',
    monto: '',
    descripcion: ''
  })
  
  const [gastoFijoForm, setGastoFijoForm] = useState({
    nombre: '',
    categoria: 'otros',
    monto: '',
    frecuencia: 'mensual',
    dia_vencimiento: '',
    proveedor: '',
    cuenta_pago: '',
    recordatorio_dias: 5,
    notas: ''
  })
  
  const [pagoGastoForm, setPagoGastoForm] = useState({
    gasto_fijo_id: '',
    nombre: '',
    categoria: 'otros',
    monto: '',
    fecha_vencimiento: '',
    metodo_pago: 'efectivo',
    notas: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && restaurant) {
      loadData()
    }
  }, [user, restaurant])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadEmpleados(),
        loadPagosEmpleados(),
        loadGastosFijos(),
        loadPagosGastos()
      ])
    } catch (err) {
      console.error('Error cargando datos:', err)
    }
    setLoading(false)
  }

  const loadEmpleados = async () => {
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('activo', true)
      .order('nombre')
    
    if (!error) setEmpleados(data || [])
  }

  const loadPagosEmpleados = async () => {
    const { data, error } = await supabase
      .from('pagos_empleados')
      .select('*, empleados(nombre, apellido)')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (!error) setPagosEmpleados(data || [])
  }

  const loadGastosFijos = async () => {
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('activo', true)
      .order('nombre')
    
    if (!error) setGastosFijos(data || [])
  }

  const loadPagosGastos = async () => {
    const { data, error } = await supabase
      .from('pagos_gastos')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (!error) setPagosGastos(data || [])
  }

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(amount || 0).replace('PYG', 'Gs.')
  }

  // Calcular totales
  const calcularTotalPagoEmpleado = () => {
    const base = parseFloat(pagoEmpleadoForm.salario_base) || 0
    const horasExtras = parseFloat(pagoEmpleadoForm.monto_horas_extras) || 0
    const turnosDobles = parseFloat(pagoEmpleadoForm.monto_turnos_dobles) || 0
    const bonificaciones = parseFloat(pagoEmpleadoForm.bonificaciones) || 0
    const descuentos = parseFloat(pagoEmpleadoForm.descuentos) || 0
    const adelantos = parseFloat(pagoEmpleadoForm.adelantos) || 0
    
    return base + horasExtras + turnosDobles + bonificaciones - descuentos - adelantos
  }

  // Pagos pendientes
  const pagosPendientesEmpleados = pagosEmpleados.filter(p => p.estado === 'pendiente')
  const pagosVencidosEmpleados = pagosEmpleados.filter(p => p.estado === 'vencido')
  const pagosPendientesGastos = pagosGastos.filter(p => p.estado === 'pendiente')
  const pagosVencidosGastos = pagosGastos.filter(p => p.estado === 'vencido')

  // Alertas de vencimiento próximo
  const alertasProximas = () => {
    const hoy = new Date()
    const en5Dias = new Date(hoy.getTime() + 5 * 24 * 60 * 60 * 1000)
    
    const alertas = []
    
    // Gastos fijos
    gastosFijos.forEach(gasto => {
      if (gasto.dia_vencimiento) {
        const diaVencimiento = gasto.dia_vencimiento
        const mesActual = hoy.getMonth()
        const anioActual = hoy.getFullYear()
        let fechaVencimiento = new Date(anioActual, mesActual, diaVencimiento)
        
        if (fechaVencimiento < hoy) {
          fechaVencimiento = new Date(anioActual, mesActual + 1, diaVencimiento)
        }
        
        const diasRestantes = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24))
        
        if (diasRestantes <= (gasto.recordatorio_dias || 5)) {
          alertas.push({
            tipo: 'gasto',
            nombre: gasto.nombre,
            monto: gasto.monto,
            diasRestantes,
            fechaVencimiento
          })
        }
      }
    })
    
    // Pagos pendientes
    pagosPendientesGastos.forEach(pago => {
      if (pago.fecha_vencimiento) {
        const fechaVenc = new Date(pago.fecha_vencimiento)
        const diasRestantes = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24))
        
        if (diasRestantes <= 5 && diasRestantes >= 0) {
          alertas.push({
            tipo: 'pago_gasto',
            nombre: pago.nombre,
            monto: pago.monto,
            diasRestantes,
            fechaVencimiento: fechaVenc
          })
        }
      }
    })
    
    return alertas.sort((a, b) => a.diasRestantes - b.diasRestantes)
  }

  // CRUD Empleados
  const handleSaveEmpleado = async () => {
    if (!empleadoForm.nombre) {
      toast.error('El nombre es requerido')
      return
    }

    try {
      if (editingEmpleado) {
        await supabase
          .from('empleados')
          .update({
            ...empleadoForm,
            salario_base: parseFloat(empleadoForm.salario_base) || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEmpleado.id)
      } else {
        await supabase
          .from('empleados')
          .insert({
            restaurant_id: restaurant.id,
            ...empleadoForm,
            salario_base: parseFloat(empleadoForm.salario_base) || 0
          })
      }

      toast.success(editingEmpleado ? 'Empleado actualizado' : 'Empleado creado')
      setEmpleadoDialogOpen(false)
      resetEmpleadoForm()
      loadEmpleados()
    } catch (err) {
      toast.error('Error guardando empleado')
    }
  }

  const handleDeleteEmpleado = async (id) => {
    if (!confirm('¿Desactivar este empleado?')) return
    
    await supabase
      .from('empleados')
      .update({ activo: false })
      .eq('id', id)
    
    toast.success('Empleado desactivado')
    loadEmpleados()
  }

  const openEditEmpleado = (emp) => {
    setEditingEmpleado(emp)
    setEmpleadoForm({
      nombre: emp.nombre || '',
      apellido: emp.apellido || '',
      documento: emp.documento || '',
      telefono: emp.telefono || '',
      email: emp.email || '',
      cargo: emp.cargo || '',
      fecha_ingreso: emp.fecha_ingreso || '',
      salario_base: emp.salario_base?.toString() || '',
      tipo_pago: emp.tipo_pago || 'mensual',
      banco: emp.banco || '',
      cuenta_bancaria: emp.cuenta_bancaria || '',
      notas: emp.notas || ''
    })
    setEmpleadoDialogOpen(true)
  }

  const resetEmpleadoForm = () => {
    setEditingEmpleado(null)
    setEmpleadoForm({
      nombre: '', apellido: '', documento: '', telefono: '', email: '',
      cargo: '', fecha_ingreso: '', salario_base: '', tipo_pago: 'mensual',
      banco: '', cuenta_bancaria: '', notas: ''
    })
  }

  // CRUD Pago Empleado
  const handleSavePagoEmpleado = async () => {
    if (!pagoEmpleadoForm.empleado_id || !pagoEmpleadoForm.periodo) {
      toast.error('Selecciona empleado y periodo')
      return
    }

    const total = calcularTotalPagoEmpleado()

    try {
      await supabase
        .from('pagos_empleados')
        .insert({
          restaurant_id: restaurant.id,
          empleado_id: pagoEmpleadoForm.empleado_id,
          periodo: pagoEmpleadoForm.periodo,
          fecha_vencimiento: pagoEmpleadoForm.fecha_vencimiento || null,
          salario_base: parseFloat(pagoEmpleadoForm.salario_base) || 0,
          horas_extras: parseFloat(pagoEmpleadoForm.horas_extras) || 0,
          monto_horas_extras: parseFloat(pagoEmpleadoForm.monto_horas_extras) || 0,
          turnos_dobles: parseInt(pagoEmpleadoForm.turnos_dobles) || 0,
          monto_turnos_dobles: parseFloat(pagoEmpleadoForm.monto_turnos_dobles) || 0,
          bonificaciones: parseFloat(pagoEmpleadoForm.bonificaciones) || 0,
          descuentos: parseFloat(pagoEmpleadoForm.descuentos) || 0,
          adelantos: parseFloat(pagoEmpleadoForm.adelantos) || 0,
          total_pagar: total,
          estado: 'pendiente',
          metodo_pago: pagoEmpleadoForm.metodo_pago,
          notas: pagoEmpleadoForm.notas
        })

      toast.success('Pago registrado')
      setPagoEmpleadoDialogOpen(false)
      resetPagoEmpleadoForm()
      loadPagosEmpleados()
    } catch (err) {
      toast.error('Error registrando pago')
    }
  }

  const marcarPagoEmpleadoPagado = async (id) => {
    await supabase
      .from('pagos_empleados')
      .update({ 
        estado: 'pagado', 
        pagado_at: new Date().toISOString(),
        fecha_pago: new Date().toISOString().split('T')[0]
      })
      .eq('id', id)
    
    toast.success('Pago marcado como pagado')
    loadPagosEmpleados()
  }

  const resetPagoEmpleadoForm = () => {
    setPagoEmpleadoForm({
      empleado_id: '', periodo: '', fecha_vencimiento: '', salario_base: '',
      horas_extras: '', monto_horas_extras: '', turnos_dobles: '',
      monto_turnos_dobles: '', bonificaciones: '', descuentos: '',
      adelantos: '', metodo_pago: 'efectivo', notas: ''
    })
  }

  // CRUD Gastos Fijos
  const handleSaveGastoFijo = async () => {
    if (!gastoFijoForm.nombre || !gastoFijoForm.monto) {
      toast.error('Nombre y monto son requeridos')
      return
    }

    try {
      if (editingGasto) {
        await supabase
          .from('gastos_fijos')
          .update({
            ...gastoFijoForm,
            monto: parseFloat(gastoFijoForm.monto),
            dia_vencimiento: parseInt(gastoFijoForm.dia_vencimiento) || null,
            recordatorio_dias: parseInt(gastoFijoForm.recordatorio_dias) || 5
          })
          .eq('id', editingGasto.id)
      } else {
        await supabase
          .from('gastos_fijos')
          .insert({
            restaurant_id: restaurant.id,
            ...gastoFijoForm,
            monto: parseFloat(gastoFijoForm.monto),
            dia_vencimiento: parseInt(gastoFijoForm.dia_vencimiento) || null,
            recordatorio_dias: parseInt(gastoFijoForm.recordatorio_dias) || 5
          })
      }

      toast.success(editingGasto ? 'Gasto actualizado' : 'Gasto creado')
      setGastoFijoDialogOpen(false)
      resetGastoFijoForm()
      loadGastosFijos()
    } catch (err) {
      toast.error('Error guardando gasto')
    }
  }

  const handleDeleteGastoFijo = async (id) => {
    if (!confirm('¿Desactivar este gasto?')) return
    
    await supabase
      .from('gastos_fijos')
      .update({ activo: false })
      .eq('id', id)
    
    toast.success('Gasto desactivado')
    loadGastosFijos()
  }

  const openEditGasto = (gasto) => {
    setEditingGasto(gasto)
    setGastoFijoForm({
      nombre: gasto.nombre || '',
      categoria: gasto.categoria || 'otros',
      monto: gasto.monto?.toString() || '',
      frecuencia: gasto.frecuencia || 'mensual',
      dia_vencimiento: gasto.dia_vencimiento?.toString() || '',
      proveedor: gasto.proveedor || '',
      cuenta_pago: gasto.cuenta_pago || '',
      recordatorio_dias: gasto.recordatorio_dias || 5,
      notas: gasto.notas || ''
    })
    setGastoFijoDialogOpen(true)
  }

  const resetGastoFijoForm = () => {
    setEditingGasto(null)
    setGastoFijoForm({
      nombre: '', categoria: 'otros', monto: '', frecuencia: 'mensual',
      dia_vencimiento: '', proveedor: '', cuenta_pago: '', recordatorio_dias: 5, notas: ''
    })
  }

  // CRUD Pago Gasto
  const handleSavePagoGasto = async () => {
    if (!pagoGastoForm.nombre || !pagoGastoForm.monto) {
      toast.error('Nombre y monto son requeridos')
      return
    }

    try {
      await supabase
        .from('pagos_gastos')
        .insert({
          restaurant_id: restaurant.id,
          gasto_fijo_id: pagoGastoForm.gasto_fijo_id === 'manual' ? null : (pagoGastoForm.gasto_fijo_id || null),
          nombre: pagoGastoForm.nombre,
          categoria: pagoGastoForm.categoria,
          monto: parseFloat(pagoGastoForm.monto),
          fecha_vencimiento: pagoGastoForm.fecha_vencimiento || null,
          estado: 'pendiente',
          metodo_pago: pagoGastoForm.metodo_pago,
          notas: pagoGastoForm.notas
        })

      toast.success('Pago de gasto registrado')
      setPagoGastoDialogOpen(false)
      resetPagoGastoForm()
      loadPagosGastos()
    } catch (err) {
      toast.error('Error registrando pago')
    }
  }

  const marcarPagoGastoPagado = async (id) => {
    await supabase
      .from('pagos_gastos')
      .update({ 
        estado: 'pagado', 
        pagado_at: new Date().toISOString(),
        fecha_pago: new Date().toISOString().split('T')[0]
      })
      .eq('id', id)
    
    toast.success('Gasto marcado como pagado')
    loadPagosGastos()
  }

  const resetPagoGastoForm = () => {
    setPagoGastoForm({
      gasto_fijo_id: '', nombre: '', categoria: 'otros', monto: '',
      fecha_vencimiento: '', metodo_pago: 'efectivo', notas: ''
    })
  }

  // Seleccionar gasto fijo para nuevo pago
  const selectGastoFijoParaPago = (gasto) => {
    setPagoGastoForm({
      gasto_fijo_id: gasto.id,
      nombre: gasto.nombre,
      categoria: gasto.categoria,
      monto: gasto.monto.toString(),
      fecha_vencimiento: '',
      metodo_pago: 'efectivo',
      notas: ''
    })
    setPagoGastoDialogOpen(true)
  }

  // Seleccionar empleado para nuevo pago
  const selectEmpleadoParaPago = (emp) => {
    setSelectedEmpleado(emp)
    setPagoEmpleadoForm({
      ...pagoEmpleadoForm,
      empleado_id: emp.id,
      salario_base: emp.salario_base?.toString() || ''
    })
    setPagoEmpleadoDialogOpen(true)
  }

  // Resumen financiero
  const resumenMensual = () => {
    const hoy = new Date()
    const mesActual = hoy.getMonth()
    const anioActual = hoy.getFullYear()
    
    const pagosMesEmpleados = pagosEmpleados.filter(p => {
      const fecha = new Date(p.created_at)
      return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual
    })
    
    const pagosMesGastos = pagosGastos.filter(p => {
      const fecha = new Date(p.created_at)
      return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual
    })
    
    const totalEmpleados = pagosMesEmpleados
      .filter(p => p.estado === 'pagado')
      .reduce((sum, p) => sum + (p.total_pagar || 0), 0)
    
    const totalGastos = pagosMesGastos
      .filter(p => p.estado === 'pagado')
      .reduce((sum, p) => sum + (p.monto || 0), 0)
    
    const pendienteEmpleados = pagosMesEmpleados
      .filter(p => p.estado === 'pendiente')
      .reduce((sum, p) => sum + (p.total_pagar || 0), 0)
    
    const pendienteGastos = pagosMesGastos
      .filter(p => p.estado === 'pendiente')
      .reduce((sum, p) => sum + (p.monto || 0), 0)
    
    return {
      totalEmpleados,
      totalGastos,
      totalPagado: totalEmpleados + totalGastos,
      pendienteEmpleados,
      pendienteGastos,
      totalPendiente: pendienteEmpleados + pendienteGastos
    }
  }

  const resumen = resumenMensual()
  const alertas = alertasProximas()

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                💰 Gestión Financiera
              </h1>
              <p className="text-gray-500 mt-1">
                Control de pagos, empleados y gastos
              </p>
            </div>
          </div>

          {/* Alertas de vencimiento */}
          {alertas.length > 0 && (
            <Card className="mb-6 border-yellow-300 bg-yellow-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-yellow-700">
                  <Bell className="h-5 w-5 mr-2" />
                  Próximos Vencimientos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alertas.slice(0, 5).map((alerta, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div className="flex items-center">
                        <AlertTriangle className={`h-4 w-4 mr-2 ${alerta.diasRestantes <= 2 ? 'text-red-500' : 'text-yellow-500'}`} />
                        <span className="font-medium">{alerta.nombre}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{formatCurrency(alerta.monto)}</span>
                        <p className={`text-xs ${alerta.diasRestantes <= 2 ? 'text-red-500' : 'text-yellow-600'}`}>
                          {alerta.diasRestantes === 0 ? '¡Hoy!' : `En ${alerta.diasRestantes} días`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumen del mes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pagado Este Mes</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(resumen.totalPagado)}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pendiente</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(resumen.totalPendiente)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Empleados</p>
                    <p className="text-2xl font-bold">{empleados.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Gastos Fijos</p>
                    <p className="text-2xl font-bold">{gastosFijos.length}</p>
                  </div>
                  <Building className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs principales */}
          <Tabs defaultValue="empleados" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full lg:w-auto">
              <TabsTrigger value="empleados" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Empleados</span>
              </TabsTrigger>
              <TabsTrigger value="pagos-empleados" className="flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Pagos</span>
              </TabsTrigger>
              <TabsTrigger value="gastos" className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Gastos</span>
              </TabsTrigger>
              <TabsTrigger value="historial" className="flex items-center gap-1">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Historial</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB: Empleados */}
            <TabsContent value="empleados">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Empleados</CardTitle>
                    <CardDescription>Gestiona tu equipo de trabajo</CardDescription>
                  </div>
                  <Button onClick={() => { resetEmpleadoForm(); setEmpleadoDialogOpen(true) }}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nuevo Empleado
                  </Button>
                </CardHeader>
                <CardContent>
                  {empleados.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay empleados registrados</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {empleados.map(emp => (
                        <Card key={emp.id} className="border hover:shadow-md transition-shadow">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-bold">{emp.nombre} {emp.apellido}</h3>
                                <p className="text-sm text-gray-500">{emp.cargo || 'Sin cargo'}</p>
                                {emp.telefono && <p className="text-xs text-gray-400">{emp.telefono}</p>}
                              </div>
                              <Badge variant={emp.tipo_pago === 'mensual' ? 'default' : 'secondary'}>
                                {emp.tipo_pago}
                              </Badge>
                            </div>
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Salario Base:</span>
                                <span className="font-bold">{formatCurrency(emp.salario_base)}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => openEditEmpleado(emp)}
                              >
                                <Edit className="h-3 w-3 mr-1" /> Editar
                              </Button>
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={() => selectEmpleadoParaPago(emp)}
                              >
                                <DollarSign className="h-3 w-3 mr-1" /> Pagar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Pagos a Empleados */}
            <TabsContent value="pagos-empleados">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Pagos a Empleados</CardTitle>
                    <CardDescription>Registra y controla los pagos</CardDescription>
                  </div>
                  <Button onClick={() => { resetPagoEmpleadoForm(); setPagoEmpleadoDialogOpen(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Pago
                  </Button>
                </CardHeader>
                <CardContent>
                  {/* Pendientes */}
                  {pagosPendientesEmpleados.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-orange-600 mb-3 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Pagos Pendientes ({pagosPendientesEmpleados.length})
                      </h3>
                      <div className="space-y-2">
                        {pagosPendientesEmpleados.map(pago => (
                          <div key={pago.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <div>
                              <p className="font-medium">{pago.empleados?.nombre} {pago.empleados?.apellido}</p>
                              <p className="text-sm text-gray-500">{pago.periodo}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-lg">{formatCurrency(pago.total_pagar)}</span>
                              <Button size="sm" onClick={() => marcarPagoEmpleadoPagado(pago.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Pagado
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Historial reciente */}
                  <div>
                    <h3 className="font-bold text-gray-700 mb-3">Historial Reciente</h3>
                    {pagosEmpleados.filter(p => p.estado === 'pagado').length === 0 ? (
                      <p className="text-center py-4 text-gray-500">No hay pagos registrados</p>
                    ) : (
                      <div className="space-y-2">
                        {pagosEmpleados.filter(p => p.estado === 'pagado').slice(0, 10).map(pago => (
                          <div key={pago.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div>
                              <p className="font-medium">{pago.empleados?.nombre} {pago.empleados?.apellido}</p>
                              <p className="text-sm text-gray-500">{pago.periodo}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-green-600">{formatCurrency(pago.total_pagar)}</span>
                              <p className="text-xs text-gray-400">
                                {pago.fecha_pago && new Date(pago.fecha_pago).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Gastos Fijos */}
            <TabsContent value="gastos">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Gastos Fijos</CardTitle>
                    <CardDescription>Alquiler, servicios, seguros y más</CardDescription>
                  </div>
                  <Button onClick={() => { resetGastoFijoForm(); setGastoFijoDialogOpen(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Gasto
                  </Button>
                </CardHeader>
                <CardContent>
                  {gastosFijos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Building className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay gastos fijos registrados</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {gastosFijos.map(gasto => (
                        <Card key={gasto.id} className="border hover:shadow-md transition-shadow">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-bold">{gasto.nombre}</h3>
                                <Badge variant="outline" className="mt-1">
                                  {gasto.categoria}
                                </Badge>
                              </div>
                              <span className="font-bold text-lg">{formatCurrency(gasto.monto)}</span>
                            </div>
                            {gasto.proveedor && (
                              <p className="text-sm text-gray-500 mt-2">{gasto.proveedor}</p>
                            )}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm">
                              <span className="text-gray-500">
                                {gasto.frecuencia}
                                {gasto.dia_vencimiento && ` - Día ${gasto.dia_vencimiento}`}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => openEditGasto(gasto)}
                              >
                                <Edit className="h-3 w-3 mr-1" /> Editar
                              </Button>
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={() => selectGastoFijoParaPago(gasto)}
                              >
                                <DollarSign className="h-3 w-3 mr-1" /> Pagar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Historial de Gastos */}
            <TabsContent value="historial">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Historial de Pagos de Gastos</CardTitle>
                    <CardDescription>Todos los pagos realizados</CardDescription>
                  </div>
                  <Button onClick={() => { resetPagoGastoForm(); setPagoGastoDialogOpen(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </Button>
                </CardHeader>
                <CardContent>
                  {/* Pendientes */}
                  {pagosPendientesGastos.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-orange-600 mb-3 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Gastos Pendientes ({pagosPendientesGastos.length})
                      </h3>
                      <div className="space-y-2">
                        {pagosPendientesGastos.map(pago => (
                          <div key={pago.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <div>
                              <p className="font-medium">{pago.nombre}</p>
                              <Badge variant="outline" className="text-xs">{pago.categoria}</Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-lg">{formatCurrency(pago.monto)}</span>
                              <Button size="sm" onClick={() => marcarPagoGastoPagado(pago.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Pagado
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Historial */}
                  <div>
                    <h3 className="font-bold text-gray-700 mb-3">Historial</h3>
                    {pagosGastos.filter(p => p.estado === 'pagado').length === 0 ? (
                      <p className="text-center py-4 text-gray-500">No hay pagos registrados</p>
                    ) : (
                      <div className="space-y-2">
                        {pagosGastos.filter(p => p.estado === 'pagado').slice(0, 15).map(pago => (
                          <div key={pago.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div>
                              <p className="font-medium">{pago.nombre}</p>
                              <Badge variant="outline" className="text-xs">{pago.categoria}</Badge>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-green-600">{formatCurrency(pago.monto)}</span>
                              <p className="text-xs text-gray-400">
                                {pago.fecha_pago && new Date(pago.fecha_pago).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Dialog: Nuevo/Editar Empleado */}
      <Dialog open={empleadoDialogOpen} onOpenChange={setEmpleadoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={empleadoForm.nombre}
                onChange={e => setEmpleadoForm({...empleadoForm, nombre: e.target.value})}
                placeholder="Nombre"
              />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input
                value={empleadoForm.apellido}
                onChange={e => setEmpleadoForm({...empleadoForm, apellido: e.target.value})}
                placeholder="Apellido"
              />
            </div>
            <div>
              <Label>Documento</Label>
              <Input
                value={empleadoForm.documento}
                onChange={e => setEmpleadoForm({...empleadoForm, documento: e.target.value})}
                placeholder="CI o documento"
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={empleadoForm.telefono}
                onChange={e => setEmpleadoForm({...empleadoForm, telefono: e.target.value})}
                placeholder="Teléfono"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={empleadoForm.email}
                onChange={e => setEmpleadoForm({...empleadoForm, email: e.target.value})}
                placeholder="Email"
              />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input
                value={empleadoForm.cargo}
                onChange={e => setEmpleadoForm({...empleadoForm, cargo: e.target.value})}
                placeholder="Ej: Cocinero, Mozo"
              />
            </div>
            <div>
              <Label>Fecha de Ingreso</Label>
              <Input
                type="date"
                value={empleadoForm.fecha_ingreso}
                onChange={e => setEmpleadoForm({...empleadoForm, fecha_ingreso: e.target.value})}
              />
            </div>
            <div>
              <Label>Salario Base (Gs.)</Label>
              <Input
                type="number"
                value={empleadoForm.salario_base}
                onChange={e => setEmpleadoForm({...empleadoForm, salario_base: e.target.value})}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Tipo de Pago</Label>
              <Select 
                value={empleadoForm.tipo_pago} 
                onValueChange={v => setEmpleadoForm({...empleadoForm, tipo_pago: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="diario">Diario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Banco</Label>
              <Input
                value={empleadoForm.banco}
                onChange={e => setEmpleadoForm({...empleadoForm, banco: e.target.value})}
                placeholder="Nombre del banco"
              />
            </div>
            <div className="col-span-2">
              <Label>Cuenta Bancaria</Label>
              <Input
                value={empleadoForm.cuenta_bancaria}
                onChange={e => setEmpleadoForm({...empleadoForm, cuenta_bancaria: e.target.value})}
                placeholder="Número de cuenta"
              />
            </div>
            <div className="col-span-2">
              <Label>Notas</Label>
              <Textarea
                value={empleadoForm.notas}
                onChange={e => setEmpleadoForm({...empleadoForm, notas: e.target.value})}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEmpleadoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEmpleado}>
              {editingEmpleado ? 'Actualizar' : 'Crear'} Empleado
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nuevo Pago a Empleado */}
      <Dialog open={pagoEmpleadoDialogOpen} onOpenChange={setPagoEmpleadoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Pago a Empleado</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Empleado *</Label>
              <Select 
                value={pagoEmpleadoForm.empleado_id} 
                onValueChange={v => {
                  const emp = empleados.find(e => e.id === v)
                  setPagoEmpleadoForm({
                    ...pagoEmpleadoForm, 
                    empleado_id: v,
                    salario_base: emp?.salario_base?.toString() || ''
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre} {emp.apellido} - {formatCurrency(emp.salario_base)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Periodo *</Label>
              <Input
                value={pagoEmpleadoForm.periodo}
                onChange={e => setPagoEmpleadoForm({...pagoEmpleadoForm, periodo: e.target.value})}
                placeholder="Ej: Enero 2025"
              />
            </div>
            <div>
              <Label>Fecha Vencimiento</Label>
              <Input
                type="date"
                value={pagoEmpleadoForm.fecha_vencimiento}
                onChange={e => setPagoEmpleadoForm({...pagoEmpleadoForm, fecha_vencimiento: e.target.value})}
              />
            </div>
            
            <div className="col-span-2 border-t pt-4 mt-2">
              <h4 className="font-medium mb-3">Desglose del Pago</h4>
            </div>
            
            <div>
              <Label>Salario Base</Label>
              <Input
                type="number"
                value={pagoEmpleadoForm.salario_base}
                onChange={e => setPagoEmpleadoForm({...pagoEmpleadoForm, salario_base: e.target.value})}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Bonificaciones</Label>
              <Input
                type="number"
                value={pagoEmpleadoForm.bonificaciones}
                onChange={e => setPagoEmpleadoForm({...pagoEmpleadoForm, bonificaciones: e.target.value})}
                placeholder="0"
              />
            </div>
            
            <div>
              <Label>Horas Extras (cantidad)</Label>
              <Input
                type="number"
                value={pagoEmpleadoForm.horas_extras}
                onChange={e => setPagoEmpleadoForm({...pagoEmpleadoForm, horas_extras: e.target.value})}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Monto Horas Extras</Label>
              <Input
                type="number"
                value={pagoEmpleadoForm.monto_horas_extras}
                onChange={e => setPagoEmpleadoForm({...pagoEmpleadoForm, monto_horas_extras: e.target.value})}
                placeholder="0"
              />
            </div>
            
            <div>
              <Label>Turnos Dobles (cantidad)</Label>
              <Input
                type="number"
                value={pagoEmpleadoForm.turnos_dobles}
                onChange={e => setPagoEmpleadoForm({...pagoEmpleadoForm, turnos_dobles: e.target.value})}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Monto Turnos Dobles</Label>
              <Input
                type="number"
                value={pagoEmpleadoForm.monto_turnos_dobles}
                onChange={e => setPagoEmpleadoForm({...pagoEmpleadoForm, monto_turnos_dobles: e.target.value})}
                placeholder="0"
              />
            </div>
            
            <div>
              <Label>Descuentos</Label>
              <Input
                type="number"
                value={pagoEmpleadoForm.descuentos}
                onChange={e => setPagoEmpleadoForm({...pagoEmpleadoForm, descuentos: e.target.value})}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Adelantos</Label>
              <Input
                type="number"
                value={pagoEmpleadoForm.adelantos}
                onChange={e => setPagoEmpleadoForm({...pagoEmpleadoForm, adelantos: e.target.value})}
                placeholder="0"
              />
            </div>
            
            <div>
              <Label>Método de Pago</Label>
              <Select 
                value={pagoEmpleadoForm.metodo_pago} 
                onValueChange={v => setPagoEmpleadoForm({...pagoEmpleadoForm, metodo_pago: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-center p-4 bg-green-50 rounded-lg w-full">
                <p className="text-sm text-gray-500">Total a Pagar</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(calcularTotalPagoEmpleado())}</p>
              </div>
            </div>
            
            <div className="col-span-2">
              <Label>Notas</Label>
              <Textarea
                value={pagoEmpleadoForm.notas}
                onChange={e => setPagoEmpleadoForm({...pagoEmpleadoForm, notas: e.target.value})}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPagoEmpleadoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePagoEmpleado}>
              Registrar Pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nuevo/Editar Gasto Fijo */}
      <Dialog open={gastoFijoDialogOpen} onOpenChange={setGastoFijoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGasto ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nombre *</Label>
              <Input
                value={gastoFijoForm.nombre}
                onChange={e => setGastoFijoForm({...gastoFijoForm, nombre: e.target.value})}
                placeholder="Ej: Alquiler Local"
              />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select 
                value={gastoFijoForm.categoria} 
                onValueChange={v => setGastoFijoForm({...gastoFijoForm, categoria: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="servicios">Servicios (Luz, Agua, etc)</SelectItem>
                  <SelectItem value="internet">Internet/Teléfono</SelectItem>
                  <SelectItem value="seguros">Seguros</SelectItem>
                  <SelectItem value="impuestos">Impuestos</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto (Gs.) *</Label>
              <Input
                type="number"
                value={gastoFijoForm.monto}
                onChange={e => setGastoFijoForm({...gastoFijoForm, monto: e.target.value})}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Frecuencia</Label>
              <Select 
                value={gastoFijoForm.frecuencia} 
                onValueChange={v => setGastoFijoForm({...gastoFijoForm, frecuencia: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Día de Vencimiento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={gastoFijoForm.dia_vencimiento}
                onChange={e => setGastoFijoForm({...gastoFijoForm, dia_vencimiento: e.target.value})}
                placeholder="1-31"
              />
            </div>
            <div>
              <Label>Proveedor</Label>
              <Input
                value={gastoFijoForm.proveedor}
                onChange={e => setGastoFijoForm({...gastoFijoForm, proveedor: e.target.value})}
                placeholder="Nombre del proveedor"
              />
            </div>
            <div>
              <Label>Recordar (días antes)</Label>
              <Input
                type="number"
                value={gastoFijoForm.recordatorio_dias}
                onChange={e => setGastoFijoForm({...gastoFijoForm, recordatorio_dias: e.target.value})}
                placeholder="5"
              />
            </div>
            <div className="col-span-2">
              <Label>Cuenta/Referencia de Pago</Label>
              <Input
                value={gastoFijoForm.cuenta_pago}
                onChange={e => setGastoFijoForm({...gastoFijoForm, cuenta_pago: e.target.value})}
                placeholder="Número de cuenta o referencia"
              />
            </div>
            <div className="col-span-2">
              <Label>Notas</Label>
              <Textarea
                value={gastoFijoForm.notas}
                onChange={e => setGastoFijoForm({...gastoFijoForm, notas: e.target.value})}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setGastoFijoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveGastoFijo}>
              {editingGasto ? 'Actualizar' : 'Crear'} Gasto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar Pago de Gasto */}
      <Dialog open={pagoGastoDialogOpen} onOpenChange={setPagoGastoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Pago de Gasto</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Gasto Fijo (opcional)</Label>
              <Select 
                value={pagoGastoForm.gasto_fijo_id} 
                onValueChange={v => {
                  const gasto = gastosFijos.find(g => g.id === v)
                  if (gasto) {
                    setPagoGastoForm({
                      ...pagoGastoForm,
                      gasto_fijo_id: v,
                      nombre: gasto.nombre,
                      categoria: gasto.categoria,
                      monto: gasto.monto.toString()
                    })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar gasto fijo o dejar vacío" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">-- Gasto manual --</SelectItem>
                  {gastosFijos.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre} - {formatCurrency(g.monto)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Nombre *</Label>
              <Input
                value={pagoGastoForm.nombre}
                onChange={e => setPagoGastoForm({...pagoGastoForm, nombre: e.target.value})}
                placeholder="Nombre del gasto"
              />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select 
                value={pagoGastoForm.categoria} 
                onValueChange={v => setPagoGastoForm({...pagoGastoForm, categoria: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="internet">Internet/Teléfono</SelectItem>
                  <SelectItem value="seguros">Seguros</SelectItem>
                  <SelectItem value="impuestos">Impuestos</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto (Gs.) *</Label>
              <Input
                type="number"
                value={pagoGastoForm.monto}
                onChange={e => setPagoGastoForm({...pagoGastoForm, monto: e.target.value})}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Fecha Vencimiento</Label>
              <Input
                type="date"
                value={pagoGastoForm.fecha_vencimiento}
                onChange={e => setPagoGastoForm({...pagoGastoForm, fecha_vencimiento: e.target.value})}
              />
            </div>
            <div>
              <Label>Método de Pago</Label>
              <Select 
                value={pagoGastoForm.metodo_pago} 
                onValueChange={v => setPagoGastoForm({...pagoGastoForm, metodo_pago: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notas</Label>
              <Textarea
                value={pagoGastoForm.notas}
                onChange={e => setPagoGastoForm({...pagoGastoForm, notas: e.target.value})}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPagoGastoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePagoGasto}>
              Registrar Pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
