import { db } from './src/lib/db'

async function main() {
  // Create default exercises
  const exercises = [
    // Pecho
    { name: 'Press de Banca', muscleGroup: 'Pecho', description: 'Press plano con barra' },
    { name: 'Press Inclinado', muscleGroup: 'Pecho', description: 'Press inclinado con mancuernas' },
    { name: 'Aperturas', muscleGroup: 'Pecho', description: 'Aperturas con mancuernas' },
    { name: 'Fondos', muscleGroup: 'Pecho', description: 'Fondos en paralelas' },
    { name: 'Cruces en Polea', muscleGroup: 'Pecho', description: 'Cruces en polea baja' },
    
    // Espalda
    { name: 'Dominadas', muscleGroup: 'Espalda', description: 'Dominadas tradicionales' },
    { name: 'Remo con Barra', muscleGroup: 'Espalda', description: 'Remo con barra' },
    { name: 'Jalón al Pecho', muscleGroup: 'Espalda', description: 'Jalón en polea al pecho' },
    { name: 'Remo en Polea', muscleGroup: 'Espalda', description: 'Remo en polea baja' },
    { name: 'Peso Muerto', muscleGroup: 'Espalda', description: 'Peso muerto tradicional' },
    
    // Hombros
    { name: 'Press Militar', muscleGroup: 'Hombros', description: 'Press militar con barra' },
    { name: 'Elevaciones Laterales', muscleGroup: 'Hombros', description: 'Elevaciones laterales con mancuernas' },
    { name: 'Pájaros', muscleGroup: 'Hombros', description: 'Elevaciones posteriores' },
    { name: 'Encogimientos', muscleGroup: 'Hombros', description: 'Encogimientos de hombros' },
    
    // Bíceps
    { name: 'Curl con Barra', muscleGroup: 'Bíceps', description: 'Curl tradicional con barra' },
    { name: 'Curl Martillo', muscleGroup: 'Bíceps', description: 'Curl martillo con mancuernas' },
    { name: 'Curl Predicador', muscleGroup: 'Bíceps', description: 'Curl en banco predicador' },
    { name: 'Curl Concentrado', muscleGroup: 'Bíceps', description: 'Curl concentrado' },
    
    // Tríceps
    { name: 'Press Francés', muscleGroup: 'Tríceps', description: 'Press francés con barra Z' },
    { name: 'Extensiones', muscleGroup: 'Tríceps', description: 'Extensiones en polea' },
    { name: 'Fondos en Banco', muscleGroup: 'Tríceps', description: 'Fondos entre bancos' },
    { name: 'Patada Tríceps', muscleGroup: 'Tríceps', description: 'Patada de tríceps' },
    
    // Piernas
    { name: 'Sentadilla', muscleGroup: 'Piernas', description: 'Sentadilla con barra' },
    { name: 'Prensa', muscleGroup: 'Piernas', description: 'Prensa de piernas' },
    { name: 'Extensiones Cuádriceps', muscleGroup: 'Piernas', description: 'Extensiones en máquina' },
    { name: 'Curl Femoral', muscleGroup: 'Piernas', description: 'Curl femoral' },
    { name: 'Zancadas', muscleGroup: 'Piernas', description: 'Zancadas con mancuernas' },
    { name: 'Elevación de Gemelos', muscleGroup: 'Piernas', description: 'Elevación de talones' },
    
    // Abdomen
    { name: 'Crunch', muscleGroup: 'Abdomen', description: 'Crunch abdominal' },
    { name: 'Plancha', muscleGroup: 'Abdomen', description: 'Plancha isométrica' },
    { name: 'Elevación de Piernas', muscleGroup: 'Abdomen', description: 'Elevación de piernas' },
    { name: 'Rotaciones Rusas', muscleGroup: 'Abdomen', description: 'Rotaciones rusas' },
  ]

  for (const exercise of exercises) {
    await db.exercise.create({
      data: exercise
    })
  }

  console.log(`✅ Created ${exercises.length} exercises`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
