'use client'

import { useState, useEffect } from 'react'
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
import {
  Plus,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  Link,
  Unlink,
  Clock,
  Hash,
  Dumbbell,
  Copy,
  Check
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface RoutineExercise {
  id?: string
  exerciseName: string
  sets: number
  reps: string
  weight?: string
  restTime: string
  notes?: string
  isSuperset: boolean
  supersetGroupId?: string
  supersetOrder?: number
  order: number
}

interface RoutineWeek {
  id?: string
  weekNumber: number
  exercises: RoutineExercise[]
  isExpanded: boolean
}

interface TrainingDay {
  id?: string
  name: string
  dayNumber: number
  muscleGroups?: string
  weeks: RoutineWeek[]
  isExpanded: boolean
}

interface RoutineEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (routine: { name: string; description?: string; trainingDays: TrainingDay[] }) => void
  initialData?: {
    id: string
    name: string
    description?: string | null
    trainingDays: {
      id: string
      name: string
      dayNumber: number
      muscleGroups?: string | null
      weeks?: {
        id: string
        weekNumber: number
        exercises: {
          id: string
          exerciseName: string
          sets: number
          reps: string
          weight?: string | null
          restTime?: string | null
          notes?: string | null
          isSuperset: boolean
          supersetGroupId?: string | null
          supersetOrder?: number | null
          order: number
        }[]
      }[]
      exercises?: {
        id: string
        exerciseName: string
        sets: number
        reps: string
        weight?: string | null
        restTime?: string | null
        notes?: string | null
        isSuperset: boolean
        supersetGroupId?: string | null
        supersetOrder?: number | null
        order: number
      }[]
    }[]
  } | null
  saving?: boolean
}

const defaultWeek = (): RoutineWeek => ({
  weekNumber: 1,
  exercises: [],
  isExpanded: true
})

const defaultDay = (): TrainingDay => ({
  name: 'Día 1',
  dayNumber: 1,
  muscleGroups: '',
  weeks: [defaultWeek()],
  isExpanded: true
})

export function RoutineEditor({ isOpen, onClose, onSave, initialData, saving }: RoutineEditorProps) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([defaultDay()])
  const [draggedExercise, setDraggedExercise] = useState<{ dayIndex: number; weekIndex: number; exerciseIndex: number } | null>(null)
  const [supersetCreating, setSupersetCreating] = useState<{ dayIndex: number; weekIndex: number; exerciseIndex: number } | null>(null)
  const [copiedWeek, setCopiedWeek] = useState<{ dayIndex: number; weekIndex: number } | null>(null)

  // Reset state when dialog opens with new data
  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '')
      setDescription(initialData?.description || '')
      
      if (initialData?.trainingDays && initialData.trainingDays.length > 0) {
        const days = initialData.trainingDays.map((day, dayIndex) => {
          if (day.weeks && day.weeks.length > 0) {
            return {
              id: day.id,
              name: day.name || `Día ${dayIndex + 1}`,
              dayNumber: day.dayNumber || dayIndex + 1,
              muscleGroups: day.muscleGroups || '',
              weeks: day.weeks.map((week, weekIndex) => ({
                id: week.id,
                weekNumber: week.weekNumber || weekIndex + 1,
                exercises: week.exercises.map(ex => ({
                  ...ex,
                  exerciseName: ex.exerciseName || '',
                  restTime: ex.restTime || '60',
                  weight: ex.weight || ''
                })),
                isExpanded: true
              })),
              isExpanded: true
            }
          } else if (day.exercises && day.exercises.length > 0) {
            return {
              id: day.id,
              name: day.name || `Día ${dayIndex + 1}`,
              dayNumber: day.dayNumber || dayIndex + 1,
              muscleGroups: day.muscleGroups || '',
              weeks: [{
                weekNumber: 1,
                exercises: day.exercises.map(ex => ({
                  ...ex,
                  exerciseName: ex.exerciseName || '',
                  restTime: ex.restTime || '60',
                  weight: ex.weight || ''
                })),
                isExpanded: true
              }],
              isExpanded: true
            }
          } else {
            return {
              id: day.id,
              name: day.name || `Día ${dayIndex + 1}`,
              dayNumber: day.dayNumber || dayIndex + 1,
              muscleGroups: day.muscleGroups || '',
              weeks: [defaultWeek()],
              isExpanded: true
            }
          }
        })
        setTrainingDays(days)
      } else {
        setTrainingDays([defaultDay()])
      }
      
      setDraggedExercise(null)
      setSupersetCreating(null)
      setCopiedWeek(null)
    }
  }, [isOpen, initialData])

  // Day management
  const addTrainingDay = () => {
    setTrainingDays(prev => [
      ...prev,
      {
        name: `Día ${prev.length + 1}`,
        dayNumber: prev.length + 1,
        muscleGroups: '',
        weeks: [defaultWeek()],
        isExpanded: true
      }
    ])
  }

  const removeTrainingDay = (dayIndex: number) => {
    if (trainingDays.length <= 1) {
      toast({ title: 'Debe haber al menos un día', variant: 'destructive' })
      return
    }
    setTrainingDays(prev => prev.filter((_, i) => i !== dayIndex).map((day, i) => ({
      ...day,
      dayNumber: i + 1,
      name: day.name.includes('Día') ? `Día ${i + 1}` : day.name
    })))
  }

  const toggleDayExpanded = (dayIndex: number) => {
    setTrainingDays(prev => prev.map((day, i) =>
      i === dayIndex ? { ...day, isExpanded: !day.isExpanded } : day
    ))
  }

  const updateDay = (dayIndex: number, field: keyof TrainingDay, value: any) => {
    setTrainingDays(prev => prev.map((day, i) =>
      i === dayIndex ? { ...day, [field]: value } : day
    ))
  }

  // Week management
  const addWeekToDay = (dayIndex: number) => {
    setTrainingDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return {
        ...day,
        weeks: [
          ...day.weeks,
          {
            weekNumber: day.weeks.length + 1,
            exercises: [],
            isExpanded: true
          }
        ]
      }
    }))
  }

  const removeWeekFromDay = (dayIndex: number, weekIndex: number) => {
    setTrainingDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      if (day.weeks.length <= 1) {
        toast({ title: 'Debe haber al menos una semana', variant: 'destructive' })
        return day
      }
      return {
        ...day,
        weeks: day.weeks.filter((_, wi) => wi !== weekIndex).map((week, wi) => ({
          ...week,
          weekNumber: wi + 1
        }))
      }
    }))
  }

  const toggleWeekExpanded = (dayIndex: number, weekIndex: number) => {
    setTrainingDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return {
        ...day,
        weeks: day.weeks.map((week, wi) =>
          wi === weekIndex ? { ...week, isExpanded: !week.isExpanded } : week
        )
      }
    }))
  }

  // Copy week
  const copyWeek = (dayIndex: number, weekIndex: number) => {
    setCopiedWeek({ dayIndex, weekIndex })
    toast({ title: 'Semana copiada' })
  }

  const pasteWeek = (dayIndex: number, weekIndex?: number) => {
    if (!copiedWeek) {
      toast({ title: 'No hay semana copiada', variant: 'destructive' })
      return
    }

    const sourceWeek = trainingDays[copiedWeek.dayIndex].weeks[copiedWeek.weekIndex]
    
    setTrainingDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      
      if (weekIndex !== undefined) {
        return {
          ...day,
          weeks: day.weeks.map((week, wi) =>
            wi === weekIndex
              ? {
                  ...sourceWeek,
                  weekNumber: week.weekNumber,
                  exercises: sourceWeek.exercises.map(ex => ({ ...ex, id: undefined })),
                  isExpanded: true
                }
              : week
          )
        }
      } else {
        return {
          ...day,
          weeks: [
            ...day.weeks,
            {
              ...sourceWeek,
              weekNumber: day.weeks.length + 1,
              exercises: sourceWeek.exercises.map(ex => ({ ...ex, id: undefined })),
              isExpanded: true
            }
          ]
        }
      }
    }))

    toast({ title: 'Semana pegada' })
  }

  const duplicateWeek = (dayIndex: number, weekIndex: number) => {
    const sourceWeek = trainingDays[dayIndex].weeks[weekIndex]
    
    setTrainingDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      
      const newWeeks = [...day.weeks]
      newWeeks.splice(weekIndex + 1, 0, {
        ...sourceWeek,
        weekNumber: weekIndex + 2,
        exercises: sourceWeek.exercises.map(ex => ({ ...ex, id: undefined })),
        isExpanded: true
      })
      
      return {
        ...day,
        weeks: newWeeks.map((week, wi) => ({
          ...week,
          weekNumber: wi + 1
        }))
      }
    }))

    toast({ title: 'Semana duplicada' })
  }

  // Exercise management
  const addExerciseToWeek = (dayIndex: number, weekIndex: number) => {
    setTrainingDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return {
        ...day,
        weeks: day.weeks.map((week, wi) => {
          if (wi !== weekIndex) return week
          return {
            ...week,
            exercises: [
              ...week.exercises,
              {
                exerciseName: '',
                sets: 3,
                reps: '10-12',
                weight: '',
                restTime: '60',
                notes: '',
                isSuperset: false,
                order: week.exercises.length
              }
            ]
          }
        })
      }
    }))
  }

  const removeExerciseFromWeek = (dayIndex: number, weekIndex: number, exerciseIndex: number) => {
    setTrainingDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return {
        ...day,
        weeks: day.weeks.map((week, wi) => {
          if (wi !== weekIndex) return week
          return {
            ...week,
            exercises: week.exercises
              .filter((_, ei) => ei !== exerciseIndex)
              .map((ex, ei) => ({ ...ex, order: ei }))
          }
        })
      }
    }))
  }

  const updateExercise = (dayIndex: number, weekIndex: number, exerciseIndex: number, field: keyof RoutineExercise, value: any) => {
    setTrainingDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return {
        ...day,
        weeks: day.weeks.map((week, wi) => {
          if (wi !== weekIndex) return week
          return {
            ...week,
            exercises: week.exercises.map((ex, ei) =>
              ei === exerciseIndex ? { ...ex, [field]: value } : ex
            )
          }
        })
      }
    }))
  }

  // Drag and drop handlers
  const handleDragStart = (dayIndex: number, weekIndex: number, exerciseIndex: number) => {
    setDraggedExercise({ dayIndex, weekIndex, exerciseIndex })
  }

  const handleDragOver = (e: React.DragEvent, dayIndex: number, weekIndex: number, exerciseIndex: number) => {
    e.preventDefault()
    if (!draggedExercise) return

    if (draggedExercise.dayIndex === dayIndex && draggedExercise.weekIndex === weekIndex && draggedExercise.exerciseIndex !== exerciseIndex) {
      setTrainingDays(prev => prev.map((day, i) => {
        if (i !== dayIndex) return day
        return {
          ...day,
          weeks: day.weeks.map((week, wi) => {
            if (wi !== weekIndex) return week
            const exerciseList = [...week.exercises]
            const draggedEx = exerciseList[draggedExercise.exerciseIndex]
            exerciseList.splice(draggedExercise.exerciseIndex, 1)
            exerciseList.splice(exerciseIndex, 0, draggedEx)
            return {
              ...week,
              exercises: exerciseList.map((ex, ei) => ({ ...ex, order: ei }))
            }
          })
        }
      }))
      setDraggedExercise({ dayIndex, weekIndex, exerciseIndex })
    }
  }

  const handleDragEnd = () => {
    setDraggedExercise(null)
  }

  // Superset functions
  const toggleSuperset = (dayIndex: number, weekIndex: number, exerciseIndex: number) => {
    if (supersetCreating) {
      if (supersetCreating.dayIndex === dayIndex && supersetCreating.weekIndex === weekIndex && supersetCreating.exerciseIndex !== exerciseIndex) {
        const groupId = `superset-${Date.now()}`
        setTrainingDays(prev => prev.map((day, i) => {
          if (i !== dayIndex) return day
          return {
            ...day,
            weeks: day.weeks.map((week, wi) => {
              if (wi !== weekIndex) return week
              return {
                ...week,
                exercises: week.exercises.map((ex, ei) => {
                  if (ei === supersetCreating.exerciseIndex) {
                    return { ...ex, isSuperset: true, supersetGroupId: groupId, supersetOrder: 1 }
                  }
                  if (ei === exerciseIndex) {
                    return { ...ex, isSuperset: true, supersetGroupId: groupId, supersetOrder: 2 }
                  }
                  return ex
                })
              }
            })
          }
        }))
        toast({ title: 'Superserie creada' })
      }
      setSupersetCreating(null)
    } else {
      setSupersetCreating({ dayIndex, weekIndex, exerciseIndex })
      toast({ title: 'Selecciona otro ejercicio para combinar', duration: 3000 })
    }
  }

  const removeSuperset = (dayIndex: number, weekIndex: number, exerciseIndex: number) => {
    const exercise = trainingDays[dayIndex].weeks[weekIndex].exercises[exerciseIndex]
    if (!exercise.supersetGroupId) return

    const groupId = exercise.supersetGroupId
    setTrainingDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return {
        ...day,
        weeks: day.weeks.map((week, wi) => {
          if (wi !== weekIndex) return week
          return {
            ...week,
            exercises: week.exercises.map((ex) => {
              if (ex.supersetGroupId === groupId) {
                return { ...ex, isSuperset: false, supersetGroupId: undefined, supersetOrder: undefined }
              }
              return ex
            })
          }
        })
      }
    }))
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: 'El nombre es requerido', variant: 'destructive' })
      return
    }

    const validTrainingDays = trainingDays.map(day => ({
      ...day,
      weeks: day.weeks.map(week => ({
        ...week,
        exercises: week.exercises.filter(ex => ex.exerciseName.trim())
      })).filter(week => week.exercises.length > 0 || day.weeks.indexOf(week) === 0)
    })).filter(day => day.weeks.some(w => w.exercises.length > 0))

    if (validTrainingDays.length === 0 || validTrainingDays.every(d => d.weeks.every(w => w.exercises.length === 0))) {
      toast({ title: 'Agrega al menos un ejercicio', variant: 'destructive' })
      return
    }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      trainingDays: validTrainingDays
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {initialData ? 'Editar Rutina' : 'Crear Nueva Rutina'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Crea una rutina con días de entrenamiento y semanas progresivas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la rutina (ej: Hipertrofia Intermedia)"
              className="bg-slate-700 border-slate-600"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción (opcional)..."
              className="bg-slate-700 border-slate-600"
              rows={2}
            />
          </div>

          {/* Copied Week Indicator */}
          {copiedWeek && (
            <div className="flex items-center gap-2 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-sm">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300 flex-1">
                Semana copiada
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCopiedWeek(null)}
                className="text-emerald-400 hover:text-emerald-300 h-6 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Training Days */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Días de Entrenamiento</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTrainingDay}
                className="border-slate-600 text-slate-300 h-8"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar Día
              </Button>
            </div>

            {trainingDays.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className="bg-slate-700/50 rounded-lg border border-slate-600 overflow-hidden"
              >
                {/* Day Header - Compact */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/30"
                  onClick={() => toggleDayExpanded(dayIndex)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center font-bold text-sm">
                      {day.dayNumber}
                    </div>
                    <div className="flex flex-col">
                      <input
                        value={day.name}
                        onChange={(e) => {
                          e.stopPropagation()
                          updateDay(dayIndex, 'name', e.target.value)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent text-white font-medium text-sm focus:outline-none w-24"
                        placeholder="Nombre"
                      />
                      <input
                        value={day.muscleGroups || ''}
                        onChange={(e) => {
                          e.stopPropagation()
                          updateDay(dayIndex, 'muscleGroups', e.target.value)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent text-slate-400 text-xs focus:outline-none w-32"
                        placeholder="Músculos"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-slate-600 text-xs">
                      {day.weeks.length} sem
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTrainingDay(dayIndex)
                      }}
                      className="text-red-400 hover:text-red-300 h-7 w-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {day.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Weeks */}
                {day.isExpanded && (
                  <div className="p-3 border-t border-slate-600 space-y-3">
                    {/* Week tabs - Compact */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {day.weeks.map((week, weekIndex) => (
                        <button
                          key={weekIndex}
                          onClick={() => toggleWeekExpanded(dayIndex, weekIndex)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                            week.isExpanded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-600/50 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          Sem {week.weekNumber} ({week.exercises.length})
                        </button>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addWeekToDay(dayIndex)}
                        className="text-emerald-400 hover:text-emerald-300 h-7 w-7 p-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Week content */}
                    {day.weeks.map((week, weekIndex) => (
                      week.isExpanded && (
                        <div key={weekIndex} className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                          {/* Week actions - Compact inline */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Semana {week.weekNumber}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => copyWeek(dayIndex, weekIndex)}
                                className="text-slate-400 hover:text-white h-6 px-2 text-xs"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copiar
                              </Button>
                              {copiedWeek && (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => pasteWeek(dayIndex, weekIndex)}
                                    className="text-emerald-400 hover:text-emerald-300 h-6 px-2 text-xs"
                                  >
                                    Pegar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => duplicateWeek(dayIndex, weekIndex)}
                                    className="text-blue-400 hover:text-blue-300 h-6 px-2 text-xs"
                                  >
                                    Duplicar
                                  </Button>
                                </>
                              )}
                              {day.weeks.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeWeekFromDay(dayIndex, weekIndex)}
                                  className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Exercises - Compact */}
                          {week.exercises.map((ex, exerciseIndex) => (
                            <div
                              key={exerciseIndex}
                              draggable
                              onDragStart={() => handleDragStart(dayIndex, weekIndex, exerciseIndex)}
                              onDragOver={(e) => handleDragOver(e, dayIndex, weekIndex, exerciseIndex)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-start gap-2 p-2 rounded border transition-all ${
                                ex.isSuperset 
                                  ? 'border-purple-500 bg-purple-500/10' 
                                  : supersetCreating?.dayIndex === dayIndex && supersetCreating?.weekIndex === weekIndex && supersetCreating?.exerciseIndex === exerciseIndex
                                  ? 'border-yellow-500 bg-yellow-500/10'
                                  : 'border-slate-600 bg-slate-700/50'
                              } ${draggedExercise?.dayIndex === dayIndex && draggedExercise?.weekIndex === weekIndex && draggedExercise?.exerciseIndex === exerciseIndex ? 'opacity-50' : ''}`}
                            >
                              {/* Drag Handle */}
                              <div className="cursor-grab pt-1 text-slate-500 hover:text-slate-300">
                                <GripVertical className="w-4 h-4" />
                              </div>

                              {/* Exercise Content - Compact */}
                              <div className="flex-1 space-y-2">
                                {/* Exercise name row */}
                                <div className="flex gap-2">
                                  <Input
                                    value={ex.exerciseName}
                                    onChange={(e) => updateExercise(dayIndex, weekIndex, exerciseIndex, 'exerciseName', e.target.value)}
                                    placeholder="Ejercicio"
                                    className="bg-slate-700 border-slate-600 h-8 text-sm flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant={ex.isSuperset ? 'default' : 'outline'}
                                    size="icon"
                                    onClick={() => ex.isSuperset ? removeSuperset(dayIndex, weekIndex, exerciseIndex) : toggleSuperset(dayIndex, weekIndex, exerciseIndex)}
                                    className={`h-8 w-8 ${ex.isSuperset 
                                      ? 'bg-purple-600 hover:bg-purple-700' 
                                      : supersetCreating?.dayIndex === dayIndex && supersetCreating?.weekIndex === weekIndex && supersetCreating?.exerciseIndex === exerciseIndex
                                      ? 'bg-yellow-600 border-yellow-600'
                                      : 'border-slate-600'
                                    }`}
                                    title={ex.isSuperset ? 'Quitar superserie' : 'Crear superserie'}
                                  >
                                    {ex.isSuperset ? <Unlink className="w-3 h-3" /> : <Link className="w-3 h-3" />}
                                  </Button>
                                </div>

                                {/* Sets, Reps, Weight, Rest - Compact 2x2 grid */}
                                <div className="grid grid-cols-4 gap-1.5">
                                  <div>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={ex.sets}
                                      onChange={(e) => updateExercise(dayIndex, weekIndex, exerciseIndex, 'sets', parseInt(e.target.value) || 3)}
                                      placeholder="Series"
                                      className="bg-slate-700 border-slate-600 h-7 text-sm text-center"
                                    />
                                  </div>
                                  <div>
                                    <Input
                                      value={ex.reps}
                                      onChange={(e) => updateExercise(dayIndex, weekIndex, exerciseIndex, 'reps', e.target.value)}
                                      placeholder="Reps"
                                      className="bg-slate-700 border-slate-600 h-7 text-sm text-center"
                                    />
                                  </div>
                                  <div>
                                    <Input
                                      value={ex.weight || ''}
                                      onChange={(e) => updateExercise(dayIndex, weekIndex, exerciseIndex, 'weight', e.target.value)}
                                      placeholder="Peso"
                                      className="bg-slate-700 border-slate-600 h-7 text-sm text-center"
                                    />
                                  </div>
                                  <div>
                                    <Input
                                      value={ex.restTime}
                                      onChange={(e) => updateExercise(dayIndex, weekIndex, exerciseIndex, 'restTime', e.target.value)}
                                      placeholder="Desc"
                                      className="bg-slate-700 border-slate-600 h-7 text-sm text-center"
                                    />
                                  </div>
                                </div>

                                {/* Notes - Compact */}
                                <Input
                                  value={ex.notes || ''}
                                  onChange={(e) => updateExercise(dayIndex, weekIndex, exerciseIndex, 'notes', e.target.value)}
                                  placeholder="Notas..."
                                  className="bg-slate-700 border-slate-600 h-7 text-sm"
                                />
                              </div>

                              {/* Delete Button */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeExerciseFromWeek(dayIndex, weekIndex, exerciseIndex)}
                                className="text-red-400 hover:text-red-300 h-7 w-7"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}

                          {/* Add Exercise Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addExerciseToWeek(dayIndex, weekIndex)}
                            className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-emerald-500 h-8"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Agregar Ejercicio
                          </Button>

                          {/* Paste Week Button */}
                          {copiedWeek && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => pasteWeek(dayIndex)}
                              className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 h-8"
                            >
                              <Copy className="w-3.5 h-3.5 mr-1" />
                              Agregar semana copiada
                            </Button>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="h-9">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 h-9"
          >
            {saving ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear Rutina'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
