import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { format, subDays, subMonths } from 'date-fns'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from 'docx'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { dateFilter, customDateStart, customDateEnd, studentId } = body

    // Build where clause
    const where: any = {}
    
    if (session.user.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { userId: session.user.id }
      })
      if (!student) {
        return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
      }
      where.studentId = student.id
    } else if (studentId) {
      where.studentId = studentId
    }

    // Get all progress records
    const allProgress = await db.progress.findMany({
      where,
      include: {
        student: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { date: 'desc' }
    })

    if (allProgress.length === 0) {
      return NextResponse.json({ error: 'No hay registros de progreso para exportar' }, { status: 400 })
    }

    // Apply date filter
    let filtered = [...allProgress]
    const now = new Date()

    switch (dateFilter) {
      case '15days':
        filtered = filtered.filter(p => new Date(p.date) >= subDays(now, 15))
        break
      case '1month':
        filtered = filtered.filter(p => new Date(p.date) >= subMonths(now, 1))
        break
      case '3months':
        filtered = filtered.filter(p => new Date(p.date) >= subMonths(now, 3))
        break
      case 'custom':
        if (customDateStart) {
          filtered = filtered.filter(p => new Date(p.date) >= new Date(customDateStart))
        }
        if (customDateEnd) {
          filtered = filtered.filter(p => new Date(p.date) <= new Date(customDateEnd))
        }
        break
    }

    const studentName = filtered[0]?.student?.user?.name || 
                        filtered[0]?.student?.user?.email || 
                        'Mi Progreso'

    // Build document content
    const children: Paragraph[] = []
    
    // Title
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Informe de Progreso', bold: true, size: 48, color: '10B981' })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }))
    
    children.push(new Paragraph({
      children: [new TextRun({ text: studentName, size: 28, color: '6B7280' })],
      alignment: AlignmentType.CENTER,
    }))
    
    children.push(new Paragraph({
      children: [new TextRun({ text: `Total: ${filtered.length} registros`, size: 24 })],
      alignment: AlignmentType.CENTER,
    }))
    
    children.push(new Paragraph({ children: [] }))

    // Section header
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Mediciones Corporales', bold: true, size: 32 })],
      heading: HeadingLevel.HEADING_1,
    }))
    
    children.push(new Paragraph({ children: [] }))

    // Sort by date (newest first)
    const sortedRecords = [...filtered].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // Create table for all records
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Fecha', bold: true, color: 'FFFFFF' })] })], width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: '10B981' } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Peso', bold: true, color: 'FFFFFF' })] })], width: { size: 16, type: WidthType.PERCENTAGE }, shading: { fill: '10B981' } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Espalda', bold: true, color: 'FFFFFF' })] })], width: { size: 16, type: WidthType.PERCENTAGE }, shading: { fill: '10B981' } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pecho', bold: true, color: 'FFFFFF' })] })], width: { size: 16, type: WidthType.PERCENTAGE }, shading: { fill: '10B981' } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cintura', bold: true, color: 'FFFFFF' })] })], width: { size: 16, type: WidthType.PERCENTAGE }, shading: { fill: '10B981' } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Gluteos', bold: true, color: 'FFFFFF' })] })], width: { size: 16, type: WidthType.PERCENTAGE }, shading: { fill: '10B981' } }),
        ],
      }),
    ]

    for (const record of sortedRecords) {
      const dateStr = format(new Date(record.date), 'dd/MM/yyyy')
      
      tableRows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dateStr, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.weight ? `${record.weight} kg` : '-' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.shoulders ? `${record.shoulders} cm` : '-' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.chest ? `${record.chest} cm` : '-' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.waist ? `${record.waist} cm` : '-' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.hip ? `${record.hip} cm` : '-' })] })] }),
        ],
      }))
    }

    const table = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
    
    children.push(table)
    
    children.push(new Paragraph({ children: [] }))
    children.push(new Paragraph({ children: [] }))

    // Additional measurements section
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Mediciones Detalladas', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_2,
    }))
    
    children.push(new Paragraph({ children: [] }))

    // Detailed table with more measurements
    const detailedRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Fecha', bold: true, color: 'FFFFFF' })] })], shading: { fill: '6366F1' } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Brazo Der', bold: true, color: 'FFFFFF' })] })], shading: { fill: '6366F1' } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Brazo Izq', bold: true, color: 'FFFFFF' })] })], shading: { fill: '6366F1' } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Muslo Der', bold: true, color: 'FFFFFF' })] })], shading: { fill: '6366F1' } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Muslo Izq', bold: true, color: 'FFFFFF' })] })], shading: { fill: '6366F1' } }),
        ],
      }),
    ]

    for (const record of sortedRecords) {
      const dateStr = format(new Date(record.date), 'dd/MM')
      
      detailedRows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dateStr, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.rightArm ? `${record.rightArm} cm` : '-' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.leftArm ? `${record.leftArm} cm` : '-' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.rightThigh ? `${record.rightThigh} cm` : '-' })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: record.leftThigh ? `${record.leftThigh} cm` : '-' })] })] }),
        ],
      }))
    }

    const detailedTable = new Table({
      rows: detailedRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
    
    children.push(detailedTable)

    // Footer
    children.push(new Paragraph({ children: [] }))
    children.push(new Paragraph({
      children: [new TextRun({ text: `Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, size: 18, color: '9CA3AF' })],
      alignment: AlignmentType.CENTER,
    }))

    // Create document
    const doc = new Document({
      sections: [{ children }],
    })

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="progreso-${format(now, 'yyyy-MM-dd')}.docx"`
      }
    })
  } catch (error) {
    console.error('Error generating document:', error)
    return NextResponse.json({ error: 'Error al generar el documento' }, { status: 500 })
  }
}
