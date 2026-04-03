import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get payments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')

    if (studentId) {
      const payments = await db.payment.findMany({
        where: {
          studentId,
          status: status ? { in: status.split(',') } : undefined
        },
        orderBy: { dueDate: 'desc' }
      })

      return NextResponse.json(payments)
    }

    // Coach sees all payments
    if (session.user.role === 'COACH') {
      const payments = await db.payment.findMany({
        where: {
          status: status ? { in: status.split(',') } : undefined
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
        orderBy: { dueDate: 'desc' }
      })

      return NextResponse.json(payments)
    }

    // Student sees only their own payments
    const student = await db.student.findUnique({
      where: { userId: session.user.id }
    })

    if (!student) {
      return NextResponse.json([])
    }

    const payments = await db.payment.findMany({
      where: {
        studentId: student.id,
        status: status ? { in: status.split(',') } : undefined
      },
      orderBy: { dueDate: 'desc' }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json({ error: 'Error al obtener pagos' }, { status: 500 })
  }
}

// POST - Create payment (coach only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { studentId, amount, currency, dueDate, method, notes } = body

    const payment = await db.payment.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        currency: currency || 'ARS',
        dueDate: new Date(dueDate),
        method,
        notes,
        coachId: session.user.id
      },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json({ error: 'Error al crear pago' }, { status: 500 })
  }
}
