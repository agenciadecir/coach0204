import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT - Update progress record
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
    const isCoach = session.user.role === 'COACH'

    // Check permission
    const progress = await db.progress.findUnique({
      where: { id },
      include: { student: true }
    })

    if (!progress) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    if (session.user.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { userId: session.user.id }
      })
      if (student?.id !== progress.studentId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    // Students can update their own progress, coaches can update coachNotes
    const updateData: any = {}
    
    // Students can update all their own data
    if (!isCoach) {
      if (body.date) updateData.date = new Date(body.date)
      if (body.weight !== undefined) updateData.weight = body.weight
      if (body.height !== undefined) updateData.height = body.height
      if (body.bodyFat !== undefined) updateData.bodyFat = body.bodyFat
      if (body.muscleMass !== undefined) updateData.muscleMass = body.muscleMass
      if (body.neck !== undefined) updateData.neck = body.neck
      if (body.shoulders !== undefined) updateData.shoulders = body.shoulders
      if (body.chest !== undefined) updateData.chest = body.chest
      if (body.waist !== undefined) updateData.waist = body.waist
      if (body.hip !== undefined) updateData.hip = body.hip
      if (body.rightArm !== undefined) updateData.rightArm = body.rightArm
      if (body.leftArm !== undefined) updateData.leftArm = body.leftArm
      if (body.rightForearm !== undefined) updateData.rightForearm = body.rightForearm
      if (body.leftForearm !== undefined) updateData.leftForearm = body.leftForearm
      if (body.rightThigh !== undefined) updateData.rightThigh = body.rightThigh
      if (body.leftThigh !== undefined) updateData.leftThigh = body.leftThigh
      if (body.rightCalf !== undefined) updateData.rightCalf = body.rightCalf
      if (body.leftCalf !== undefined) updateData.leftCalf = body.leftCalf
      if (body.frontPhoto !== undefined) updateData.frontPhoto = body.frontPhoto
      if (body.backPhoto !== undefined) updateData.backPhoto = body.backPhoto
      if (body.sidePhoto !== undefined) updateData.sidePhoto = body.sidePhoto
      if (body.notes !== undefined) updateData.notes = body.notes
    }
    
    // Coach can only update coachNotes
    if (isCoach && body.coachNotes !== undefined) {
      updateData.coachNotes = body.coachNotes
    }

    const updatedProgress = await db.progress.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updatedProgress)
  } catch (error) {
    console.error('Update progress error:', error)
    return NextResponse.json({ error: 'Error al actualizar progreso' }, { status: 500 })
  }
}

// DELETE - Delete progress record
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check permission
    const progress = await db.progress.findUnique({
      where: { id },
      include: { student: true }
    })

    if (!progress) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    if (session.user.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { userId: session.user.id }
      })
      if (student?.id !== progress.studentId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    await db.progress.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Registro eliminado correctamente' })
  } catch (error) {
    console.error('Delete progress error:', error)
    return NextResponse.json({ error: 'Error al eliminar progreso' }, { status: 500 })
  }
}
