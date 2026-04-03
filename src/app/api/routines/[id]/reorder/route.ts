import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT - Reorder exercises in routine
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { exercises } = body // Array of { id, order }

    // Update each exercise order
    const updates = exercises.map((ex: { id: string; order: number }) =>
      db.routineExercise.update({
        where: { id: ex.id },
        data: { order: ex.order }
      })
    )

    await Promise.all(updates)

    // Fetch updated routine
    const routine = await db.routine.findUnique({
      where: { id },
      include: {
        exercises: {
          include: {
            exercise: true
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json(routine)
  } catch (error) {
    console.error('Reorder exercises error:', error)
    return NextResponse.json({ error: 'Error al reordenar ejercicios' }, { status: 500 })
  }
}
