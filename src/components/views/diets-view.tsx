'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Utensils, User, ChevronRight, Flame, Archive, RotateCcw } from 'lucide-react'
import { useAppStore } from '@/hooks/use-store'

interface Diet {
  id: string
  name: string
  description: string | null
  totalCalories: number | null
  proteinGoal: number | null
  carbsGoal: number | null
  fatsGoal: number | null
  isArchived: boolean
  student?: {
    id: string
    user: { name: string | null; email: string }
  }
  meals: Array<{
    id: string
    name: string
    time: string | null
    foods: string
  }>
}

export function DietsView() {
  const { data: session } = useSession()
  const [diets, setDiets] = useState<Diet[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const { setCurrentView, setSelectedStudentId } = useAppStore()

  const isCoach = session?.user.role === 'COACH'

  useEffect(() => {
    fetchDiets()
  }, [])

  const fetchDiets = async () => {
    try {
      // Fetch all diets including archived
      const res = await fetch('/api/diets?archived=true')
      const data = await res.json()
      setDiets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching diets:', error)
      setDiets([])
    } finally {
      setLoading(false)
    }
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

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId)
    setCurrentView('student-detail')
  }

  const activeDiets = diets.filter(d => !d.isArchived)
  const archivedDiets = diets.filter(d => d.isArchived)
  const displayedDiets = showArchived ? archivedDiets : activeDiets

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6 sm:p-8 border border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-orange-500/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {isCoach ? 'Todas las Dietas' : 'Mi Dieta'}
            </h1>
            <p className="text-slate-400 mt-1">
              {isCoach ? 'Dietas de todos tus alumnos' : 'Tu plan de alimentación'}
            </p>
          </div>
          {archivedDiets.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowArchived(!showArchived)}
              className={`border-slate-700 ${showArchived ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-slate-800/50 text-slate-300'} hover:bg-slate-700`}
            >
              {showArchived ? (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Ver Activas
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Archivadas ({archivedDiets.length})
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="bg-gradient-to-br from-orange-500/20 to-amber-600/10 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeDiets.length}</p>
                <p className="text-xs text-orange-200">Dietas Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/20 to-rose-600/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {activeDiets.reduce((sum, d) => sum + (d.totalCalories || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-red-200">kcal Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diets List */}
      <div className="space-y-4">
        {displayedDiets.map((diet) => (
          <Card 
            key={diet.id} 
            className={`bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 hover:border-orange-500/50 transition-all group overflow-hidden ${diet.isArchived ? 'opacity-70' : ''}`}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-white text-lg sm:text-xl group-hover:text-orange-300 transition-colors flex items-center gap-2">
                  {diet.name}
                  {diet.isArchived && (
                    <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
                      <Archive className="w-3 h-3 mr-1" />
                      Archivada
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex flex-wrap gap-2 text-sm">
                  {diet.totalCalories && (
                    <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white">
                      🔥 {diet.totalCalories} kcal
                    </Badge>
                  )}
                  {diet.proteinGoal && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                      🥩 {diet.proteinGoal}g proteína
                    </Badge>
                  )}
                  {diet.carbsGoal && (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                      🍞 {diet.carbsGoal}g carbs
                    </Badge>
                  )}
                </div>
              </div>
              {isCoach && diet.student && (
                <button
                  onClick={() => handleStudentClick(diet.student!.id)}
                  className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-2 group/btn"
                >
                  <User className="w-3 h-3" />
                  {diet.student.user.name || diet.student.user.email}
                  <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {diet.meals.map((meal) => (
                  <div key={meal.id} className="p-3 rounded-xl bg-slate-700/30 group-hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{meal.name}</span>
                      {meal.time && (
                        <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
                          {meal.time}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2">{meal.foods}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {displayedDiets.length === 0 && (
        <div className="text-center py-16 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50">
          <div className="w-20 h-20 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
            <Utensils className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-slate-400 text-lg">
            {showArchived ? 'No hay dietas archivadas' : 'No hay dietas activas'}
          </p>
          {isCoach && !showArchived && (
            <p className="text-slate-500 text-sm mt-2">
              Selecciona un alumno para crear su dieta
            </p>
          )}
        </div>
      )}
    </div>
  )
}
