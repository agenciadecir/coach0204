# Gym Coach App

Aplicación de gestión para entrenadores personales y sus alumnos.

## 🚀 Características

- Gestión de alumnos
- Creación de rutinas de entrenamiento
- Planificación de dietas
- Seguimiento de progreso (medidas corporales y fotos)
- Gestión de pagos
- Sistema de notificaciones

## 🛠️ Tecnologías

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Base de datos**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Autenticación**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui
- **Deploy**: Vercel

## 📋 Requisitos

- Node.js 18+ o Bun
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [GitHub](https://github.com)

---

## 🚀 DEPLOY EN VERCEL (Paso a Paso)

Ver instrucciones detalladas en [DEPLOYMENT.md](./DEPLOYMENT.md)

### Resumen rápido:

1. **Crear base de datos en Supabase**
   - Crea un proyecto en supabase.com
   - Copia los strings de conexión (pooling y direct)

2. **Subir a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TU-USUARIO/fitness-coach-app.git
   git push -u origin main
   ```

3. **Deploy en Vercel**
   - Importa el repositorio desde GitHub
   - Configura las variables de entorno:
     - `DATABASE_URL` (puerto 6543 - pooling)
     - `DIRECT_URL` (puerto 5432 - migraciones)
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL`
   - Click en Deploy

---

## 🔧 Variables de Entorno

### Desarrollo Local (`.env`)
```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="tu-secreto-seguro-minimo-32-caracteres"
NEXTAUTH_URL="http://localhost:3000"
```

### Producción (Vercel)
Las mismas variables, pero `NEXTAUTH_URL` debe ser tu URL de Vercel:
```env
NEXTAUTH_URL="https://tu-app.vercel.app"
```

---

## 🏃‍♂️ Desarrollo Local

```bash
# Instalar dependencias
bun install

# Configurar base de datos
bun run db:push

# Iniciar servidor de desarrollo
bun run dev
```

---

## 📦 Migración de datos

Si tienes datos en SQLite que quieres migrar:

```bash
# Exportar datos existentes
bun run db:export

# Importar en producción (configura DATABASE_URL de producción primero)
bun run db:import data-export-YYYY-MM-DD.json
```

---

## ❗ Solución de Problemas

### Error: "No se pueden ver los alumnos/rutinas"
- Verifica que `NEXTAUTH_SECRET` esté configurado
- Limpia las cookies del navegador
- Intenta cerrar sesión y volver a entrar

### Error: "Database connection failed"
- Verifica que `DATABASE_URL` y `DIRECT_URL` sean correctos
- Asegúrate de usar los puertos correctos:
  - 6543 para DATABASE_URL (pooling)
  - 5432 para DIRECT_URL (migraciones)

### Error en Vercel: "Build failed"
- Revisa los logs de build en Vercel
- Verifica que todas las variables de entorno estén configuradas

---

## 📝 Licencia

MIT
