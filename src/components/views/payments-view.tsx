'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  CreditCard,
  Settings,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  FileText,
  Image as ImageIcon,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  X,
  Eye,
  Check,
  XCircle,
  Wallet,
  Building2,
  Smartphone,
  Gift,
  Percent,
  Plus,
  Bell,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Hash,
  User,
  Receipt,
  Trash2,
  Edit2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface PaymentSettings {
  id: string
  monthlyAmount: number
  currency: string
  acceptCash: boolean
  acceptTransfer: boolean
  acceptMercadoPago: boolean
  acceptOther: boolean
  cbu: string | null
  alias: string | null
  holderName: string | null
  mercadoPagoLink: string | null
  otherMethodInfo: string | null
  paymentDueDay: number
}

interface Student {
  id: string
  user: {
    id: string
    name: string | null
    email: string
    isActive: boolean
  }
}

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  month: number
  year: number
  dueDate: string
  paidDate: string | null
  paymentMethod: string | null
  paymentMethodDetail: string | null
  reference: string | null
  receiptUrl: string | null
  receiptUploadedAt: string | null
  rejectionReason: string | null
  notes: string | null
  bonusPercentage: number | null
  isGift: boolean
  student?: {
    id: string
    user: { name: string | null; email: string }
  }
  paidAmount?: number | null
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  entityId?: string
  entityType?: string
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const paymentMethodLabels: Record<string, { label: string; icon: any }> = {
  cash: { label: 'Efectivo', icon: DollarSign },
  transfer: { label: 'Transferencia', icon: Building2 },
  mercadopago: { label: 'Mercado Pago', icon: Smartphone },
  other: { label: 'Otro', icon: Wallet }
}

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  PAID: { label: 'Pagado', bg: 'bg-gradient-to-r from-emerald-500 to-green-500', text: 'text-white', icon: CheckCircle },
  PENDING: { label: 'Pendiente', bg: 'bg-gradient-to-r from-amber-400 to-yellow-500', text: 'text-white', icon: Clock },
  PENDING_VALIDATION: { label: 'A Validar', bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', text: 'text-white', icon: Eye },
  OVERDUE: { label: 'Vencido', bg: 'bg-gradient-to-r from-red-500 to-rose-500', text: 'text-white', icon: AlertCircle },
  REJECTED: { label: 'Rechazado', bg: 'bg-gradient-to-r from-gray-500 to-slate-600', text: 'text-white', icon: XCircle },
  CANCELLED: { label: 'Cancelado', bg: 'bg-gray-400', text: 'text-white', icon: X }
}

export function PaymentsView() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [startMonthDialogOpen, setStartMonthDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [viewReceiptDialogOpen, setViewReceiptDialogOpen] = useState(false)
  const [manualPaymentDialogOpen, setManualPaymentDialogOpen] = useState(false)
  const [notificationsDialogOpen, setNotificationsDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  
  const [settingsForm, setSettingsForm] = useState({
    monthlyAmount: '',
    currency: 'ARS',
    acceptCash: true,
    acceptTransfer: true,
    acceptMercadoPago: false,
    acceptOther: false,
    cbu: '',
    alias: '',
    holderName: '',
    mercadoPagoLink: '',
    otherMethodInfo: '',
    paymentDueDay: '10'
  })

  const [startMonthForm, setStartMonthForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: '',
    dueDay: '10'
  })

  const [uploadForm, setUploadForm] = useState({
    paymentMethod: '',
    reference: '',
    paidDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    receiptFile: null as File | null
  })

  const [manualPaymentForm, setManualPaymentForm] = useState({
    studentId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: '',
    isGift: false,
    bonusPercentage: '',
    notes: ''
  })

  const { toast } = useToast()
  const isCoach = session?.user.role === 'COACH'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [settingsRes, paymentsRes, studentsRes, notificationsRes] = await Promise.all([
        fetch('/api/payment-settings'),
        fetch('/api/payments'),
        fetch('/api/students'),
        fetch('/api/notifications')
      ])
      
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData)
        setSettingsForm({
          monthlyAmount: settingsData.monthlyAmount?.toString() || '',
          currency: settingsData.currency || 'ARS',
          acceptCash: settingsData.acceptCash ?? true,
          acceptTransfer: settingsData.acceptTransfer ?? true,
          acceptMercadoPago: settingsData.acceptMercadoPago ?? false,
          acceptOther: settingsData.acceptOther ?? false,
          cbu: settingsData.cbu || '',
          alias: settingsData.alias || '',
          holderName: settingsData.holderName || '',
          mercadoPagoLink: settingsData.mercadoPagoLink || '',
          otherMethodInfo: settingsData.otherMethodInfo || '',
          paymentDueDay: settingsData.paymentDueDay?.toString() || '10'
        })
        setStartMonthForm(prev => ({
          ...prev,
          amount: settingsData.monthlyAmount?.toString() || '',
          dueDay: settingsData.paymentDueDay?.toString() || '10'
        }))
      }
      
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        setPayments(Array.isArray(paymentsData) ? paymentsData : [])
      }

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json()
        setStudents(Array.isArray(studentsData) ? studentsData : [])
      }

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json()
        setNotifications(Array.isArray(notificationsData) ? notificationsData : [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyAmount: parseFloat(settingsForm.monthlyAmount) || 0,
          currency: settingsForm.currency,
          acceptCash: settingsForm.acceptCash,
          acceptTransfer: settingsForm.acceptTransfer,
          acceptMercadoPago: settingsForm.acceptMercadoPago,
          acceptOther: settingsForm.acceptOther,
          cbu: settingsForm.cbu,
          alias: settingsForm.alias,
          holderName: settingsForm.holderName,
          mercadoPagoLink: settingsForm.mercadoPagoLink,
          otherMethodInfo: settingsForm.otherMethodInfo,
          paymentDueDay: parseInt(settingsForm.paymentDueDay) || 10
        })
      })

      if (!res.ok) throw new Error('Error')

      toast({ title: 'Configuración guardada' })
      setSettingsDialogOpen(false)
      fetchData()
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleStartMonth = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/payments/start-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: startMonthForm.month,
          year: startMonthForm.year,
          amount: parseFloat(startMonthForm.amount) || 0,
          dueDay: parseInt(startMonthForm.dueDay) || 10
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({ 
        title: `¡Mes iniciado! ${data.paymentsCreated} pagos creados`,
        description: `Se notificó a los alumnos`
      })
      setStartMonthDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: error.message || 'Error al iniciar mes', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayment) return

    setSaving(true)

    try {
      let receiptUrl = selectedPayment.receiptUrl

      if (uploadForm.receiptFile) {
        const formData = new FormData()
        formData.append('file', uploadForm.receiptFile)
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          receiptUrl = uploadData.url
        }
      }

      const res = await fetch(`/api/payments/${selectedPayment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PENDING_VALIDATION',
          paymentMethod: uploadForm.paymentMethod,
          reference: uploadForm.reference,
          paidDate: uploadForm.paidDate ? new Date(uploadForm.paidDate).toISOString() : null,
          notes: uploadForm.notes,
          receiptUrl
        })
      })

      if (!res.ok) throw new Error('Error')

      toast({ title: 'Comprobante enviado correctamente' })
      setUploadDialogOpen(false)
      setUploadForm({ paymentMethod: '', reference: '', paidDate: format(new Date(), 'yyyy-MM-dd'), notes: '', receiptFile: null })
      fetchData()
    } catch (error) {
      toast({ title: 'Error al subir comprobante', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleManualPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: manualPaymentForm.studentId,
          month: manualPaymentForm.month,
          year: manualPaymentForm.year,
          amount: parseFloat(manualPaymentForm.amount) || 0,
          isGift: manualPaymentForm.isGift,
          bonusPercentage: parseInt(manualPaymentForm.bonusPercentage) || 0,
          notes: manualPaymentForm.notes
        })
      })

      if (!res.ok) throw new Error('Error')

      toast({ 
        title: manualPaymentForm.isGift ? '¡Mes regalado!' : 'Pago registrado',
        description: manualPaymentForm.isGift 
          ? 'El alumno recibirá una notificación de este regalo'
          : 'El pago ha sido registrado exitosamente'
      })
      setManualPaymentDialogOpen(false)
      setManualPaymentForm({
        studentId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: '',
        isGift: false,
        bonusPercentage: '',
        notes: ''
      })
      fetchData()
    } catch (error) {
      toast({ title: 'Error al registrar pago', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleValidatePayment = async (paymentId: string, validate: boolean, reason?: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: validate ? 'PAID' : 'REJECTED',
          rejectionReason: reason
        })
      })

      if (!res.ok) throw new Error('Error')

      toast({ title: validate ? '¡Pago validado!' : 'Pago rechazado' })
      fetchData()
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Error')

      toast({ title: 'Pago anulado correctamente' })
      setViewReceiptDialogOpen(false)
      fetchData()
    } catch (error) {
      toast({ title: 'Error al anular pago', variant: 'destructive' })
    }
  }

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        body: JSON.stringify({ isRead: true })
      })
      fetchData()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Calculate stats
  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'PENDING').length,
    pendingValidation: payments.filter(p => p.status === 'PENDING_VALIDATION').length,
    paid: payments.filter(p => p.status === 'PAID').length,
    overdue: payments.filter(p => p.status === 'OVERDUE').length,
    totalAmount: payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0),
    pendingAmount: payments.filter(p => ['PENDING', 'PENDING_VALIDATION', 'OVERDUE'].includes(p.status)).reduce((sum, p) => sum + p.amount, 0)
  }

  // Prepare chart data
  const chartData = monthNames.map((name, index) => {
    const monthPayments = payments.filter(p => p.month === index + 1 && p.year === currentYear && p.status === 'PAID')
    return {
      name: monthNamesShort[index],
      Ingresos: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      Esperado: (settings?.monthlyAmount || 0) * students.filter(s => s.user.isActive).length
    }
  })

  // Prepare spreadsheet data
  const activeStudents = students.filter(s => s.user.isActive)
  
  const getPaymentForStudentMonth = (studentId: string, month: number) => {
    return payments.find(p => p.studentId === studentId && p.month === month && p.year === currentYear)
  }

  const unreadNotifications = notifications.filter(n => !n.isRead)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  // Student View
  if (!isCoach) {
    return <StudentPaymentsView 
      payments={payments} 
      settings={settings}
      onUploadReceipt={(payment) => {
        setSelectedPayment(payment)
        setUploadForm({ paymentMethod: '', reference: '', paidDate: format(new Date(), 'yyyy-MM-dd'), notes: '', receiptFile: null })
        setUploadDialogOpen(true)
      }}
      uploadDialogOpen={uploadDialogOpen}
      setUploadDialogOpen={setUploadDialogOpen}
      uploadForm={uploadForm}
      setUploadForm={setUploadForm}
      handleUploadReceipt={handleUploadReceipt}
      saving={saving}
    />
  }

  // Coach View
  return (
    <div className="space-y-6 pb-8">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 border border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10"></div>
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Gestión de Pagos
            </h1>
            <p className="text-slate-400 mt-1">Administra los cobros mensuales de tus alumnos</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => setNotificationsDialogOpen(true)} 
              className="relative border-slate-700 bg-slate-800/50 hover:bg-slate-700 backdrop-blur"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                  {unreadNotifications.length}
                </span>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSettingsDialogOpen(true)} 
              className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 backdrop-blur"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
            <Button 
              onClick={() => setManualPaymentDialogOpen(true)} 
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Pago
            </Button>
            <Button 
              onClick={() => setStartMonthDialogOpen(true)} 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar Mes
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards with gradients */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-transparent"></div>
          <CardContent className="relative p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Pagos</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-700/50">
                <CreditCard className="w-6 h-6 text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border-amber-500/30">
          <CardContent className="relative p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-200">Pendientes</p>
                <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border-blue-500/30">
          <CardContent className="relative p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">A Validar</p>
                <p className="text-2xl font-bold text-blue-400">{stats.pendingValidation}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Eye className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-green-600/10 border-emerald-500/30">
          <CardContent className="relative p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-200">Pagados</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.paid}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-violet-500/20 to-purple-600/10 border-violet-500/30">
          <CardContent className="relative p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-violet-200">Recaudado</p>
                <p className="text-2xl font-bold text-violet-400">${stats.totalAmount.toLocaleString('es-AR')} ARS</p>
              </div>
              <div className="p-3 rounded-xl bg-violet-500/20">
                <TrendingUp className="w-6 h-6 text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Chart */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Ingresos Mensuales</CardTitle>
              <CardDescription className="text-slate-400">Comparativa de ingresos acumulados</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setCurrentYear(currentYear - 1)}
                className="text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-white font-medium px-3">{currentYear}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setCurrentYear(currentYear + 1)}
                className="text-slate-400 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString('es-AR')} ARS`, '']}
                />
                <Legend />
                <Bar dataKey="Ingresos" fill="url(#colorIngresos)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Esperado" fill="url(#colorEsperado)" radius={[4, 4, 0, 0]} opacity={0.5} />
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="colorEsperado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Payment Spreadsheet */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Planilla de Pagos {currentYear}</CardTitle>
              <CardDescription className="text-slate-400">Estado de pagos por alumno y mes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700/50">
                  <th className="sticky left-0 bg-slate-700 z-10 px-4 py-3 text-left text-sm font-medium text-slate-300 min-w-[200px]">
                    Alumno
                  </th>
                  {monthNames.map((month, i) => (
                    <th key={i} className="px-3 py-3 text-center text-xs font-medium text-slate-300 min-w-[80px]">
                      {monthNamesShort[i]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeStudents.map((student, index) => (
                  <tr 
                    key={student.id} 
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${index % 2 === 0 ? 'bg-slate-800/50' : ''}`}
                  >
                    <td className="sticky left-0 bg-inherit z-10 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-medium">
                          {student.user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{student.user.name || 'Sin nombre'}</p>
                          <p className="text-slate-400 text-xs">{student.user.email}</p>
                        </div>
                      </div>
                    </td>
                    {monthNames.map((_, monthIndex) => {
                      const payment = getPaymentForStudentMonth(student.id, monthIndex + 1)
                      const status = payment?.status
                      const config = status ? statusConfig[status] : null

                      return (
                        <td key={monthIndex} className="px-2 py-2 text-center">
                          {payment ? (
                            <button
                              onClick={() => {
                                setSelectedPayment(payment)
                                setViewReceiptDialogOpen(true)
                              }}
                              className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all hover:scale-105 hover:shadow-lg ${config?.bg || 'bg-slate-600'} ${config?.text || 'text-white'} ${payment.isGift ? 'ring-2 ring-pink-400/50' : ''}`}
                              title={payment.isGift ? 'Mes regalado' : payment.bonusPercentage ? `${payment.bonusPercentage}% bonificación` : ''}
                            >
                              <div className="flex items-center justify-center gap-1">
                                {payment.isGift && <Gift className="w-3 h-3" />}
                                {payment.bonusPercentage && payment.bonusPercentage > 0 && <Percent className="w-3 h-3" />}
                                <span>{payment.amount.toLocaleString()}</span>
                              </div>
                            </button>
                          ) : (
                            <div className="w-full py-1.5 px-2 rounded-lg text-xs text-slate-500 bg-slate-700/30">
                              -
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {activeStudents.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">No hay alumnos activos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments to Validate */}
      {stats.pendingValidation > 0 && (
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Pagos Pendientes de Validación
            </CardTitle>
            <CardDescription className="text-slate-400">
              Revisa y valida los comprobantes subidos por tus alumnos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.filter(p => p.status === 'PENDING_VALIDATION').map((payment) => (
                <div 
                  key={payment.id}
                  className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{payment.student?.user.name || payment.student?.user.email}</p>
                        <p className="text-slate-400 text-sm">{monthNames[payment.month - 1]} {payment.year} • ${payment.amount.toLocaleString('es-AR')} ARS</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {payment.receiptUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPayment(payment)
                          setViewReceiptDialogOpen(true)
                        }}
                        className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleValidatePayment(payment.id, true)}
                      className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Validar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const reason = prompt('Razón del rechazo:')
                        if (reason) handleValidatePayment(payment.id, false, reason)
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Configuración de Pagos</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configura los métodos de pago disponibles para tus alumnos
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Monto Mensual</Label>
                <Input
                  type="number"
                  value={settingsForm.monthlyAmount}
                  onChange={(e) => setSettingsForm({ ...settingsForm, monthlyAmount: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 focus:border-emerald-500"
                  placeholder="5000"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Moneda</Label>
                <select
                  value={settingsForm.currency}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                  className="w-full bg-slate-700/50 border-slate-600 rounded-lg p-2 text-white focus:border-emerald-500"
                >
                  <option value="ARS">ARS ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Día de vencimiento</Label>
              <Input
                type="number"
                min="1"
                max="28"
                value={settingsForm.paymentDueDay}
                onChange={(e) => setSettingsForm({ ...settingsForm, paymentDueDay: e.target.value })}
                className="bg-slate-700/50 border-slate-600 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-700">
              <Label className="text-base text-slate-200">Métodos de Pago Aceptados</Label>
              
              <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                <input
                  type="checkbox"
                  id="acceptCash"
                  checked={settingsForm.acceptCash}
                  onChange={(e) => setSettingsForm({ ...settingsForm, acceptCash: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500"
                />
                <Label htmlFor="acceptCash" className="font-normal text-slate-300">Efectivo</Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="acceptTransfer"
                    checked={settingsForm.acceptTransfer}
                    onChange={(e) => setSettingsForm({ ...settingsForm, acceptTransfer: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <Label htmlFor="acceptTransfer" className="font-normal text-slate-300">Transferencia Bancaria</Label>
                </div>
                {settingsForm.acceptTransfer && (
                  <div className="pl-6 space-y-2">
                    <Input
                      value={settingsForm.cbu}
                      onChange={(e) => setSettingsForm({ ...settingsForm, cbu: e.target.value })}
                      className="bg-slate-700/50 border-slate-600"
                      placeholder="CBU"
                    />
                    <Input
                      value={settingsForm.alias}
                      onChange={(e) => setSettingsForm({ ...settingsForm, alias: e.target.value })}
                      className="bg-slate-700/50 border-slate-600"
                      placeholder="Alias (ej: COACH.PESAS.JUAN)"
                    />
                    <Input
                      value={settingsForm.holderName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, holderName: e.target.value })}
                      className="bg-slate-700/50 border-slate-600"
                      placeholder="Titular de la cuenta"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="acceptMercadoPago"
                    checked={settingsForm.acceptMercadoPago}
                    onChange={(e) => setSettingsForm({ ...settingsForm, acceptMercadoPago: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <Label htmlFor="acceptMercadoPago" className="font-normal text-slate-300">Mercado Pago</Label>
                </div>
                {settingsForm.acceptMercadoPago && (
                  <div className="pl-6">
                    <Input
                      value={settingsForm.mercadoPagoLink}
                      onChange={(e) => setSettingsForm({ ...settingsForm, mercadoPagoLink: e.target.value })}
                      className="bg-slate-700/50 border-slate-600"
                      placeholder="Alias o CVU de Mercado Pago"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                <input
                  type="checkbox"
                  id="acceptOther"
                  checked={settingsForm.acceptOther}
                  onChange={(e) => setSettingsForm({ ...settingsForm, acceptOther: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500"
                />
                <Label htmlFor="acceptOther" className="font-normal text-slate-300">Otro (especificar)</Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setSettingsDialogOpen(false)} className="text-slate-400">
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Start Month Dialog */}
      <Dialog open={startMonthDialogOpen} onOpenChange={setStartMonthDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Iniciar Mes de Cobranza</DialogTitle>
            <DialogDescription className="text-slate-400">
              Se notificará a todos los alumnos activos sobre el nuevo pago pendiente
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStartMonth} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Mes</Label>
                <select
                  value={startMonthForm.month}
                  onChange={(e) => setStartMonthForm({ ...startMonthForm, month: parseInt(e.target.value) })}
                  className="w-full bg-slate-700/50 border-slate-600 rounded-lg p-2 text-white"
                >
                  {monthNames.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Año</Label>
                <Input
                  type="number"
                  value={startMonthForm.year}
                  onChange={(e) => setStartMonthForm({ ...startMonthForm, year: parseInt(e.target.value) })}
                  className="bg-slate-700/50 border-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Monto</Label>
                <Input
                  type="number"
                  value={startMonthForm.amount}
                  onChange={(e) => setStartMonthForm({ ...startMonthForm, amount: e.target.value })}
                  className="bg-slate-700/50 border-slate-600"
                  placeholder={settings?.monthlyAmount?.toString() || '0'}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Día de Vencimiento</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={startMonthForm.dueDay}
                  onChange={(e) => setStartMonthForm({ ...startMonthForm, dueDay: e.target.value })}
                  className="bg-slate-700/50 border-slate-600"
                />
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-sm text-blue-300">
                Se crearán pagos pendientes para todos los alumnos activos y recibirán una notificación.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStartMonthDialogOpen(false)} className="text-slate-400">
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" disabled={saving}>
                {saving ? 'Procesando...' : 'Iniciar Mes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Payment Dialog */}
      <Dialog open={manualPaymentDialogOpen} onOpenChange={setManualPaymentDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Agregar Pago Manual</DialogTitle>
            <DialogDescription className="text-slate-400">
              Registra un pago manualmente o regala meses a tus alumnos
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleManualPayment} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Alumno</Label>
              <select
                value={manualPaymentForm.studentId}
                onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, studentId: e.target.value })}
                className="w-full bg-slate-700/50 border-slate-600 rounded-lg p-2 text-white"
                required
              >
                <option value="">Seleccionar alumno</option>
                {activeStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.user.name || student.user.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Mes</Label>
                <select
                  value={manualPaymentForm.month}
                  onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, month: parseInt(e.target.value) })}
                  className="w-full bg-slate-700/50 border-slate-600 rounded-lg p-2 text-white"
                >
                  {monthNames.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Año</Label>
                <Input
                  type="number"
                  value={manualPaymentForm.year}
                  onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, year: parseInt(e.target.value) })}
                  className="bg-slate-700/50 border-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Monto</Label>
              <Input
                type="number"
                value={manualPaymentForm.amount}
                onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, amount: e.target.value })}
                className="bg-slate-700/50 border-slate-600"
                placeholder={settings?.monthlyAmount?.toString() || '0'}
              />
            </div>

            {/* Gift Option */}
            <div className="p-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isGift"
                  checked={manualPaymentForm.isGift}
                  onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, isGift: e.target.checked })}
                  className="w-4 h-4 accent-pink-500"
                />
                <Label htmlFor="isGift" className="font-medium text-pink-300 flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Regalar este mes
                </Label>
              </div>
              <p className="text-xs text-pink-400/70 pl-7">
                El alumno recibirá una notificación especial de este regalo
              </p>
            </div>

            {/* Bonus Option */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Bonificación (%)
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={manualPaymentForm.bonusPercentage}
                onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, bonusPercentage: e.target.value })}
                className="bg-slate-700/50 border-slate-600"
                placeholder="Ej: 10 para 10% de descuento"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Notas</Label>
              <Textarea
                value={manualPaymentForm.notes}
                onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, notes: e.target.value })}
                className="bg-slate-700/50 border-slate-600"
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setManualPaymentDialogOpen(false)} className="text-slate-400">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className={manualPaymentForm.isGift 
                  ? "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                  : "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                }
                disabled={saving}
              >
                {saving ? 'Procesando...' : manualPaymentForm.isGift ? 'Regalar Mes' : 'Registrar Pago'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={notificationsDialogOpen} onOpenChange={setNotificationsDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificaciones
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No hay notificaciones
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 rounded-lg ${notification.isRead ? 'bg-slate-700/30' : 'bg-slate-700/70 border border-slate-600'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white text-sm">{notification.title}</p>
                      <p className="text-slate-400 text-xs mt-1">{notification.message}</p>
                      <p className="text-slate-500 text-xs mt-2">
                        {format(new Date(notification.createdAt), 'dd MMM HH:mm', { locale: es })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkNotificationRead(notification.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Receipt Dialog */}
      <Dialog open={viewReceiptDialogOpen} onOpenChange={setViewReceiptDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                Detalle del Pago
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setViewReceiptDialogOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="p-4 space-y-4">
              {/* Información del alumno */}
              {selectedPayment.student && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Alumno</p>
                      <p className="text-white font-medium text-lg">{selectedPayment.student.user.name || 'Sin nombre'}</p>
                      <p className="text-slate-500 text-sm">{selectedPayment.student.user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Información del pago */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Período
                  </div>
                  <p className="text-white font-medium text-lg">{monthNames[selectedPayment.month - 1]} {selectedPayment.year}</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/10 rounded-lg p-4 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
                    <DollarSign className="w-4 h-4" />
                    Monto
                  </div>
                  <p className="text-white font-bold text-2xl">${selectedPayment.amount.toLocaleString('es-AR')} ARS</p>
                </div>

                {selectedPayment.paidDate && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <CheckCircle className="w-4 h-4" />
                      Fecha de Pago
                    </div>
                    <p className="text-white font-medium">{format(new Date(selectedPayment.paidDate), 'dd MMM yyyy', { locale: es })}</p>
                  </div>
                )}

                {selectedPayment.paymentMethod && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <CreditCard className="w-4 h-4" />
                      Método de Pago
                    </div>
                    <p className="text-white font-medium flex items-center gap-2">
                      {React.createElement(paymentMethodLabels[selectedPayment.paymentMethod]?.icon || Wallet, { className: 'w-4 h-4 text-emerald-400' })}
                      {paymentMethodLabels[selectedPayment.paymentMethod]?.label || selectedPayment.paymentMethod}
                    </p>
                  </div>
                )}

                {selectedPayment.reference && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 col-span-2">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Hash className="w-4 h-4" />
                      Referencia / Número de Operación
                    </div>
                    <p className="text-white font-medium font-mono">{selectedPayment.reference}</p>
                  </div>
                )}

                {selectedPayment.paymentMethodDetail && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 col-span-2">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Building2 className="w-4 h-4" />
                      Detalle del Método de Pago
                    </div>
                    <p className="text-white font-medium">{selectedPayment.paymentMethodDetail}</p>
                  </div>
                )}

                {selectedPayment.notes && (
                  <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/30 col-span-2">
                    <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
                      <FileText className="w-4 h-4" />
                      Notas del Alumno
                    </div>
                    <p className="text-white">{selectedPayment.notes}</p>
                  </div>
                )}
              </div>

              {/* Comprobante */}
              {selectedPayment.receiptUrl && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                    <Receipt className="w-4 h-4" />
                    Comprobante Adjunto
                  </div>
                  {selectedPayment.receiptUrl.toLowerCase().endsWith('.pdf') ? (
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedPayment.receiptUrl, '_blank')}
                      className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Abrir PDF en nueva pestaña
                    </Button>
                  ) : (
                    <img src={selectedPayment.receiptUrl} alt="Comprobante" className="w-full rounded-lg max-h-96 object-contain bg-slate-700" />
                  )}
                </div>
              )}

              {/* Botones de acción */}
              {selectedPayment.status === 'PENDING_VALIDATION' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                    onClick={() => {
                      handleValidatePayment(selectedPayment.id, true)
                      setViewReceiptDialogOpen(false)
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Validar Pago
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      const reason = prompt('Razón del rechazo:')
                      if (reason) {
                        handleValidatePayment(selectedPayment.id, false, reason)
                        setViewReceiptDialogOpen(false)
                      }
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              )}
              
              {/* Anular pago pendiente */}
              {selectedPayment.status === 'PENDING' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      if (confirm('¿Estás seguro de anular este pago? El alumno no recibirá notificación y podrás crear uno nuevo.')) {
                        handleDeletePayment(selectedPayment.id)
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Anular Pago
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Student Payments View Component
function StudentPaymentsView({ 
  payments, 
  settings,
  onUploadReceipt,
  uploadDialogOpen,
  setUploadDialogOpen,
  uploadForm,
  setUploadForm,
  handleUploadReceipt,
  saving
}: {
  payments: Payment[]
  settings: PaymentSettings | null
  onUploadReceipt: (payment: Payment) => void
  uploadDialogOpen: boolean
  setUploadDialogOpen: (open: boolean) => void
  uploadForm: { paymentMethod: string; reference: string; paidDate: string; notes: string; receiptFile: File | null }
  setUploadForm: (form: { paymentMethod: string; reference: string; paidDate: string; notes: string; receiptFile: File | null }) => void
  handleUploadReceipt: (e: React.FormEvent) => void
  saving: boolean
}) {
  const [viewReceiptDialogOpen, setViewReceiptDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const pendingPayments = payments.filter(p => ['PENDING', 'PENDING_VALIDATION', 'OVERDUE', 'REJECTED'].includes(p.status))
  const paidPayments = payments.filter(p => p.status === 'PAID')

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 border border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10"></div>
        <div className="relative">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Mis Pagos
          </h1>
          <p className="text-slate-400 mt-1">Gestiona tus cuotas mensuales</p>
        </div>
      </div>

      {/* Payment Methods Info */}
      {settings && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white text-lg">Métodos de Pago Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {settings.acceptCash && (
                <div className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-700/30 rounded-xl border border-slate-600/50">
                  <DollarSign className="w-6 h-6 text-emerald-400 mb-2" />
                  <p className="font-medium text-white">Efectivo</p>
                  <p className="text-xs text-slate-400">Paga en persona</p>
                </div>
              )}
              {settings.acceptTransfer && (
                <div className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-700/30 rounded-xl border border-slate-600/50">
                  <Building2 className="w-6 h-6 text-emerald-400 mb-2" />
                  <p className="font-medium text-white">Transferencia</p>
                  {settings.alias && <p className="text-xs text-slate-300">Alias: {settings.alias}</p>}
                  {settings.cbu && <p className="text-xs text-slate-300">CBU: {settings.cbu}</p>}
                  {settings.holderName && <p className="text-xs text-slate-400">Titular: {settings.holderName}</p>}
                </div>
              )}
              {settings.acceptMercadoPago && settings.mercadoPagoLink && (
                <div className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-700/30 rounded-xl border border-slate-600/50">
                  <Smartphone className="w-6 h-6 text-emerald-400 mb-2" />
                  <p className="font-medium text-white">Mercado Pago</p>
                  <p className="text-xs text-slate-300 font-mono">{settings.mercadoPagoLink}</p>
                </div>
              )}
              {settings.acceptOther && settings.otherMethodInfo && (
                <div className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-700/30 rounded-xl border border-slate-600/50">
                  <Wallet className="w-6 h-6 text-emerald-400 mb-2" />
                  <p className="font-medium text-white">Otro método</p>
                  <p className="text-xs text-slate-300">{settings.otherMethodInfo}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white">Pagos Pendientes</h2>
          {pendingPayments.map((payment) => {
            const config = statusConfig[payment.status] || statusConfig.PENDING
            return (
              <Card key={payment.id} className={`bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 ${payment.status === 'OVERDUE' ? 'border-red-500/50' : payment.status === 'PENDING_VALIDATION' ? 'border-blue-500/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center`}>
                        <config.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">${payment.amount.toLocaleString('es-AR')} ARS</p>
                        <p className="text-slate-400">{monthNames[payment.month - 1]} {payment.year}</p>
                        {payment.status === 'PENDING' && (
                          <p className="text-sm text-yellow-400">Vence: {format(new Date(payment.dueDate), 'dd MMM yyyy', { locale: es })}</p>
                        )}
                        {payment.status === 'PENDING_VALIDATION' && (
                          <p className="text-sm text-blue-400">Comprobante enviado, esperando validación</p>
                        )}
                        {payment.status === 'REJECTED' && payment.rejectionReason && (
                          <p className="text-sm text-red-400">Rechazado: {payment.rejectionReason}</p>
                        )}
                        {payment.isGift && (
                          <p className="text-sm text-pink-400 flex items-center gap-1">
                            <Gift className="w-4 h-4" /> ¡Mes regalado!
                          </p>
                        )}
                        {payment.bonusPercentage && payment.bonusPercentage > 0 && (
                          <p className="text-sm text-emerald-400">{payment.bonusPercentage}% bonificación</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${config.bg} ${config.text}`}>
                        {config.label}
                      </Badge>
                      {(payment.status === 'PENDING' || payment.status === 'REJECTED') && (
                        <Button onClick={() => onUploadReceipt(payment)} className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25">
                          <Upload className="w-4 h-4 mr-2" />
                          {payment.status === 'REJECTED' ? 'Reenviar' : 'Subir Comprobante'}
                        </Button>
                      )}
                      {payment.receiptUrl && (
                        <Button variant="outline" onClick={() => { setSelectedPayment(payment); setViewReceiptDialogOpen(true) }} className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Paid Payments */}
      {paidPayments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white">Historial de Pagos</h2>
          <div className="grid gap-2">
            {paidPayments.map((payment) => (
              <Card key={payment.id} className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">${payment.amount.toLocaleString('es-AR')} ARS</p>
                      <p className="text-sm text-slate-400">{monthNames[payment.month - 1]} {payment.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {payment.isGift && <Gift className="w-4 h-4 text-pink-400" />}
                    <Badge className="bg-gradient-to-r from-emerald-500 to-green-600">Pagado</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {payments.length === 0 && (
        <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50">
          <CreditCard className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 text-lg">No tienes pagos registrados</p>
        </div>
      )}

      {/* Upload Receipt Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Subir Comprobante de Pago</DialogTitle>
            <DialogDescription className="text-slate-400">
              Completa los datos de tu pago y sube el comprobante
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadReceipt} className="space-y-4">
            {/* Payment Methods Info */}
            {settings && (
              <div className="bg-slate-700/30 rounded-lg p-3 mb-4 space-y-2">
                <p className="text-sm font-medium text-slate-300 mb-2">Vías de pago habilitadas:</p>
                {settings.acceptTransfer && settings.alias && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">Alias: <span className="text-white font-mono">{settings.alias}</span></span>
                  </div>
                )}
                {settings.acceptTransfer && settings.cbu && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">CBU: <span className="text-white font-mono">{settings.cbu}</span></span>
                  </div>
                )}
                {settings.acceptTransfer && settings.holderName && (
                  <div className="text-sm text-slate-400 ml-6">Titular: {settings.holderName}</div>
                )}
                {settings.acceptMercadoPago && settings.mercadoPagoLink && (
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">Mercado Pago: <span className="text-white font-mono">{settings.mercadoPagoLink}</span></span>
                  </div>
                )}
                {settings.acceptCash && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">Efectivo (pagar en persona)</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300">Método de Pago *</Label>
                <select
                  value={uploadForm.paymentMethod}
                  onChange={(e) => setUploadForm({ ...uploadForm, paymentMethod: e.target.value })}
                  className="w-full bg-slate-700/50 border-slate-600 rounded-lg p-2 text-white"
                  required
                >
                  <option value="">Seleccionar</option>
                  {settings?.acceptCash && <option value="cash">Efectivo</option>}
                  {settings?.acceptTransfer && <option value="transfer">Transferencia</option>}
                  {settings?.acceptMercadoPago && <option value="mercadopago">Mercado Pago</option>}
                  {settings?.acceptOther && <option value="other">Otro</option>}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Fecha de Pago *</Label>
                <Input
                  type="date"
                  value={uploadForm.paidDate}
                  onChange={(e) => setUploadForm({ ...uploadForm, paidDate: e.target.value })}
                  className="bg-slate-700/50 border-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Referencia / Número de Operación</Label>
              <Input
                value={uploadForm.reference}
                onChange={(e) => setUploadForm({ ...uploadForm, reference: e.target.value })}
                className="bg-slate-700/50 border-slate-600"
                placeholder="Ej: 123456789"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Notas adicionales</Label>
              <Textarea
                value={uploadForm.notes}
                onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                className="bg-slate-700/50 border-slate-600 resize-none"
                placeholder="Algún comentario para el coach..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Comprobante (Imagen o PDF)</Label>
              <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-emerald-500/50 transition-colors">
                <input
                  type="file"
                  id="receiptFile"
                  accept="image/*,.pdf"
                  onChange={(e) => setUploadForm({ ...uploadForm, receiptFile: e.target.files?.[0] || null })}
                  className="hidden"
                />
                <label htmlFor="receiptFile" className="cursor-pointer">
                  {uploadForm.receiptFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-400">
                      {uploadForm.receiptFile.type.includes('image') ? <ImageIcon className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                      <span>{uploadForm.receiptFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-slate-500 mb-3" />
                      <p className="text-slate-300">Click para subir archivo</p>
                      <p className="text-xs text-slate-500 mt-1">PNG, JPG, PDF hasta 5MB</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setUploadDialogOpen(false)} className="text-slate-400">
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700" disabled={saving}>
                {saving ? 'Enviando...' : 'Enviar Comprobante'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Receipt Dialog */}
      <Dialog open={viewReceiptDialogOpen} onOpenChange={setViewReceiptDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                Mi Comprobante
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setViewReceiptDialogOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="p-4 space-y-4">
              {/* Información del pago */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Período
                  </div>
                  <p className="text-white font-medium text-lg">{monthNames[selectedPayment.month - 1]} {selectedPayment.year}</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/10 rounded-lg p-4 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
                    <DollarSign className="w-4 h-4" />
                    Monto
                  </div>
                  <p className="text-white font-bold text-2xl">${selectedPayment.amount.toLocaleString('es-AR')} ARS</p>
                </div>

                {selectedPayment.paidDate && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <CheckCircle className="w-4 h-4" />
                      Fecha de Pago
                    </div>
                    <p className="text-white font-medium">{format(new Date(selectedPayment.paidDate), 'dd MMM yyyy', { locale: es })}</p>
                  </div>
                )}

                {selectedPayment.paymentMethod && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <CreditCard className="w-4 h-4" />
                      Método de Pago
                    </div>
                    <p className="text-white font-medium">{paymentMethodLabels[selectedPayment.paymentMethod]?.label || selectedPayment.paymentMethod}</p>
                  </div>
                )}

                {selectedPayment.reference && (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 col-span-2">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Hash className="w-4 h-4" />
                      Referencia / Número de Operación
                    </div>
                    <p className="text-white font-medium font-mono">{selectedPayment.reference}</p>
                  </div>
                )}

                {selectedPayment.notes && (
                  <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/30 col-span-2">
                    <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
                      <FileText className="w-4 h-4" />
                      Notas
                    </div>
                    <p className="text-white">{selectedPayment.notes}</p>
                  </div>
                )}
              </div>

              {/* Comprobante */}
              {selectedPayment.receiptUrl && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                    <Receipt className="w-4 h-4" />
                    Comprobante Adjunto
                  </div>
                  {selectedPayment.receiptUrl.toLowerCase().endsWith('.pdf') ? (
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedPayment.receiptUrl, '_blank')}
                      className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Abrir PDF en nueva pestaña
                    </Button>
                  ) : (
                    <img src={selectedPayment.receiptUrl} alt="Comprobante" className="w-full rounded-lg max-h-96 object-contain bg-slate-700" />
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
