import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get single routine
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const routine = await db.routine.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
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
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { weekNumber: 'asc' }
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
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { dayNumber: 'asc' }
        }
      }
    })

    if (!routine) {
      return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })
    }

    // Check permission
    if (session.user.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { userId: session.user.id }
      })
      if (student?.id !== routine.studentId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    return NextResponse.json(routine)
  } catch (error) {
    console.error('Get routine error:', error)
    return NextResponse.json({ error: 'Error al obtener rutina' }, { status: 500 })
  }
}

// PUT - Update routine (coach) or update student notes (student)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()

    // Student can only update their own exercise notes and completed sets
    if (session.user.role === 'STUDENT') {
      const { exerciseId, studentNotes, completedSets } = body
      
      if (exerciseId) {
        // Find student
        const student = await db.student.findUnique({
          where: { userId: session.user.id }
        })
        
        if (!student) {
          return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
        }

        // Verify the exercise belongs to a routine of this student
        const exercise = await db.routineExercise.findFirst({
          where: { id: exerciseId },
          include: {
            trainingDay: {
              include: { routine: true }
            },
            week: {
              include: {
                trainingDay: {
                  include: { routine: true }
                }
              }
            }
          }
        })

        const routineId = exercise?.trainingDay?.routineId || exercise?.week?.trainingDay?.routineId
        if (!exercise || routineId !== student.id) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Update exercise
        const updated = await db.routineExercise.update({
          where: { id: exerciseId },
          data: {
            studentNotes: studentNotes?.trim() || null,
            completedSets: completedSets || null
          }
        })

        return NextResponse.json(updated)
      }

      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Coach can update everything
    const { name, description, isArchived, trainingDays } = body

    // Validate name if provided
    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'El nombre de la rutina no puede estar vacío' }, { status: 400 })
    }

    // Update routine basic info
    const routine = await db.routine.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
        isArchived: isArchived ?? undefined,
        archivedAt: isArchived ? new Date() : null
      }
    })

    // If trainingDays provided, update them
    if (trainingDays !== undefined) {
      // Delete existing training days, weeks, and exercises
      const existingDays = await db.trainingDay.findMany({
        where: { routineId: id }
      })
      
      for (const day of existingDays) {
        // Delete exercises directly on day (legacy)
        await db.routineExercise.deleteMany({
          where: { trainingDayId: day.id }
        })
        
        // Delete weeks and their exercises
        const existingWeeks = await db.routineWeek.findMany({
          where: { trainingDayId: day.id }
        })
        
        for (const week of existingWeeks) {
          await db.routineExercise.deleteMany({
            where: { weekId: week.id }
          })
        }
        
        await db.routineWeek.deleteMany({
          where: { trainingDayId: day.id }
        })
      }
      
      await db.trainingDay.deleteMany({
        where: { routineId: id }
      })

      // Create new training days with weeks
      if (trainingDays.length > 0) {
        for (let dayIndex = 0; dayIndex < trainingDays.length; dayIndex++) {
          const day = trainingDays[dayIndex]
          
          const trainingDay = await db.trainingDay.create({
            data: {
              routineId: id,
              name: day.name || `Día ${dayIndex + 1}`,
              dayNumber: dayIndex + 1,
              muscleGroups: day.muscleGroups || null
            }
          })

          // Check if day has weeks (new format) or direct exercises (legacy format)
          if (day.weeks && day.weeks.length > 0) {
            // Create weeks
            for (let weekIndex = 0; weekIndex < day.weeks.length; weekIndex++) {
              const week = day.weeks[weekIndex]
              
              const routineWeek = await db.routineWeek.create({
                data: {
                  trainingDayId: trainingDay.id,
                  weekNumber: weekIndex + 1
                }
              })

              // Create exercises for this week
              const validExercises = week.exercises?.filter((ex: any) => ex.exerciseName && ex.exerciseName.trim() !== '') || []
              
              if (validExercises.length > 0) {
                await db.routineExercise.createMany({
                  data: validExercises.map((ex: any, exIndex: number) => ({
                    weekId: routineWeek.id,
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
                })
              }
            }
          } else if (day.exercises && day.exercises.length > 0) {
            // Legacy: Create exercises directly on day
            const validExercises = day.exercises.filter((ex: any) => ex.exerciseName && ex.exerciseName.trim() !== '')
            
            if (validExercises.length > 0) {
              await db.routineExercise.createMany({
                data: validExercises.map((ex: any, exIndex: number) => ({
                  trainingDayId: trainingDay.id,
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
              })
            }
          }
        }
      }
    }

    // Fetch updated routine
    const updatedRoutine = await db.routine.findUnique({
      where: { id },
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

    return NextResponse.json(updatedRoutine)
  } catch (error) {
    console.error('Update routine error:', error)
    return NextResponse.json({ error: 'Error al actualizar rutina' }, { status: 500 })
  }
}

// DELETE - Delete routine
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Delete in correct order
    const trainingDays = await db.trainingDay.findMany({
      where: { routineId: id }
    })

    for (const day of trainingDays) {
      // Delete exercises directly on day (legacy)
      await db.routineExercise.deleteMany({
        where: { trainingDayId: day.id }
      })
      
      // Delete weeks and their exercises
      const weeks = await db.routineWeek.findMany({
        where: { trainingDayId: day.id }
      })
      
      for (const week of weeks) {
        await db.routineExercise.deleteMany({
          where: { weekId: week.id }
        })
      }
      
      await db.routineWeek.deleteMany({
        where: { trainingDayId: day.id }
      })
    }

    await db.trainingDay.deleteMany({
      where: { routineId: id }
    })

    await db.routine.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Rutina eliminada correctamente' })
  } catch (error) {
    console.error('Delete routine error:', error)
    return NextResponse.json({ error: 'Error al eliminar rutina' }, { status: 500 })
  }
}
