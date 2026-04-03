'use client'

import { useEffect, useState } from 'react'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
  Play,
  X,
  Search,
  Video,
  Image as ImageIcon
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Exercise {
  id: string
  name: string
  muscleGroup: string
  description: string | null
  videoUrl: string | null
  imageUrl: string | null
}

const muscleGroups = [
  { id: 'pecho', label: 'Pecho', shortLabel: 'Pecho', emoji: '🏋️', gradient: 'from-red-500 to-rose-600' },
  { id: 'espalda', label: 'Espalda', shortLabel: 'Espalda', emoji: '🔙', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'hombros', label: 'Hombros', shortLabel: 'Hombros', emoji: '💪', gradient: 'from-purple-500 to-violet-600' },
  { id: 'biceps', label: 'Bíceps', shortLabel: 'Bíceps', emoji: '💪', gradient: 'from-cyan-500 to-teal-600' },
  { id: 'triceps', label: 'Tríceps', shortLabel: 'Tríceps', emoji: '💪', gradient: 'from-pink-500 to-rose-600' },
  { id: 'piernas', label: 'Piernas', shortLabel: 'Piernas', emoji: '🦵', gradient: 'from-orange-500 to-amber-600' },
  { id: 'abdomen', label: 'Abdomen', shortLabel: 'Abs', emoji: '🎯', gradient: 'from-yellow-500 to-orange-600' },
  { id: 'gluteos', label: 'Glúteos', shortLabel: 'Glúteos', emoji: '🍑', gradient: 'from-pink-500 to-fuchsia-600' },
  { id: 'cardio', label: 'Cardio', shortLabel: 'Cardio', emoji: '❤️', gradient: 'from-red-500 to-pink-600' },
]

export function ExercisesView() {
  const { data: session } = useSession()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    muscleGroup: '',
    description: '',
    videoUrl: '',
    imageUrl: ''
  })
  const [saving, setSaving] = useState(false)
  
  const { toast } = useToast()
  const isCoach = session?.user.role === 'COACH'

  useEffect(() => {
    fetchExercises()
  }, [])

  const fetchExercises = async () => {
    try {
      const res = await fetch('/api/exercises')
      const data = await res.json()
      setExercises(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
      setExercises([])
    } finally {
      setLoading(false)
    }
  }

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGroup = !selectedGroup || ex.muscleGroup.toLowerCase() === selectedGroup.toLowerCase()
    return matchesSearch && matchesGroup
  })

  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    const group = ex.muscleGroup.toLowerCase()
    if (!acc[group]) acc[group] = []
    acc[group].push(ex)
    return acc
  }, {} as Record<string, Exercise[]>)

  const openCreateDialog = () => {
    setEditingExercise(null)
    setFormData({
      name: '',
      muscleGroup: selectedGroup || '',
      description: '',
      videoUrl: '',
      imageUrl: ''
    })
    setDialogOpen(true)
  }

  const openEditDialog = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setFormData({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      description: exercise.description || '',
      videoUrl: exercise.videoUrl || '',
      imageUrl: exercise.imageUrl || ''
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.muscleGroup) {
      toast({ title: 'Nombre y grupo muscular son requeridos', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const url = editingExercise ? `/api/exercises/${editingExercise.id}` : '/api/exercises'
      const method = editingExercise ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error('Error al guardar')

      toast({ title: editingExercise ? 'Ejercicio actualizado' : 'Ejercicio creado' })
      setDialogOpen(false)
      fetchExercises()
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este ejercicio?')) return

    try {
      const res = await fetch(`/api/exercises/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error')

      toast({ title: 'Ejercicio eliminado' })
      fetchExercises()
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
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

  const getExerciseImage = (exercise: Exercise): string | null => {
    // Primero usar la imagen personalizada si existe Y es una URL de imagen válida
    if (exercise.imageUrl && !exercise.imageUrl.includes('youtube.com') && !exercise.imageUrl.includes('youtu.be')) {
      return exercise.imageUrl
    }
    // Si no, usar la miniatura de YouTube si hay video
    return getYouTubeThumbnail(exercise.videoUrl)
  }

  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const handleImageError = (exerciseId: string) => {
    setImageErrors(prev => new Set(prev).add(exerciseId))
  }

  const getGroupInfo = (groupId: string) => {
    return muscleGroups.find(g => g.id === groupId.toLowerCase()) || 
      { id: groupId, label: groupId, shortLabel: groupId, emoji: '💪', gradient: 'from-slate-500 to-slate-600' }
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
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-orange-500/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Ejercicios
            </h1>
            <p className="text-slate-400 mt-1">Biblioteca de ejercicios con videos explicativos</p>
          </div>
          {isCoach && (
            <Button 
              onClick={openCreateDialog} 
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Ejercicio
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Buscar ejercicios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12 rounded-xl"
        />
      </div>

      {/* Muscle Group Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedGroup === null ? 'default' : 'outline'}
          onClick={() => setSelectedGroup(null)}
          className={selectedGroup === null
            ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25'
            : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400'}
        >
          Todos
        </Button>
        {muscleGroups.map((group) => (
          <Button
            key={group.id}
            variant={selectedGroup === group.id ? 'default' : 'outline'}
            onClick={() => setSelectedGroup(group.id)}
            className={selectedGroup === group.id
              ? `bg-gradient-to-r ${group.gradient} shadow-lg`
              : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400'}
          >
            <span className="mr-1">{group.emoji}</span>
            <span className="text-xs sm:text-sm">{group.shortLabel || group.label}</span>
          </Button>
        ))}
      </div>

      {/* Exercises Accordion by Group */}
      {Object.keys(groupedExercises).length > 0 && (
        <Accordion type="multiple" defaultValue={Object.keys(groupedExercises)} className="space-y-2">
          {Object.entries(groupedExercises).map(([groupId, groupExercises]) => {
            const groupInfo = getGroupInfo(groupId)
            return (
              <AccordionItem 
                key={groupId} 
                value={groupId}
                className="bg-slate-800/50 border-slate-700 rounded-xl overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:bg-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${groupInfo.gradient} flex items-center justify-center text-white text-sm`}>
                      {groupInfo.emoji}
                    </div>
                    <span className="text-lg font-semibold text-white">{groupInfo.label}</span>
                    <Badge variant="secondary" className="bg-slate-700/50 text-slate-300">{groupExercises.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-2">
                    {groupExercises.map((exercise) => (
                      <Card 
                        key={exercise.id} 
                        className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 hover:border-emerald-500/50 transition-all group overflow-hidden"
                      >
                        {/* Image thumbnail - use custom image or YouTube thumbnail */}
                        {(() => {
                          const imageSrc = getExerciseImage(exercise)
                          const hasError = imageErrors.has(exercise.id)

                          if (imageSrc && !hasError) {
                            return (
                              <div className="relative h-32 w-full overflow-hidden bg-slate-700">
                                <img
                                  src={imageSrc}
                                  alt={exercise.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={() => handleImageError(exercise.id)}
                                />
                                {exercise.videoUrl && (
                                  <div
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
                                    onClick={() => openVideoDialog(exercise.videoUrl)}
                                  >
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
                                      <Play className="w-6 h-6 text-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          }

                          // Fallback placeholder when no image or image failed to load
                          return (
                            <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                              {exercise.videoUrl ? (
                                <div
                                  className="flex flex-col items-center gap-2 cursor-pointer group/preview"
                                  onClick={() => openVideoDialog(exercise.videoUrl)}
                                >
                                  <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center group-hover/preview:bg-red-500/30 transition-colors">
                                    <Play className="w-7 h-7 text-red-400" />
                                  </div>
                                  <span className="text-xs text-slate-400">Ver video</span>
                                </div>
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-slate-600/50 flex items-center justify-center">
                                  <Dumbbell className="w-7 h-7 text-slate-400" />
                                </div>
                              )}
                            </div>
                          )
                        })()}
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-white text-base group-hover:text-emerald-300 transition-colors">
                              {exercise.name}
                            </CardTitle>
                            {!exercise.imageUrl && exercise.videoUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openVideoDialog(exercise.videoUrl)}
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 w-8 shrink-0"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {exercise.description && (
                            <p className="text-sm text-slate-400 line-clamp-2 mb-3">{exercise.description}</p>
                          )}
                          
                          {exercise.videoUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openVideoDialog(exercise.videoUrl)}
                              className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Ver Video
                            </Button>
                          )}

                          {isCoach && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(exercise)}
                                className="flex-1 text-slate-400 hover:text-white hover:bg-slate-700/50"
                              >
                                <Pencil className="w-3 h-3 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(exercise.id)}
                                className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}

      {filteredExercises.length === 0 && (
        <div className="text-center py-16 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50">
          <div className="w-20 h-20 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
            <Dumbbell className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-slate-400 text-lg">No se encontraron ejercicios</p>
          {isCoach && (
            <Button 
              onClick={openCreateDialog} 
              className="mt-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear primer ejercicio
            </Button>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Añade un ejercicio con video explicativo de YouTube
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700/50 border-slate-600 focus:border-emerald-500"
                placeholder="Ej: Press de Banca"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Grupo Muscular *</Label>
              <select
                value={formData.muscleGroup}
                onChange={(e) => setFormData({ ...formData, muscleGroup: e.target.value })}
                className="w-full bg-slate-700/50 border-slate-600 rounded-lg p-2 text-white focus:border-emerald-500"
              >
                <option value="">Seleccionar</option>
                {muscleGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-700/50 border-slate-600 focus:border-emerald-500 resize-none"
                placeholder="Descripción del ejercicio..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Video className="w-4 h-4 text-red-400" />
                URL de YouTube
              </Label>
              <Input
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="bg-slate-700/50 border-slate-600 focus:border-emerald-500"
                placeholder="https://youtube.com/watch?v=..."
              />
              <p className="text-xs text-slate-500">Pega el link del video de YouTube</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                URL de Imagen
              </Label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="bg-slate-700/50 border-slate-600 focus:border-emerald-500"
                placeholder="https://..."
              />
              <p className="text-xs text-slate-500">URL de la imagen del ejercicio (opcional)</p>
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
