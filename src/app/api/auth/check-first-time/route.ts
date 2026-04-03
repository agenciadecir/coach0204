import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const userCount = await db.user.count()
    return NextResponse.json({ isFirstTime: userCount === 0 })
  } catch (error) {
    console.error('Error checking first time:', error)
    return NextResponse.json({ isFirstTime: false })
  }
}
