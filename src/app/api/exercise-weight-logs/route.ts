import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get weight logs for an exercise (returns empty if table doesn't exist)
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

    // Try to get weight logs, but return empty if table doesn't exist
    try {
      const logs = await db.exerciseWeightLog.findMany({
        where: { routineExerciseId: exerciseId },
        orderBy: { date: 'desc' },
        take: 10
      })
      return NextResponse.json(logs)
    } catch (tableError) {
      // Table might not exist, return empty array
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Error fetching weight logs:', error)
    return NextResponse.json([])
  }
}

// POST - Create a new weight log (or just update weight if table doesn't exist)
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

    // Update the current weight on the exercise (this always works)
    await db.routineExercise.update({
      where: { id: routineExerciseId },
      data: { weight }
    })

    // Try to create a log entry (may fail if table doesn't exist)
    let log = null
    try {
      log = await db.exerciseWeightLog.create({
        data: {
          routineExerciseId,
          weight,
          reps: reps || null,
          notes: notes || null,
          date: new Date()
        }
      })
    } catch (logError) {
      // Table doesn't exist, that's ok - weight was still updated
      console.log('Weight log table not available, weight updated anyway')
    }

    // Return the log or just the weight update confirmation
    return NextResponse.json(log || { 
      id: routineExerciseId, 
      weight, 
      date: new Date().toISOString(),
      reps: reps || null 
    })
  } catch (error) {
    console.error('Error saving weight:', error)
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }
}
