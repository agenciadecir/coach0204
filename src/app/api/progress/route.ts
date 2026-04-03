import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get progress records
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')

    if (studentId) {
      const progress = await db.progress.findMany({
        where: { studentId },
        orderBy: { date: 'asc' }
      })

      return NextResponse.json(progress)
    }

    // Coach sees all progress
    if (session.user.role === 'COACH') {
      const progress = await db.progress.findMany({
        include: {
          student: {
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 50
      })

      return NextResponse.json(progress)
    }

    // Student sees only their own progress
    const student = await db.student.findUnique({
      where: { userId: session.user.id }
    })

    if (!student) {
      return NextResponse.json([])
    }

    const progress = await db.progress.findMany({
      where: { studentId: student.id },
      orderBy: { date: 'asc' }
    })

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Get progress error:', error)
    return NextResponse.json({ error: 'Error al obtener progreso' }, { status: 500 })
  }
}

// POST - Create progress record
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    let studentId = body.studentId

    // Students can only create their own progress
    if (session.user.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { userId: session.user.id }
      })
      if (!student) {
        return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
      }
      studentId = student.id
    }

    const progress = await db.progress.create({
      data: {
        studentId,
        date: body.date ? new Date(body.date) : new Date(),
        weight: body.weight,
        height: body.height,
        bodyFat: body.bodyFat,
        muscleMass: body.muscleMass,
        neck: body.neck,
        shoulders: body.shoulders,
        chest: body.chest,
        waist: body.waist,
        hip: body.hip,
        rightArm: body.rightArm,
        leftArm: body.leftArm,
        rightForearm: body.rightForearm,
        leftForearm: body.leftForearm,
        rightThigh: body.rightThigh,
        leftThigh: body.leftThigh,
        rightCalf: body.rightCalf,
        leftCalf: body.leftCalf,
        frontPhoto: body.frontPhoto,
        backPhoto: body.backPhoto,
        sidePhoto: body.sidePhoto,
        notes: body.notes
      }
    })

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Create progress error:', error)
    return NextResponse.json({ error: 'Error al crear registro de progreso' }, { status: 500 })
  }
}
