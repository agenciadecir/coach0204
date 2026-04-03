import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT - Update routine exercise (for student notes and weight)
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
    const { studentNotes, weight } = body

    // Get the exercise with training day and routine to verify ownership
    const routineExercise = await db.routineExercise.findUnique({
      where: { id },
      include: {
        trainingDay: {
          include: {
            routine: {
              include: {
                student: true
              }
            }
          }
        },
        week: {
          include: {
            trainingDay: {
              include: {
                routine: {
                  include: {
                    student: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!routineExercise) {
      return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 })
    }

    // Verify the user owns this routine (student) or is coach
    const isCoach = session.user.role === 'COACH'
    // Check ownership through trainingDay or week
    const routine = routineExercise.trainingDay?.routine || routineExercise.week?.trainingDay?.routine
    const isOwner = routine?.student?.userId === session.user.id

    if (!isCoach && !isOwner) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Students can only update weight and studentNotes
    // Coaches can update all fields
    const updateData: any = {}
    
    if (studentNotes !== undefined) {
      updateData.studentNotes = studentNotes
    }
    
    // Weight can be updated by students (for their records) or coaches
    if (weight !== undefined) {
      updateData.weight = weight
    }

    const updated = await db.routineExercise.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update routine exercise error:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
