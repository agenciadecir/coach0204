import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PaymentStatus } from '@prisma/client'

function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return months[month - 1] || ''
}

// GET - Get single payment
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payment = await db.payment.findUnique({
      where: { id },
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

    if (!payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Get payment error:', error)
    return NextResponse.json({ error: 'Error al obtener pago' }, { status: 500 })
  }
}

// PUT - Update payment
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const isCoach = session.user.role === 'COACH'

    // Get current payment
    const currentPayment = await db.payment.findUnique({
      where: { id },
      include: { student: true }
    })

    if (!currentPayment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    // Students can only update their own payments
    if (!isCoach) {
      const student = await db.student.findUnique({
        where: { userId: session.user.id }
      })
      if (student?.id !== currentPayment.studentId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    const updateData: any = {}

    // Handle status changes
    if (body.status) {
      updateData.status = body.status as PaymentStatus
      
      if (body.status === 'PAID') {
        updateData.paidDate = new Date()
        updateData.validatedAt = new Date()
        updateData.validatedBy = session.user.id
      }
      
      if (body.status === 'PENDING_VALIDATION') {
        updateData.receiptUploadedAt = new Date()
      }
      
      if (body.status === 'REJECTED') {
        updateData.rejectionReason = body.rejectionReason
      }
    }

    // Handle payment method and receipt
    if (body.paymentMethod) {
      updateData.paymentMethod = body.paymentMethod
    }
    
    if (body.reference !== undefined) {
      updateData.reference = body.reference
    }
    
    if (body.receiptUrl !== undefined) {
      updateData.receiptUrl = body.receiptUrl
    }

    if (body.paidDate !== undefined) {
      updateData.paidDate = body.paidDate ? new Date(body.paidDate) : null
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    const payment = await db.payment.update({
      where: { id },
      data: updateData,
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

    // Create notification if payment was validated or rejected
    if (body.status === 'PAID' || body.status === 'REJECTED') {
      await db.notification.create({
        data: {
          userId: currentPayment.student.userId,
          title: body.status === 'PAID' ? 'Pago Validado' : 'Pago Rechazado',
          message: body.status === 'PAID' 
            ? `Tu pago de ${currentPayment.amount} ${currentPayment.currency} ha sido validado correctamente.`
            : `Tu pago ha sido rechazado. ${body.rejectionReason || ''}`,
          type: body.status === 'PAID' ? 'PAYMENT_VALIDATED' : 'PAYMENT_REJECTED',
          entityType: 'payment',
          entityId: id
        }
      })
    }

    // Create notification for coach when student uploads receipt
    if (body.status === 'PENDING_VALIDATION' && currentPayment.coachId) {
      const studentUser = await db.user.findUnique({
        where: { id: currentPayment.student.userId }
      })
      await db.notification.create({
        data: {
          userId: currentPayment.coachId,
          title: 'Nuevo Comprobante de Pago',
          message: `${studentUser?.name || studentUser?.email || 'Un alumno'} ha subido un comprobante de pago para ${getMonthName(currentPayment.month)} ${currentPayment.year}. Monto: ${currentPayment.amount} ${currentPayment.currency}`,
          type: 'PAYMENT_RECEIPT',
          entityType: 'payment',
          entityId: id
        }
      })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Update payment error:', error)
    return NextResponse.json({ error: 'Error al actualizar pago' }, { status: 500 })
  }
}

// DELETE - Delete payment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await db.payment.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Pago eliminado correctamente' })
  } catch (error) {
    console.error('Delete payment error:', error)
    return NextResponse.json({ error: 'Error al eliminar pago' }, { status: 500 })
  }
}
