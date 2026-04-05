import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get ALL users with their roles
    const allUsers = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      }
    })

    // Count by role
    const coaches = allUsers.filter(u => u.role === 'COACH')
    const students = allUsers.filter(u => u.role === 'STUDENT')
    const admins = allUsers.filter(u => u.role === 'ADMIN')

    return NextResponse.json({
      total: allUsers.length,
      coaches: coaches.length,
      students: students.length,
      admins: admins.length,
      users: allUsers
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Error', details: String(error) }, { status: 500 })
  }
}