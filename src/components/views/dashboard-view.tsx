'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  AlertCircle,
  Calendar,
  ArrowRight,
  Activity,
  Dumbbell, 
  Utensils,
  CheckCircle,
  Clock,
  User,
  Sparkles,
  Plus
} from 'lucide-react'
import { useAppStore } from '@/hooks/use-store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface DashboardData {
  stats: {
    activeStudents: number
    totalStudents: number
    pendingPayments: number
    overduePayments: number
  }
  recentPayments: Array<{
    id: string
    amount: number
    dueDate: string
    status: string
    student: {
      id: string
      user: { name: string | null; email: string }
    }
  }>
  recentProgress: Array<{
    id: string
    date: string
    weight: number | null
    student: {
      user: { name: string | null }
    }
  }>
}

interface Student {
  id: string
  user: {
    name: string | null
    email: string
    isActive: boolean
  }
  _count?: {
    routines: number
    diets: number
    progress: number
    payments: number
  }
}

export function DashboardView() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const { setCurrentView, setSelectedStudentId } = useAppStore()

  const isCoach = session?.user.role === 'COACH'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, studentsRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/students')
        ])
        const dashboardData = await dashboardRes.json()
        const studentsData = await studentsRes.json()
        setData(dashboardData || null)
        setStudents(Array.isArray(studentsData) ? studentsData : [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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

  if (!isCoach) {
    return <StudentDashboard />
  }

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId)
    setCurrentView('student-detail')
  }

  const handlePaymentClick = () => {
    setCurrentView('payments')
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 sm:p-8 border border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Bienvenido, {session?.user.name || 'Coach'}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Active Students */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-green-600/10 border-emerald-500/30">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
          <CardContent className="relative p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-200">Alumnos Activos</p>
                <p className="text-3xl sm:text-4xl font-bold text-white mt-1">{data?.stats?.activeStudents || 0}</p>
                <p className="text-xs text-emerald-300/70 mt-1">
                  de {data?.stats?.totalStudents || 0} totales
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border-amber-500/30">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
          <CardContent className="relative p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-200">Pagos Pendientes</p>
                <p className="text-3xl sm:text-4xl font-bold text-white mt-1">{data?.stats?.pendingPayments || 0}</p>
                <p className="text-xs text-amber-300/70 mt-1">por cobrar</p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/30">
                <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Payments */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-red-500/20 to-rose-600/10 border-red-500/30 sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
          <CardContent className="relative p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-200">Pagos Vencidos</p>
                <p className="text-3xl sm:text-4xl font-bold text-white mt-1">{data?.stats?.overduePayments || 0}</p>
                <p className="text-xs text-red-300/70 mt-1">requieren atención</p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30">
                <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Students List */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 overflow-hidden">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2 pb-4">
            <div>
              <CardTitle className="text-white text-lg sm:text-xl">Mis Alumnos</CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                Click en un alumno para ver su perfil
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 shrink-0"
              onClick={() => setCurrentView('students')}
            >
              Ver todos <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {students.slice(0, 5).map((student, index) => (
                <button
                  key={student.id}
                  onClick={() => handleStudentClick(student.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/60 transition-all duration-200 text-left group border border-transparent hover:border-slate-600"
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-slate-600 group-hover:ring-emerald-500/50 transition-all">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600 text-white font-medium">
                        {student.user.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {student.user.isActive && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate group-hover:text-emerald-300 transition-colors">
                      {student.user.name || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{student.user.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="text-xs text-slate-400 border-slate-600 bg-slate-700/50"
                    >
                      {student._count?.routines || 0} rutinas
                    </Badge>
                    <Badge 
                      className={`text-xs ${student.user.isActive ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-slate-600'}`}
                    >
                      {student.user.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </button>
              ))}
              {students.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-3">
                    <User className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400">No tienes alumnos aún</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400"
                    onClick={() => setCurrentView('students')}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar alumno
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg sm:text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Pagos Pendientes
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              Recordatorios de pagos próximos a vencer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.recentPayments && data.recentPayments.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {data.recentPayments.map((payment) => (
                  <button
                    key={payment.id}
                    onClick={handlePaymentClick}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-700/30 border border-slate-700/50 hover:border-slate-600 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {payment.student.user.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm group-hover:text-emerald-300 transition-colors">
                          {payment.student.user.name || payment.student.user.email}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(payment.dueDate), 'dd MMM', { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">${payment.amount.toLocaleString('es-AR')}</p>
                      <Badge 
                        className={`text-xs ${payment.status === 'OVERDUE' 
                          ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                          : payment.status === 'PENDING_VALIDATION'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-600'}`}
                      >
                        {payment.status === 'OVERDUE' ? 'Vencido' : payment.status === 'PENDING_VALIDATION' ? 'A Validar' : 'Pendiente'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-slate-400">No hay pagos pendientes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg sm:text-xl">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => setCurrentView('students')}
              className="h-auto py-4 px-4 rounded-lg bg-gradient-to-r from-emerald-500/20 to-green-600/10 hover:from-emerald-500/40 hover:to-green-600/30 border border-emerald-500/30 hover:border-emerald-400 text-white justify-start group transition-all flex items-center text-left"
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 mr-3 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white group-hover:text-emerald-300 transition-colors">Gestionar Alumnos</p>
                <p className="text-xs text-emerald-300/60 group-hover:text-emerald-200/80 transition-colors">Crear, editar o eliminar</p>
              </div>
            </button>
            <button
              onClick={() => setCurrentView('students')}
              className="h-auto py-4 px-4 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-600/10 hover:from-cyan-500/40 hover:to-blue-600/30 border border-cyan-500/30 hover:border-cyan-400 text-white justify-start group transition-all flex items-center text-left"
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 mr-3 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/30">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white group-hover:text-cyan-300 transition-colors">Crear Rutina</p>
                <p className="text-xs text-cyan-300/60 group-hover:text-cyan-200/80 transition-colors">Selecciona un alumno</p>
              </div>
            </button>
            <button
              onClick={() => setCurrentView('students')}
              className="h-auto py-4 px-4 rounded-lg bg-gradient-to-r from-orange-500/20 to-amber-600/10 hover:from-orange-500/40 hover:to-amber-600/30 border border-orange-500/30 hover:border-orange-400 text-white justify-start group transition-all flex items-center text-left sm:col-span-2 lg:col-span-1"
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 mr-3 group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/30">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white group-hover:text-orange-300 transition-colors">Crear Dieta</p>
                <p className="text-xs text-orange-300/60 group-hover:text-orange-200/80 transition-colors">Selecciona un alumno</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StudentDashboard() {
  const [studentData, setStudentData] = useState<any>(null)
  const { setCurrentView } = useAppStore()

  useEffect(() => {
    fetch('/api/students')
      .then(res => res.json())
      .then(data => {
        if (data && data[0]) {
          setStudentData(data[0])
        }
      })
  }, [])

  const menuItems = [
    { 
      id: 'routines', 
      label: 'Mis Rutinas', 
      icon: Dumbbell, 
      count: studentData?._count?.routines,
      gradient: 'from-emerald-500 to-green-600',
      shadowColor: 'shadow-emerald-500/30',
      bgGradient: 'from-emerald-500/20 to-green-600/10',
      borderColor: 'border-emerald-500/30'
    },
    { 
      id: 'diets', 
      label: 'Mi Dieta', 
      icon: Utensils, 
      count: studentData?._count?.diets,
      gradient: 'from-orange-500 to-amber-600',
      shadowColor: 'shadow-orange-500/30',
      bgGradient: 'from-orange-500/20 to-amber-600/10',
      borderColor: 'border-orange-500/30'
    },
    { 
      id: 'progress', 
      label: 'Mi Progreso', 
      icon: TrendingUp, 
      count: studentData?._count?.progress,
      gradient: 'from-blue-500 to-indigo-600',
      shadowColor: 'shadow-blue-500/30',
      bgGradient: 'from-blue-500/20 to-indigo-600/10',
      borderColor: 'border-blue-500/30'
    },
    { 
      id: 'payments', 
      label: 'Mis Pagos', 
      icon: CreditCard, 
      count: studentData?._count?.payments,
      gradient: 'from-violet-500 to-purple-600',
      shadowColor: 'shadow-violet-500/30',
      bgGradient: 'from-violet-500/20 to-purple-600/10',
      borderColor: 'border-violet-500/30'
    },
  ]

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 sm:p-8 border border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Mi Panel
          </h1>
          <p className="text-slate-400 mt-1">Bienvenido a tu área personal</p>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {menuItems.map((item) => (
          <Card 
            key={item.id}
            className={`relative overflow-hidden bg-gradient-to-br ${item.bgGradient} ${item.borderColor} cursor-pointer group transition-all hover:scale-[1.02] hover:shadow-xl ${item.shadowColor}`}
            onClick={() => setCurrentView(item.id as any)}
          >
            <CardContent className="p-4 sm:p-6 text-center">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 shadow-lg ${item.shadowColor} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <p className="text-white font-medium text-sm sm:text-base">{item.label}</p>
              {item.count > 0 && (
                <Badge className={`mt-2 bg-gradient-to-r ${item.gradient} text-white text-xs`}>
                  {item.count} {item.id === 'progress' ? 'registros' : item.id === 'payments' ? 'pendientes' : 'activos'}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
