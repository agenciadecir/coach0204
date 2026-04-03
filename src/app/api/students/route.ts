import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hashPassword } from '@/lib/password'

// GET - Get all students (coach only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (session.user.role === 'COACH') {
      // Coach sees all students
      const students = await db.student.findMany({
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
          _count: {
            select: {
              routines: { where: { isArchived: false } },
              diets: { where: { isArchived: false } },
              progress: true,
              payments: { where: { status: { in: ['PENDING', 'OVERDUE'] } } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json(students)
    } else {
      // Student sees only their own profile
      const student = await db.student.findUnique({
        where: { userId: session.user.id },
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
          }
        }
      })

      return NextResponse.json(student ? [student] : [])
    }
  } catch (error) {
    console.error('Get students error:', error)
    return NextResponse.json({ error: 'Error al obtener alumnos' }, { status: 500 })
  }
}

// POST - Create new student (coach only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'COACH') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      email, 
      password, 
      name, 
      phone, 
      birthDate, 
      address, 
      emergencyContact, 
      goals, 
      notes 
    } = body

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(password || 'password123')

    // Create user and student in transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'STUDENT'
        }
      })

      const student = await tx.student.create({
        data: {
          userId: user.id,
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
    console.error('Create student error:', error)
    return NextResponse.json({ error: 'Error al crear alumno' }, { status: 500 })
  }
}
