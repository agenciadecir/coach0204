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

// GET - Get diets (by student if query param provided)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')
    const includeArchived = searchParams.get('archived') === 'true'

    if (studentId) {
      const diets = await db.diet.findMany({
        where: {
          studentId,
          isArchived: includeArchived ? undefined : false
        },
        include: {
          meals: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json(diets)
    }

    // Coach sees all diets
    if (session.user.role === 'COACH') {
      const diets = await db.diet.findMany({
        where: {
          isArchived: includeArchived ? undefined : false
        },
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
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json(diets)
    }

    // Student sees only their own diets
    const student = await db.student.findUnique({
      where: { userId: session.user.id }
    })

    if (!student) {
      return NextResponse.json([])
    }

    const diets = await db.diet.findMany({
      where: {
        studentId: student.id,
        isArchived: includeArchived ? undefined : false
      },
      include: {
        meals: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(diets)
  } catch (error) {
    console.error('Get diets error:', error)
    return NextResponse.json({ error: 'Error al obtener dietas' }, { status: 500 })
  }
}

// POST - Create new diet
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { studentId, name, description, totalCalories, proteinGoal, carbsGoal, fatsGoal, meals } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre de la dieta es requerido' }, { status: 400 })
    }

    if (!studentId) {
      return NextResponse.json({ error: 'El alumno es requerido' }, { status: 400 })
    }

    // Verify student exists
    const student = await db.student.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      return NextResponse.json({ error: 'El alumno no existe' }, { status: 400 })
    }

    // Verify coach exists
    const coach = await db.user.findUnique({
      where: { id: session.user.id }
    })

    if (!coach) {
      return NextResponse.json({ error: 'El coach no existe en la base de datos' }, { status: 400 })
    }

    // Filter out meals without required fields
    const validMeals = meals?.filter((meal: { name: string; foods: string }) => 
      meal.name && meal.name.trim() !== '' && meal.foods && meal.foods.trim() !== ''
    ) || []

    const diet = await db.diet.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        totalCalories: parseNumberField(totalCalories),
        proteinGoal: parseNumberField(proteinGoal),
        carbsGoal: parseNumberField(carbsGoal),
        fatsGoal: parseNumberField(fatsGoal),
        studentId,
        coachId: session.user.id,
        meals: validMeals.length > 0 ? {
          create: validMeals.map((meal: { name: string; time?: string; foods: string; calories?: unknown; protein?: unknown; carbs?: unknown; fats?: unknown; notes?: string }, index: number) => ({
            name: meal.name.trim(),
            time: meal.time?.trim() || null,
            foods: meal.foods.trim(),
            calories: parseNumberField(meal.calories),
            protein: parseNumberField(meal.protein),
            carbs: parseNumberField(meal.carbs),
            fats: parseNumberField(meal.fats),
            notes: meal.notes?.trim() || null,
            order: index
          }))
        } : undefined
      },
      include: {
        meals: {
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json(diet)
  } catch (error) {
    console.error('Create diet error:', error)
    return NextResponse.json({ 
      error: 'Error al crear dieta', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
