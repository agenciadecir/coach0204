import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Upload file (receipts, progress photos, etc.)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'receipt'

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    const maxSize = type === 'progress' ? 10 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: `El archivo es muy grande (máx ${type === 'progress' ? '10MB' : '5MB'})` }, { status: 400 })
    }

    const allowedTypes = type === 'progress' 
      ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      : ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
    }

    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const ext = file.name.split('.').pop()
    const folder = type === 'progress' ? 'progress' : 'receipts'
    const filename = `${folder}/${timestamp}-${randomStr}.${ext}`

    const blob = await put(filename, file, {
      access: 'public',
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}