'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  UserCheck, 
  Mail, 
  Phone, 
  Plus,
  Search,
  ArrowLeft,
  Download,
  UserPlus,
  ChevronRight,
  ShoppingCart,
  Package,
  Trash2,
  ExternalLink,
  Loader2,
  ClipboardList,
  Tag,
  FolderPlus
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Coach {
  id: string
  name: string | null
  email: string
  isActive: boolean
  createdAt: string
  _count: {
    students: number
  }
}

interface Student {
  id: string
  userId: string
  name: string | null
  email: string
  phone: string | null
  isActive: boolean
  coachName: string | null
  coachEmail: string | null
  createdAt: string
}

interface Category {
  id: string
  name: string
  description: string | null
  _count?: {
    products: number
  }
}

interface Product {
  id: string
  name: string
  price: string
  originalPrice: string | null
  imageUrl: string
  productUrl: string
  description: string | null
  isActive: boolean
  createdAt: string
  categoryId: string | null
  category: Category | null
}

type DatabaseSubTab = 'coaches' | 'students'

interface AdminDashboardViewProps {
  initialView?: 'admin-dashboard' | 'admin-database' | 'admin-store'
}

export function AdminDashboardView({ initialView = 'admin-dashboard' }: AdminDashboardViewProps) {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [databaseSubTab, setDatabaseSubTab] = useState<DatabaseSubTab>('coaches')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [coachStudents, setCoachStudents] = useState<Student[]>([])
  
  // Create coach dialog
  const [createCoachOpen, setCreateCoachOpen] = useState(false)
  const [newCoach, setNewCoach] = useState({ name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)
  
  // Add product dialog
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [productUrl, setProductUrl] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualProduct, setManualProduct] = useState({ name: '', price: '', imageUrl: '' })
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  
  const { toast } = useToast()

  // Determine active view based on initialView prop
  const activeView = initialView

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [coachesRes, studentsRes, productsRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/coaches'),
        fetch('/api/admin/students'),
        fetch('/api/products'),
        fetch('/api/categories')
      ])
      
      const coachesData = await coachesRes.json()
      const studentsData = await studentsRes.json()
      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()
      
      setCoaches(Array.isArray(coachesData) ? coachesData : [])
      setStudents(Array.isArray(studentsData) ? studentsData : [])
      setProducts(Array.isArray(productsData) ? productsData : [])
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCoachClick = async (coach: Coach) => {
    setSelectedCoach(coach)
    // Filter students that belong to this coach
    const coachStudentsList = students.filter(s => s.coachEmail === coach.email)
    setCoachStudents(coachStudentsList)
  }

  const handleBackToCoaches = () => {
    setSelectedCoach(null)
    setCoachStudents([])
  }

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm)
  )

  const filteredCoaches = coaches.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalStudents = students.length
  const totalCoaches = coaches.length
  const activeStudents = students.filter(s => s.isActive).length
  const activeCoaches = coaches.filter(c => c.isActive).length

  // Create coach
  const handleCreateCoach = async () => {
    if (!newCoach.email || !newCoach.password || !newCoach.name) {
      toast({ title: 'Todos los campos son requeridos', variant: 'destructive' })
      return
    }

    if (newCoach.password.length < 6) {
      toast({ title: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/admin/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCoach)
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: data.error || 'Error al crear coach', variant: 'destructive' })
        return
      }

      toast({ title: 'Coach creado exitosamente' })
      setCreateCoachOpen(false)
      setNewCoach({ name: '', email: '', password: '' })
      fetchData()
    } catch (error) {
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  // Add product from Mercado Libre
  const handleAddProduct = async () => {
    if (!productUrl) {
      toast({ title: 'Ingresa un enlace de Mercado Libre', variant: 'destructive' })
      return
    }

    // Accept Mercado Libre URLs and affiliate short links (meli.la)
    const isValidUrl = 
      productUrl.includes('mercadolibre.com.ar') || 
      productUrl.includes('mercadolibre.com') ||
      productUrl.includes('mercadolibre.cl') ||
      productUrl.includes('mercadolibre.com.mx') ||
      productUrl.includes('meli.la')
    
    if (!isValidUrl) {
      toast({ title: 'El enlace debe ser de Mercado Libre o un enlace de afiliado (meli.la)', variant: 'destructive' })
      return
    }

    // If manual mode, validate manual fields
    if (manualMode) {
      if (!manualProduct.name || !manualProduct.price || !manualProduct.imageUrl) {
        toast({ title: 'Completa todos los campos manuales', variant: 'destructive' })
        return
      }

      setAddingProduct(true)
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            productUrl,
            name: manualProduct.name,
            price: manualProduct.price,
            imageUrl: manualProduct.imageUrl,
            categoryId: selectedCategoryId || undefined
          })
        })

        const data = await res.json()

        if (!res.ok) {
          toast({ title: data.error || 'Error al agregar producto', variant: 'destructive' })
          return
        }

        toast({ title: 'Producto agregado exitosamente' })
        setAddProductOpen(false)
        setProductUrl('')
        setManualMode(false)
        setManualProduct({ name: '', price: '', imageUrl: '' })
        fetchData()
      } catch (error) {
        toast({ title: 'Error de conexión', variant: 'destructive' })
      } finally {
        setAddingProduct(false)
      }
      return
    }

    // Auto-extraction mode
    setAddingProduct(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productUrl,
          categoryId: selectedCategoryId || undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        // Show manual mode option on failure
        toast({ title: 'No se pudo extraer automáticamente. Completa los campos manualmente.', variant: 'destructive' })
        setManualMode(true)
        return
      }

      toast({ title: 'Producto agregado exitosamente' })
      setAddProductOpen(false)
      setProductUrl('')
      fetchData()
    } catch (error) {
      toast({ title: 'Error de conexión. Intenta el modo manual.', variant: 'destructive' })
      setManualMode(true)
    } finally {
      setAddingProduct(false)
    }
  }

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        toast({ title: 'Error al eliminar producto', variant: 'destructive' })
        return
      }

      toast({ title: 'Producto eliminado' })
      fetchData()
    } catch (error) {
      toast({ title: 'Error de conexión', variant: 'destructive' })
    }
  }

  // Toggle product visibility
  const handleToggleProduct = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive })
      })

      if (!res.ok) {
        toast({ title: 'Error al actualizar producto', variant: 'destructive' })
        return
      }

      toast({ title: product.isActive ? 'Producto ocultado' : 'Producto activado' })
      fetchData()
    } catch (error) {
      toast({ title: 'Error de conexión', variant: 'destructive' })
    }
  }

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: 'Ingresa un nombre para la categoría', variant: 'destructive' })
      return
    }

    setAddingCategory(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: data.error || 'Error al crear categoría', variant: 'destructive' })
        return
      }

      toast({ title: 'Categoría creada' })
      setCategories([...categories, data])
      setSelectedCategoryId(data.id)
      setNewCategoryName('')
    } catch (error) {
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setAddingCategory(false)
    }
  }

  // Export to Excel
  const exportToExcel = () => {
    const data = selectedCoach 
      ? coachStudents.map(s => ({
          Nombre: s.name || '',
          Email: s.email,
          Teléfono: s.phone || '',
          Estado: s.isActive ? 'Activo' : 'Inactivo',
          Coach: selectedCoach.name || selectedCoach.email
        }))
      : students.map(s => ({
          Nombre: s.name || '',
          Email: s.email,
          Teléfono: s.phone || '',
          Estado: s.isActive ? 'Activo' : 'Inactivo',
          Coach: s.coachName || 'Sin asignar'
        }))

    // Create CSV content
    const headers = Object.keys(data[0] || {}).join(',')
    const rows = data.map(row => Object.values(row).join(',')).join('\n')
    const csv = `${headers}\n${rows}`

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = selectedCoach 
      ? `alumnos_${selectedCoach.name || selectedCoach.email}.csv`
      : 'alumnos_todos.csv'
    link.click()
    
    toast({ title: 'Archivo descargado' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 via-slate-800 to-slate-800 rounded-2xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {selectedCoach ? `Alumnos de ${selectedCoach.name || selectedCoach.email}` : 'Panel de Administrador'}
            </h1>
            <p className="text-slate-400 mt-1">
              {selectedCoach ? `${coachStudents.length} alumnos asignados` : 'Gestión de coaches, alumnos y tienda'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedCoach && (
              <Button
                onClick={handleBackToCoaches}
                className="bg-slate-700 hover:bg-slate-600 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Selected Coach View - Show their students */}
      {selectedCoach && (
        <div className="space-y-4">
          {coachStudents.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
              <Users className="w-12 h-12 mx-auto text-slate-500 mb-4" />
              <p className="text-slate-400">Este coach no tiene alumnos asignados</p>
            </div>
          ) : (
            coachStudents.map((student) => (
              <Card key={student.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center text-white text-lg font-bold">
                        {student.name?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div>
                        <p className="text-white font-medium text-lg">{student.name || 'Sin nombre'}</p>
                        <p className="text-slate-400 flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {student.email}
                        </p>
                        {student.phone && (
                          <p className="text-slate-400 flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {student.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={student.isActive ? 'default' : 'secondary'} className={student.isActive ? 'bg-emerald-600' : ''}>
                      {student.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Dashboard View */}
      {!selectedCoach && activeView === 'admin-dashboard' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-purple-500/20 to-violet-600/10 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{totalCoaches}</p>
                    <p className="text-xs text-purple-200">Coaches</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-emerald-500/20 to-green-600/10 border-emerald-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{activeCoaches}</p>
                    <p className="text-xs text-emerald-200">Coaches Activos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-600/10 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/30">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{totalStudents}</p>
                    <p className="text-xs text-blue-200">Alumnos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-500/20 to-amber-600/10 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{products.filter(p => p.isActive).length}</p>
                    <p className="text-xs text-orange-200">Productos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-purple-400" />
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setCreateCoachOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                  size="lg"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Crear Coach
                </Button>
                <Button
                  onClick={exportToExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Exportar Alumnos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Coaches */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Coaches Recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {coaches.slice(0, 5).map((coach) => (
                  <button
                    key={coach.id}
                    onClick={() => handleCoachClick(coach)}
                    className="w-full flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center text-white font-bold">
                        {coach.name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{coach.name || 'Sin nombre'}</p>
                        <p className="text-slate-400 text-sm flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {coach.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">{coach._count.students} alumnos</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Recent Students */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Alumnos Recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {students.slice(0, 5).map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center text-white font-bold">
                        {student.name?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{student.name || 'Sin nombre'}</p>
                        <p className="text-slate-400 text-sm flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {student.email}
                        </p>
                        {student.phone && (
                          <p className="text-slate-400 text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {student.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={student.isActive ? 'default' : 'secondary'} className={student.isActive ? 'bg-emerald-600' : ''}>
                      {student.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Database View */}
      {!selectedCoach && activeView === 'admin-database' && (
        <div className="space-y-4">
          {/* Sub-tabs for Coaches/Students */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setDatabaseSubTab('coaches')}
              className={databaseSubTab === 'coaches' 
                ? 'bg-purple-600 hover:bg-purple-700 text-white font-semibold' 
                : 'bg-slate-700 hover:bg-slate-600 text-white font-semibold'
              }
            >
              <Users className="w-4 h-4 mr-2" />
              Coaches ({coaches.length})
            </Button>
            <Button
              onClick={() => setDatabaseSubTab('students')}
              className={databaseSubTab === 'students' 
                ? 'bg-purple-600 hover:bg-purple-700 text-white font-semibold' 
                : 'bg-slate-700 hover:bg-slate-600 text-white font-semibold'
              }
            >
              <Users className="w-4 h-4 mr-2" />
              Alumnos ({students.length})
            </Button>
            <div className="flex-1" />
            <Button
              onClick={exportToExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={databaseSubTab === 'coaches' ? 'Buscar coaches...' : 'Buscar alumnos...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white pl-10"
            />
          </div>

          {/* Coaches List */}
          {databaseSubTab === 'coaches' && (
            <div className="space-y-3">
              {filteredCoaches.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
                  <Users className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                  <p className="text-slate-400">No se encontraron coaches</p>
                </div>
              ) : (
                filteredCoaches.map((coach) => (
                  <button
                    key={coach.id}
                    onClick={() => handleCoachClick(coach)}
                    className="w-full text-left"
                  >
                    <Card className="bg-slate-800 border-slate-700 hover:border-purple-500/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center text-white text-lg font-bold">
                              {coach.name?.charAt(0).toUpperCase() || 'C'}
                            </div>
                            <div>
                              <p className="text-white font-medium text-lg">{coach.name || 'Sin nombre'}</p>
                              <p className="text-slate-400 flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {coach.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-white">{coach._count.students}</p>
                              <p className="text-xs text-slate-400">Alumnos</p>
                            </div>
                            <Badge variant={coach.isActive ? 'default' : 'secondary'} className={coach.isActive ? 'bg-emerald-600' : ''}>
                              {coach.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Students List */}
          {databaseSubTab === 'students' && (
            <div className="space-y-3">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
                  <Users className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                  <p className="text-slate-400">No se encontraron alumnos</p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <Card key={student.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center text-white text-lg font-bold">
                            {student.name?.charAt(0).toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="text-white font-medium text-lg">{student.name || 'Sin nombre'}</p>
                            <p className="text-slate-400 flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {student.email}
                            </p>
                            {student.phone && (
                              <p className="text-slate-400 flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {student.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[120px]">
                            <p className="text-sm text-slate-400">Coach</p>
                            <p className="text-white font-medium">{student.coachName || 'Sin asignar'}</p>
                            {student.coachEmail && (
                              <p className="text-xs text-slate-500">{student.coachEmail}</p>
                            )}
                          </div>
                          <Badge variant={student.isActive ? 'default' : 'secondary'} className={student.isActive ? 'bg-emerald-600' : ''}>
                            {student.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Store View */}
      {!selectedCoach && activeView === 'admin-store' && (
        <div className="space-y-4">
          {/* Add Product Button */}
          <div className="flex gap-2">
            <Button
              onClick={() => setAddProductOpen(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white pl-10"
            />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
              <Package className="w-12 h-12 mx-auto text-slate-500 mb-4" />
              <p className="text-slate-400">No hay productos en la tienda</p>
              <p className="text-slate-500 text-sm mt-2">Agrega productos de Mercado Libre</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <Card key={product.id} className={`bg-slate-800 border-slate-700 overflow-hidden ${!product.isActive ? 'opacity-60' : ''}`}>
                  <div className="aspect-video relative overflow-hidden bg-slate-900/50">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Imagen+no+disponible'
                      }}
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Badge variant={product.isActive ? 'default' : 'secondary'} className={product.isActive ? 'bg-emerald-600' : ''}>
                        {product.isActive ? 'Activo' : 'Oculto'}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-white line-clamp-2 mb-2 min-h-[48px]">
                      {product.name}
                    </h3>
                    <div className="mb-3">
                      {product.originalPrice && (
                        <p className="text-sm text-slate-400 line-through">
                          {product.originalPrice}
                        </p>
                      )}
                      <p className="text-lg font-bold text-orange-400">
                        {product.price}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => window.open(product.productUrl, '_blank')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleToggleProduct(product)}
                        className="bg-slate-600 hover:bg-slate-500 text-white font-semibold"
                      >
                        {product.isActive ? 'Ocultar' : 'Mostrar'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Coach Dialog */}
      <Dialog open={createCoachOpen} onOpenChange={setCreateCoachOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Crear Nuevo Coach</DialogTitle>
            <DialogDescription className="text-slate-400">
              Completa los datos para crear una cuenta de coach
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nombre</Label>
              <Input
                value={newCoach.name}
                onChange={(e) => setNewCoach({ ...newCoach, name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Nombre del coach"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={newCoach.email}
                onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="coach@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Contraseña</Label>
              <Input
                type="password"
                value={newCoach.password}
                onChange={(e) => setNewCoach({ ...newCoach, password: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setCreateCoachOpen(false)}
              className="bg-slate-600 hover:bg-slate-500 text-white font-semibold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCoach}
              disabled={creating}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {creating ? 'Creando...' : 'Crear Coach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={addProductOpen} onOpenChange={(open) => {
        setAddProductOpen(open)
        if (!open) {
          setManualMode(false)
          setManualProduct({ name: '', price: '', imageUrl: '' })
          setSelectedCategoryId('')
          setNewCategoryName('')
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Agregar Producto</DialogTitle>
            <DialogDescription className="text-slate-400">
              Pega un enlace de Mercado Libre o de afiliado (meli.la)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Enlace del producto</Label>
              <Input
                value={productUrl}
                onChange={(e) => {
                  setProductUrl(e.target.value)
                  setManualMode(false)
                }}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="https://meli.la/... o https://mercadolibre.com.ar/..."
              />
            </div>
            
            {/* Category Selection */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categoría (opcional)
              </Label>
              <div className="flex gap-2">
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white flex-1">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="" className="text-white hover:bg-slate-600">
                      Sin categoría
                    </SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-slate-600">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* New category input */}
              <div className="flex gap-2 mt-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white flex-1"
                  placeholder="Nueva categoría..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategoryName.trim()) {
                      handleCreateCategory()
                    }
                  }}
                />
                <Button
                  onClick={handleCreateCategory}
                  disabled={addingCategory || !newCategoryName.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  size="icon"
                >
                  {addingCategory ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderPlus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {manualMode && (
              <>
                <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                  <p className="text-orange-300 text-sm">
                    No se pudo extraer automáticamente. Completa los campos:
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Nombre del producto *</Label>
                  <Input
                    value={manualProduct.name}
                    onChange={(e) => setManualProduct({ ...manualProduct, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Nombre del producto"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Precio *</Label>
                  <Input
                    value={manualProduct.price}
                    onChange={(e) => setManualProduct({ ...manualProduct, price: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="$ 10.000"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">URL de imagen *</Label>
                  <Input
                    value={manualProduct.imageUrl}
                    onChange={(e) => setManualProduct({ ...manualProduct, imageUrl: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="https://..."
                  />
                </div>
              </>
            )}
            
            {!manualMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setManualMode(true)}
                className="text-slate-400 hover:text-white"
              >
                ¿Problemas? Ingresar datos manualmente
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setAddProductOpen(false)
                setManualMode(false)
                setManualProduct({ name: '', price: '', imageUrl: '' })
                setSelectedCategoryId('')
                setNewCategoryName('')
              }}
              className="bg-slate-600 hover:bg-slate-500 text-white font-semibold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={addingProduct}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              {addingProduct ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {manualMode ? 'Guardando...' : 'Extrayendo...'}
                </div>
              ) : (
                manualMode ? 'Guardar Producto' : 'Agregar Producto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
