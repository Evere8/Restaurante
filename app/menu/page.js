'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Edit, Trash2, Package, AlertTriangle, X, ChevronRight, FolderTree, Layers, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { compressAndUploadImage } from '@/lib/imageUpload'

export default function MenuPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const { formatCurrency } = useCurrency()
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [stockItems, setStockItems] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingCategory, setEditingCategory] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)

  const [productForm, setProductForm] = useState({
    nombre: '',
    descripcion: '',
    precio_base: '',
    coste: '',
    category_id: '',
    subcategory_id: '', // Nueva subcategoría
    img_url: '',
    tiempo_preparacion_min: 15,
    disponible: true,
    dias_para_vencer: '',
    dias_alerta_vencimiento: 2,
    fecha_compra: '',
    usar_stock_avanzado: false,
    crear_en_stock: false,
    stock_minimo_alerta: 1,
    dias_alerta_vencimiento_stock: 7,
    cantidad_inicial: '',
    unidad_medida: 'unidad',
    orden_display: 0,
    destacado: false
  })

  const [recetaItems, setRecetaItems] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)

  const handleProductImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen es muy grande. Máximo 10MB')
      e.target.value = ''
      return
    }
    setUploadingImage(true)
    try {
      const { url, error } = await compressAndUploadImage(file, 'productos', restaurant?.id || 'r')
      if (error || !url) {
        toast.error(error || 'Error al subir imagen')
      } else {
        setProductForm((prev) => ({ ...prev, img_url: url }))
        toast.success('Imagen comprimida y subida correctamente')
      }
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const [categoryForm, setCategoryForm] = useState({
    nombre: '',
    orden: 0,
    parent_id: null, // Para subcategorías
    descripcion: '',
    icono: ''
  })

  // Estado para filtrar vista de categorías
  const [showSubcategories, setShowSubcategories] = useState(true)

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
    // Cargar categorías primero
    const { data: catsData } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('orden', { ascending: true })

    setCategories(catsData || [])

    // Cargar productos
    const { data: prodsData, error: prodsError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('nombre', { ascending: true })

    if (prodsError) {
      toast.error('Error cargando productos')
      console.error('Error:', prodsError)
    } else {
      // Agregar nombre de categoría manualmente
      const productsWithCategory = (prodsData || []).map(p => {
        const cat = (catsData || []).find(c => c.id === p.category_id)
        return {
          ...p,
          menu_categories: cat ? { nombre: cat.nombre } : null
        }
      })
      setProducts(productsWithCategory)
    }

    // Cargar stock items
    loadStockItems()
  }

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('orden', { ascending: true })

    if (error) {
      toast.error('Error cargando categorías')
    } else {
      setCategories(data || [])
    }
  }

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('nombre', { ascending: true })

    if (error) {
      toast.error('Error cargando productos')
      console.error('Error:', error)
    } else {
      // Agregar nombre de categoría manualmente
      const productsWithCategory = (data || []).map(p => {
        const cat = categories.find(c => c.id === p.category_id)
        return {
          ...p,
          menu_categories: cat ? { nombre: cat.nombre } : null
        }
      })
      setProducts(productsWithCategory)
    }
  }

  const loadStockItems = async () => {
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('utilizable_en_receta', true)
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error cargando stock:', error)
    } else {
      setStockItems(data || [])
    }
  }

  const handleSaveProduct = async () => {
    try {
      const dataToSave = {
        nombre: productForm.nombre,
        descripcion: productForm.descripcion,
        restaurant_id: restaurant.id,
        precio_base: parseFloat(productForm.precio_base),
        coste: productForm.coste ? parseFloat(productForm.coste) : null,
        category_id: productForm.category_id || null,
        subcategory_id: productForm.subcategory_id || null,
        img_url: productForm.img_url,
        tiempo_preparacion_min: parseInt(productForm.tiempo_preparacion_min),
        disponible: productForm.disponible,
        dias_para_vencer: productForm.dias_para_vencer ? parseInt(productForm.dias_para_vencer) : null,
        dias_alerta_vencimiento: parseInt(productForm.dias_alerta_vencimiento),
        fecha_compra: productForm.fecha_compra || null,
        usar_stock_avanzado: productForm.usar_stock_avanzado,
        crear_en_stock: productForm.crear_en_stock,
        orden_display: parseInt(productForm.orden_display) || 0,
        destacado: productForm.destacado || false
      }

      let savedProductId

      if (editingProduct) {
        const { error } = await supabase
          .from('menu_items')
          .update(dataToSave)
          .eq('id', editingProduct.id)

        if (error) throw error
        savedProductId = editingProduct.id
        toast.success('Producto actualizado')
      } else {
        const { data: newProduct, error } = await supabase
          .from('menu_items')
          .insert([dataToSave])
          .select()
          .single()

        if (error) throw error
        savedProductId = newProduct.id
        toast.success('Producto creado')
      }

      // Si crear_en_stock está activado, crear producto en stock_items MANUALMENTE
      if (productForm.crear_en_stock && !editingProduct) {
        try {
          const stockData = {
            restaurant_id: restaurant.id,
            nombre: productForm.nombre,
            tipo: 'vendible',
            cantidad: productForm.cantidad_inicial ? parseFloat(productForm.cantidad_inicial) : 0,
            unidad_medida: productForm.unidad_medida || 'unidad',
            costo: productForm.coste ? parseFloat(productForm.coste) : null,
            vencimiento: productForm.fecha_compra && productForm.dias_para_vencer
              ? new Date(new Date(productForm.fecha_compra).getTime() + productForm.dias_para_vencer * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              : null,
            stock_minimo_alerta: parseFloat(productForm.stock_minimo_alerta) || 1,
            dias_alerta_vencimiento: parseInt(productForm.dias_alerta_vencimiento_stock) || 7,
            utilizable_en_receta: false,
            activo: true
          }

          const { error: stockError } = await supabase
            .from('stock_items')
            .insert([stockData])

          if (stockError) {
            console.error('Error creando en stock:', stockError)
            toast.warning('Producto creado en menú pero no en stock: ' + stockError.message)
          } else {
            toast.success('✅ Producto creado en Menú y Stock automáticamente')
          }
        } catch (stockErr) {
          console.error('Error en crear_en_stock:', stockErr)
        }
      }

      // Si usa stock avanzado, guardar receta
      if (productForm.usar_stock_avanzado && recetaItems.length > 0) {
        // Eliminar recetas anteriores si está editando
        if (editingProduct) {
          await supabase
            .from('menu_receta')
            .delete()
            .eq('menu_item_id', savedProductId)
        }

        // Insertar nuevas recetas con unidad de medida
        const recetasToInsert = recetaItems.map(item => ({
          menu_item_id: savedProductId,
          stock_item_id: item.stock_item_id,
          cantidad_usada: parseFloat(item.cantidad),
          unidad_medida: item.unidad_receta || 'unidad'
        }))

        const { error: recetaError } = await supabase
          .from('menu_receta')
          .insert(recetasToInsert)

        if (recetaError) {
          console.error('Error guardando receta:', recetaError)
          toast.error('Producto guardado pero error en receta')
        } else {
          toast.success('Receta guardada')
        }
      }

      setDialogOpen(false)
      resetProductForm()
      loadProducts()
    } catch (error) {
      console.error('Error guardando producto:', error)
      toast.error('Error al guardar producto')
    }
  }

  const handleDeleteProduct = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error eliminando producto')
    } else {
      toast.success('Producto eliminado')
      loadProducts()
    }
  }

  const handleSaveCategory = async () => {
    try {
      const dataToSave = {
        ...categoryForm,
        restaurant_id: restaurant.id
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('menu_categories')
          .update(dataToSave)
          .eq('id', editingCategory.id)

        if (error) throw error
        toast.success('Categoría actualizada')
      } else {
        const { error } = await supabase
          .from('menu_categories')
          .insert([dataToSave])

        if (error) throw error
        toast.success('Categoría creada')
      }

      setCategoryDialogOpen(false)
      resetCategoryForm()
      loadCategories()
    } catch (error) {
      console.error('Error guardando categoría:', error)
      toast.error('Error al guardar categoría')
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return

    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error eliminando categoría')
    } else {
      toast.success('Categoría eliminada')
      loadCategories()
    }
  }

  const extractImageUrl = (url) => {
    if (url.includes('google.com/imgres')) {
      try {
        const urlObj = new URL(url)
        const imgurl = urlObj.searchParams.get('imgurl')
        if (imgurl) {
          return decodeURIComponent(imgurl)
        }
      } catch (e) {
        console.error('Error extrayendo URL:', e)
      }
    }
    return url
  }

  const resetProductForm = () => {
    setProductForm({
      nombre: '',
      descripcion: '',
      precio_base: '',
      coste: '',
      category_id: '',
      img_url: '',
      tiempo_preparacion_min: 15,
      disponible: true,
      dias_para_vencer: '',
      dias_alerta_vencimiento: 2,
      fecha_compra: '',
      usar_stock_avanzado: false,
      crear_en_stock: false,
      stock_minimo_alerta: 1,
      dias_alerta_vencimiento_stock: 7,
      cantidad_inicial: '',
      unidad_medida: 'unidad'
    })
    setRecetaItems([])
    setEditingProduct(null)
  }

  const resetCategoryForm = () => {
    setCategoryForm({ nombre: '', orden: 0, parent_id: null, descripcion: '', icono: '' })
    setEditingCategory(null)
  }

  const openEditProduct = async (product) => {
    setEditingProduct(product)
    const cleanImgUrl = product.img_url ? extractImageUrl(product.img_url) : ''
    setProductForm({
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio_base: product.precio_base,
      coste: product.coste || '',
      category_id: product.category_id || '',
      subcategory_id: product.subcategory_id || '',
      img_url: cleanImgUrl,
      tiempo_preparacion_min: product.tiempo_preparacion_min,
      disponible: product.disponible,
      dias_para_vencer: product.dias_para_vencer || '',
      dias_alerta_vencimiento: product.dias_alerta_vencimiento,
      fecha_compra: product.fecha_compra || '',
      usar_stock_avanzado: product.usar_stock_avanzado || false,
      crear_en_stock: product.crear_en_stock || false,
      stock_minimo_alerta: 1,
      dias_alerta_vencimiento_stock: 7,
      orden_display: product.orden_display || 0,
      destacado: product.destacado || false
    })

    // Cargar receta si existe
    if (product.usar_stock_avanzado) {
      const { data: receta, error } = await supabase
        .from('menu_receta')
        .select('*, stock_items(nombre, unidad_medida)')
        .eq('menu_item_id', product.id)

      if (!error && receta) {
        setRecetaItems(receta.map(r => ({
          stock_item_id: r.stock_item_id,
          nombre: r.stock_items.nombre,
          cantidad: r.cantidad_usada,
          unidad_receta: r.unidad_medida || r.stock_items.unidad_medida || 'unidad',
          unidad_stock: r.stock_items.unidad_medida || 'unidad'
        })))
      }
    }

    setDialogOpen(true)
  }

  const openEditCategory = (category) => {
    setEditingCategory(category)
    setCategoryForm({
      nombre: category.nombre,
      orden: category.orden || 0,
      parent_id: category.parent_id || null,
      descripcion: category.descripcion || '',
      icono: category.icono || ''
    })
    setCategoryDialogOpen(true)
  }

  // Obtener solo categorías principales (sin parent_id)
  const mainCategories = categories.filter(c => !c.parent_id)

  // Obtener subcategorías de una categoría principal
  const getSubcategories = (parentId) => {
    return categories.filter(c => c.parent_id === parentId)
  }

  const addRecetaItem = () => {
    if (stockItems.length === 0) {
      toast.error('No hay insumos disponibles')
      return
    }
    setRecetaItems([...recetaItems, { stock_item_id: '', nombre: '', cantidad: '', unidad_receta: 'unidad', unidad_stock: 'unidad' }])
  }

  const removeRecetaItem = (index) => {
    setRecetaItems(recetaItems.filter((_, i) => i !== index))
  }

  const updateRecetaItem = (index, field, value) => {
    const updated = [...recetaItems]
    updated[index][field] = value

    if (field === 'stock_item_id') {
      const item = stockItems.find(s => s.id === value)
      if (item) {
        updated[index].nombre = item.nombre
        updated[index].unidad_stock = item.unidad_medida || 'unidad'
        // Auto-seleccionar la misma unidad por defecto
        updated[index].unidad_receta = item.unidad_medida || 'unidad'
      }
    }

    setRecetaItems(updated)
  }

  // Obtener unidades compatibles según el tipo de stock
  const getUnidadesCompatibles = (unidadStock) => {
    if (unidadStock === 'kg' || unidadStock === 'gramo') {
      return [
        { value: 'kg', label: 'Kilogramo (kg)' },
        { value: 'gramo', label: 'Gramo (g)' }
      ]
    }
    if (unidadStock === 'litro' || unidadStock === 'ml') {
      return [
        { value: 'litro', label: 'Litro (L)' },
        { value: 'ml', label: 'Mililitro (ml)' }
      ]
    }
    return [
      { value: 'unidad', label: 'Unidad/Entero' }
    ]
  }

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products

  const showManualWarning = !productForm.usar_stock_avanzado && (productForm.coste || productForm.dias_para_vencer)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gestión de Menú</h1>
            <p className="text-gray-600">Administra productos y categorías</p>
          </div>
        </div>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Select value={selectedCategory || 'all'} onValueChange={(val) => setSelectedCategory(val === 'all' ? null : val)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open)
                if (!open) resetProductForm()
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Editar' : 'Nuevo'} Producto</DialogTitle>
                  </DialogHeader>

                  {showManualWarning && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        ⚠️ Algunos productos que usan receta no se podrán analizar los costos correctamente.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre *</Label>
                      <Input value={productForm.nombre} onChange={(e) => setProductForm({...productForm, nombre: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoría Principal</Label>
                      <Select value={productForm.category_id} onValueChange={(val) => setProductForm({...productForm, category_id: val, subcategory_id: ''})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {mainCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subcategoría - solo si hay subcategorías para la categoría seleccionada */}
                    {productForm.category_id && getSubcategories(productForm.category_id).length > 0 && (
                      <div className="space-y-2">
                        <Label>Subcategoría <span className="text-gray-400 text-xs">(opcional)</span></Label>
                        <Select
                          value={productForm.subcategory_id || 'none'}
                          onValueChange={(val) => setProductForm({...productForm, subcategory_id: val === 'none' ? '' : val})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar subcategoría" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin subcategoría</SelectItem>
                            {getSubcategories(productForm.category_id).map(sub => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.icono ? `${sub.icono} ` : ''}{sub.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="col-span-2 space-y-2">
                      <Label>Descripción</Label>
                      <Textarea value={productForm.descripcion} onChange={(e) => setProductForm({...productForm, descripcion: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio *</Label>
                      <Input type="number" step="0.01" value={productForm.precio_base} onChange={(e) => setProductForm({...productForm, precio_base: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tiempo Preparación (min)</Label>
                      <Input type="number" value={productForm.tiempo_preparacion_min} onChange={(e) => setProductForm({...productForm, tiempo_preparacion_min: e.target.value})} />
                    </div>

                    {/* Checkboxes de Stock */}
                    <div className="col-span-2 space-y-3 border-t pt-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={productForm.usar_stock_avanzado}
                          onCheckedChange={(checked) => setProductForm({...productForm, usar_stock_avanzado: checked, crear_en_stock: false})}
                        />
                        <Label>✨ Usar Stock Avanzado (con Receta)</Label>
                      </div>

                      {!productForm.usar_stock_avanzado && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={productForm.crear_en_stock}
                            onCheckedChange={(checked) => setProductForm({...productForm, crear_en_stock: checked})}
                          />
                          <Label>📦 Crear automáticamente en STOCK</Label>
                        </div>
                      )}
                    </div>

                    {/* Campos adicionales si NO usa stock avanzado */}
                    {!productForm.usar_stock_avanzado && (
                      <>
                        <div className="space-y-2">
                          <Label>Coste</Label>
                          <Input type="number" step="0.01" value={productForm.coste} onChange={(e) => setProductForm({...productForm, coste: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Días para vencer</Label>
                          <Input type="number" value={productForm.dias_para_vencer} onChange={(e) => setProductForm({...productForm, dias_para_vencer: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Fecha compra</Label>
                          <Input type="date" value={productForm.fecha_compra} onChange={(e) => setProductForm({...productForm, fecha_compra: e.target.value})} />
                        </div>
                      </>
                    )}

                    {/* Campos adicionales si crea en stock */}
                    {productForm.crear_en_stock && (
                      <>
                        <div className="space-y-2">
                          <Label>Cantidad Inicial *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={productForm.cantidad_inicial}
                            onChange={(e) => setProductForm({...productForm, cantidad_inicial: e.target.value})}
                            placeholder="Ej: 100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unidad de Medida</Label>
                          <Select value={productForm.unidad_medida} onValueChange={(val) => setProductForm({...productForm, unidad_medida: val})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unidad">Unidad</SelectItem>
                              <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                              <SelectItem value="litro">Litro (L)</SelectItem>
                              <SelectItem value="gramo">Gramo (g)</SelectItem>
                              <SelectItem value="ml">Mililitro (ml)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Stock Mínimo (alerta)</Label>
                          <Input type="number" value={productForm.stock_minimo_alerta} onChange={(e) => setProductForm({...productForm, stock_minimo_alerta: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Días Alerta Vencimiento</Label>
                          <Input type="number" value={productForm.dias_alerta_vencimiento_stock} onChange={(e) => setProductForm({...productForm, dias_alerta_vencimiento_stock: e.target.value})} />
                        </div>
                      </>
                    )}

                    <div className="col-span-2 space-y-2">
                      <Label>Imagen del Producto</Label>
                      <div className="flex flex-col gap-2">
                        {/* Botón de subir desde PC/galería */}
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id="product-image-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={handleProductImageUpload}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploadingImage}
                            onClick={() => document.getElementById('product-image-upload')?.click()}
                            className="flex items-center"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingImage ? 'Subiendo...' : 'Subir desde PC/Galería'}
                          </Button>
                          {productForm.img_url && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setProductForm({ ...productForm, img_url: '' })}
                              className="text-red-600"
                            >
                              <X className="h-4 w-4 mr-1" /> Quitar
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          La imagen se comprimirá automáticamente (~400KB máx, 1200px) para optimizar tu hosting sin perder calidad notable.
                        </p>

                        {/* Campo URL opcional */}
                        <div>
                          <Label className="text-xs text-gray-600">O pega una URL de imagen:</Label>
                          <Input
                            value={productForm.img_url}
                            onChange={(e) => setProductForm({...productForm, img_url: e.target.value})}
                            onBlur={(e) => {
                              const cleanUrl = extractImageUrl(e.target.value)
                              if (cleanUrl !== e.target.value) {
                                setProductForm({...productForm, img_url: cleanUrl})
                                toast.success('URL de imagen extraída correctamente')
                              }
                            }}
                            placeholder="https://... o URL de Google Imágenes"
                          />
                        </div>
                      </div>
                      {productForm.img_url && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Vista previa:</p>
                          <div className="w-32 h-32 bg-gray-50 rounded border flex items-center justify-center overflow-hidden">
                            <img
                              src={productForm.img_url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onLoad={(e) => {
                                e.target.style.display = 'block'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECCIÓN DE RECETA */}
                    {productForm.usar_stock_avanzado && (
                      <div className="col-span-2 space-y-3 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold">🍳 Receta del Producto</Label>
                          <Button type="button" size="sm" variant="outline" onClick={addRecetaItem}>
                            <Plus className="h-4 w-4 mr-1" /> Agregar Insumo
                          </Button>
                        </div>

                        {recetaItems.length === 0 ? (
                          <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed">
                            <p className="text-gray-500">No hay insumos en la receta. Agrega al menos uno.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {recetaItems.map((item, index) => {
                              const stockItem = stockItems.find(s => s.id === item.stock_item_id)
                              const unidadStock = stockItem?.unidad_medida || 'unidad'
                              const unidadIngreso = unidadStock === 'kg' ? 'gramos' : unidadStock === 'litro' ? 'ml' : unidadStock

                              return (
                                <div key={index} className="p-3 bg-orange-50 rounded-lg border space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Select
                                      value={item.stock_item_id}
                                      onValueChange={(val) => updateRecetaItem(index, 'stock_item_id', val)}
                                    >
                                      <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Seleccionar insumo" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {stockItems.map(stock => (
                                          <SelectItem key={stock.id} value={stock.id}>
                                            {stock.nombre} (stock en {stock.unidad_medida || 'unidad'})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => removeRecetaItem(index)}>
                                      <X className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder={`Cantidad en ${unidadIngreso}`}
                                      value={item.cantidad}
                                      onChange={(e) => updateRecetaItem(index, 'cantidad', e.target.value)}
                                      className="w-40"
                                    />
                                    <span className="text-sm font-medium text-gray-600">{unidadIngreso}</span>
                                    {stockItem && (unidadStock === 'kg' || unidadStock === 'litro') && item.cantidad && (
                                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                        = {(parseFloat(item.cantidad) / 1000).toFixed(3)} {unidadStock} del stock
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                          <p className="font-semibold text-blue-800 mb-1">💡 Unidades de medida:</p>
                          <ul className="text-blue-700 list-disc list-inside space-y-1">
                            <li><strong>Si el stock está en kg:</strong> ingresa la cantidad en <strong>gramos</strong> (ej: 200g de café)</li>
                            <li><strong>Si el stock está en litros:</strong> ingresa la cantidad en <strong>ml</strong> (ej: 250ml de leche)</li>
                            <li><strong>Si el stock está en unidades:</strong> ingresa unidades enteras</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="col-span-2 flex items-center space-x-2 border-t pt-3">
                      <Switch checked={productForm.disponible} onCheckedChange={(checked) => setProductForm({...productForm, disponible: checked})} />
                      <Label>Disponible</Label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSaveProduct}>Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <Card key={product.id} className="overflow-hidden">
                  {product.img_url && (
                    <div className="w-full h-40 bg-gray-100 rounded-t-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={product.img_url}
                        alt={product.nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.nombre}</CardTitle>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.menu_categories && (
                            <Badge variant="outline">{product.menu_categories.nombre}</Badge>
                          )}
                          {product.subcategory_id && categories.find(c => c.id === product.subcategory_id) && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <FolderTree className="h-3 w-3 mr-1" />
                              {categories.find(c => c.id === product.subcategory_id)?.nombre}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.usar_stock_avanzado && (
                            <Badge className="bg-green-500 text-xs">✨ Stock Avanzado</Badge>
                          )}
                          {product.crear_en_stock && (
                            <Badge className="bg-blue-500 text-xs">📦 En Stock</Badge>
                          )}
                          {product.destacado && (
                            <Badge className="bg-yellow-500 text-xs">⭐ Destacado</Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant={product.disponible ? 'default' : 'destructive'}>
                        {product.disponible ? 'Disponible' : 'No disponible'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.descripcion}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-orange-600">{formatCurrency(product.precio_base)}</span>
                      <span className="text-sm text-gray-500">{product.tiempo_preparacion_min} min</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditProduct(product)}>
                        <Edit className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay productos. Crea tu primer producto.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="categories">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-sm">
                  <Layers className="h-3 w-3 mr-1" />
                  {mainCategories.length} categorías
                </Badge>
                <Badge variant="outline" className="text-sm">
                  <FolderTree className="h-3 w-3 mr-1" />
                  {categories.filter(c => c.parent_id).length} subcategorías
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
                  setCategoryDialogOpen(open)
                  if (!open) resetCategoryForm()
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600">
                      <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingCategory ? 'Editar' : 'Nueva'} Categoría</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Tipo de categoría */}
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={categoryForm.parent_id || 'principal'}
                          onValueChange={(val) => setCategoryForm({...categoryForm, parent_id: val === 'principal' ? null : val})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="principal">
                              <span className="flex items-center">
                                <Layers className="h-4 w-4 mr-2 text-orange-500" />
                                Categoría Principal
                              </span>
                            </SelectItem>
                            {mainCategories.filter(c => c.id !== editingCategory?.id).map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <span className="flex items-center">
                                  <FolderTree className="h-4 w-4 mr-2 text-blue-500" />
                                  Subcategoría de: {cat.nombre}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          Las subcategorías aparecerán como títulos de sección en el menú del cliente
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Nombre *</Label>
                        <Input value={categoryForm.nombre} onChange={(e) => setCategoryForm({...categoryForm, nombre: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Orden</Label>
                          <Input type="number" value={categoryForm.orden} onChange={(e) => setCategoryForm({...categoryForm, orden: parseInt(e.target.value) || 0})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Icono <span className="text-gray-400 text-xs">(emoji)</span></Label>
                          <Input
                            value={categoryForm.icono}
                            onChange={(e) => setCategoryForm({...categoryForm, icono: e.target.value})}
                            placeholder="🍕"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Descripción <span className="text-gray-400 text-xs">(opcional)</span></Label>
                        <Textarea
                          value={categoryForm.descripcion}
                          onChange={(e) => setCategoryForm({...categoryForm, descripcion: e.target.value})}
                          placeholder="Descripción de la categoría..."
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
                      <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSaveCategory}>Guardar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Lista de categorías con jerarquía */}
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {mainCategories.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Layers className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay categorías. Crea tu primera categoría.</p>
                    </div>
                  ) : (
                    mainCategories.map(category => {
                      const productCount = products.filter(p => p.category_id === category.id).length
                      const subcats = getSubcategories(category.id)

                      return (
                        <div key={category.id}>
                          {/* Categoría Principal */}
                          <div className="p-4 flex items-center justify-between hover:bg-gray-50 bg-orange-50/30">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mr-3">
                                <span className="text-xl">{category.icono || '📁'}</span>
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg flex items-center">
                                  {category.nombre}
                                  <Badge variant="secondary" className="ml-2 text-xs">Principal</Badge>
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {productCount} productos • {subcats.length} subcategorías • Orden: {category.orden}
                                </p>
                                {category.descripcion && (
                                  <p className="text-xs text-gray-500 mt-1">{category.descripcion}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => {
                                  setCategoryForm({
                                    nombre: '',
                                    orden: subcats.length,
                                    parent_id: category.id,
                                    descripcion: '',
                                    icono: ''
                                  })
                                  setEditingCategory(null)
                                  setCategoryDialogOpen(true)
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Subcategoría
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openEditCategory(category)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteCategory(category.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Subcategorías */}
                          {subcats.length > 0 && (
                            <div className="bg-gray-50/50">
                              {subcats.map(subcat => {
                                const subProductCount = products.filter(p => p.subcategory_id === subcat.id).length
                                return (
                                  <div
                                    key={subcat.id}
                                    className="p-3 pl-16 flex items-center justify-between hover:bg-gray-100 border-l-4 border-blue-200"
                                  >
                                    <div className="flex items-center">
                                      <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
                                      <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center mr-2">
                                        <span className="text-sm">{subcat.icono || '📂'}</span>
                                      </div>
                                      <div>
                                        <h4 className="font-medium flex items-center">
                                          {subcat.nombre}
                                          <Badge variant="outline" className="ml-2 text-xs text-blue-600">Subcategoría</Badge>
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                          {subProductCount} productos • Orden: {subcat.orden}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button size="sm" variant="ghost" onClick={() => openEditCategory(subcat)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteCategory(subcat.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tip informativo */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 flex items-center mb-2">
                <FolderTree className="h-4 w-4 mr-2" />
                💡 Cómo usar Subcategorías
              </h4>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Las <strong>Categorías Principales</strong> aparecen como filtros en el menú del cliente</li>
                <li>Las <strong>Subcategorías</strong> aparecen como títulos de sección dentro de cada categoría</li>
                <li>Asigna productos a subcategorías desde la pestaña &quot;Productos&quot; al editar</li>
                <li>Usa iconos (emojis) para hacer el menú más visual</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  )
}
