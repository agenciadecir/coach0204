/**
 * Script para importar datos desde JSON a PostgreSQL
 * Útil para migrar datos a producción
 *
 * Uso: bun run scripts/import-data.ts <archivo.json>
 */

import { db } from '../src/lib/db'
import { readFileSync } from 'fs'

async function importData() {
  const filename = process.argv[2]

  if (!filename) {
    console.error('❌ Uso: bun run scripts/import-data.ts <archivo.json>')
    process.exit(1)
  }

  console.log(`📦 Importando datos desde ${filename}...\n`)

  try {
    // Leer archivo
    const fileContent = readFileSync(filename, 'utf-8')
    const { data } = JSON.parse(fileContent)

    // Importar usuarios (sin contraseñas hasheadas - se hashean al crear)
    console.log('👤 Importando usuarios...')
    for (const user of data.users) {
      await db.user.upsert({
        where: { id: user.id },
        update: user,
        create: user
      })
    }
    console.log(`✅ Usuarios importados: ${data.users.length}`)

    // Importar estudiantes
    console.log('👥 Importando estudiantes...')
    for (const student of data.students) {
      await db.student.upsert({
        where: { id: student.id },
        update: student,
        create: student
      })
    }
    console.log(`✅ Estudiantes importados: ${data.students.length}`)

    // Importar ejercicios
    console.log('🏋️ Importando ejercicios...')
    for (const exercise of data.exercises) {
      await db.exercise.upsert({
        where: { id: exercise.id },
        update: exercise,
        create: exercise
      })
    }
    console.log(`✅ Ejercicios importados: ${data.exercises.length}`)

    // Importar combinaciones de ejercicios
    console.log('🔗 Importando combinaciones de ejercicios...')
    for (const combo of data.exerciseCombinations) {
      await db.exerciseCombination.upsert({
        where: { id: combo.id },
        update: combo,
        create: combo
      })
    }
    console.log(`✅ Combinaciones importadas: ${data.exerciseCombinations.length}`)

    // Importar rutinas
    console.log('📋 Importando rutinas...')
    for (const routine of data.routines) {
      await db.routine.upsert({
        where: { id: routine.id },
        update: routine,
        create: routine
      })
    }
    console.log(`✅ Rutinas importadas: ${data.routines.length}`)

    // Importar días de entrenamiento
    console.log('📅 Importando días de entrenamiento...')
    for (const day of data.trainingDays) {
      await db.trainingDay.upsert({
        where: { id: day.id },
        update: day,
        create: day
      })
    }
    console.log(`✅ Días de entrenamiento importados: ${data.trainingDays.length}`)

    // Importar semanas de rutina
    console.log('📆 Importando semanas de rutina...')
    for (const week of data.routineWeeks) {
      await db.routineWeek.upsert({
        where: { id: week.id },
        update: week,
        create: week
      })
    }
    console.log(`✅ Semanas importadas: ${data.routineWeeks.length}`)

    // Importar ejercicios de rutina
    console.log('💪 Importando ejercicios de rutina...')
    for (const exercise of data.routineExercises) {
      await db.routineExercise.upsert({
        where: { id: exercise.id },
        update: exercise,
        create: exercise
      })
    }
    console.log(`✅ Ejercicios de rutina importados: ${data.routineExercises.length}`)

    // Importar dietas
    console.log('🥗 Importando dietas...')
    for (const diet of data.diets) {
      await db.diet.upsert({
        where: { id: diet.id },
        update: diet,
        create: diet
      })
    }
    console.log(`✅ Dietas importadas: ${data.diets.length}`)

    // Importar comidas
    console.log('🍽️ Importando comidas...')
    for (const meal of data.meals) {
      await db.meal.upsert({
        where: { id: meal.id },
        update: meal,
        create: meal
      })
    }
    console.log(`✅ Comidas importadas: ${data.meals.length}`)

    // Importar progreso
    console.log('📊 Importando registros de progreso...')
    for (const prog of data.progress) {
      await db.progress.upsert({
        where: { id: prog.id },
        update: prog,
        create: prog
      })
    }
    console.log(`✅ Registros de progreso importados: ${data.progress.length}`)

    // Importar configuración de pagos
    console.log('💰 Importando configuración de pagos...')
    for (const setting of data.paymentSettings) {
      await db.paymentSettings.upsert({
        where: { id: setting.id },
        update: setting,
        create: setting
      })
    }
    console.log(`✅ Configuración de pagos importada: ${data.paymentSettings.length}`)

    // Importar pagos
    console.log('💳 Importando pagos...')
    for (const payment of data.payments) {
      await db.payment.upsert({
        where: { id: payment.id },
        update: payment,
        create: payment
      })
    }
    console.log(`✅ Pagos importados: ${data.payments.length}`)

    // Importar notificaciones
    console.log('🔔 Importando notificaciones...')
    for (const notification of data.notifications) {
      await db.notification.upsert({
        where: { id: notification.id },
        update: notification,
        create: notification
      })
    }
    console.log(`✅ Notificaciones importadas: ${data.notifications.length}`)

    console.log('\n🎉 Importación completada exitosamente!')

  } catch (error) {
    console.error('❌ Error durante la importación:', error)
    process.exit(1)
  }
}

importData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
