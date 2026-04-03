import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get single student
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

    // Coach can see any student, student can only see themselves
    if (session.user.role === 'STUDENT') {
      const ownStudent = await db.student.findUnique({
        where: { userId: session.user.id }
      })
      if (ownStudent?.id !== id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    // Get query params for including archived items
    const { searchParams } = new URL(req.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // Build the where clause for routines and diets
    const routineWhere = includeArchived ? {} : { isArchived: false }
    const dietWhere = includeArchived ? {} : { isArchived: false }

    const student = await db.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            image: true,
            createdAt: true
          }
        },
        routines: {
          where: routineWhere,
          include: {
            trainingDays: {
              include: {
                weeks: {
                  include: {
                    exercises: {
                      include: {
                        exercise: true
                      },
                      orderBy: { order: 'asc' }
                    }
                  },
                  orderBy: { weekNumber: 'asc' }
                },
                exercises: {
                  include: {
                    exercise: true
                  },
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { dayNumber: 'asc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        diets: {
          where: dietWhere,
          include: {
            meals: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        progress: {
          orderBy: { date: 'desc' },
          take: 10
        },
        payments: {
          orderBy: { dueDate: 'desc' }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Get student error:', error)
    return NextResponse.json({ error: 'Error al obtener alumno' }, { status: 500 })
  }
}

// PUT - Update student
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
    const { 
      name, 
      email, 
      phone, 
      birthDate, 
      address, 
      emergencyContact, 
      goals, 
      notes,
      isActive 
    } = body

    // Get current student
    const currentStudent = await db.student.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!currentStudent) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    // Check if email is being changed and if it conflicts
    if (email && email !== currentStudent.user.email) {
      const existingUser = await db.user.findUnique({
        where: { email }
      })
      if (existingUser) {
        return NextResponse.json(
          { error: 'El email ya está en uso' },
          { status: 400 }
        )
      }
    }

    // Update in transaction
    const result = await db.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: currentStudent.userId },
        data: {
          name: name || currentStudent.user.name,
          email: email || currentStudent.user.email,
          isActive: isActive !== undefined ? isActive : currentStudent.user.isActive
        }
      })

      // Update student
      const student = await tx.student.update({
        where: { id },
        data: {
          phone,
          birthDate: birthDate ? new Date(birthDate) : null,
          address,
          emergencyContact,
          goals,
          notes
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true
            }
          }
        }
      })

      return student
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Update student error:', error)
    return NextResponse.json({ error: 'Error al actualizar alumno' }, { status: 500 })
  }
}

// DELETE - Delete student
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

    // Get student
    const student = await db.student.findUnique({
      where: { id }
    })

    if (!student) {
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    }

    // Delete student and user (cascade will handle related data)
    await db.$transaction([
      db.student.delete({ where: { id } }),
      db.user.delete({ where: { id: student.userId } })
    ])

    return NextResponse.json({ message: 'Alumno eliminado correctamente' })
  } catch (error) {
    console.error('Delete student error:', error)
    return NextResponse.json({ error: 'Error al eliminar alumno' }, { status: 500 })
  }
}
