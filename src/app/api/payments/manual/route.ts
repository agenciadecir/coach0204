import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Create manual payment (coach only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      studentId, 
      month, 
      year, 
      amount, 
      isGift = false, 
      bonusPercentage = 0, 
      notes 
    } = body

    // Validate student exists
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { user: true }
    })

    if (!student) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    // Check if payment already exists for this month/year/student
    const existingPayment = await db.payment.findFirst({
      where: {
        studentId,
        month,
        year
      }
    })

    if (existingPayment) {
      return NextResponse.json({ error: 'Ya existe un pago para este mes' }, { status: 400 })
    }

    // Calculate final amount with bonus
    let finalAmount = amount
    if (bonusPercentage > 0 && !isGift) {
      finalAmount = amount * (1 - bonusPercentage / 100)
    }
    if (isGift) {
      finalAmount = 0
    }

    // Create payment
    const payment = await db.payment.create({
      data: {
        studentId,
        amount: finalAmount,
        currency: 'ARS',
        status: 'PAID',
        month,
        year,
        dueDate: new Date(year, month - 1, 10),
        paidDate: new Date(),
        isGift,
        bonusPercentage: isGift ? 0 : bonusPercentage,
        notes: notes || (isGift ? 'Mes regalado por el coach' : undefined),
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

    // Create notification for student
    await db.notification.create({
      data: {
        userId: student.userId,
        title: isGift ? '¡Mes Regalado! 🎁' : 'Pago Registrado',
        message: isGift 
          ? `Tu coach te ha regalado el mes de ${getMonthName(month)} ${year}. ¡Disfruta tu entrenamiento!`
          : `Tu pago de $${finalAmount.toLocaleString('es-AR')} ARS para ${getMonthName(month)} ${year} ha sido registrado.${bonusPercentage > 0 ? ` Incluye ${bonusPercentage}% de bonificación.` : ''}`,
        type: isGift ? 'GIFT' : 'PAYMENT',
        entityId: payment.id,
        entityType: 'PAYMENT'
      }
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Create manual payment error:', error)
    return NextResponse.json({ error: 'Error al crear pago' }, { status: 500 })
  }
}

function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return months[month - 1] || ''
}
