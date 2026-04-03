import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Helper to convert empty strings to null and parse integers
const parseNumberField = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const num = parseInt(String(value))
  return isNaN(num) ? null : num
}

// GET - Get single diet
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

    const diet = await db.diet.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        meals: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!diet) {
      return NextResponse.json({ error: 'Dieta no encontrada' }, { status: 404 })
    }

    // Check permission
    if (session.user.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { userId: session.user.id }
      })
      if (student?.id !== diet.studentId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    return NextResponse.json(diet)
  } catch (error) {
    console.error('Get diet error:', error)
    return NextResponse.json({ error: 'Error al obtener dieta' }, { status: 500 })
  }
}

// PUT - Update diet
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, totalCalories, proteinGoal, carbsGoal, fatsGoal, isArchived, isActive, meals } = body

    // Update diet
    const diet = await db.diet.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
        totalCalories: parseNumberField(totalCalories),
        proteinGoal: parseNumberField(proteinGoal),
        carbsGoal: parseNumberField(carbsGoal),
        fatsGoal: parseNumberField(fatsGoal),
        isArchived,
        archivedAt: isArchived ? new Date() : null,
        isActive
      }
    })

    // If meals provided, update them
    if (meals) {
      // Delete existing meals
      await db.meal.deleteMany({
        where: { dietId: id }
      })

      // Create new meals
      await db.meal.createMany({
        data: meals.map((meal: { name: string; time?: string; foods: string; calories?: unknown; protein?: unknown; carbs?: unknown; fats?: unknown; notes?: string }, index: number) => ({
          dietId: id,
          name: meal.name?.trim(),
          time: meal.time?.trim() || null,
          foods: meal.foods?.trim(),
          calories: parseNumberField(meal.calories),
          protein: parseNumberField(meal.protein),
          carbs: parseNumberField(meal.carbs),
          fats: parseNumberField(meal.fats),
          notes: meal.notes?.trim() || null,
          order: index
        }))
      })
    }

    // Fetch updated diet
    const updatedDiet = await db.diet.findUnique({
      where: { id },
      include: {
        meals: {
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json(updatedDiet)
  } catch (error) {
    console.error('Update diet error:', error)
    return NextResponse.json({ error: 'Error al actualizar dieta' }, { status: 500 })
  }
}

// DELETE - Delete diet
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

    await db.diet.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Dieta eliminada correctamente' })
  } catch (error) {
    console.error('Delete diet error:', error)
    return NextResponse.json({ error: 'Error al eliminar dieta' }, { status: 500 })
  }
}
