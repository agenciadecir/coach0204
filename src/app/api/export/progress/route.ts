import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// GET - Get progress data for PDF export
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    // Get progress records
    const progressRecords = await db.progress.findMany({
      where: {
        studentId: student.id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      orderBy: { date: 'asc' }
    })

    // Generate PDF content as a data structure
    const pdfData = {
      student: {
        name: student.user.name || 'Sin nombre',
        email: student.user.email
      },
      dateRange: {
        start: startDate ? format(new Date(startDate), 'dd MMM yyyy', { locale: es }) : 'Inicio',
        end: endDate ? format(new Date(endDate), 'dd MMM yyyy', { locale: es }) : 'Hoy'
      },
      progress: progressRecords.map(p => ({
        date: format(new Date(p.date), 'dd MMMM yyyy', { locale: es }),
        weight: p.weight,
        shoulders: p.shoulders,
        chest: p.chest,
        rightArm: p.rightArm,
        leftArm: p.leftArm,
        waist: p.waist,
        hip: p.hip,
        rightThigh: p.rightThigh,
        leftThigh: p.leftThigh,
        frontPhoto: p.frontPhoto,
        backPhoto: p.backPhoto,
        sidePhoto: p.sidePhoto,
        notes: p.notes
      }))
    }

    return NextResponse.json(pdfData)
  } catch (error) {
    console.error('Export progress error:', error)
    return NextResponse.json({ error: 'Error al exportar progreso' }, { status: 500 })
  }
}
