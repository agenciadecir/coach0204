import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// GET - List all coaches
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const coaches = await db.user.findMany({
      where: { 
        role: 'COACH'
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    const coachesWithCount = await Promise.all(
      coaches.map(async (coach) => {
        const routines = await db.routine.findMany({
          where: { coachId: coach.id },
          select: { studentId: true }
        })
        
        const uniqueStudents = new Set(routines.map(r => r.studentId))
        
        return {
          ...coach,
          _count: {
            students: uniqueStudents.size
          }
        }
      })
    )

    return NextResponse.json(coachesWithCount)
  } catch (error) {
    console.error('Error fetching coaches:', error)
    return NextResponse.json({ error: 'Error al obtener coaches', details: String(error) }, { status: 500 })
  }
}

// POST - Create new coach (only ADMIN)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { name, email, password } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create coach
    const coach = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'COACH',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      }
    })

    return NextResponse.json(coach)
  } catch (error) {
    console.error('Error creating coach:', error)
    return NextResponse.json({ error: 'Error al crear coach' }, { status: 500 })
  }
}
