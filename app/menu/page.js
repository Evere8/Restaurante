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
import { Plus, Edit, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'

export default function MenuPage() {
  const { user, restaurant, loading: authLoading } = useAuth()
  const { formatCurrency } = useCurrency()
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
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
    fecha_compra: ''
  })

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

  const handleSaveProduct = async () => {
    try {
      const dataToSave = {
        ...productForm,
        restaurant_id: restaurant.id,
        precio_base: parseFloat(productForm.precio_base),
        coste: productForm.coste ? parseFloat(productForm.coste) : null,
        dias_para_vencer: productForm.dias_para_vencer ? parseInt(productForm.dias_para_vencer) : null,
        dias_alerta_vencimiento: parseInt(productForm.dias_alerta_vencimiento),
        fecha_compra: productForm.fecha_compra || null
      }

      if (editingProduct) {
        const { error } = await supabase
          .from('menu_items')
          .update(dataToSave)
          .eq('id', editingProduct.id)

        if (error) throw error
        toast.success('Producto actualizado')
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert([dataToSave])

        if (error) throw error
        toast.success('Producto creado')
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
    // Si es una URL de búsqueda de Google, extraer la URL real de la imagen
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
      fecha_compra: ''
    })
    setEditingProduct(null)
  }

  const resetCategoryForm = () => {
    setCategoryForm({ nombre: '', orden: 0 })
    setEditingCategory(null)
  }

  const openEditProduct = (product) => {
    setEditingProduct(product)
    setProductForm({
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio_base: product.precio_base,
      coste: product.coste || '',
      category_id: product.category_id || '',
      img_url: product.img_url || '',
      tiempo_preparacion_min: product.tiempo_preparacion_min,
      disponible: product.disponible,
      dias_para_vencer: product.dias_para_vencer || '',
      dias_alerta_vencimiento: product.dias_alerta_vencimiento,
      fecha_compra: product.fecha_compra || ''
    })
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

  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products

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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Editar' : 'Nuevo'} Producto</DialogTitle>
                  </DialogHeader>
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
                      <Label>Coste</Label>
                      <Input type="number" step="0.01" value={productForm.coste} onChange={(e) => setProductForm({...productForm, coste: e.target.value})} />
                    </div>
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
                    <div className="space-y-2">
                      <Label>Tiempo Preparación (min)</Label>
                      <Input type="number" value={productForm.tiempo_preparacion_min} onChange={(e) => setProductForm({...productForm, tiempo_preparacion_min: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Días para vencer</Label>
                      <Input type="number" value={productForm.dias_para_vencer} onChange={(e) => setProductForm({...productForm, dias_para_vencer: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Días alerta vencimiento</Label>
                      <Input type="number" value={productForm.dias_alerta_vencimiento} onChange={(e) => setProductForm({...productForm, dias_alerta_vencimiento: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha compra</Label>
                      <Input type="date" value={productForm.fecha_compra} onChange={(e) => setProductForm({...productForm, fecha_compra: e.target.value})} />
                    </div>
                    <div className="col-span-2 flex items-center space-x-2">
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
