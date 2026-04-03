import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Start new payment month for all students
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { month, year, amount, dueDay } = body

    // Get payment settings
    const settings = await db.paymentSettings.findUnique({
      where: { coachId: session.user.id }
    })

    const paymentAmount = amount || settings?.monthlyAmount || 0
    const dueDateDay = dueDay || settings?.paymentDueDay || 10

    // Get all active students
    const students = await db.student.findMany({
      where: {
        user: { isActive: true }
      },
      include: {
        user: true
      }
    })

    // Calculate due date
    const dueDate = new Date(year, month - 1, dueDateDay)

    // Create payments for each student
    const payments = await Promise.all(
      students.map(student => 
        db.payment.create({
          data: {
            studentId: student.id,
            coachId: session.user.id,
            amount: paymentAmount,
            currency: settings?.currency || 'ARS',
            month,
            year,
            dueDate,
            status: 'PENDING'
          }
        })
      )
    )

    // Build payment methods info for the notification
    const paymentMethodsInfo = buildPaymentMethodsInfo(settings, paymentAmount)

    // Create notifications for each student
    await Promise.all(
      students.map(student =>
        db.notification.create({
          data: {
            userId: student.userId,
            title: '¡Nuevo mes iniciado!',
            message: `Ya puedes pagar tu cuota de ${paymentAmount} ${settings?.currency || 'ARS'} correspondiente a ${getMonthName(month)} ${year}. Vence el ${dueDateDay} del mes.\n\n${paymentMethodsInfo}`,
            type: 'NEW_MONTH_STARTED',
            entityType: 'payment'
          }
        })
      )
    )

    return NextResponse.json({ 
      message: `Mes iniciado correctamente`,
      paymentsCreated: payments.length,
      students: students.map(s => s.user.name || s.user.email)
    })
  } catch (error) {
    console.error('Start month error:', error)
    return NextResponse.json({ error: 'Error al iniciar mes' }, { status: 500 })
  }
}

function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return months[month - 1]
}

function buildPaymentMethodsInfo(settings: any, amount: number): string {
  if (!settings) return 'Consulta con tu profesor las vías de pago disponibles.'
  
  const methods: string[] = []
  
  if (settings.acceptTransfer && (settings.alias || settings.cbu)) {
    methods.push('📱 **Transferencia Bancaria:**')
    if (settings.alias) {
      methods.push(`   Alias: ${settings.alias}`)
    }
    if (settings.cbu) {
      methods.push(`   CBU: ${settings.cbu}`)
    }
    if (settings.holderName) {
      methods.push(`   Titular: ${settings.holderName}`)
    }
    methods.push(`   Importe: $${amount.toLocaleString('es-AR')}`)
  }
  
  if (settings.acceptMercadoPago && settings.mercadoPagoLink) {
    methods.push('💳 **Mercado Pago:**')
    methods.push(`   Link: ${settings.mercadoPagoLink}`)
    methods.push(`   Importe: $${amount.toLocaleString('es-AR')}`)
  }
  
  if (settings.acceptCash) {
    methods.push('💵 **Efectivo:**')
    methods.push('   Coordinar con tu profesor')
  }
  
  if (settings.acceptOther && settings.otherMethodInfo) {
    methods.push('📌 **Otro método:**')
    methods.push(`   ${settings.otherMethodInfo}`)
  }
  
  if (methods.length === 0) {
    return 'Consulta con tu profesor las vías de pago disponibles.'
  }
  
  return '💳 **Vías de Pago:**\n' + methods.join('\n')
}
