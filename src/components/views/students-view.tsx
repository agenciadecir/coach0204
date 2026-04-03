'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  User,
  Dumbbell,
  Utensils,
  TrendingUp,
  CreditCard,
  Mail,
  Phone,
  Calendar,
  ChevronRight
} from 'lucide-react'
import { useAppStore } from '@/hooks/use-store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'

interface Student {
  id: string
  userId: string
  phone: string | null
  goals: string | null
  notes: string | null
  createdAt: string
  startDate: string
  user: {
    id: string
    name: string | null
    email: string
    isActive: boolean
    image: string | null
    createdAt: string
  }
  _count?: {
    routines: number
    diets: number
    progress: number
    payments: number
  }
}

export function StudentsView() {
  const { data: session } = useSession()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    goals: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  
  const { setCurrentView, setSelectedStudentId } = useAppStore()
  const { toast } = useToast()

  const isCoach = session?.user.role === 'COACH'

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students')
      const data = await res.json()
      setStudents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(s =>
    s.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openCreateDialog = () => {
    setEditingStudent(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      goals: '',
      notes: ''
    })
    setDialogOpen(true)
  }

  const openEditDialog = (student: Student) => {
    setEditingStudent(student)
    setFormData({
      name: student.user.name || '',
      email: student.user.email,
      password: '',
      phone: student.phone || '',
      goals: student.goals || '',
      notes: student.notes || ''
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingStudent) {
        const res = await fetch(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al actualizar')
        }

        toast({ title: 'Alumno actualizado correctamente' })
      } else {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            password: formData.password || 'password123'
          })
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al crear')
        }

        toast({ title: 'Alumno creado correctamente' })
      }

      setDialogOpen(false)
      fetchStudents()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingStudent) return

    try {
      const res = await fetch(`/api/students/${deletingStudent.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Error al eliminar')

      toast({ title: 'Alumno eliminado correctamente' })
      setDeleteDialogOpen(false)
      setDeletingStudent(null)
      fetchStudents()
    } catch (error) {
      toast({
        title: 'Error al eliminar',
        variant: 'destructive'
      })
    }
  }

  const openStudentDetail = (studentId: string) => {
    setSelectedStudentId(studentId)
    setCurrentView('student-detail')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-emerald-500/30"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 sm:p-8 border border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Alumnos
            </h1>
            <p className="text-slate-400 mt-1">
              {isCoach 
                ? 'Selecciona un alumno para ver sus rutinas, dietas y progreso'
                : 'Tu perfil'}
            </p>
          </div>
          {isCoach && (
            <Button 
              onClick={openCreateDialog} 
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Alumno
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      {isCoach && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12 rounded-xl"
          />
        </div>
      )}

      {/* Students List */}
      <div className="space-y-3">
        {filteredStudents.map((student) => (
          <Card 
            key={student.id} 
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 hover:border-emerald-500/50 transition-all cursor-pointer group overflow-hidden"
            onClick={() => openStudentDetail(student.id)}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-slate-600 group-hover:ring-emerald-500/50 transition-all">
                    <AvatarImage src={student.user.image || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600 text-white text-lg sm:text-xl font-medium">
                      {student.user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {student.user.isActive && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-800"></div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      {student.user.name || 'Sin nombre'}
                    </h3>
                    <Badge 
                      className={`text-xs ${student.user.isActive 
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
                        : 'bg-slate-600'}`}
                    >
                      {student.user.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-[150px] sm:max-w-none">{student.user.email}</span>
                    </span>
                    {student.phone && (
                      <span className="hidden sm:flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {student.phone}
                      </span>
                    )}
                    <span className="hidden sm:flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Desde {format(new Date(student.startDate), 'MMM yyyy', { locale: es })}
                    </span>
                  </div>
                </div>

                {/* Stats - Desktop */}
                <div className="hidden lg:flex items-center gap-3">
                  <div className="text-center px-4 py-2 rounded-xl bg-slate-700/30">
                    <Dumbbell className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                    <p className="text-lg font-bold text-white">{student._count?.routines || 0}</p>
                    <p className="text-xs text-slate-500">Rutinas</p>
                  </div>
                  <div className="text-center px-4 py-2 rounded-xl bg-slate-700/30">
                    <Utensils className="w-5 h-5 mx-auto text-orange-400 mb-1" />
                    <p className="text-lg font-bold text-white">{student._count?.diets || 0}</p>
                    <p className="text-xs text-slate-500">Dietas</p>
                  </div>
                  <div className="text-center px-4 py-2 rounded-xl bg-slate-700/30">
                    <TrendingUp className="w-5 h-5 mx-auto text-blue-400 mb-1" />
                    <p className="text-lg font-bold text-white">{student._count?.progress || 0}</p>
                    <p className="text-xs text-slate-500">Progreso</p>
                  </div>
                  <div className="text-center px-4 py-2 rounded-xl bg-slate-700/30">
                    <CreditCard className={`w-5 h-5 mx-auto mb-1 ${(student._count?.payments || 0) > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
                    <p className="text-lg font-bold text-white">{student._count?.payments || 0}</p>
                    <p className="text-xs text-slate-500">Pagos</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {isCoach && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditDialog(student)
                        }}
                        className="text-slate-400 hover:text-white hover:bg-slate-700"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingStudent(student)
                          setDeleteDialogOpen(true)
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              </div>
              
              {/* Stats - Mobile */}
              <div className="lg:hidden flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Dumbbell className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-medium">{student._count?.routines || 0}</span> Rutinas
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Utensils className="w-4 h-4 text-orange-400" />
                  <span className="text-white font-medium">{student._count?.diets || 0}</span> Dietas
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">{student._count?.progress || 0}</span> Progreso
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-16 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50">
          <div className="w-20 h-20 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-slate-400 text-lg">No se encontraron alumnos</p>
          {isCoach && searchTerm === '' && (
            <Button 
              onClick={openCreateDialog} 
              className="mt-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear primer alumno
            </Button>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingStudent ? 'Editar Alumno' : 'Nuevo Alumno'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingStudent ? 'Modifica los datos del alumno' : 'Completa los datos del nuevo alumno'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 focus:border-emerald-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 focus:border-emerald-500"
                  required
                />
              </div>
            </div>
            
            {!editingStudent && (
              <div className="space-y-2">
                <Label className="text-slate-300">Contraseña</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 focus:border-emerald-500"
                  placeholder="Por defecto: password123"
                />
                <p className="text-xs text-slate-500">Mínimo 6 caracteres. Si no se especifica, será 'password123'</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-slate-300">Teléfono</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-700/50 border-slate-600 focus:border-emerald-500"
                placeholder="+34 600 000 000"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Objetivos</Label>
              <Textarea
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                className="bg-slate-700/50 border-slate-600 focus:border-emerald-500 resize-none"
                placeholder="Ej: Perder 5kg, ganar masa muscular..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Notas privadas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-slate-700/50 border-slate-600 focus:border-emerald-500 resize-none"
                placeholder="Notas solo visibles para el coach..."
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700" 
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">¿Eliminar alumno?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta acción eliminará permanentemente a <span className="text-white font-medium">{deletingStudent?.user.name || deletingStudent?.user.email}</span> y todos sus datos asociados (rutinas, dietas, progreso, pagos).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
