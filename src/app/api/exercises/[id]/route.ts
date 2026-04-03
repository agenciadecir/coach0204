import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT - Update exercise
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
    const { name, muscleGroup, description, videoUrl, imageUrl } = body

    const exercise = await db.exercise.update({
      where: { id },
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
    console.error('Update exercise error:', error)
    return NextResponse.json({ error: 'Error al actualizar ejercicio' }, { status: 500 })
  }
}

// DELETE - Delete exercise
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

    await db.exercise.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Ejercicio eliminado correctamente' })
  } catch (error) {
    console.error('Delete exercise error:', error)
    return NextResponse.json({ error: 'Error al eliminar ejercicio' }, { status: 500 })
  }
}
