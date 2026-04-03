import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get routines (by student if query param provided)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')
    const includeArchived = searchParams.get('archived') === 'true'

    const includeQuery = {
      trainingDays: {
        include: {
          weeks: {
            include: {
              exercises: {
                include: {
                  exercise: {
                    select: {
                      id: true,
                      name: true,
                      videoUrl: true,
                      imageUrl: true
                    }
                  }
                },
                orderBy: { order: 'asc' as const }
              }
            },
            orderBy: { weekNumber: 'asc' as const }
          },
          exercises: {
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  videoUrl: true,
                  imageUrl: true
                }
              }
            },
            orderBy: { order: 'asc' as const }
          }
        },
        orderBy: { dayNumber: 'asc' as const }
      }
    }

    if (studentId) {
      const routines = await db.routine.findMany({
        where: {
          studentId,
          isArchived: includeArchived ? undefined : false
        },
        include: includeQuery,
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json(routines)
    }

    if (session.user.role === 'COACH') {
      const routines = await db.routine.findMany({
        where: {
          isArchived: includeArchived ? undefined : false
        },
        include: {
          student: {
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          },
          ...includeQuery
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json(routines)
    }

    const student = await db.student.findUnique({
      where: { userId: session.user.id }
    })

    if (!student) {
      return NextResponse.json([])
    }

    const routines = await db.routine.findMany({
      where: {
        studentId: student.id,
        isArchived: includeArchived ? undefined : false
      },
      include: includeQuery,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(routines)
  } catch (error) {
    console.error('Get routines error:', error)
    return NextResponse.json({ error: 'Error al obtener rutinas' }, { status: 500 })
  }
}

// POST - Create new routine with training days and weeks
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { studentId, name, description, trainingDays } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre de la rutina es requerido' }, { status: 400 })
    }

    if (!studentId) {
      return NextResponse.json({ error: 'El alumno es requerido' }, { status: 400 })
    }

    const student = await db.student.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      return NextResponse.json({ error: 'El alumno no existe' }, { status: 400 })
    }

    // Build training days data with weeks
    const trainingDaysData = trainingDays && trainingDays.length > 0 
      ? trainingDays.map((day: any, dayIndex: number) => {
          // Check if day has weeks (new format) or direct exercises (legacy format)
          const hasWeeks = day.weeks && day.weeks.length > 0
          
          return {
            name: day.name || `Día ${dayIndex + 1}`,
            dayNumber: dayIndex + 1,
            muscleGroups: day.muscleGroups || null,
            // Create weeks if present
            weeks: hasWeeks ? {
              create: day.weeks.map((week: any, weekIndex: number) => ({
                weekNumber: weekIndex + 1,
                exercises: week.exercises && week.exercises.length > 0 ? {
                  create: week.exercises
                    .filter((ex: any) => ex.exerciseName && ex.exerciseName.trim() !== '')
                    .map((ex: any, exIndex: number) => ({
                      exerciseName: ex.exerciseName.trim(),
                      exerciseId: null,
                      sets: ex.sets || 3,
                      reps: ex.reps || '10-12',
                      weight: ex.weight?.trim() || null,
                      restTime: ex.restTime || '60',
                      notes: ex.notes?.trim() || null,
                      isSuperset: ex.isSuperset || false,
                      supersetGroupId: ex.supersetGroupId || null,
                      supersetOrder: ex.supersetOrder || null,
                      order: exIndex
                    }))
                } : undefined
              }))
            } : undefined,
            // Legacy: create exercises directly on day (for backwards compatibility)
            exercises: !hasWeeks && day.exercises && day.exercises.length > 0 ? {
              create: day.exercises
                .filter((ex: any) => ex.exerciseName && ex.exerciseName.trim() !== '')
                .map((ex: any, exIndex: number) => ({
                  exerciseName: ex.exerciseName.trim(),
                  exerciseId: null,
                  sets: ex.sets || 3,
                  reps: ex.reps || '10-12',
                  weight: ex.weight?.trim() || null,
                  restTime: ex.restTime || '60',
                  notes: ex.notes?.trim() || null,
                  isSuperset: ex.isSuperset || false,
                  supersetGroupId: ex.supersetGroupId || null,
                  supersetOrder: ex.supersetOrder || null,
                  order: exIndex
                }))
            } : undefined
          }
        })
      : undefined

    const routine = await db.routine.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        studentId,
        coachId: session.user.id,
        trainingDays: trainingDaysData ? {
          create: trainingDaysData
        } : undefined
      },
      include: {
        trainingDays: {
          include: {
            weeks: {
              include: {
                exercises: {
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { weekNumber: 'asc' }
            },
            exercises: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { dayNumber: 'asc' }
        }
      }
    })

    return NextResponse.json(routine)
  } catch (error) {
    console.error('Create routine error:', error)
    return NextResponse.json({ error: 'Error al crear rutina', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
