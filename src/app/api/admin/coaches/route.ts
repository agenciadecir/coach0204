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

    // Get all coaches
    const coaches = await db.user.findMany({
      where: { role: 'COACH' },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    // Count students for each coach (through routines)
    const coachesWithCount = await Promise.all(
      coaches.map(async (coach) => {
        // Count distinct students that have routines created by this coach
        const studentsWithRoutines = await db.routine.findMany({
          where: { coachId: coach.id },
          select: { studentId: true },
          distinct: ['studentId']
        })
        
        return {
          ...coach,
          _count: {
            students: studentsWithRoutines.length
          }
        }
      })
    )

    return NextResponse.json(coachesWithCount)
  } catch (error) {
    console.error('Error fetching coaches:', error)
    return NextResponse.json({ error: 'Error al obtener coaches' }, { status: 500 })
  }
}
