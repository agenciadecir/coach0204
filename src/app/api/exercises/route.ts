import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get all exercises
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const exercises = await db.exercise.findMany({
      include: {
        combinedWith: {
          include: {
            exerciseB: true
          }
        },
        combinedBy: {
          include: {
            exerciseA: true
          }
        }
      },
      orderBy: [
        { muscleGroup: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(exercises)
  } catch (error) {
    console.error('Get exercises error:', error)
    return NextResponse.json({ error: 'Error al obtener ejercicios' }, { status: 500 })
  }
}

// POST - Create new exercise (coach only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { name, muscleGroup, description, videoUrl, imageUrl } = body

    if (!name || !muscleGroup) {
      return NextResponse.json({ error: 'Nombre y grupo muscular son requeridos' }, { status: 400 })
    }

    const exercise = await db.exercise.create({
      data: {
        name,
        muscleGroup,
        description,
        videoUrl,
        imageUrl
      }
    })

    return NextResponse.json(exercise)
  } catch (error) {
    console.error('Create exercise error:', error)
    return NextResponse.json({ error: 'Error al crear ejercicio' }, { status: 500 })
  }
}
