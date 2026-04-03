import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Dashboard API - Updated v2 for new payment schema
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get coach's students first
    const coachStudents = await db.student.findMany({
      where: { 
        OR: [
          { routines: { some: { coachId: session.user.id } } },
          { payments: { some: { coachId: session.user.id } } }
        ]
      },
      select: { id: true }
    })
    const studentIds = coachStudents.map(s => s.id)

    // Get counts first
    const [
      activeStudents,
      totalStudents,
      pendingPayments,
      overduePayments,
      pendingValidation
    ] = await Promise.all([
      db.student.count({
        where: { 
          user: { isActive: true },
          id: { in: studentIds.length > 0 ? studentIds : undefined }
        }
      }),
      db.student.count({
        where: { id: { in: studentIds.length > 0 ? studentIds : undefined } }
      }),
      db.payment.count({ 
        where: { 
          status: 'PENDING',
          studentId: { in: studentIds.length > 0 ? studentIds : undefined }
        } 
      }),
      db.payment.count({ 
        where: { 
          status: 'OVERDUE',
          studentId: { in: studentIds.length > 0 ? studentIds : undefined }
        } 
      }),
      db.payment.count({ 
        where: { 
          status: 'PENDING_VALIDATION',
          studentId: { in: studentIds.length > 0 ? studentIds : undefined }
        } 
      })
    ])

    // Get recent payments (using new schema fields)
    const recentPayments = await db.payment.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE', 'PENDING_VALIDATION'] },
        studentId: { in: studentIds.length > 0 ? studentIds : undefined }
      },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    })

    // Get recent progress updates
    const recentProgress = await db.progress.findMany({
      where: {
        studentId: { in: studentIds.length > 0 ? studentIds : undefined }
      },
      include: {
        student: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 5
    })

    return NextResponse.json({
      stats: {
        activeStudents,
        totalStudents,
        pendingPayments,
        overduePayments,
        pendingValidation
      },
      recentPayments,
      recentProgress
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Error al obtener datos del dashboard' }, { status: 500 })
  }
}
