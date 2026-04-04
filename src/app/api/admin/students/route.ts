import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get all students with their user info
    const students = await db.student.findMany({
      select: {
        id: true,
        userId: true,
        phone: true,
        startDate: true,
        user: {
          select: {
            name: true,
            email: true,
            isActive: true,
            createdAt: true,
          }
        },
        routines: {
          select: {
            coachId: true,
            coach: {
              select: {
                name: true
              }
            }
          },
          where: { isArchived: false },
          take: 1
        }
      },
      orderBy: { startDate: 'desc' }
    })

    // Transform data for frontend
    const studentsData = students.map(student => ({
      id: student.id,
      userId: student.userId,
      name: student.user.name,
      email: student.user.email,
      phone: student.phone,
      isActive: student.user.isActive,
      coachName: student.routines[0]?.coach?.name || null,
      createdAt: student.user.createdAt.toISOString()
    }))

    return NextResponse.json(studentsData)
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Error al obtener alumnos' }, { status: 500 })
  }
}
