import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get payment settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // If coach, get their own settings
    if (session.user.role === 'COACH') {
      let settings = await db.paymentSettings.findUnique({
        where: { coachId: session.user.id }
      })

      // Create default settings if not exists
      if (!settings) {
        settings = await db.paymentSettings.create({
          data: {
            coachId: session.user.id,
            monthlyAmount: 0,
            currency: 'ARS',
            acceptCash: true,
            acceptTransfer: true,
            acceptMercadoPago: false,
            acceptOther: false,
            paymentDueDay: 10
          }
        })
      }

      return NextResponse.json(settings)
    }

    // If student, get their coach's settings
    const student = await db.student.findUnique({
      where: { userId: session.user.id },
      include: {
        payments: {
          where: { status: { in: ['PENDING', 'PENDING_VALIDATION', 'OVERDUE'] } },
          take: 1
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    // Get coachId from student's payments or find the coach another way
    let coachId: string | null = null

    // Try to get coachId from payments
    if (student.payments.length > 0) {
      coachId = student.payments[0].coachId
    }

    // If no payments, try to find coach through routines
    if (!coachId) {
      const routine = await db.routine.findFirst({
        where: { studentId: student.id },
        select: { coachId: true }
      })
      if (routine) {
        coachId = routine.coachId
      }
    }

    if (!coachId) {
      // Return default settings if no coach found
      return NextResponse.json({
        monthlyAmount: 0,
        currency: 'ARS',
        acceptCash: true,
        acceptTransfer: true,
        acceptMercadoPago: false,
        acceptOther: false,
        paymentDueDay: 10
      })
    }

    const settings = await db.paymentSettings.findUnique({
      where: { coachId }
    })

    if (!settings) {
      return NextResponse.json({
        monthlyAmount: 0,
        currency: 'ARS',
        acceptCash: true,
        acceptTransfer: true,
        acceptMercadoPago: false,
        acceptOther: false,
        paymentDueDay: 10
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Get payment settings error:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

// PUT - Update payment settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()

    const settings = await db.paymentSettings.upsert({
      where: { coachId: session.user.id },
      update: {
        monthlyAmount: body.monthlyAmount,
        currency: body.currency,
        acceptCash: body.acceptCash,
        acceptTransfer: body.acceptTransfer,
        acceptMercadoPago: body.acceptMercadoPago,
        acceptOther: body.acceptOther,
        cbu: body.cbu,
        alias: body.alias,
        holderName: body.holderName,
        mercadoPagoLink: body.mercadoPagoLink,
        otherMethodInfo: body.otherMethodInfo,
        paymentDueDay: body.paymentDueDay
      },
      create: {
        coachId: session.user.id,
        monthlyAmount: body.monthlyAmount,
        currency: body.currency,
        acceptCash: body.acceptCash,
        acceptTransfer: body.acceptTransfer,
        acceptMercadoPago: body.acceptMercadoPago,
        acceptOther: body.acceptOther,
        cbu: body.cbu,
        alias: body.alias,
        holderName: body.holderName,
        mercadoPagoLink: body.mercadoPagoLink,
        otherMethodInfo: body.otherMethodInfo,
        paymentDueDay: body.paymentDueDay
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Update payment settings error:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
