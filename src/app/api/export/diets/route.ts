import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// GET - Get diets data for PDF export
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // Get student info
    let student: any
    if (session.user.role === 'STUDENT') {
      student = await db.student.findUnique({
        where: { userId: session.user.id },
        include: { user: true }
      })
    } else if (studentId) {
      student = await db.student.findUnique({
        where: { id: studentId },
        include: { user: true }
      })
    }

    if (!student) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
    }

    // Get diets
    const diets = await db.diet.findMany({
      where: {
        studentId: student.id,
        ...(includeArchived ? {} : { isArchived: false })
      },
      include: {
        meals: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Generate PDF content as a data structure
    const pdfData = {
      student: {
        name: student.user.name || 'Sin nombre',
        email: student.user.email
      },
      exportDate: format(new Date(), "dd MMMM yyyy", { locale: es }),
      diets: diets.map(d => ({
        name: d.name,
        description: d.description,
        totalCalories: d.totalCalories,
        proteinGoal: d.proteinGoal,
        carbsGoal: d.carbsGoal,
        fatsGoal: d.fatsGoal,
        isArchived: d.isArchived,
        meals: d.meals.map(m => ({
          name: m.name,
          time: m.time,
          foods: m.foods,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fats: m.fats,
          notes: m.notes
        }))
      }))
    }

    return NextResponse.json(pdfData)
  } catch (error) {
    console.error('Export diets error:', error)
    return NextResponse.json({ error: 'Error al exportar dietas' }, { status: 500 })
  }
}
