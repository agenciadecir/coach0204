'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Dumbbell,
  User,
  Archive,
  Clock,
  Link,
  MessageSquare,
  Save,
  X,
  Play,
  Video,
  Timer,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react'
import { useAppStore } from '@/hooks/use-store'
import { useToast } from '@/hooks/use-toast'

interface Exercise {
  id: string
  name: string
  videoUrl: string | null
  imageUrl: string | null
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
  exercise: Exercise | null
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
  exercises: RoutineExercise[] // Legacy direct exercises
  weeks: RoutineWeek[] // New format with weeks
}

interface Routine {
  id: string
  name: string
  description: string | null
  isArchived: boolean
  createdAt: string
  student?: {
    id: string
    user: { name: string | null; email: string }
  }
  trainingDays: TrainingDay[]
}

// Inline Timer Component
function InlineTimer() {
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer')
  const [seconds, setSeconds] = useState(60)
  const [stopwatchTime, setStopwatchTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(60)

  const presets = [30, 60, 90, 120]

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (mode === 'timer' && isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            playBeep()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    if (mode === 'stopwatch' && isRunning) {
      interval = setInterval(() => {
        setStopwatchTime((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [mode, isRunning, seconds])

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.frequency.value = 880
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3
      oscillator.start()
      setTimeout(() => { gainNode.gain.value = 0 }, 200)
      setTimeout(() => { gainNode.gain.value = 0.3 }, 300)
      setTimeout(() => { gainNode.gain.value = 0 }, 500)
      setTimeout(() => { oscillator.stop() }, 600)
    } catch (e) {
      console.log('Audio not supported')
    }
  }

  const toggleTimer = () => {
    if (mode === 'timer' && seconds === 0) {
      setSeconds(selectedPreset || 60)
    }
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    if (mode === 'timer') {
      setSeconds(selectedPreset || 60)
    } else {
      setStopwatchTime(0)
    }
    setIsRunning(false)
  }

  const selectPreset = (preset: number) => {
    setSelectedPreset(preset)
    setSeconds(preset)
    setIsRunning(false)
  }

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentTime = mode === 'timer' ? seconds : stopwatchTime
  const isFinished = mode === 'timer' && seconds === 0

  return (
    <Card className="bg-gradient-to-r from-purple-900/50 to-violet-900/50 border-purple-500/30">
      <CardContent className="p-4">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMode('timer'); setIsRunning(false); setSeconds(selectedPreset || 60); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              mode === 'timer' 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            <Timer className="w-4 h-4 inline mr-1" />
            Timer
          </button>
          <button
            onClick={() => { setMode('stopwatch'); setIsRunning(false); setStopwatchTime(0); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              mode === 'stopwatch' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1" />
            Cronómetro
          </button>
        </div>

        {/* Time Display */}
        <div className="text-center mb-4">
          <span className={`text-5xl font-bold ${isFinished ? 'text-emerald-400 animate-pulse' : 'text-white'}`}>
            {formatTime(currentTime)}
          </span>
          {isFinished && (
            <p className="text-emerald-400 text-sm mt-1">¡Tiempo completado!</p>
          )}
        </div>

        {/* Preset buttons - only for timer mode */}
        {mode === 'timer' && (
          <div className="flex gap-2 mb-4">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => selectPreset(preset)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPreset === preset 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {preset}s
              </button>
            ))}
          </div>
        )}

        {/* Control buttons */}
        <div className="flex gap-2">
          <button
            onClick={resetTimer}
            className="flex-1 py-2.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar
          </button>
          <button
            onClick={toggleTimer}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'stopwatch' 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : isFinished 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Iniciar
              </>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

export function RoutinesView() {
  const { data: session } = useSession()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<RoutineExercise | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null)
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null)
  const [editingWeightValue, setEditingWeightValue] = useState<string>('')
  const [savingWeight, setSavingWeight] = useState(false)
  const { setCurrentView, setSelectedStudentId } = useAppStore()
  const { toast } = useToast()

  const isCoach = session?.user.role === 'COACH'

  useEffect(() => {
    fetchRoutines()
  }, [showArchived])

  const fetchRoutines = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/routines?archived=${showArchived}`)
      const data = await res.json()
      setRoutines(Array.isArray(data) ? data : [])

      // Auto-select first routine and day
      if (data.length > 0) {
        setSelectedRoutine(data[0])
        if (data[0].trainingDays.length > 0) {
          setSelectedDayId(data[0].trainingDays[0].id)
          // Set initial week to 1
          setSelectedWeekNumber(1)
        }
      } else {
        setSelectedRoutine(null)
        setSelectedDayId(null)
      }
    } catch (error) {
      console.error('Error fetching routines:', error)
      setRoutines([])
    } finally {
      setLoading(false)
    }
  }

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId)
    setCurrentView('student-detail')
  }

  const openNoteDialog = (exercise: RoutineExercise) => {
    setEditingExercise(exercise)
    setNoteText(exercise.studentNotes || '')
    setNoteDialogOpen(true)
  }

  const handleSaveNote = async () => {
    if (!editingExercise) return

    setSavingNote(true)
    try {
      const res = await fetch(`/api/routine-exercises/${editingExercise.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentNotes: noteText })
      })

      if (!res.ok) throw new Error('Error')

      // Update local state
      setRoutines(prev => prev.map(r => {
        if (r.id !== selectedRoutine?.id) return r
        return {
          ...r,
          trainingDays: r.trainingDays.map(d => {
            if (d.id !== selectedDayId) return d
            
            // Update in weeks if present
            const updatedWeeks = d.weeks?.map(w => ({
              ...w,
              exercises: w.exercises.map(ex =>
                ex.id === editingExercise.id
                  ? { ...ex, studentNotes: noteText }
                  : ex
              )
            })) || []
            
            // Also update in legacy exercises
            const updatedExercises = d.exercises?.map(ex =>
              ex.id === editingExercise.id
                ? { ...ex, studentNotes: noteText }
                : ex
            ) || []
            
            return {
              ...d,
              weeks: updatedWeeks,
              exercises: updatedExercises
            }
          })
        }
      }))

      // Update selected routine
      setSelectedRoutine(prev => {
        if (!prev) return prev
        return {
          ...prev,
          trainingDays: prev.trainingDays.map(d => {
            if (d.id !== selectedDayId) return d
            
            const updatedWeeks = d.weeks?.map(w => ({
              ...w,
              exercises: w.exercises.map(ex =>
                ex.id === editingExercise.id
                  ? { ...ex, studentNotes: noteText }
                  : ex
              )
            })) || []
            
            const updatedExercises = d.exercises?.map(ex =>
              ex.id === editingExercise.id
                ? { ...ex, studentNotes: noteText }
                : ex
            ) || []
            
            return {
              ...d,
              weeks: updatedWeeks,
              exercises: updatedExercises
            }
          })
        }
      })

      toast({ title: 'Nota guardada' })
      setNoteDialogOpen(false)
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    } finally {
      setSavingNote(false)
    }
  }

  const handleSaveWeight = async (exerciseId: string, weight: string) => {
    setSavingWeight(true)
    try {
      const res = await fetch(`/api/routine-exercises/${exerciseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight })
      })

      if (!res.ok) throw new Error('Error')

      // Update local state
      setRoutines(prev => prev.map(r => {
        return {
          ...r,
          trainingDays: r.trainingDays.map(d => {
            // Update in weeks if present
            const updatedWeeks = d.weeks?.map(w => ({
              ...w,
              exercises: w.exercises.map(ex =>
                ex.id === exerciseId
                  ? { ...ex, weight }
                  : ex
              )
            })) || []
            
            // Also update in legacy exercises
            const updatedExercises = d.exercises?.map(ex =>
              ex.id === exerciseId
                ? { ...ex, weight }
                : ex
            ) || []
            
            return {
              ...d,
              weeks: updatedWeeks,
              exercises: updatedExercises
            }
          })
        }
      }))

      // Update selected routine
      setSelectedRoutine(prev => {
        if (!prev) return prev
        return {
          ...prev,
          trainingDays: prev.trainingDays.map(d => {
            const updatedWeeks = d.weeks?.map(w => ({
              ...w,
              exercises: w.exercises.map(ex =>
                ex.id === exerciseId
                  ? { ...ex, weight }
                  : ex
              )
            })) || []
            
            const updatedExercises = d.exercises?.map(ex =>
              ex.id === exerciseId
                ? { ...ex, weight }
                : ex
            ) || []
            
            return {
              ...d,
              weeks: updatedWeeks,
              exercises: updatedExercises
            }
          })
        }
      })

      toast({ title: 'Peso guardado' })
    } catch (error) {
      toast({ title: 'Error al guardar peso', variant: 'destructive' })
    } finally {
      setSavingWeight(false)
    }
  }

  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) return match[1]
    }
    return null
  }

  const getYouTubeThumbnail = (url: string | null): string | null => {
    if (!url) return null
    const videoId = extractYouTubeId(url)
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    }
    return null
  }

  const openVideoDialog = (url: string | null) => {
    if (!url) return

    const videoId = extractYouTubeId(url)
    if (videoId) {
      setSelectedVideoUrl(`https://www.youtube.com/embed/${videoId}`)
      setVideoDialogOpen(true)
    } else {
      window.open(url, '_blank')
    }
  }

  const getExerciseImage = (ex: RoutineExercise): string | null => {
    // First use custom image if exists and valid
    if (ex.exercise?.imageUrl && !ex.exercise.imageUrl.includes('youtube.com') && !ex.exercise.imageUrl.includes('youtu.be')) {
      return ex.exercise.imageUrl
    }
    // Then use YouTube thumbnail
    return getYouTubeThumbnail(ex.exercise?.videoUrl || null)
  }

  const visibleRoutines = routines.filter(r => showArchived ? r.isArchived : !r.isArchived)

  // Get current day's exercises (supports both new weeks format and legacy direct exercises)
  const currentDay = selectedRoutine?.trainingDays.find(d => d.id === selectedDayId)

  // Get exercises for the current week
  const getCurrentExercises = (): RoutineExercise[] => {
    if (!currentDay) return []

    // If day has weeks, get exercises from selected week
    if (currentDay.weeks && currentDay.weeks.length > 0) {
      const week = currentDay.weeks.find(w => w.weekNumber === selectedWeekNumber)
      return week?.exercises || []
    }

    // Legacy: use direct exercises
    return currentDay.exercises || []
  }

  const currentExercises = getCurrentExercises()
  
  // Get max week number for the current day
  const maxWeekNumber = currentDay?.weeks?.length || 1

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
    <div className="space-y-4 pb-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {isCoach ? 'Todas las Rutinas' : 'Mis Rutinas'}
          </h1>
          <p className="text-slate-400 mt-1">
            {isCoach ? 'Rutinas de todos tus alumnos' : 'Tus rutinas de entrenamiento'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowArchived(!showArchived)
              setSelectedRoutine(null)
              setSelectedDayId(null)
            }}
            className={!showArchived ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400' : 'bg-amber-500/20 text-amber-400 border-amber-500/50'}
          >
            <Archive className="w-4 h-4 mr-2" />
            {showArchived ? 'Ver activas' : 'Ver archivadas'}
          </Button>
        </div>
      </div>

      {/* Timer Block for Students */}
      {!isCoach && <InlineTimer />}

      {/* Routine Selector (for multiple routines) */}
      {visibleRoutines.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {visibleRoutines.map((routine) => (
            <button
              key={routine.id}
              onClick={() => {
                setSelectedRoutine(routine)
                setSelectedDayId(routine.trainingDays[0]?.id || null)
                setSelectedWeekNumber(1)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedRoutine?.id === routine.id
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {routine.name}
              {routine.isArchived && (
                <Badge variant="outline" className="ml-2 text-xs border-slate-500 text-slate-400">
                  Archivada
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedRoutine ? (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Routine Header - Only for Coach */}
          {isCoach && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-white text-xl">{selectedRoutine.name}</CardTitle>
                    {selectedRoutine.description && (
                      <CardDescription className="text-slate-400 mt-1">
                        {selectedRoutine.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRoutine.student && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStudentClick(selectedRoutine.student!.id)}
                        className="border-slate-600 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <User className="w-4 h-4 mr-2" />
                        {selectedRoutine.student.user.name || selectedRoutine.student.user.email}
                      </Button>
                    )}
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50">
                      {selectedRoutine.trainingDays.length} días
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Day Tabs */}
          {selectedRoutine.trainingDays.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-2">
              {selectedRoutine.trainingDays.map((day) => (
                <button
                  key={day.id}
                  onClick={() => {
                    setSelectedDayId(day.id)
                    setSelectedWeekNumber(1)
                  }}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    selectedDayId === day.id
                      ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {day.name}
                  <span className="ml-2 text-xs opacity-70">
                    ({(day.weeks?.length || 0) > 0 
                      ? day.weeks.reduce((sum, w) => sum + (w.exercises?.length || 0), 0)
                      : (day.exercises?.length || 0)})
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Week Tabs (only if day has weeks) */}
          {currentDay && (currentDay.weeks?.length || 0) > 0 && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <div className="flex gap-1 overflow-x-auto">
                {currentDay.weeks?.map((week) => (
                  <button
                    key={week.id || week.weekNumber}
                    onClick={() => setSelectedWeekNumber(week.weekNumber)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedWeekNumber === week.weekNumber
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    Semana {week.weekNumber}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exercises List */}
          {currentDay && (
            <Card className="flex-1 bg-slate-800 border-slate-700 overflow-hidden">
              <CardContent className="p-4 overflow-y-auto max-h-[calc(100vh-380px)]">
                {currentDay.muscleGroups && (
                  <p className="text-sm text-slate-400 mb-4 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" />
                    {currentDay.muscleGroups}
                  </p>
                )}

                <div className="space-y-3">
                  {currentExercises.map((ex, i) => {
                    const isSuperset = ex.isSuperset
                    const supersetLabel = isSuperset ? `Superserie ${ex.supersetOrder}` : null
                    const imageSrc = getExerciseImage(ex)
                    const hasVideo = ex.exercise?.videoUrl

                    return (
                      <div
                        key={ex.id || `ex-${i}-${ex.exerciseName}`}
                        className={`flex items-start gap-3 p-4 rounded-xl transition-all ${
                          isSuperset
                            ? 'bg-purple-500/10 border border-purple-500/30'
                            : 'bg-slate-700/50 hover:bg-slate-700/70'
                        }`}
                      >
                        {/* Exercise thumbnail */}
                        {imageSrc && (
                          <div
                            className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer relative group"
                            onClick={() => hasVideo && openVideoDialog(ex.exercise?.videoUrl)}
                          >
                            <img
                              src={imageSrc}
                              alt={ex.exerciseName}
                              className="w-full h-full object-cover"
                            />
                            {hasVideo && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                                <Play className="w-6 h-6 text-white" />
                              </div>
                            )}
                          </div>
                        )}

                        {!imageSrc && (
                          <div className="w-20 h-20 rounded-lg bg-slate-600/50 flex items-center justify-center flex-shrink-0">
                            <Dumbbell className="w-8 h-8 text-slate-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-medium text-lg">{ex.exerciseName}</p>
                            {isSuperset && (
                              <Badge variant="outline" className="text-xs border-purple-500 text-purple-300">
                                <Link className="w-3 h-3 mr-1" />
                                {supersetLabel}
                              </Badge>
                            )}
                            {hasVideo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openVideoDialog(ex.exercise?.videoUrl || null)}
                                className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Video className="w-3 h-3 mr-1" />
                                Video
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <p className="text-slate-300">
                              <span className="text-emerald-400 font-semibold">{ex.sets}</span>
                              <span className="text-slate-500 mx-1">×</span>
                              <span className="text-emerald-400 font-semibold">{ex.reps}</span>
                            </p>
                            
                            {/* Weight - editable for students */}
                            {!isCoach ? (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">@</span>
                                <input
                                  type="text"
                                  value={editingWeightId === ex.id ? editingWeightValue : (ex.weight || '')}
                                  onChange={(e) => {
                                    if (editingWeightId !== ex.id) {
                                      setEditingWeightId(ex.id)
                                    }
                                    setEditingWeightValue(e.target.value)
                                  }}
                                  onBlur={async () => {
                                    if (editingWeightId === ex.id && editingWeightValue !== (ex.weight || '')) {
                                      await handleSaveWeight(ex.id, editingWeightValue)
                                    }
                                    setEditingWeightId(null)
                                  }}
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur()
                                    }
                                  }}
                                  placeholder="kg"
                                  className="w-16 px-2 py-0.5 text-sm bg-slate-700/50 border border-slate-600 rounded text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                                />
                                <span className="text-slate-400 text-sm">kg</span>
                              </div>
                            ) : (
                              ex.weight && (
                                <span className="text-emerald-400 font-medium">@ {ex.weight}kg</span>
                              )
                            )}
                          </div>

                          {/* Coach sees indicator when student has entered weight */}
                          {isCoach && ex.weight && (
                            <p className="text-[10px] text-amber-400/70 flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              Peso registrado por alumno
                            </p>
                          )}

                          {ex.notes && (
                            <p className="text-sm text-slate-400 mt-2 bg-slate-800/50 px-2 py-1 rounded">
                              📝 {ex.notes}
                            </p>
                          )}

                          {ex.studentNotes && (
                            <p className="text-sm text-amber-400/90 mt-2 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                              ✏️ {ex.studentNotes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm text-slate-300 border-slate-600 px-3 py-1">
                              {ex.sets}×{ex.reps}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1 text-slate-400 text-sm">
                            <Clock className="w-3 h-3" />
                            {ex.restTime || 60}s
                          </div>

                          {/* Student notes button */}
                          {!isCoach && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openNoteDialog(ex)}
                              className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              {ex.studentNotes ? 'Editar' : 'Nota'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {currentExercises.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Dumbbell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay ejercicios en este día</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 w-full max-w-md">
            <div className="w-20 h-20 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
              <Dumbbell className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-400 text-lg">
              {showArchived ? 'No hay rutinas archivadas' : 'No hay rutinas activas'}
            </p>
            {isCoach && !showArchived && (
              <p className="text-slate-500 text-sm mt-2">
                Selecciona un alumno para crear su rutina
              </p>
            )}
          </div>
        </div>
      )}

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Nota Personal
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-400 mb-2">
              Ejercicio: <span className="text-white font-medium">{editingExercise?.exerciseName}</span>
            </p>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Añade tus notas personales sobre este ejercicio..."
              className="bg-slate-700/50 border-slate-600 focus:border-amber-500 min-h-[120px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setNoteDialogOpen(false)}
              className="text-slate-400"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNote}
              disabled={savingNote}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {savingNote ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVideoDialogOpen(false)}
              className="absolute top-3 right-3 z-10 bg-slate-800/90 hover:bg-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
            {selectedVideoUrl && (
              <div className="aspect-video">
                <iframe
                  src={selectedVideoUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
