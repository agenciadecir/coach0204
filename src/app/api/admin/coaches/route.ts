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

    // Get all coaches - simple query
    const coaches = await db.user.findMany({
      where: { 
        role: 'COACH'
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log('Found coaches:', coaches.length, coaches.map(c => c.email))

    // Get student count for each coach
    const coachesWithCount = await Promise.all(
      coaches.map(async (coach) => {
        const routines = await db.routine.findMany({
          where: { coachId: coach.id },
          select: { studentId: true }
        })
        
        const uniqueStudents = new Set(routines.map(r => r.studentId))
        
        return {
          ...coach,
          _count: {
            students: uniqueStudents.size
          }
        }
      })
    )

    return NextResponse.json(coachesWithCount)
  } catch (error) {
    console.error('Error fetching coaches:', error)
    return NextResponse.json({ error: 'Error al obtener coaches', details: String(error) }, { status: 500 })
  }
}