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
        }
      },
      orderBy: { startDate: 'desc' }
    })

    const studentsData = await Promise.all(
      students.map(async (student) => {
        const routine = await db.routine.findFirst({
          where: { studentId: student.id },
          select: {
            coach: { select: { name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        let coach = routine?.coach
        if (!coach) {
          const diet = await db.diet.findFirst({
            where: { studentId: student.id },
            select: {
              coach: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
          })
          coach = diet?.coach
        }
        
        if (!coach) {
          const payment = await db.payment.findFirst({
            where: { studentId: student.id },
            select: {
              coach: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
          })
          coach = payment?.coach
        }
        
        return {
          id: student.id,
          userId: student.userId,
          name: student.user.name,
          email: student.user.email,
          phone: student.phone,
          isActive: student.user.isActive,
          coachName: coach?.name || coach?.email?.split('@')[0] || null,
          coachEmail: coach?.email || null,
          createdAt: student.user.createdAt.toISOString()
        }
      })
    )

    return NextResponse.json(studentsData)
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Error al obtener alumnos' }, { status: 500 })
  }
}