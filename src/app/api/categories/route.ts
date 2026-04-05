import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - List all categories
export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    )
  }
}

// POST - Create a new category (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo el admin puede crear categorías.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { name, description } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre de la categoría es requerido' },
        { status: 400 }
      )
    }

    // Check if category already exists
    const existing = await db.category.findUnique({
      where: { name: name.trim() }
    })

    if (existing) {
      return NextResponse.json(existing)
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        description: description || null
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Error al crear categoría' },
      { status: 500 }
    )
  }
}
