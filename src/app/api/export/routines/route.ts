import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// GET - Get routines data for PDF export
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // Get student info
    let student: any
    if (session.user.role === 'STUDENT') {
      student = await db.student.findUnique({
        where: { userId: session.user.id },
        include: { user: true }
      })
    } else if (studentId) {
      student = await db.student.findUnique({
        where: { id: studentId },
        include: { user: true }
      })
    }

    if (!student) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
    }

    // Get routines
    const routines = await db.routine.findMany({
      where: {
        studentId: student.id,
        ...(includeArchived ? {} : { isArchived: false })
      },
      include: {
        exercises: {
          include: {
            exercise: true
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Generate PDF content as a data structure
    const pdfData = {
      student: {
        name: student.user.name || 'Sin nombre',
        email: student.user.email
      },
      exportDate: format(new Date(), "dd MMMM yyyy", { locale: es }),
      routines: routines.map(r => ({
        name: r.name,
        description: r.description,
        weekDay: r.weekDay,
        isArchived: r.isArchived,
        exercises: r.exercises.map(e => ({
          name: e.exercise.name,
          muscleGroup: e.exercise.muscleGroup,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          restTime: e.restTime,
          notes: e.notes
        }))
      }))
    }

    return NextResponse.json(pdfData)
  } catch (error) {
    console.error('Export routines error:', error)
    return NextResponse.json({ error: 'Error al exportar rutinas' }, { status: 500 })
  }
}
