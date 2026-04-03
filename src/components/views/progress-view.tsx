'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { TrendingUp, User, ChevronRight, Plus, Camera, Pencil, Trash2, X, Eye, Calendar, ImageIcon, History, MessageSquare } from 'lucide-react'
import { useAppStore } from '@/hooks/use-store'
import { useToast } from '@/hooks/use-toast'
import { format, subDays, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
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
  student?: {
    id: string
    user: { name: string | null; email: string }
  }
}

// Metrics configuration
const bodyMetrics = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'rightArm', label: 'Brazo Der.', unit: 'cm' },
  { key: 'leftArm', label: 'Brazo Izq.', unit: 'cm' },
  { key: 'shoulders', label: 'Espalda', unit: 'cm' },
  { key: 'chest', label: 'Pecho', unit: 'cm' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'hip', label: 'Glúteos', unit: 'cm' },
  { key: 'rightThigh', label: 'Muslo Der.', unit: 'cm' },
  { key: 'leftThigh', label: 'Muslo Izq.', unit: 'cm' },
]

const chartMetrics = [
  { key: 'weight', label: 'Peso (kg)', color: '#10b981' },
  { key: 'shoulders', label: 'Espalda (cm)', color: '#8b5cf6' },
  { key: 'chest', label: 'Pecho (cm)', color: '#3b82f6' },
  { key: 'waist', label: 'Cintura (cm)', color: '#ef4444' },
  { key: 'hip', label: 'Glúteos (cm)', color: '#f97316' },
  { key: 'rightArm', label: 'Brazo Der. (cm)', color: '#06b6d4' },
  { key: 'rightThigh', label: 'Muslo Der. (cm)', color: '#ec4899' }
]

export function ProgressView() {
  const { data: session } = useSession()
  const [progress, setProgress] = useState<ProgressRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['weight'])
  const { setCurrentView, setSelectedStudentId } = useAppStore()
  const { toast } = useToast()
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingProgress, setEditingProgress] = useState<ProgressRecord | null>(null)
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
    shoulders: '',
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
  
  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Photo viewer state
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<{front: string | null, back: string | null, side: string | null}>({front: null, back: null, side: null})
  const [activePhoto, setActivePhoto] = useState<'front' | 'back' | 'side'>('front')

  const isCoach = session?.user.role === 'COACH'

  // Date filter state
  const [dateFilter, setDateFilter] = useState<'all' | '15days' | '1month' | '3months' | 'custom'>('all')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')

  useEffect(() => {
    fetchProgress()
  }, [])

  const getFilteredProgress = () => {
    let filtered = Array.isArray(progress) ? [...progress] : []
    const now = new Date()
    
    switch (dateFilter) {
      case '15days':
        const fifteenDaysAgo = subDays(now, 15)
        filtered = filtered.filter(p => new Date(p.date) >= fifteenDaysAgo)
        break
      case '1month':
        const oneMonthAgo = subMonths(now, 1)
        filtered = filtered.filter(p => new Date(p.date) >= oneMonthAgo)
        break
      case '3months':
        const threeMonthsAgo = subMonths(now, 3)
        filtered = filtered.filter(p => new Date(p.date) >= threeMonthsAgo)
        break
      case 'custom':
        if (customDateStart) {
          filtered = filtered.filter(p => new Date(p.date) >= new Date(customDateStart))
        }
        if (customDateEnd) {
          filtered = filtered.filter(p => new Date(p.date) <= new Date(customDateEnd))
        }
        break
    }
    
    return filtered
  }

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/progress')
      const data = await res.json()
      setProgress(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching progress:', error)
      setProgress([])
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingProgress(null)
    setForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      weight: '',
      shoulders: '',
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
    setDialogOpen(true)
  }

  const openEditDialog = (record: ProgressRecord) => {
    setEditingProgress(record)
    setForm({
      date: format(new Date(record.date), 'yyyy-MM-dd'),
      weight: record.weight?.toString() || '',
      shoulders: record.shoulders?.toString() || '',
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
    setDialogOpen(true)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'frontPhoto' | 'backPhoto' | 'sidePhoto') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPhoto(field)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'progress')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Error uploading photo')

      const data = await res.json()
      setForm(prev => ({ ...prev, [field]: data.url }))
      toast({ title: 'Foto subida correctamente' })
    } catch (error) {
      toast({ title: 'Error al subir la foto', variant: 'destructive' })
    } finally {
      setUploadingPhoto(null)
    }
  }

  const handleSaveProgress = async () => {
    setSaving(true)
    try {
      const payload = {
        date: form.date,
        weight: form.weight ? parseFloat(form.weight) : null,
        shoulders: form.shoulders ? parseFloat(form.shoulders) : null,
        chest: form.chest ? parseFloat(form.chest) : null,
        rightArm: form.rightArm ? parseFloat(form.rightArm) : null,
        leftArm: form.leftArm ? parseFloat(form.leftArm) : null,
        waist: form.waist ? parseFloat(form.waist) : null,
        hip: form.hip ? parseFloat(form.hip) : null,
        rightThigh: form.rightThigh ? parseFloat(form.rightThigh) : null,
        leftThigh: form.leftThigh ? parseFloat(form.leftThigh) : null,
        frontPhoto: form.frontPhoto || null,
        backPhoto: form.backPhoto || null,
        sidePhoto: form.sidePhoto || null,
        notes: form.notes || null
      }

      const url = editingProgress 
        ? `/api/progress/${editingProgress.id}`
        : '/api/progress'
      const method = editingProgress ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!res.ok) throw new Error('Error')
      
      toast({ title: editingProgress ? 'Progreso actualizado' : 'Progreso guardado correctamente' })
      setDialogOpen(false)
      fetchProgress()
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProgress = async (id: string) => {
    if (!confirm('¿Eliminar este registro de progreso?')) return
    
    try {
      const res = await fetch(`/api/progress/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error')
      
      toast({ title: 'Registro eliminado' })
      fetchProgress()
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  const openPhotoViewer = (record: ProgressRecord) => {
    setSelectedPhotos({
      front: record.frontPhoto,
      back: record.backPhoto,
      side: record.sidePhoto
    })
    setActivePhoto('front')
    setPhotoViewerOpen(true)
  }

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId)
    setCurrentView('student-detail')
  }

  // Sort progress by date (oldest first for table)
  const sortedProgress = [...progress].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  // Get initial measurement and recent ones
  const initialMeasurement = sortedProgress[0]
  const recentMeasurements = sortedProgress.length > 1 
    ? [...sortedProgress.slice(1)].reverse().slice(0, 4) 
    : []
  
  // For chart and history - reversed (newest first)
  const reversedProgress = [...sortedProgress].reverse()

  // Group by student for coach view
  const groupedByStudent = isCoach 
    ? progress.reduce((acc, p) => {
        const studentId = p.student?.id || 'unknown'
        if (!acc[studentId]) {
          acc[studentId] = {
            student: p.student,
            records: []
          }
        }
        acc[studentId].records.push(p)
        return acc
      }, {} as Record<string, { student: any; records: ProgressRecord[] }>)
    : null

  const filteredProgress = getFilteredProgress()

  const chartData = filteredProgress
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(p => ({
      date: format(new Date(p.date), 'dd/MM', { locale: es }),
      fullDate: format(new Date(p.date), 'dd MMM yyyy', { locale: es }),
      weight: p.weight,
      shoulders: p.shoulders,
      chest: p.chest,
      waist: p.waist,
      hip: p.hip,
      rightArm: p.rightArm,
      leftArm: p.leftArm,
      rightThigh: p.rightThigh,
      leftThigh: p.leftThigh
    }))

  const hasAnyPhoto = (record: ProgressRecord) => 
    record.frontPhoto || record.backPhoto || record.sidePhoto

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev => 
      prev.includes(key) 
        ? prev.filter(m => m !== key)
        : [...prev, key]
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    )
  }

  // Empty state
  if (progress.length === 0) {
    return (
      <div className="space-y-6 pb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 sm:p-8 border border-slate-700/50">
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {isCoach ? 'Progreso de Alumnos' : 'Mi Progreso'}
              </h1>
              <p className="text-slate-400 mt-1">
                {isCoach ? 'Visualiza el progreso de todos tus alumnos' : 'Tu historial de mediciones y fotos'}
              </p>
            </div>
            {!isCoach && (
              <Button onClick={openCreateDialog} className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Registro
              </Button>
            )}
          </div>
        </div>
        
        <div className="text-center py-16 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50">
          <div className="w-20 h-20 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
            <TrendingUp className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-slate-400 text-lg">No hay registros de progreso</p>
          {!isCoach && (
            <Button onClick={openCreateDialog} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Registrar progreso
            </Button>
          )}
        </div>

        <ProgressDialog 
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingProgress={editingProgress}
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={handleSaveProgress}
          uploadingPhoto={uploadingPhoto}
          onPhotoUpload={handlePhotoUpload}
        />

        <PhotoViewerDialog
          open={photoViewerOpen}
          onOpenChange={setPhotoViewerOpen}
          photos={selectedPhotos}
          activePhoto={activePhoto}
          setActivePhoto={setActivePhoto}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 sm:p-8 border border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-pink-500/10"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {isCoach ? 'Progreso de Alumnos' : 'Mi Progreso'}
            </h1>
            <p className="text-slate-400 mt-1">
              {isCoach ? 'Visualiza el progreso de todos tus alumnos' : 'Tu historial de mediciones y fotos'}
            </p>
          </div>
          {!isCoach && (
            <Button onClick={openCreateDialog} className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Registro
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="bg-gradient-to-br from-pink-500/20 to-rose-600/10 border-pink-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/30">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{progress.length}</p>
                <p className="text-xs text-pink-200">Registros totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {reversedProgress[0]?.weight && (
          <Card className="bg-gradient-to-br from-emerald-500/20 to-green-600/10 border-emerald-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
                  <span className="text-white text-lg">⚖️</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{reversedProgress[0].weight}</p>
                  <p className="text-xs text-emerald-200">Peso Actual (kg)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{progress.filter(p => hasAnyPhoto(p)).length}</p>
                <p className="text-xs text-blue-200">Con Fotos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Measurements Table */}
      <Card className="bg-slate-800 border-slate-700 overflow-hidden">
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
                  {initialMeasurement && (
                    <th className="p-3 text-center min-w-[140px] bg-gradient-to-b from-amber-900/30 to-amber-800/20 border-l border-r border-amber-500/30">
                      <div className="text-amber-400 text-xs font-medium mb-1">DATOS INICIALES</div>
                      <div className="text-white text-sm font-semibold">
                        {format(new Date(initialMeasurement.date), 'dd MMM yyyy', { locale: es })}
                      </div>
                    </th>
                  )}
                  {/* Recent Measurements Columns */}
                  {recentMeasurements.map((m, i) => (
                    <th key={m.id} className="p-3 text-center min-w-[140px] border-l border-slate-700">
                      <div className={`text-xs font-medium mb-1 ${i === 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {i === 0 ? 'ÚLTIMA' : i === 1 ? 'PREVIA' : `HACE ${i + 1}`}
                      </div>
                      <div className="text-white text-sm font-semibold">
                        {format(new Date(m.date), 'dd MMM yy', { locale: es })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Photo Row */}
                <tr className="border-b border-slate-700/50 bg-slate-800/50">
                  <td className="p-3 text-slate-400 font-medium sticky left-0 bg-slate-800 z-10">
                    Foto
                  </td>
                  {initialMeasurement && hasAnyPhoto(initialMeasurement) && (
                    <td className="p-3 bg-gradient-to-b from-amber-900/20 to-amber-800/10 border-l border-r border-amber-500/30">
                      <div className="flex justify-center gap-1">
                        <PhotoThumbnails record={initialMeasurement} onView={() => openPhotoViewer(initialMeasurement)} />
                      </div>
                    </td>
                  )}
                  {initialMeasurement && !hasAnyPhoto(initialMeasurement) && (
                    <td className="p-3 bg-gradient-to-b from-amber-900/20 to-amber-800/10 border-l border-r border-amber-500/30">
                      <div className="flex justify-center">
                        <span className="text-slate-500 text-xs">Sin foto</span>
                      </div>
                    </td>
                  )}
                  {recentMeasurements.map((m) => (
                    <td key={m.id} className="p-3 border-l border-slate-700">
                      <div className="flex justify-center gap-1">
                        {hasAnyPhoto(m) ? (
                          <PhotoThumbnails record={m} onView={() => openPhotoViewer(m)} />
                        ) : (
                          <span className="text-slate-500 text-xs">Sin foto</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Metric Rows */}
                {bodyMetrics.map((metric) => (
                  <tr key={metric.key} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 text-slate-300 font-medium sticky left-0 bg-slate-800 z-10">
                      {metric.label}
                      <span className="text-slate-500 text-xs ml-1">({metric.unit})</span>
                    </td>
                    {initialMeasurement && (
                      <td className="p-3 text-center bg-gradient-to-b from-amber-900/20 to-amber-800/10 border-l border-r border-amber-500/30">
                        <span className="text-amber-300 font-semibold">
                          {(initialMeasurement as any)[metric.key] || '-'}
                        </span>
                      </td>
                    )}
                    {recentMeasurements.map((m, i) => {
                      const value = (m as any)[metric.key]
                      const prevValue = i < recentMeasurements.length - 1 
                        ? (recentMeasurements[i + 1] as any)[metric.key] 
                        : (initialMeasurement as any)?.[metric.key]
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Evolution Charts */}
      {chartData.length > 1 && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Curvas Evolutivas
              </CardTitle>
              {/* Metrics Selection */}
              <div className="flex flex-wrap gap-2">
                {chartMetrics.map((metric) => (
                  <Button
                    key={metric.key}
                    variant={selectedMetrics.includes(metric.key) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleMetric(metric.key)}
                    className={selectedMetrics.includes(metric.key)
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
                  >
                    {metric.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                      const item = chartData.find(d => d.date === label)
                      return item?.fullDate || label
                    }}
                  />
                  <Legend />
                  {chartMetrics.filter(m => selectedMetrics.includes(m.key)).map((metric) => (
                    <Line
                      key={metric.key}
                      type="monotone"
                      dataKey={metric.key}
                      stroke={metric.color}
                      name={metric.label}
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
        
        {isCoach && groupedByStudent ? (
          <div className="space-y-6">
            {Object.entries(groupedByStudent).map(([studentId, data]) => (
              <Card key={studentId} className="bg-slate-800 border-slate-700 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <button
                    onClick={() => handleStudentClick(studentId)}
                    className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-4 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium">
                      {data.student?.user?.name || data.student?.user?.email || 'Alumno'}
                    </span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <div className="grid gap-3">
                    {data.records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((p) => (
                      <ProgressCard 
                        key={p.id} 
                        record={p} 
                        onEdit={() => openEditDialog(p)}
                        onDelete={() => handleDeleteProgress(p.id)}
                        onViewPhotos={() => openPhotoViewer(p)}
                        isCoach={isCoach}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {reversedProgress.map((p) => (
              <ProgressCard 
                key={p.id} 
                record={p} 
                onEdit={() => openEditDialog(p)}
                onDelete={() => handleDeleteProgress(p.id)}
                onViewPhotos={() => openPhotoViewer(p)}
                isCoach={isCoach}
              />
            ))}
          </div>
        )}
      </div>

      <ProgressDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingProgress={editingProgress}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSaveProgress}
        uploadingPhoto={uploadingPhoto}
        onPhotoUpload={handlePhotoUpload}
      />

      <PhotoViewerDialog
        open={photoViewerOpen}
        onOpenChange={setPhotoViewerOpen}
        photos={selectedPhotos}
        activePhoto={activePhoto}
        setActivePhoto={setActivePhoto}
      />
    </div>
  )
}

// Photo Thumbnails Component
function PhotoThumbnails({ record, onView }: { record: ProgressRecord; onView: () => void }) {
  const photos = [
    record.frontPhoto && { url: record.frontPhoto, label: 'F' },
    record.backPhoto && { url: record.backPhoto, label: 'E' },
    record.sidePhoto && { url: record.sidePhoto, label: 'P' },
  ].filter(Boolean)

  if (photos.length === 0) return null

  return (
    <button onClick={onView} className="flex gap-1 hover:opacity-80 transition-opacity">
      {photos.map((p, i) => (
        <img key={i} src={p!.url} alt="" className="w-10 h-10 rounded object-cover border border-slate-600" />
      ))}
    </button>
  )
}

// Progress Card Component
function ProgressCard({ 
  record, 
  onEdit, 
  onDelete, 
  onViewPhotos,
  isCoach 
}: { 
  record: ProgressRecord
  onEdit: () => void
  onDelete: () => void
  onViewPhotos: () => void
  isCoach: boolean
}) {
  const hasPhotos = record.frontPhoto || record.backPhoto || record.sidePhoto
  
  return (
    <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
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
              {!isCoach && (
                <>
                  <Button variant="ghost" size="icon" onClick={onEdit} className="text-slate-400 hover:text-white h-8 w-8">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-400 hover:text-red-300 h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
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
              <Button variant="ghost" size="sm" onClick={onViewPhotos} className="text-emerald-400 hover:text-emerald-300">
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
}

// Progress Dialog Component
function ProgressDialog({
  open,
  onOpenChange,
  editingProgress,
  form,
  setForm,
  saving,
  onSave,
  uploadingPhoto,
  onPhotoUpload
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingProgress: ProgressRecord | null
  form: any
  setForm: (form: any) => void
  saving: boolean
  onSave: () => void
  uploadingPhoto: string | null
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'frontPhoto' | 'backPhoto' | 'sidePhoto') => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProgress ? 'Editar Registro de Progreso' : 'Nuevo Registro de Progreso'}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Registra tus mediciones corporales y fotos
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="bg-slate-700 border-slate-600"
            />
          </div>
          
          {/* Body Measurements */}
          <div className="space-y-3">
            <Label className="text-base text-emerald-400">Mediciones Corporales</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="70.5"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Espalda (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.shoulders}
                  onChange={(e) => setForm({ ...form, shoulders: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="45.0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Pecho (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.chest}
                  onChange={(e) => setForm({ ...form, chest: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="100.0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Cintura (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.waist}
                  onChange={(e) => setForm({ ...form, waist: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="80.0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Glúteos (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.hip}
                  onChange={(e) => setForm({ ...form, hip: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="95.0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Brazo Der. (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.rightArm}
                  onChange={(e) => setForm({ ...form, rightArm: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="35.0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Brazo Izq. (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.leftArm}
                  onChange={(e) => setForm({ ...form, leftArm: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="35.0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Muslo Der. (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.rightThigh}
                  onChange={(e) => setForm({ ...form, rightThigh: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="55.0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-400">Muslo Izq. (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.leftThigh}
                  onChange={(e) => setForm({ ...form, leftThigh: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="55.0"
                />
              </div>
            </div>
          </div>
          
          {/* Photo Upload Section */}
          <div className="border-t border-slate-700 pt-4 mt-4">
            <Label className="text-base text-emerald-400 flex items-center gap-2 mb-4">
              <Camera className="w-4 h-4" />
              Fotos de Progreso
            </Label>
            <div className="grid grid-cols-3 gap-4">
              {(['front', 'back', 'side'] as const).map((photoType) => (
                <div key={photoType} className="space-y-2">
                  <Label className="text-sm text-slate-400 capitalize">
                    {photoType === 'front' ? 'Frontal' : photoType === 'back' ? 'Espalda' : 'Perfil'}
                  </Label>
                  <div className="relative">
                    {form[`${photoType}Photo`] ? (
                      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-slate-700">
                        <img 
                          src={form[`${photoType}Photo`]} 
                          alt={`${photoType} photo`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setForm({ ...form, [`${photoType}Photo`]: '' })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-[3/4] rounded-lg border-2 border-dashed border-slate-600 cursor-pointer hover:border-emerald-500 transition-colors bg-slate-700/30">
                        {uploadingPhoto === `${photoType}Photo` ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-emerald-500"></div>
                        ) : (
                          <>
                            <Camera className="w-8 h-8 text-slate-500 mb-2" />
                            <span className="text-xs text-slate-500">Subir foto</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onPhotoUpload(e, `${photoType}Photo` as any)}
                          disabled={uploadingPhoto !== null}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="bg-slate-700 border-slate-600"
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Guardando...' : editingProgress ? 'Actualizar Registro' : 'Guardar Registro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Photo Viewer Dialog Component
function PhotoViewerDialog({
  open,
  onOpenChange,
  photos,
  activePhoto,
  setActivePhoto
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  photos: { front: string | null; back: string | null; side: string | null }
  activePhoto: 'front' | 'back' | 'side'
  setActivePhoto: (photo: 'front' | 'back' | 'side') => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            Fotos de Progreso
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Photo Type Selector */}
          <div className="flex gap-2">
            {(['front', 'back', 'side'] as const).map((type) => (
              <Button
                key={type}
                variant={activePhoto === type ? 'default' : 'outline'}
                onClick={() => setActivePhoto(type)}
                className={activePhoto === type ? 'bg-emerald-600' : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400'}
                disabled={!photos[type]}
              >
                {type === 'front' ? 'Frontal' : type === 'back' ? 'Espalda' : 'Perfil'}
              </Button>
            ))}
          </div>
          
          {/* Main Photo Display */}
          <div className="relative aspect-[3/4] max-h-[60vh] mx-auto rounded-lg overflow-hidden bg-slate-800">
            {photos[activePhoto] ? (
              <img 
                src={photos[activePhoto]!}
                alt={`${activePhoto} photo`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <ImageIcon className="w-16 h-16" />
              </div>
            )}
          </div>
          
          {/* Thumbnail Strip */}
          <div className="flex justify-center gap-2">
            {(['front', 'back', 'side'] as const).map((type) => (
              photos[type] && (
                <button
                  key={type}
                  onClick={() => setActivePhoto(type)}
                  className={`w-16 h-20 rounded overflow-hidden border-2 transition-colors ${
                    activePhoto === type ? 'border-emerald-500' : 'border-slate-600'
                  }`}
                >
                  <img 
                    src={photos[type]!}
                    alt={`${type} thumbnail`}
                    className="w-full h-full object-cover"
                  />
                </button>
              )
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
