import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from 'docx'

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

    // Get diets
    const diets = await db.diet.findMany({
      where,
      include: {
        student: {
          include: { user: { select: { name: true, email: true } } }
        },
        meals: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (diets.length === 0) {
      return NextResponse.json({ error: 'No hay dietas para exportar' }, { status: 400 })
    }

    const studentName = diets[0]?.student?.user?.name || 
                        diets[0]?.student?.user?.email || 
                        'Mi Dieta'

    // Build document content
    const children: Paragraph[] = []
    
    // Title
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Plan de Alimentacion', bold: true, size: 48, color: 'F97316' })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }))
    
    children.push(new Paragraph({
      children: [new TextRun({ text: studentName, size: 28, color: '6B7280' })],
      alignment: AlignmentType.CENTER,
    }))
    
    children.push(new Paragraph({
      children: [new TextRun({ text: `Total: ${diets.length} dietas`, size: 24 })],
      alignment: AlignmentType.CENTER,
    }))
    
    children.push(new Paragraph({ children: [] }))

    // Each diet
    for (const diet of diets) {
      // Diet name
      children.push(new Paragraph({
        children: [new TextRun({ text: diet.name, bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1,
      }))
      
      if (diet.description) {
        children.push(new Paragraph({
          children: [new TextRun({ text: diet.description, size: 22, color: '6B7280' })],
        }))
      }
      
      children.push(new Paragraph({ children: [] }))

      // Macros
      const macros: string[] = []
      if (diet.totalCalories) macros.push(`Calorias: ${diet.totalCalories} kcal`)
      if (diet.proteinGoal) macros.push(`Proteinas: ${diet.proteinGoal}g`)
      if (diet.carbsGoal) macros.push(`Carbos: ${diet.carbsGoal}g`)
      if (diet.fatsGoal) macros.push(`Grasas: ${diet.fatsGoal}g`)

      if (macros.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: macros.join('  |  '), bold: true, size: 24, color: '059669' })],
        }))
        children.push(new Paragraph({ children: [] }))
      }

      // Meals table
      if (diet.meals && diet.meals.length > 0) {
        const tableRows = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Comida', bold: true, color: 'FFFFFF' })] })], width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: 'F97316' } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Alimentos', bold: true, color: 'FFFFFF' })] })], width: { size: 50, type: WidthType.PERCENTAGE }, shading: { fill: 'F97316' } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Macros', bold: true, color: 'FFFFFF' })] })], width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: 'F97316' } }),
            ],
          }),
        ]

        for (const meal of diet.meals) {
          const mealName = `${meal.name}${meal.time ? ` (${meal.time})` : ''}`
          const mealMacros: string[] = []
          if (meal.calories) mealMacros.push(`${meal.calories} kcal`)
          if (meal.protein) mealMacros.push(`P: ${meal.protein}g`)
          if (meal.carbs) mealMacros.push(`C: ${meal.carbs}g`)
          if (meal.fats) mealMacros.push(`G: ${meal.fats}g`)

          tableRows.push(new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: mealName, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: meal.foods })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: mealMacros.join(' | ') })] })] }),
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
        'Content-Disposition': `attachment; filename="dietas-${format(new Date(), 'yyyy-MM-dd')}.docx"`
      }
    })
  } catch (error) {
    console.error('Error generating document:', error)
    return NextResponse.json({ error: 'Error al generar el documento' }, { status: 500 })
  }
}
