'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Dumbbell, 
  Users, 
  Utensils, 
  TrendingUp, 
  CreditCard, 
  LogOut, 
  Menu,
  X,
  Activity,
  ChevronLeft
} from 'lucide-react'
import { useAppStore } from '@/hooks/use-store'
import { DashboardView } from '@/components/views/dashboard-view'
import { StudentsView } from '@/components/views/students-view'
import { StudentDetailView } from '@/components/views/student-detail-view'
import { RoutinesView } from '@/components/views/routines-view'
import { DietsView } from '@/components/views/diets-view'
import { ProgressView } from '@/components/views/progress-view'
import { PaymentsView } from '@/components/views/payments-view'
import { ExercisesView } from '@/components/views/exercises-view'
import { cn } from '@/lib/utils'

export default function Home() {
  const { data: session, status } = useSession()
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const { currentView, setCurrentView, selectedStudentId } = useAppStore()

  useEffect(() => {
    fetch('/api/auth/check-first-time')
      .then(res => res.json())
      .then(data => {
        setIsFirstTime(data.isFirstTime)
        if (data.isFirstTime) {
          setAuthTab('register')
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    const result = await signIn('credentials', {
      email: loginForm.email,
      password: loginForm.password,
      redirect: false
    })

    if (result?.error) {
      setError('Credenciales incorrectas')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (registerForm.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrar')
        return
      }

      await signIn('credentials', {
        email: registerForm.email,
        password: registerForm.password,
        redirect: false
      })
    } catch {
      setError('Error al registrar usuario')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-emerald-500/30"></div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <Card className="w-full max-w-md border-slate-700/50 bg-slate-800/50 backdrop-blur-xl relative z-10">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Fitness Coach Pro
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isFirstTime ? 'Crea tu cuenta de Coach' : 'Inicia sesión para continuar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as 'login' | 'register')}>
              {!isFirstTime && (
                <TabsList className="grid w-full grid-cols-2 bg-slate-700/50 mb-4">
                  <TabsTrigger value="login" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600">Iniciar Sesión</TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600" disabled>
                    Registrar
                  </TabsTrigger>
                </TabsList>
              )}
              
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{error}</p>}
                  <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25">
                    Iniciar Sesión
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-slate-300">Nombre</Label>
                    <Input
                      id="reg-name"
                      type="text"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-slate-300">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-slate-300">Contraseña</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm" className="text-slate-300">Confirmar Contraseña</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{error}</p>}
                  <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25">
                    Crear Cuenta de Coach
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCoach = session.user.role === 'COACH'

  const navItems = isCoach ? [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, gradient: 'from-emerald-500 to-green-600' },
    { id: 'students', label: 'Alumnos', icon: Users, gradient: 'from-blue-500 to-indigo-600' },
    { id: 'exercises', label: 'Ejercicios', icon: Dumbbell, gradient: 'from-orange-500 to-amber-600' },
    { id: 'payments', label: 'Pagos', icon: CreditCard, gradient: 'from-violet-500 to-purple-600' },
  ] : [
    { id: 'dashboard', label: 'Mi Panel', icon: Activity, gradient: 'from-emerald-500 to-green-600' },
    { id: 'routines', label: 'Mis Rutinas', icon: Dumbbell, gradient: 'from-blue-500 to-indigo-600' },
    { id: 'diets', label: 'Mi Dieta', icon: Utensils, gradient: 'from-orange-500 to-amber-600' },
    { id: 'progress', label: 'Mi Progreso', icon: TrendingUp, gradient: 'from-pink-500 to-rose-600' },
    { id: 'exercises', label: 'Ejercicios', icon: Dumbbell, gradient: 'from-cyan-500 to-teal-600' },
    { id: 'payments', label: 'Mis Pagos', icon: CreditCard, gradient: 'from-violet-500 to-purple-600' },
  ]

  const renderContent = () => {
    if (currentView === 'student-detail' && selectedStudentId) {
      return <StudentDetailView studentId={selectedStudentId} />
    }
    
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />
      case 'students':
        return <StudentsView />
      case 'exercises':
        return <ExercisesView />
      case 'routines':
        return <RoutinesView />
      case 'diets':
        return <DietsView />
      case 'progress':
        return <ProgressView />
      case 'payments':
        return <PaymentsView />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen z-50",
        "bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700/50",
        "flex flex-col transition-all duration-300 ease-in-out",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
        !sidebarOpen && "lg:w-64 lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Coach Pro</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as typeof currentView)
                setSidebarOpen(false)
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group",
                currentView === item.id
                  ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                  : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform",
                currentView === item.id ? "" : "group-hover:scale-110"
              )} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 ring-2 ring-slate-600">
              <AvatarImage src={session.user.image || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600 text-white font-medium">
                {session.user.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
              <p className="text-xs text-slate-400">
                {isCoach ? 'Coach' : 'Alumno'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="w-full mt-3 text-slate-400 hover:text-white hover:bg-red-500/10 border border-slate-700 hover:border-red-500/50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">Coach Pro</span>
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600 text-white text-xs">
                {session.user.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
