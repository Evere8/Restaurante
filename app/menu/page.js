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
import { Plus, Edit, Trash2, Package, AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'

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

  const [recetaItems, setRecetaItems] = useState([])

  const [categoryForm, setCategoryForm] = useState({
    nombre: '',
    orden: 0
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && restaurant) {
      loadCategories()
      loadProducts()
      loadStockItems()
    }
  }, [user, restaurant])

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
      .select('*, menu_categories(nombre)')
      .eq('restaurant_id', restaurant.id)
      .order('nombre', { ascending: true })

    if (error) {
      toast.error('Error cargando productos')
    } else {
      setProducts(data || [])
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
        img_url: productForm.img_url,
        tiempo_preparacion_min: parseInt(productForm.tiempo_preparacion_min),
        disponible: productForm.disponible,
        dias_para_vencer: productForm.dias_para_vencer ? parseInt(productForm.dias_para_vencer) : null,
        dias_alerta_vencimiento: parseInt(productForm.dias_alerta_vencimiento),
        fecha_compra: productForm.fecha_compra || null,
        usar_stock_avanzado: productForm.usar_stock_avanzado,
        crear_en_stock: productForm.crear_en_stock
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

      // Si usa stock avanzado, guardar receta
      if (productForm.usar_stock_avanzado && recetaItems.length > 0) {
        // Eliminar recetas anteriores si está editando
        if (editingProduct) {
          await supabase
            .from('menu_receta')
            .delete()
            .eq('menu_item_id', savedProductId)
        }

        // Insertar nuevas recetas
        const recetasToInsert = recetaItems.map(item => ({
          menu_item_id: savedProductId,
          stock_item_id: item.stock_item_id,
          cantidad_usada: parseFloat(item.cantidad)
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
      dias_alerta_vencimiento_stock: 7
    })
    setRecetaItems([])
    setEditingProduct(null)
  }

  const resetCategoryForm = () => {
    setCategoryForm({ nombre: '', orden: 0 })
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
      img_url: cleanImgUrl,
      tiempo_preparacion_min: product.tiempo_preparacion_min,
      disponible: product.disponible,
      dias_para_vencer: product.dias_para_vencer || '',
      dias_alerta_vencimiento: product.dias_alerta_vencimiento,
      fecha_compra: product.fecha_compra || '',
      usar_stock_avanzado: product.usar_stock_avanzado || false,
      crear_en_stock: product.crear_en_stock || false,
      stock_minimo_alerta: 1,
      dias_alerta_vencimiento_stock: 7
    })

    // Cargar receta si existe
    if (product.usar_stock_avanzado) {
      const { data: receta, error } = await supabase
        .from('menu_receta')
        .select('*, stock_items(nombre)')
        .eq('menu_item_id', product.id)

      if (!error && receta) {
        setRecetaItems(receta.map(r => ({
          stock_item_id: r.stock_item_id,
          nombre: r.stock_items.nombre,
          cantidad: r.cantidad_usada
        })))
      }
    }

    setDialogOpen(true)
  }

  const openEditCategory = (category) => {
    setEditingCategory(category)
    setCategoryForm({
      nombre: category.nombre,
      orden: category.orden
    })
    setCategoryDialogOpen(true)
  }

  const addRecetaItem = () => {
    if (stockItems.length === 0) {
      toast.error('No hay insumos disponibles')
      return
    }
    setRecetaItems([...recetaItems, { stock_item_id: '', nombre: '', cantidad: '' }])
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
      }
    }
    
    setRecetaItems(updated)
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
                      <Label>Categoría</Label>
                      <Select value={productForm.category_id} onValueChange={(val) => setProductForm({...productForm, category_id: val})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                      <Label>URL Imagen</Label>
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
                        placeholder="Pega cualquier URL de Google Imágenes o URL directa" 
                      />
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
                            {recetaItems.map((item, index) => (
                              <div key={index} className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg border">
                                <Select 
                                  value={item.stock_item_id} 
                                  onValueChange={(val) => updateRecetaItem(index, 'stock_item_id', val)}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Seleccionar insumo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {stockItems.map(stock => (
                                      <SelectItem key={stock.id} value={stock.id}>{stock.nombre}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  placeholder="Cantidad" 
                                  value={item.cantidad}
                                  onChange={(e) => updateRecetaItem(index, 'cantidad', e.target.value)}
                                  className="w-32"
                                />
                                <Button type="button" size="sm" variant="ghost" onClick={() => removeRecetaItem(index)}>
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
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
                        {product.menu_categories && (
                          <Badge variant="outline" className="mt-1">{product.menu_categories.nombre}</Badge>
                        )}
                        {product.usar_stock_avanzado && (
                          <Badge className="mt-1 bg-green-500">✨ Stock Avanzado</Badge>
                        )}
                        {product.crear_en_stock && (
                          <Badge className="mt-1 bg-blue-500">📦 En Stock</Badge>
                        )}
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
            <div className="flex justify-end mb-4">
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
                    <div className="space-y-2">
                      <Label>Nombre *</Label>
                      <Input value={categoryForm.nombre} onChange={(e) => setCategoryForm({...categoryForm, nombre: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Orden</Label>
                      <Input type="number" value={categoryForm.orden} onChange={(e) => setCategoryForm({...categoryForm, orden: parseInt(e.target.value)})} />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
                    <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSaveCategory}>Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {categories.map(category => {
                    const productCount = products.filter(p => p.category_id === category.id).length
                    return (
                      <div key={category.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <h3 className="font-semibold text-lg">{category.nombre}</h3>
                          <p className="text-sm text-gray-600">{productCount} productos • Orden: {category.orden}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => openEditCategory(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
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
