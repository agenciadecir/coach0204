import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get weight logs for an exercise
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const exerciseId = searchParams.get('exerciseId')

    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId requerido' }, { status: 400 })
    }

    const logs = await db.exerciseWeightLog.findMany({
      where: { routineExerciseId: exerciseId },
      orderBy: { date: 'desc' },
      take: 10
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching weight logs:', error)
    return NextResponse.json([])
  }
}

// POST - Create a new weight log
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { routineExerciseId, weight, reps, notes } = body

    if (!routineExerciseId || !weight) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Create the log
    const log = await db.exerciseWeightLog.create({
      data: {
        routineExerciseId,
        weight,
        reps: reps || null,
        notes: notes || null,
        date: new Date()
      }
    })

    // Also update the current weight on the exercise
    await db.routineExercise.update({
      where: { id: routineExerciseId },
      data: { weight }
    })

    return NextResponse.json(log)
  } catch (error) {
    console.error('Error creating weight log:', error)
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }
}
