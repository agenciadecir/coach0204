import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Create new user
// Rules:
// 1. If NO users exist -> First registration becomes ADMIN (no auth required)
// 2. If users exist and logged in as ADMIN -> Can create COACH
// 3. If users exist and logged in as COACH -> Can create STUDENT
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, phone, goals } = body

    // Check if any users exist in the system
    const userCount = await db.user.count()
    const isFirstUser = userCount === 0

    // If this is the first user, create as ADMIN (no auth required)
    if (isFirstUser) {
      // Validate required fields
      if (!email || !password || !name) {
        return NextResponse.json(
          { error: 'Email, contraseña y nombre son requeridos' },
          { status: 400 }
        )
      }

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

      // Validate password
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        )
      }

      const hashedPassword = await hashPassword(password)

      // Create first user as ADMIN
      const user = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'ADMIN'
        }
      })

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        message: 'Admin creado exitosamente. Ahora puedes iniciar sesión.'
      })
    }

    // If not first user, require authentication
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      )
    }

    // ADMIN can create COACHes
    if (session.user.role === 'ADMIN') {
      // Validate required fields
      if (!email || !password || !name) {
        return NextResponse.json(
          { error: 'Email, contraseña y nombre son requeridos' },
          { status: 400 }
        )
      }

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

      // Validate password
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        )
      }

      const hashedPassword = await hashPassword(password)

      // Create user with COACH role
      const user = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'COACH'
        }
      })

      // Create coach profile
      const coach = await db.coach.create({
        data: {
          userId: user.id,
          specialty: null,
          bio: null,
        }
      })

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        coachId: coach.id,
        message: 'Coach creado exitosamente.'
      })
    }

    // COACH can create STUDENTs
    if (session.user.role === 'COACH') {
      // Validate required fields
      if (!email || !password || !name) {
        return NextResponse.json(
          { error: 'Email, contraseña y nombre son requeridos' },
          { status: 400 }
        )
      }

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

      // Validate password
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        )
      }

      const hashedPassword = await hashPassword(password)

      // Get the coach ID from the session user
      const coach = await db.coach.findUnique({
        where: { userId: session.user.id }
      })

      if (!coach) {
        return NextResponse.json(
          { error: 'Coach no encontrado' },
          { status: 400 }
        )
      }

      // Create user with STUDENT role
      const user = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'STUDENT'
        }
      })

      // Create student profile linked to the coach
      const student = await db.student.create({
        data: {
          userId: user.id,
          coachId: coach.id,
          phone: phone || null,
          goals: goals || null,
        }
      })

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: student.id,
        message: 'Alumno creado exitosamente.'
      })
    }

    // STUDENTs cannot create users
    return NextResponse.json(
      { error: 'No autorizado. No tienes permisos para crear usuarios.' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Error al registrar usuario' },
      { status: 500 }
    )
  }
}

// GET - Check if first user setup is needed
export async function GET() {
  try {
    const userCount = await db.user.count()
    
    return NextResponse.json({
      isFirstUser: userCount === 0,
      userCount
    })
  } catch (error) {
    console.error('Check first user error:', error)
    return NextResponse.json(
      { error: 'Error al verificar usuarios' },
      { status: 500 }
    )
  }
}
