import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// DELETE - Delete a product (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo el admin puede eliminar productos.' },
        { status: 401 }
      )
    }

    const { id } = await params

    await db.product.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    )
  }
}

// PATCH - Update a product (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo el admin puede actualizar productos.' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await req.json()
    const { name, price, imageUrl, productUrl, description, isActive } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (price !== undefined) updateData.price = price
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (productUrl !== undefined) updateData.productUrl = productUrl
    if (description !== undefined) updateData.description = description
    if (isActive !== undefined) updateData.isActive = isActive

    const product = await db.product.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    )
  }
}
