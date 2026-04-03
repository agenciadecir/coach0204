import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle } from 'docx'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { studentId } = body

    // Build where clause
    const where: any = { isArchived: false }
    
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

    // Get routines
    const routines = await db.routine.findMany({
      where,
      include: {
        student: {
          include: { user: { select: { name: true, email: true } } }
        },
        trainingDays: {
          include: {
            exercises: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { dayNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (routines.length === 0) {
      return NextResponse.json({ error: 'No hay rutinas para exportar' }, { status: 400 })
    }

    const studentName = routines[0]?.student?.user?.name || 
                        routines[0]?.student?.user?.email || 
                        'Mis Rutinas'

    // Build document content
    const children: Paragraph[] = []
    
    // Title
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Rutinas de Entrenamiento', bold: true, size: 48, color: '10B981' })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }))
    
    children.push(new Paragraph({
      children: [new TextRun({ text: studentName, size: 28, color: '6B7280' })],
      alignment: AlignmentType.CENTER,
    }))
    
    children.push(new Paragraph({
      children: [new TextRun({ text: `Total: ${routines.length} rutinas`, size: 24 })],
      alignment: AlignmentType.CENTER,
    }))
    
    children.push(new Paragraph({ children: [] }))

    // Each routine
    for (const routine of routines) {
      // Routine name
      children.push(new Paragraph({
        children: [new TextRun({ text: routine.name, bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1,
      }))
      
      if (routine.description) {
        children.push(new Paragraph({
          children: [new TextRun({ text: routine.description, size: 22, color: '6B7280' })],
        }))
      }
      
      children.push(new Paragraph({ children: [] }))

      // Training days
      for (const day of routine.trainingDays || []) {
        const dayHeader = `${day.name}${day.muscleGroups ? ` - ${day.muscleGroups}` : ''}`
        children.push(new Paragraph({
          children: [new TextRun({ text: dayHeader, bold: true, size: 26, color: '7C3AED' })],
          heading: HeadingLevel.HEADING_2,
        }))

        if (day.exercises && day.exercises.length > 0) {
          // Table header
          const tableRows = [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ejercicio', bold: true, color: 'FFFFFF' })] })], width: { size: 40, type: WidthType.PERCENTAGE }, shading: { fill: '10B981' } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Series', bold: true, color: 'FFFFFF' })] })], width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: '10B981' } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Reps', bold: true, color: 'FFFFFF' })] })], width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: '10B981' } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Peso', bold: true, color: 'FFFFFF' })] })], width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: '10B981' } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Descanso', bold: true, color: 'FFFFFF' })] })], width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: '10B981' } }),
              ],
            }),
          ]

          // Table rows
          for (const ex of day.exercises) {
            tableRows.push(new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ex.exerciseName || '-' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(ex.sets || 3) })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ex.reps || '-' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ex.weight ? `${ex.weight} kg` : '-' })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ex.restTime ? `${ex.restTime}s` : '-' })] })] }),
              ],
            }))
          }

          const table = new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
          
          children.push(table)
        }
        
        children.push(new Paragraph({ children: [] }))
      }
      
      children.push(new Paragraph({ children: [] }))
    }

    // Footer
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
        'Content-Disposition': `attachment; filename="rutinas-${format(new Date(), 'yyyy-MM-dd')}.docx"`
      }
    })
  } catch (error) {
    console.error('Error generating document:', error)
    return NextResponse.json({ error: 'Error al generar el documento' }, { status: 500 })
  }
}
