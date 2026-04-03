'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Dumbbell,
  Utensils,
  TrendingUp,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Save,
  X,
  Phone,
  Mail,
  Calendar,
  Target,
  User,
  CheckCircle,
  Camera,
  Eye,
  ImageIcon,
  Clock,
  Link,
  GripVertical,
  MessageCircle,
  MessageSquare,
  History,
  Key,
  Loader2
} from 'lucide-react'
import { useAppStore } from '@/hooks/use-store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { RestTimer } from '@/components/ui/rest-timer'
import { RoutineEditor } from '@/components/routines/routine-editor'

interface StudentDetail {
  id: string
  userId: string
  phone: string | null
  birthDate: string | null
  goals: string | null
  notes: string | null
  startDate: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    isActive: boolean
    image: string | null
    createdAt: string
  }
  routines: Routine[]
  diets: Diet[]
  progress: ProgressRecord[]
  payments: Payment[]
}

interface Exercise {
  id: string
  name: string
  muscleGroup: string
}

interface RoutineExercise {
  id: string
  exerciseName: string
  sets: number
  reps: string
  weight: string | null
  restTime: string | null
  notes: string | null
  studentNotes: string | null
  isSuperset: boolean
  supersetGroupId: string | null
  supersetOrder: number | null
  order: number
}

interface RoutineWeek {
  id: string
  weekNumber: number
  exercises: RoutineExercise[]
}

interface TrainingDay {
  id: string
  name: string
  dayNumber: number
  muscleGroups: string | null
  exercises: RoutineExercise[]
  weeks: RoutineWeek[]
}

interface Routine {
  id: string
  name: string
  description: string | null
  isArchived: boolean
  trainingDays: TrainingDay[]
}

interface Meal {
  id: string
  name: string
  time: string | null
  foods: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fats: number | null
  notes: string | null
  order: number
}

interface Diet {
  id: string
  name: string
  description: string | null
  totalCalories: number | null
  proteinGoal: number | null
  carbsGoal: number | null
  fatsGoal: number | null
  isArchived: boolean
  isActive: boolean
  meals: Meal[]
}

interface ProgressRecord {
  id: string
  date: string
  weight: number | null
  bodyFat: number | null
  height: number | null
  muscleMass: number | null
  neck: number | null
  shoulders: number | null
  chest: number | null
  waist: number | null
  hip: number | null
  rightArm: number | null
  leftArm: number | null
  rightForearm: number | null
  leftForearm: number | null
  rightThigh: number | null
  leftThigh: number | null
  rightCalf: number | null
  leftCalf: number | null
  frontPhoto: string | null
  backPhoto: string | null
  sidePhoto: string | null
  notes: string | null
  coachNotes: string | null
}

interface Payment {
  id: string
  amount: number
  status: string
  dueDate: string
  paidDate: string | null
  method: string | null
  notes: string | null
}

export function StudentDetailView({ studentId }: { studentId: string }) {
  const { data: session } = useSession()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const { setCurrentView } = useAppStore()
  const { toast } = useToast()

  // Routine state
  const [routineEditorOpen, setRoutineEditorOpen] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [savingRoutine, setSavingRoutine] = useState(false)
  const [showArchivedRoutines, setShowArchivedRoutines] = useState(false)
  const [selectedDays, setSelectedDays] = useState<Record<string, string>>({})
  const [archiveRoutineConfirmOpen, setArchiveRoutineConfirmOpen] = useState(false)
  const [activeRoutineToArchive, setActiveRoutineToArchive] = useState<Routine | null>(null)
  
  // Timer state
  const [timerOpen, setTimerOpen] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(60)

  // Diet state
  const [dietDialogOpen, setDietDialogOpen] = useState(false)
  const [editingDiet, setEditingDiet] = useState<Diet | null>(null)
  const [dietForm, setDietForm] = useState({
    name: '',
    description: '',
    totalCalories: '',
    proteinGoal: '',
    carbsGoal: '',
    fatsGoal: '',
    meals: [] as any[]
  })
  const [showArchivedDiets, setShowArchivedDiets] = useState(false)
  const [archiveDietConfirmOpen, setArchiveDietConfirmOpen] = useState(false)
  const [activeDietToArchive, setActiveDietToArchive] = useState<Diet | null>(null)
  const [activeTab, setActiveTab] = useState('routines')

  // Progress state
  const [progressDialogOpen, setProgressDialogOpen] = useState(false)
  const [editingProgress, setEditingProgress] = useState<ProgressRecord | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null)
  const [progressForm, setProgressForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
    back: '',
    chest: '',
    rightArm: '',
    leftArm: '',
    waist: '',
    hip: '',
    rightThigh: '',
    leftThigh: '',
    frontPhoto: '',
    backPhoto: '',
    sidePhoto: '',
    notes: ''
  })
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<{front: string | null, back: string | null, side: string | null}>({front: null, back: null, side: null})
  const [activePhoto, setActivePhoto] = useState<'front' | 'back' | 'side'>('front')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['weight'])
  
  // Coach notes state
  const [coachNotesDialogOpen, setCoachNotesDialogOpen] = useState(false)
  const [editingCoachNotes, setEditingCoachNotes] = useState<ProgressRecord | null>(null)
  const [coachNotesText, setCoachNotesText] = useState('')
  const [savingCoachNotes, setSavingCoachNotes] = useState(false)

  // Payment state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    dueDate: '',
    method: '',
    notes: ''
  })

  // Reset password state
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  const isCoach = session?.user.role === 'COACH'

  const refetchStudent = async () => {
    try {
      const includeArchived = showArchivedRoutines || showArchivedDiets
      const res = await fetch(`/api/students/${studentId}?includeArchived=${includeArchived}`)
      const data = await res.json()
      setStudent(data)
    } catch (error) {
      console.error('Error fetching student:', error)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const includeArchived = showArchivedRoutines || showArchivedDiets
        const res = await fetch(`/api/students/${studentId}?includeArchived=${includeArchived}`)
        const data = await res.json()
        setStudent(data)
      } catch (error) {
        console.error('Error fetching student:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    fetchExercises()
  }, [studentId, showArchivedRoutines, showArchivedDiets])

  const fetchExercises = async () => {
    try {
      const res = await fetch('/api/exercises')
      const data = await res.json()
      setExercises(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
      setExercises([])
    }
  }

  // Routine functions
  const openCreateRoutine = () => {
    // Check if there's an active routine
    const activeRoutine = student?.routines.find(r => !r.isArchived)
    if (activeRoutine) {
      setActiveRoutineToArchive(activeRoutine)
      setArchiveRoutineConfirmOpen(true)
    } else {
      setEditingRoutine(null)
      setRoutineEditorOpen(true)
    }
  }

  const confirmArchiveAndCreateRoutine = async () => {
    if (!activeRoutineToArchive) return
    
    try {
      // Archive the existing routine
      const res = await fetch(`/api/routines/${activeRoutineToArchive.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      })

      if (!res.ok) throw new Error('Error')
      
      toast({ title: 'Rutina anterior archivada' })
      setArchiveRoutineConfirmOpen(false)
      setActiveRoutineToArchive(null)
      
      // Refresh data and open editor
      await refetchStudent()
      setEditingRoutine(null)
      setRoutineEditorOpen(true)
    } catch (error) {
      toast({ title: 'Error al archivar', variant: 'destructive' })
    }
  }

  const openEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine)
    setRoutineEditorOpen(true)
  }

  const handleSaveRoutine = async (data: { name: string; description?: string; trainingDays: any[] }) => {
    setSavingRoutine(true)
    try {
      const url = editingRoutine 
        ? `/api/routines/${editingRoutine.id}`
        : '/api/routines'
      const method = editingRoutine ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          studentId,
          trainingDays: data.trainingDays
        })
      })

      const responseData = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast({ title: responseData.error || 'Error al guardar', variant: 'destructive' })
        return
      }

      toast({ title: editingRoutine ? 'Rutina actualizada' : 'Rutina creada' })
      setRoutineEditorOpen(false)
      refetchStudent()
    } catch (error) {
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSavingRoutine(false)
    }
  }

  const handleArchiveRoutine = async (routineId: string, archive: boolean) => {
    try {
      const res = await fetch(`/api/routines/${routineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: archive })
      })

      if (!res.ok) throw new Error('Error')
      toast({ title: archive ? 'Rutina archivada' : 'Rutina desarchivada' })
      refetchStudent()
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const handleDeleteRoutine = async (routineId: string) => {
    if (!confirm('¿Eliminar esta rutina?')) return
    try {
      const res = await fetch(`/api/routines/${routineId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error')
      toast({ title: 'Rutina eliminada' })
      refetchStudent()
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  // Diet functions
  const openCreateDiet = () => {
    // Check if there's an active diet
    const activeDiet = student?.diets.find(d => !d.isArchived)
    if (activeDiet) {
      setActiveDietToArchive(activeDiet)
      setArchiveDietConfirmOpen(true)
    } else {
      setEditingDiet(null)
      setDietForm({
        name: '',
        description: '',
        totalCalories: '',
        proteinGoal: '',
        carbsGoal: '',
        fatsGoal: '',
        meals: []
      })
      setDietDialogOpen(true)
    }
  }

  const confirmArchiveAndCreateDiet = async () => {
    if (!activeDietToArchive) return
    
    try {
      // Archive the existing diet
      const res = await fetch(`/api/diets/${activeDietToArchive.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      })

      if (!res.ok) throw new Error('Error')
      
      toast({ title: 'Dieta anterior archivada' })
      setArchiveDietConfirmOpen(false)
      setActiveDietToArchive(null)
      
      // Refresh data and open editor
      await refetchStudent()
      setEditingDiet(null)
      setDietForm({
        name: '',
        description: '',
        totalCalories: '',
        proteinGoal: '',
        carbsGoal: '',
        fatsGoal: '',
        meals: []
      })
      setDietDialogOpen(true)
    } catch (error) {
      toast({ title: 'Error al archivar', variant: 'destructive' })
    }
  }

  const openEditDiet = (diet: Diet) => {
    setEditingDiet(diet)
    setDietForm({
      name: diet.name,
      description: diet.description || '',
      totalCalories: diet.totalCalories?.toString() || '',
      proteinGoal: diet.proteinGoal?.toString() || '',
      carbsGoal: diet.carbsGoal?.toString() || '',
      fatsGoal: diet.fatsGoal?.toString() || '',
      meals: diet.meals.map(m => ({
        name: m.name,
        time: m.time || '',
        foods: m.foods,
        calories: m.calories?.toString() || '',
        protein: m.protein?.toString() || '',
        carbs: m.carbs?.toString() || '',
        fats: m.fats?.toString() || '',
        notes: m.notes || ''
      }))
    })
    setDietDialogOpen(true)
  }

  const handleSaveDiet = async () => {
    if (!dietForm.name) {
      toast({ title: 'El nombre es requerido', variant: 'destructive' })
      return
    }

    const validMeals = dietForm.meals.filter(meal => 
      meal.name && meal.name.trim() !== '' && meal.foods && meal.foods.trim() !== ''
    )

    try {
      const url = editingDiet 
        ? `/api/diets/${editingDiet.id}`
        : '/api/diets'
      const method = editingDiet ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dietForm.name,
          description: dietForm.description,
          studentId,
          totalCalories: dietForm.totalCalories ? parseInt(dietForm.totalCalories) : null,
          proteinGoal: dietForm.proteinGoal ? parseInt(dietForm.proteinGoal) : null,
          carbsGoal: dietForm.carbsGoal ? parseInt(dietForm.carbsGoal) : null,
          fatsGoal: dietForm.fatsGoal ? parseInt(dietForm.fatsGoal) : null,
          meals: validMeals
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: data.error || 'Error al guardar', variant: 'destructive' })
        return
      }

      toast({ title: editingDiet ? 'Dieta actualizada' : 'Dieta creada' })
      setDietDialogOpen(false)
      refetchStudent()
    } catch (error) {
      toast({ title: 'Error de conexión', variant: 'destructive' })
    }
  }

  const handleArchiveDiet = async (dietId: string, archive: boolean) => {
    try {
      const res = await fetch(`/api/diets/${dietId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: archive })
      })
      if (!res.ok) throw new Error('Error')
      toast({ title: archive ? 'Dieta archivada' : 'Dieta desarchivada' })
      refetchStudent()
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const handleDeleteDiet = async (dietId: string) => {
    if (!confirm('¿Eliminar esta dieta?')) return
    try {
      const res = await fetch(`/api/diets/${dietId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error')
      toast({ title: 'Dieta eliminada' })
      refetchStudent()
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  const addMealToDiet = () => {
    setDietForm(prev => ({
      ...prev,
      meals: [...prev.meals, { name: '', time: '', foods: '', calories: '', protein: '', carbs: '', fats: '', notes: '' }]
    }))
  }

  const updateMeal = (index: number, field: string, value: string) => {
    setDietForm(prev => ({
      ...prev,
      meals: prev.meals.map((m, i) => i === index ? { ...m, [field]: value } : m)
    }))
  }

  const removeMeal = (index: number) => {
    setDietForm(prev => ({
      ...prev,
      meals: prev.meals.filter((_, i) => i !== index)
    }))
  }

  // Progress functions
  const openCreateProgress = () => {
    setEditingProgress(null)
    setProgressForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      weight: '',
      back: '',
      chest: '',
      rightArm: '',
      leftArm: '',
      waist: '',
      hip: '',
      rightThigh: '',
      leftThigh: '',
      frontPhoto: '',
      backPhoto: '',
      sidePhoto: '',
      notes: ''
    })
    setProgressDialogOpen(true)
  }

  const openEditProgress = (record: ProgressRecord) => {
    setEditingProgress(record)
    setProgressForm({
      date: format(new Date(record.date), 'yyyy-MM-dd'),
      weight: record.weight?.toString() || '',
      back: record.shoulders?.toString() || '',
      chest: record.chest?.toString() || '',
      rightArm: record.rightArm?.toString() || '',
      leftArm: record.leftArm?.toString() || '',
      waist: record.waist?.toString() || '',
      hip: record.hip?.toString() || '',
      rightThigh: record.rightThigh?.toString() || '',
      leftThigh: record.leftThigh?.toString() || '',
      frontPhoto: record.frontPhoto || '',
      backPhoto: record.backPhoto || '',
      sidePhoto: record.sidePhoto || '',
      notes: record.notes || ''
    })
    setProgressDialogOpen(true)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'frontPhoto' | 'backPhoto' | 'sidePhoto') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPhoto(field)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'progress')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Error uploading photo')

      const data = await res.json()
      setProgressForm(prev => ({ ...prev, [field]: data.url }))
      toast({ title: 'Foto subida correctamente' })
    } catch (error) {
      toast({ title: 'Error al subir la foto', variant: 'destructive' })
    } finally {
      setUploadingPhoto(null)
    }
  }

  const handleSaveProgress = async () => {
    try {
      const payload = {
        studentId,
        date: progressForm.date,
        weight: progressForm.weight ? parseFloat(progressForm.weight) : null,
        shoulders: progressForm.back ? parseFloat(progressForm.back) : null,
        chest: progressForm.chest ? parseFloat(progressForm.chest) : null,
        rightArm: progressForm.rightArm ? parseFloat(progressForm.rightArm) : null,
        leftArm: progressForm.leftArm ? parseFloat(progressForm.leftArm) : null,
        waist: progressForm.waist ? parseFloat(progressForm.waist) : null,
        hip: progressForm.hip ? parseFloat(progressForm.hip) : null,
        rightThigh: progressForm.rightThigh ? parseFloat(progressForm.rightThigh) : null,
        leftThigh: progressForm.leftThigh ? parseFloat(progressForm.leftThigh) : null,
        frontPhoto: progressForm.frontPhoto || null,
        backPhoto: progressForm.backPhoto || null,
        sidePhoto: progressForm.sidePhoto || null,
        notes: progressForm.notes || null
      }

      const url = editingProgress 
        ? `/api/progress/${editingProgress.id}`
        : '/api/progress'
      const method = editingProgress ? 'PUT' : 'POST'

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Error')

      toast({ title: editingProgress ? 'Progreso actualizado' : 'Progreso guardado' })
      setProgressDialogOpen(false)
      setProgressForm({
        date: format(new Date(), 'yyyy-MM-dd'), weight: '', back: '', chest: '', rightArm: '', leftArm: '',
        waist: '', hip: '', rightThigh: '', leftThigh: '', frontPhoto: '', backPhoto: '', sidePhoto: '', notes: ''
      })
      refetchStudent()
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    }
  }

  const openPhotoViewer = (record: ProgressRecord) => {
    setSelectedPhotos({ front: record.frontPhoto, back: record.backPhoto, side: record.sidePhoto })
    setActivePhoto('front')
    setPhotoViewerOpen(true)
  }

  const handleDeleteProgress = async (progressId: string) => {
    if (!confirm('¿Eliminar este registro de progreso?')) return
    try {
      const res = await fetch(`/api/progress/${progressId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error')
      toast({ title: 'Registro eliminado' })
      refetchStudent()
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  // Coach notes functions
  const openCoachNotesDialog = (record: ProgressRecord) => {
    setEditingCoachNotes(record)
    setCoachNotesText(record.coachNotes || '')
    setCoachNotesDialogOpen(true)
  }

  const handleSaveCoachNotes = async () => {
    if (!editingCoachNotes) return
    setSavingCoachNotes(true)
    try {
      const res = await fetch(`/api/progress/${editingCoachNotes.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachNotes: coachNotesText })
      })
      if (!res.ok) throw new Error('Error')
      toast({ title: 'Nota del coach guardada' })
      setCoachNotesDialogOpen(false)
      refetchStudent()
    } catch (error) {
      toast({ title: 'Error al guardar nota', variant: 'destructive' })
    } finally {
      setSavingCoachNotes(false)
    }
  }

  // Payment functions
  const handleSavePayment = async () => {
    if (!paymentForm.amount || !paymentForm.dueDate) {
      toast({ title: 'Cantidad y fecha son requeridos', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paymentForm, studentId, amount: parseFloat(paymentForm.amount) })
      })
      if (!res.ok) throw new Error('Error')
      toast({ title: 'Pago registrado' })
      setPaymentDialogOpen(false)
      setPaymentForm({ amount: '', dueDate: '', method: '', notes: '' })
      refetchStudent()
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    }
  }

  const handleMarkPaymentPaid = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' })
      })
      if (!res.ok) throw new Error('Error')
      toast({ title: 'Pago marcado como pagado' })
      refetchStudent()
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  // Progress chart
  const progressChartData = student?.progress.map(p => ({
    date: format(new Date(p.date), 'dd/MM', { locale: es }),
    fullDate: format(new Date(p.date), 'dd MMM yyyy', { locale: es }),
    weight: p.weight, shoulders: p.shoulders, chest: p.chest, waist: p.waist, hip: p.hip,
    rightArm: p.rightArm, leftArm: p.leftArm, rightThigh: p.rightThigh, leftThigh: p.leftThigh
  })).reverse() || []

  const metrics = [
    { key: 'weight', label: 'Peso (kg)', color: '#10b981' },
    { key: 'shoulders', label: 'Espalda (cm)', color: '#8b5cf6' },
    { key: 'chest', label: 'Pecho (cm)', color: '#3b82f6' },
    { key: 'waist', label: 'Cintura (cm)', color: '#ef4444' },
    { key: 'hip', label: 'Glúteos (cm)', color: '#f97316' },
    { key: 'rightArm', label: 'Brazo Der. (cm)', color: '#06b6d4' },
    { key: 'leftArm', label: 'Brazo Izq. (cm)', color: '#14b8a6' },
    { key: 'rightThigh', label: 'Muslo Der. (cm)', color: '#ec4899' },
    { key: 'leftThigh', label: 'Muslo Izq. (cm)', color: '#f59e0b' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 mx-auto text-slate-600 mb-4" />
        <p className="text-slate-400 text-lg">Alumno no encontrado</p>
        <Button onClick={() => setCurrentView('students')} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a alumnos
        </Button>
      </div>
    )
  }

  const visibleRoutines = student.routines.filter(r => showArchivedRoutines ? r.isArchived : !r.isArchived)
  const visibleDiets = student.diets.filter(d => showArchivedDiets ? d.isArchived : !d.isArchived)
  const pendingPayments = student.payments.filter(p => p.status !== 'PAID')
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0)

  // Count total exercises across all training days
  const countExercises = (routine: Routine) => {
    return routine.trainingDays?.reduce((sum, day) => {
      // Count from weeks if present
      if (day.weeks && day.weeks.length > 0) {
        return sum + day.weeks.reduce((wSum, w) => wSum + (w.exercises?.length || 0), 0)
      }
      // Legacy: count from direct exercises
      return sum + (day.exercises?.length || 0)
    }, 0) || 0
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <Button variant="ghost" onClick={() => setCurrentView('students')} className="text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a alumnos
        </Button>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shrink-0">
            {student.user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{student.user.name || 'Sin nombre'}</h1>
              <Badge variant={student.user.isActive ? 'default' : 'secondary'} className={student.user.isActive ? 'bg-emerald-600' : ''}>
                {student.user.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4 mt-2 text-sm sm:text-base text-slate-400">
              <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{student.user.email}</span>
              {student.phone && (
                <a
                  href={`https://wa.me/${student.phone.replace(/[\s\-\(\)]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  {student.phone}
                </a>
              )}
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Desde {format(new Date(student.startDate), 'MMM yyyy', { locale: es })}</span>
            </div>
            {student.goals && <div className="mt-3 flex items-start gap-2"><Target className="w-4 h-4 text-emerald-400 mt-1" /><p className="text-slate-300">{student.goals}</p></div>}
          </div>
          {isCoach && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetPasswordDialogOpen(true)}
              className="border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
            >
              <Key className="w-4 h-4 mr-2" />
              Restablecer Contraseña
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <Dumbbell className="w-6 h-6 mx-auto text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-white">{student.routines.filter(r => !r.isArchived).length}</p>
            <p className="text-xs text-slate-400">Rutinas</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <Utensils className="w-6 h-6 mx-auto text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-white">{student.diets.filter(d => !d.isArchived).length}</p>
            <p className="text-xs text-slate-400">Dietas</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-white">{student.progress.length}</p>
            <p className="text-xs text-slate-400">Registros</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <CreditCard className="w-6 h-6 mx-auto text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-white">${totalPending.toLocaleString('es-AR')}</p>
            <p className="text-xs text-slate-400">Pendiente</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700 w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="routines" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5">
            <Dumbbell className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Rutinas</span>
          </TabsTrigger>
          <TabsTrigger value="diets" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5">
            <Utensils className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Dietas</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5">
            <TrendingUp className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Progreso</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5">
            <CreditCard className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Pagos</span>
          </TabsTrigger>
        </TabsList>

        {/* Routines Tab */}
        <TabsContent value="routines" className="mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <Button
              variant={showArchivedRoutines ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowArchivedRoutines(!showArchivedRoutines)}
              className={!showArchivedRoutines ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400' : 'bg-amber-500/20 text-amber-400 border-amber-500/50'}
            >
              <Archive className="w-4 h-4 mr-2" />
              {showArchivedRoutines ? 'Ver activas' : 'Ver archivadas'}
            </Button>
            <div className="flex gap-2">
              {isCoach && !showArchivedRoutines && (
                <Button onClick={openCreateRoutine} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />Nueva Rutina
                </Button>
              )}
            </div>
          </div>

          {visibleRoutines.length > 0 ? (
            <div className="space-y-4">
              {visibleRoutines.map((routine) => (
                <Card key={routine.id} className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white text-xl">{routine.name}</CardTitle>
                        {routine.description && <CardDescription className="text-slate-400 mt-1">{routine.description}</CardDescription>}
                      </div>
                      {isCoach && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditRoutine(routine)} className="text-slate-400 hover:text-white">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleArchiveRoutine(routine.id, !routine.isArchived)} className="text-slate-400 hover:text-white">
                            {routine.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRoutine(routine.id)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {routine.trainingDays && routine.trainingDays.length > 0 && (
                      <>
                        {/* Day Tabs */}
                        <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
                          {routine.trainingDays.map((day, idx) => {
                            const isSelected = (selectedDays[routine.id] === day.id) || 
                              (!selectedDays[routine.id] && idx === 0)
                            return (
                              <button
                                key={day.id}
                                onClick={() => setSelectedDays(prev => ({ ...prev, [routine.id]: day.id }))}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                  isSelected 
                                    ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25' 
                                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                              >
                                {day.name}
                              </button>
                            )
                          })}
                        </div>
                        
                        {/* Selected Day Exercises */}
                        {routine.trainingDays.map((day, idx) => {
                          const isSelected = (selectedDays[routine.id] === day.id) || 
                            (!selectedDays[routine.id] && idx === 0)
                          if (!isSelected) return null
                          
                          // Check if day has weeks (new format) or direct exercises (legacy)
                          const hasWeeks = day.weeks && day.weeks.length > 0
                          const currentWeeks = hasWeeks ? day.weeks : [{ weekNumber: 1, exercises: day.exercises || [] }]
                          
                          return (
                            <div key={day.id}>
                              {day.muscleGroups && (
                                <p className="text-sm text-slate-400 mb-3">{day.muscleGroups}</p>
                              )}
                              
                              {/* Week tabs */}
                              {hasWeeks && (
                                <div className="flex gap-1 mb-3 overflow-x-auto">
                                  {day.weeks?.map((week) => {
                                    const weekKey = `${day.id}-week-${week.weekNumber}`
                                    const isWeekSelected = (selectedDays[`${routine.id}-week`] === String(week.weekNumber)) || 
                                      (!selectedDays[`${routine.id}-week`] && week.weekNumber === 1)
                                    return (
                                      <button
                                        key={weekKey}
                                        onClick={() => setSelectedDays(prev => ({ 
                                          ...prev, 
                                          [`${routine.id}-week`]: String(week.weekNumber) 
                                        }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                                          isWeekSelected 
                                            ? 'bg-emerald-600 text-white' 
                                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                      >
                                        Semana {week.weekNumber}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                              
                              {/* Exercises for selected week */}
                              {currentWeeks.map((week) => {
                                const isWeekSelected = !hasWeeks || 
                                  (selectedDays[`${routine.id}-week`] === String(week.weekNumber)) || 
                                  (!selectedDays[`${routine.id}-week`] && week.weekNumber === 1)
                                if (!isWeekSelected) return null
                                
                                return (
                                  <div key={`week-${week.weekNumber}`} className="space-y-2">
                                    {week.exercises?.map((ex, i) => {
                                      const isSuperset = ex.isSuperset
                                      const supersetLabel = isSuperset ? `SS${ex.supersetOrder}` : null

                                      return (
                                        <div
                                          key={ex.id}
                                          className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg ${
                                            isSuperset ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-slate-700/50'
                                          }`}
                                        >
                                          <span className="text-emerald-400 font-bold w-5 sm:w-6 text-sm sm:text-base shrink-0">{i + 1}</span>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="text-white font-medium truncate text-sm sm:text-base">{ex.exerciseName}</p>
                                              {isSuperset && (
                                                <Badge variant="outline" className="text-[10px] sm:text-xs border-purple-500 text-purple-300 px-1.5 sm:px-2 shrink-0">
                                                  <Link className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                                  {supersetLabel}
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-400">
                                              {ex.sets} x {ex.reps} {ex.weight && <span className="text-emerald-400 font-medium">@ {ex.weight}kg</span>}
                                              {ex.restTime && <span className="text-purple-400 ml-2">⏱ {ex.restTime}s</span>}
                                            </p>
                                            {ex.weight && (
                                              <p className="text-[10px] text-amber-400/70 flex items-center gap-1">
                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                Peso registrado por alumno
                                              </p>
                                            )}
                                            {ex.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">📝 {ex.notes}</p>}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setTimerSeconds(parseInt(ex.restTime || '60') || 60)
                                              setTimerOpen(true)
                                            }}
                                            className="text-purple-400 hover:text-purple-300 shrink-0 p-1.5 sm:p-2"
                                          >
                                            <Clock className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
              <Dumbbell className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">{showArchivedRoutines ? 'No hay rutinas archivadas' : 'No hay rutinas activas'}</p>
              {isCoach && !showArchivedRoutines && (
                <Button onClick={openCreateRoutine} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                  Crear primera rutina
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Diets Tab */}
        <TabsContent value="diets" className="mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <Button
              variant={showArchivedDiets ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowArchivedDiets(!showArchivedDiets)}
              className={!showArchivedDiets ? 'border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400' : 'bg-orange-500/20 text-orange-400 border-orange-500/50'}
            >
              <Archive className="w-4 h-4 mr-2" />
              {showArchivedDiets ? 'Ver activas' : 'Ver archivadas'}
            </Button>
            <div className="flex gap-2">
              {isCoach && !showArchivedDiets && (
                <Button onClick={openCreateDiet} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />Nueva Dieta
                </Button>
              )}
            </div>
          </div>

          {visibleDiets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleDiets.map((diet) => (
                <Card key={diet.id} className="bg-slate-800 border-slate-700 hover:border-emerald-600 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white text-xl">{diet.name}</CardTitle>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-400">
                          {diet.totalCalories && <span>🔥 {diet.totalCalories} kcal</span>}
                          {diet.proteinGoal && <span>🥩 {diet.proteinGoal}g proteína</span>}
                          {diet.carbsGoal && <span>🍞 {diet.carbsGoal}g carbs</span>}
                          {diet.fatsGoal && <span>🥑 {diet.fatsGoal}g grasas</span>}
                        </div>
                      </div>
                      {isCoach && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDiet(diet)} className="text-slate-400 hover:text-white">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleArchiveDiet(diet.id, !diet.isArchived)} className="text-slate-400 hover:text-white">
                            {diet.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteDiet(diet.id)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {diet.meals.map((meal, i) => (
                        <div key={meal.id} className="p-3 bg-slate-700/50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 font-bold">{i + 1}</span>
                              <span className="text-white font-medium">{meal.name}</span>
                              {meal.time && <span className="text-xs text-slate-400">({meal.time})</span>}
                            </div>
                            <div className="flex gap-3 text-xs text-slate-400">
                              {meal.calories && <span>{meal.calories} kcal</span>}
                              {meal.protein && <span>P: {meal.protein}g</span>}
                            </div>
                          </div>
                          <p className="text-sm text-slate-300 mt-2">{meal.foods}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
              <Utensils className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">{showArchivedDiets ? 'No hay dietas archivadas' : 'No hay dietas activas'}</p>
              {isCoach && !showArchivedDiets && (
                <Button onClick={openCreateDiet} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                  Crear primera dieta
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="mt-6">
          {/* Measurements Table */}
          {student.progress.length > 0 && (
            <Card className="bg-slate-800 border-slate-700 overflow-hidden mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Comparativa de Mediciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="p-3 text-left text-slate-400 font-medium sticky left-0 bg-slate-800 z-10">
                          Métrica
                        </th>
                        {/* Initial Data Column */}
                        {student.progress.length > 0 && (() => {
                          const initial = [...student.progress].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
                          return initial && (
                            <th className="p-3 text-center min-w-[140px] bg-gradient-to-b from-amber-900/30 to-amber-800/20 border-l border-r border-amber-500/30">
                              <div className="text-amber-400 text-xs font-medium mb-1">DATOS INICIALES</div>
                              <div className="text-white text-sm font-semibold">
                                {format(new Date(initial.date), 'dd MMM yyyy', { locale: es })}
                              </div>
                            </th>
                          )
                        })()}
                        {/* Recent Measurements Columns */}
                        {[...student.progress]
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .slice(1)
                          .reverse()
                          .slice(0, 4)
                          .map((m, i, arr) => {
                            const sorted = [...student.progress].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            const initial = sorted[0]
                            const prevIdx = sorted.findIndex(p => p.id === m.id) - 1
                            const prev = prevIdx >= 0 ? sorted[prevIdx] : initial
                            return (
                              <th key={m.id} className="p-3 text-center min-w-[140px] border-l border-slate-700">
                                <div className={`text-xs font-medium mb-1 ${i === 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  {i === 0 ? 'ÚLTIMA' : i === 1 ? 'PREVIA' : `HACE ${i + 1}`}
                                </div>
                                <div className="text-white text-sm font-semibold">
                                  {format(new Date(m.date), 'dd MMM yy', { locale: es })}
                                </div>
                              </th>
                            )
                          })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Photo Row */}
                      <tr className="border-b border-slate-700/50 bg-slate-800/50">
                        <td className="p-3 text-slate-400 font-medium sticky left-0 bg-slate-800 z-10">
                          Foto
                        </td>
                        {[...student.progress]
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .slice(0, 1)
                          .map((initial) => (
                            <td key={initial.id} className="p-3 bg-gradient-to-b from-amber-900/20 to-amber-800/10 border-l border-r border-amber-500/30">
                              <div className="flex justify-center gap-1">
                                {(initial.frontPhoto || initial.backPhoto || initial.sidePhoto) ? (
                                  <button onClick={() => openPhotoViewer(initial)} className="flex gap-1 hover:opacity-80 transition-opacity">
                                    {initial.frontPhoto && <img src={initial.frontPhoto} alt="" className="w-10 h-10 rounded object-cover border border-slate-600" />}
                                    {initial.backPhoto && <img src={initial.backPhoto} alt="" className="w-10 h-10 rounded object-cover border border-slate-600" />}
                                    {initial.sidePhoto && <img src={initial.sidePhoto} alt="" className="w-10 h-10 rounded object-cover border border-slate-600" />}
                                  </button>
                                ) : (
                                  <span className="text-slate-500 text-xs">Sin foto</span>
                                )}
                              </div>
                            </td>
                          ))}
                        {[...student.progress]
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .slice(1)
                          .reverse()
                          .slice(0, 4)
                          .map((m) => (
                            <td key={m.id} className="p-3 border-l border-slate-700">
                              <div className="flex justify-center gap-1">
                                {(m.frontPhoto || m.backPhoto || m.sidePhoto) ? (
                                  <button onClick={() => openPhotoViewer(m)} className="flex gap-1 hover:opacity-80 transition-opacity">
                                    {m.frontPhoto && <img src={m.frontPhoto} alt="" className="w-10 h-10 rounded object-cover border border-slate-600" />}
                                    {m.backPhoto && <img src={m.backPhoto} alt="" className="w-10 h-10 rounded object-cover border border-slate-600" />}
                                    {m.sidePhoto && <img src={m.sidePhoto} alt="" className="w-10 h-10 rounded object-cover border border-slate-600" />}
                                  </button>
                                ) : (
                                  <span className="text-slate-500 text-xs">Sin foto</span>
                                )}
                              </div>
                            </td>
                          ))}
                      </tr>
                      {/* Metric Rows */}
                      {[
                        { key: 'weight', label: 'Peso', unit: 'kg' },
                        { key: 'shoulders', label: 'Espalda', unit: 'cm' },
                        { key: 'chest', label: 'Pecho', unit: 'cm' },
                        { key: 'rightArm', label: 'Brazo Der.', unit: 'cm' },
                        { key: 'leftArm', label: 'Brazo Izq.', unit: 'cm' },
                        { key: 'waist', label: 'Cintura', unit: 'cm' },
                        { key: 'hip', label: 'Glúteos', unit: 'cm' },
                        { key: 'rightThigh', label: 'Muslo Der.', unit: 'cm' },
                        { key: 'leftThigh', label: 'Muslo Izq.', unit: 'cm' },
                      ].map((metric) => {
                        const sorted = [...student.progress].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        const initial = sorted[0]
                        const recent = sorted.slice(1).reverse().slice(0, 4)
                        
                        return (
                          <tr key={metric.key} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                            <td className="p-3 text-slate-300 font-medium sticky left-0 bg-slate-800 z-10">
                              {metric.label}
                              <span className="text-slate-500 text-xs ml-1">({metric.unit})</span>
                            </td>
                            {initial && (
                              <td className="p-3 text-center bg-gradient-to-b from-amber-900/20 to-amber-800/10 border-l border-r border-amber-500/30">
                                <span className="text-amber-300 font-semibold">
                                  {(initial as any)[metric.key] || '-'}
                                </span>
                              </td>
                            )}
                            {recent.map((m, i) => {
                              const value = (m as any)[metric.key]
                              const prevIdx = sorted.findIndex(p => p.id === m.id) - 1
                              const prev = prevIdx >= 0 ? sorted[prevIdx] : initial
                              const prevValue = prev ? (prev as any)[metric.key] : null
                              const diff = value && prevValue ? value - prevValue : null
                              
                              return (
                                <td key={m.id} className="p-3 text-center border-l border-slate-700">
                                  <div className="flex flex-col items-center">
                                    <span className="text-white font-semibold">{value || '-'}</span>
                                    {diff !== null && diff !== 0 && (
                                      <span className={`text-xs ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evolution Charts */}
          {progressChartData.length > 1 && (
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 overflow-hidden mb-6">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Curvas Evolutivas
                  </CardTitle>
                  {/* Metrics Selection */}
                  <div className="flex flex-wrap gap-2">
                    {metrics.slice(0, 7).map((m) => (
                      <Button
                        key={m.key}
                        variant={selectedMetrics.includes(m.key) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedMetrics(prev => prev.includes(m.key) ? prev.filter(x => x !== m.key) : [...prev, m.key])}
                        className={selectedMetrics.includes(m.key)
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                        }}
                        labelFormatter={(label) => {
                          const item = progressChartData.find(d => d.date === label)
                          return item?.fullDate || label
                        }}
                      />
                      <Legend />
                      {metrics.filter(m => selectedMetrics.includes(m.key)).map((m) => (
                        <Line
                          key={m.key}
                          type="monotone"
                          dataKey={m.key}
                          stroke={m.color}
                          name={m.label}
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2 }}
                          activeDot={{ r: 6, strokeWidth: 2 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Historial Completo
              </h2>
            </div>
            
            {student.progress.length > 0 ? (
              <div className="grid gap-4">
                {[...student.progress]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((record) => {
                    const hasPhotos = record.frontPhoto || record.backPhoto || record.sidePhoto
                    return (
                      <Card key={record.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row gap-4">
                            {/* Date and Actions */}
                            <div className="flex items-start justify-between sm:flex-col sm:w-40">
                              <div>
                                <p className="text-white font-semibold">
                                  {format(new Date(record.date), 'dd MMM yyyy', { locale: es })}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {format(new Date(record.date), 'EEEE', { locale: es })}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {isCoach && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => openCoachNotesDialog(record)} 
                                    className="text-amber-400 hover:text-amber-300 h-8"
                                  >
                                    <MessageSquare className="w-4 h-4 mr-1" />
                                    Nota
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {/* Measurements */}
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                              {record.weight && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Peso:</span>
                                  <span className="text-white font-medium">{record.weight} kg</span>
                                </div>
                              )}
                              {record.shoulders && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Espalda:</span>
                                  <span className="text-white font-medium">{record.shoulders} cm</span>
                                </div>
                              )}
                              {record.chest && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Pecho:</span>
                                  <span className="text-white font-medium">{record.chest} cm</span>
                                </div>
                              )}
                              {record.rightArm && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Brazo Der:</span>
                                  <span className="text-white font-medium">{record.rightArm} cm</span>
                                </div>
                              )}
                              {record.leftArm && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Brazo Izq:</span>
                                  <span className="text-white font-medium">{record.leftArm} cm</span>
                                </div>
                              )}
                              {record.waist && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Cintura:</span>
                                  <span className="text-white font-medium">{record.waist} cm</span>
                                </div>
                              )}
                              {record.hip && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Glúteos:</span>
                                  <span className="text-white font-medium">{record.hip} cm</span>
                                </div>
                              )}
                              {record.rightThigh && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Muslo Der:</span>
                                  <span className="text-white font-medium">{record.rightThigh} cm</span>
                                </div>
                              )}
                              {record.leftThigh && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Muslo Izq:</span>
                                  <span className="text-white font-medium">{record.leftThigh} cm</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Photos Preview */}
                            {hasPhotos && (
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                  {record.frontPhoto && (
                                    <img src={record.frontPhoto} alt="Front" className="w-10 h-10 rounded-full border-2 border-slate-800 object-cover" />
                                  )}
                                  {record.backPhoto && (
                                    <img src={record.backPhoto} alt="Back" className="w-10 h-10 rounded-full border-2 border-slate-800 object-cover" />
                                  )}
                                  {record.sidePhoto && (
                                    <img src={record.sidePhoto} alt="Side" className="w-10 h-10 rounded-full border-2 border-slate-800 object-cover" />
                                  )}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => openPhotoViewer(record)} className="text-emerald-400 hover:text-emerald-300">
                                  <Eye className="w-4 h-4 mr-1" />
                                  Ver
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {record.notes && (
                            <div className="mt-3 pt-3 border-t border-slate-700">
                              <p className="text-sm text-slate-400">📝 {record.notes}</p>
                            </div>
                          )}
                          
                          {record.coachNotes && (
                            <div className="mt-3 pt-3 border-t border-slate-700 bg-amber-500/10 -mx-4 -mb-4 p-4 rounded-b-lg">
                              <p className="text-sm text-amber-300 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                <span className="font-medium">Nota del Coach:</span>
                              </p>
                              <p className="text-sm text-amber-200 mt-1">{record.coachNotes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
                <TrendingUp className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">No hay registros de progreso</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6">
          <div className="flex justify-end mb-4">
            {isCoach && (
              <Button onClick={() => setPaymentDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />Nuevo Pago
              </Button>
            )}
          </div>

          {student.payments.length > 0 ? (
            <div className="space-y-3">
              {student.payments.map((payment) => (
                <Card key={payment.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">${payment.amount.toLocaleString('es-AR')}</p>
                        <p className="text-sm text-slate-400">Vence: {format(new Date(payment.dueDate), 'dd/MM/yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={payment.status === 'PAID' ? 'default' : 'secondary'} className={payment.status === 'PAID' ? 'bg-emerald-600' : payment.status === 'OVERDUE' ? 'bg-red-600' : ''}>
                          {payment.status === 'PAID' ? 'Pagado' : payment.status === 'OVERDUE' ? 'Vencido' : 'Pendiente'}
                        </Badge>
                        {isCoach && payment.status !== 'PAID' && (
                          <Button variant="outline" size="sm" onClick={() => handleMarkPaymentPaid(payment.id)} className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/10">
                            <CheckCircle className="w-4 h-4 mr-1" />Marcar pagado
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
              <CreditCard className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No hay pagos registrados</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Routine Editor Dialog */}
      <RoutineEditor
        isOpen={routineEditorOpen}
        onClose={() => setRoutineEditorOpen(false)}
        onSave={handleSaveRoutine}
        initialData={editingRoutine}
        exercises={exercises}
        saving={savingRoutine}
      />

      {/* Rest Timer */}
      <RestTimer
        isOpen={timerOpen}
        onClose={() => setTimerOpen(false)}
        defaultSeconds={timerSeconds}
      />

      {/* Diet Dialog */}
      <Dialog open={dietDialogOpen} onOpenChange={setDietDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDiet ? 'Editar Dieta' : 'Nueva Dieta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={dietForm.name} onChange={(e) => setDietForm({ ...dietForm, name: e.target.value })} placeholder="Ej: Definición" className="bg-slate-700 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label>Calorías totales</Label>
                <Input type="number" value={dietForm.totalCalories} onChange={(e) => setDietForm({ ...dietForm, totalCalories: e.target.value })} placeholder="2000" className="bg-slate-700 border-slate-600" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={dietForm.description} onChange={(e) => setDietForm({ ...dietForm, description: e.target.value })} placeholder="Descripción..." className="bg-slate-700 border-slate-600" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Proteína (g)</Label>
                <Input type="number" value={dietForm.proteinGoal} onChange={(e) => setDietForm({ ...dietForm, proteinGoal: e.target.value })} className="bg-slate-700 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label>Carbs (g)</Label>
                <Input type="number" value={dietForm.carbsGoal} onChange={(e) => setDietForm({ ...dietForm, carbsGoal: e.target.value })} className="bg-slate-700 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label>Grasas (g)</Label>
                <Input type="number" value={dietForm.fatsGoal} onChange={(e) => setDietForm({ ...dietForm, fatsGoal: e.target.value })} className="bg-slate-700 border-slate-600" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Comidas</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMealToDiet} className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400">
                  <Plus className="w-4 h-4 mr-2" />Agregar
                </Button>
              </div>
              {dietForm.meals.map((meal, index) => (
                <div key={index} className="p-3 bg-slate-700/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Input value={meal.name} onChange={(e) => updateMeal(index, 'name', e.target.value)} placeholder="Nombre de comida" className="bg-slate-700 border-slate-600 flex-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMeal(index)} className="text-red-400 hover:text-red-300 ml-2">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={meal.time} onChange={(e) => updateMeal(index, 'time', e.target.value)} placeholder="Hora (ej: 8:00)" className="bg-slate-700 border-slate-600" />
                    <Input value={meal.calories} onChange={(e) => updateMeal(index, 'calories', e.target.value)} placeholder="Calorías" className="bg-slate-700 border-slate-600" />
                  </div>
                  <Textarea value={meal.foods} onChange={(e) => updateMeal(index, 'foods', e.target.value)} placeholder="Alimentos..." className="bg-slate-700 border-slate-600" rows={2} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDietDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveDiet} className="bg-emerald-600 hover:bg-emerald-700">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Dialog */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProgress ? 'Editar Progreso' : 'Nuevo Registro'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={progressForm.date} onChange={(e) => setProgressForm({ ...progressForm, date: e.target.value })} className="bg-slate-700 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" value={progressForm.weight} onChange={(e) => setProgressForm({ ...progressForm, weight: e.target.value })} className="bg-slate-700 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label>Espalda (cm)</Label>
                <Input type="number" step="0.1" value={progressForm.back} onChange={(e) => setProgressForm({ ...progressForm, back: e.target.value })} className="bg-slate-700 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label>Pecho (cm)</Label>
                <Input type="number" step="0.1" value={progressForm.chest} onChange={(e) => setProgressForm({ ...progressForm, chest: e.target.value })} className="bg-slate-700 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label>Cintura (cm)</Label>
                <Input type="number" step="0.1" value={progressForm.waist} onChange={(e) => setProgressForm({ ...progressForm, waist: e.target.value })} className="bg-slate-700 border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label>Glúteos (cm)</Label>
                <Input type="number" step="0.1" value={progressForm.hip} onChange={(e) => setProgressForm({ ...progressForm, hip: e.target.value })} className="bg-slate-700 border-slate-600" />
              </div>
            </div>
            <Textarea value={progressForm.notes} onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })} placeholder="Notas..." className="bg-slate-700 border-slate-600" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProgressDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveProgress} className="bg-emerald-600 hover:bg-emerald-700">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer */}
      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle>Fotos de Progreso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {['front', 'back', 'side'].map((type) => (
                <Button
                  key={type}
                  variant={activePhoto === type ? 'default' : 'outline'}
                  onClick={() => setActivePhoto(type as any)}
                  className={activePhoto === type ? 'bg-emerald-600' : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400'}
                  disabled={!selectedPhotos[type as keyof typeof selectedPhotos]}
                >
                  {type === 'front' ? 'Frontal' : type === 'back' ? 'Espalda' : 'Perfil'}
                </Button>
              ))}
            </div>
            <div className="aspect-[3/4] max-h-[60vh] mx-auto rounded-lg overflow-hidden bg-slate-800">
              {selectedPhotos[activePhoto] ? (
                <img src={selectedPhotos[activePhoto]!} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <ImageIcon className="w-16 h-16" />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="bg-slate-700 border-slate-600" />
            </div>
            <div className="space-y-2">
              <Label>Fecha de vencimiento</Label>
              <Input type="date" value={paymentForm.dueDate} onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })} className="bg-slate-700 border-slate-600" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePayment} className="bg-emerald-600 hover:bg-emerald-700">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Routine Confirmation Dialog */}
      <Dialog open={archiveRoutineConfirmOpen} onOpenChange={setArchiveRoutineConfirmOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>¿Archivar rutina existente?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Ya existe una rutina activa: <strong className="text-white">{activeRoutineToArchive?.name}</strong>. 
              ¿Deseas archivarla y crear una nueva rutina desde cero?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => {
              setArchiveRoutineConfirmOpen(false)
              setActiveRoutineToArchive(null)
            }}>
              Cancelar
            </Button>
            <Button onClick={confirmArchiveAndCreateRoutine} className="bg-amber-600 hover:bg-amber-700">
              <Archive className="w-4 h-4 mr-2" />
              Archivar y crear nueva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Diet Confirmation Dialog */}
      <Dialog open={archiveDietConfirmOpen} onOpenChange={setArchiveDietConfirmOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>¿Archivar dieta existente?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Ya existe una dieta activa: <strong className="text-white">{activeDietToArchive?.name}</strong>. 
              ¿Deseas archivarla y crear una nueva dieta desde cero?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => {
              setArchiveDietConfirmOpen(false)
              setActiveDietToArchive(null)
            }}>
              Cancelar
            </Button>
            <Button onClick={confirmArchiveAndCreateDiet} className="bg-amber-600 hover:bg-amber-700">
              <Archive className="w-4 h-4 mr-2" />
              Archivar y crear nueva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coach Notes Dialog */}
      <Dialog open={coachNotesDialogOpen} onOpenChange={setCoachNotesDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Nota Profesional
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Agrega una devolución profesional que el alumno podrá ver en su registro de progreso
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {editingCoachNotes && (
              <p className="text-sm text-slate-400 mb-2">
                Fecha: <span className="text-white font-medium">
                  {format(new Date(editingCoachNotes.date), 'dd MMM yyyy', { locale: es })}
                </span>
              </p>
            )}
            <Textarea
              value={coachNotesText}
              onChange={(e) => setCoachNotesText(e.target.value)}
              placeholder="Escribe tu observación o devolución para el alumno..."
              className="bg-slate-700/50 border-slate-600 focus:border-amber-500 min-h-[150px]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCoachNotesDialogOpen(false)} className="text-slate-400">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCoachNotes}
              disabled={savingCoachNotes}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {savingCoachNotes ? 'Guardando...' : 'Guardar Nota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              Restablecer Contraseña
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Establece una nueva contraseña para <strong className="text-white">{student?.user.name || student?.user.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newPassword" className="text-slate-300 mb-2 block">
              Nueva Contraseña
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="bg-slate-700/50 border-slate-600 focus:border-emerald-500"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => {
              setResetPasswordDialogOpen(false)
              setNewPassword('')
            }} className="text-slate-400">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (newPassword.length < 6) {
                  toast({ title: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' })
                  return
                }
                setResettingPassword(true)
                try {
                  const res = await fetch(`/api/users/${studentId}/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newPassword })
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || 'Error')
                  toast({ title: 'Contraseña actualizada correctamente' })
                  setResetPasswordDialogOpen(false)
                  setNewPassword('')
                } catch (error) {
                  toast({ title: 'Error al restablecer la contraseña', variant: 'destructive' })
                } finally {
                  setResettingPassword(false)
                }
              }}
              disabled={resettingPassword}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {resettingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Guardar Contraseña
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
