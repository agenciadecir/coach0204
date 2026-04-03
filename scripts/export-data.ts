/**
 * Script para exportar datos de SQLite a JSON
 * Útil para migrar datos a PostgreSQL en producción
 *
 * Uso: bun run scripts/export-data.ts
 */

import { db } from '../src/lib/db'
import { writeFileSync } from 'fs'

async function exportData() {
  console.log('📦 Exportando datos de SQLite...\n')

  try {
    // Exportar usuarios
    const users = await db.user.findMany()
    console.log(`✅ Usuarios: ${users.length}`)

    // Exportar estudiantes
    const students = await db.student.findMany()
    console.log(`✅ Estudiantes: ${students.length}`)

    // Exportar ejercicios
    const exercises = await db.exercise.findMany()
    console.log(`✅ Ejercicios: ${exercises.length}`)

    // Exportar combinaciones de ejercicios
    const exerciseCombinations = await db.exerciseCombination.findMany()
    console.log(`✅ Combinaciones de ejercicios: ${exerciseCombinations.length}`)

    // Exportar rutinas
    const routines = await db.routine.findMany()
    console.log(`✅ Rutinas: ${routines.length}`)

    // Exportar días de entrenamiento
    const trainingDays = await db.trainingDay.findMany()
    console.log(`✅ Días de entrenamiento: ${trainingDays.length}`)

    // Exportar semanas de rutina
    const routineWeeks = await db.routineWeek.findMany()
    console.log(`✅ Semanas de rutina: ${routineWeeks.length}`)

    // Exportar ejercicios de rutina
    const routineExercises = await db.routineExercise.findMany()
    console.log(`✅ Ejercicios de rutina: ${routineExercises.length}`)

    // Exportar dietas
    const diets = await db.diet.findMany()
    console.log(`✅ Dietas: ${diets.length}`)

    // Exportar comidas
    const meals = await db.meal.findMany()
    console.log(`✅ Comidas: ${meals.length}`)

    // Exportar progreso
    const progress = await db.progress.findMany()
    console.log(`✅ Registros de progreso: ${progress.length}`)

    // Exportar configuración de pagos
    const paymentSettings = await db.paymentSettings.findMany()
    console.log(`✅ Configuración de pagos: ${paymentSettings.length}`)

    // Exportar pagos
    const payments = await db.payment.findMany()
    console.log(`✅ Pagos: ${payments.length}`)

    // Exportar notificaciones
    const notifications = await db.notification.findMany()
    console.log(`✅ Notificaciones: ${notifications.length}`)

    // Crear objeto de exportación
    const exportData = {
      exportDate: new Date().toISOString(),
      data: {
        users,
        students,
        exercises,
        exerciseCombinations,
        routines,
        trainingDays,
        routineWeeks,
        routineExercises,
        diets,
        meals,
        progress,
        paymentSettings,
        payments,
        notifications,
      }
    }

    // Guardar en archivo
    const filename = `data-export-${new Date().toISOString().split('T')[0]}.json`
    writeFileSync(filename, JSON.stringify(exportData, null, 2))

    console.log(`\n🎉 Exportación completada!`)
    console.log(`📄 Archivo creado: ${filename}`)
    console.log(`\n💡 Para importar en producción, usa: bun run scripts/import-data.ts ${filename}`)

  } catch (error) {
    console.error('❌ Error durante la exportación:', error)
    process.exit(1)
  }
}

exportData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
