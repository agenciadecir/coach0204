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
  TrendingUp,
  Plus,
  Search,
  ArrowLeft,
  Download,
  UserPlus,
  ChevronRight
} from 'lucide-react'
import { useAppStore } from '@/hooks/use-store'
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

export function AdminDashboardView() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'coaches' | 'students'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [coachStudents, setCoachStudents] = useState<Student[]>([])
  
  // Create coach dialog
  const [createCoachOpen, setCreateCoachOpen] = useState(false)
  const [newCoach, setNewCoach] = useState({ name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)
  
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [coachesRes, studentsRes] = await Promise.all([
        fetch('/api/admin/coaches'),
        fetch('/api/admin/students')
      ])
      
      const coachesData = await coachesRes.json()
      const studentsData = await studentsRes.json()
      
      setCoaches(Array.isArray(coachesData) ? coachesData : [])
      setStudents(Array.isArray(studentsData) ? studentsData : [])
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
              {selectedCoach ? `${coachStudents.length} alumnos asignados` : 'Gestión de coaches y alumnos'}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedCoach && (
              <Button
                variant="outline"
                onClick={handleBackToCoaches}
                className="border-slate-600 text-slate-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            )}
            <Button
              onClick={() => setCreateCoachOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Crear Coach
            </Button>
            {(students.length > 0 || coachStudents.length > 0) && (
              <Button
                variant="outline"
                onClick={exportToExcel}
                className="border-slate-600 text-slate-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            )}
          </div>
        </div>
      </div>

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
        
        <Card className="bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
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
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeStudents}</p>
                <p className="text-xs text-orange-200">Alumnos Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
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

      {/* Main View - Show tabs and lists */}
      {!selectedCoach && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={activeTab === 'overview' ? 'default' : 'outline'}
              onClick={() => setActiveTab('overview')}
              className={activeTab === 'overview' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600 text-slate-300'}
            >
              Resumen
            </Button>
            <Button
              variant={activeTab === 'coaches' ? 'default' : 'outline'}
              onClick={() => setActiveTab('coaches')}
              className={activeTab === 'coaches' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600 text-slate-300'}
            >
              Coaches ({coaches.length})
            </Button>
            <Button
              variant={activeTab === 'students' ? 'default' : 'outline'}
              onClick={() => setActiveTab('students')}
              className={activeTab === 'students' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600 text-slate-300'}
            >
              Alumnos ({students.length})
            </Button>
          </div>

          {/* Search */}
          {(activeTab === 'coaches' || activeTab === 'students') && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={activeTab === 'coaches' ? 'Buscar coaches...' : 'Buscar alumnos...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white pl-10"
              />
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recent Coaches */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Coaches
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold">
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
          )}

          {/* Coaches Tab */}
          {activeTab === 'coaches' && (
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

          {/* Students Tab */}
          {activeTab === 'students' && (
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
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
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
        </>
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
              variant="outline"
              onClick={() => setCreateCoachOpen(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCoach}
              disabled={creating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {creating ? 'Creando...' : 'Crear Coach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
