# 🚀 Guía de Deploy: Supabase + GitHub + Vercel

## Resumen
Esta guía te llevará paso a paso para desplegar tu aplicación Fitness Coach en producción.

---

## 📋 Checklist Pre-Deploy

- [ ] Cuenta en [Supabase](https://supabase.com)
- [ ] Cuenta en [GitHub](https://github.com)
- [ ] Cuenta en [Vercel](https://vercel.com)

---

## Paso 1: Configurar Supabase (Base de datos)

### 1.1 Crear proyecto
1. Ve a [supabase.com](https://supabase.com) e inicia sesión
2. Click en **"New Project"**
3. Nombre del proyecto: `fitness-coach` (o el que prefieras)
4. Crea una contraseña segura para la base de datos **¡GUÁRDALA!**
5. Selecciona la región más cercana
6. Click en **"Create new project"**
7. Espera ~2 minutos mientras se crea

### 1.2 Obtener credenciales
1. Ve a **Project Settings** (icono de engranaje) > **Database**
2. En la sección **"Connection string"**:
   - Selecciona **"URI"** en el tab
   - Copia el string de conexión
   - Reemplaza `[YOUR-PASSWORD]` con tu contraseña

### 1.3 Configurar Connection Pooling
Necesitas DOS strings de conexión:

**DATABASE_URL (para la app - usa puerto 6543):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**DIRECT_DATABASE_URL (para migraciones - usa puerto 5432):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

> ⚠️ **Importante:** El puerto 6543 es para connection pooling (necesario en Vercel/serverless).

---

## Paso 2: Subir a GitHub

### 2.1 Crear repositorio
1. Ve a [github.com](https://github.com)
2. Click en **"New repository"**
3. Nombre: `fitness-coach-app`
4. **NO** inicialices con README (ya tenemos código)
5. Click en **"Create repository"**

### 2.2 Subir el código
Desde tu terminal en la carpeta del proyecto:

```bash
# Inicializar git (si no está)
git init

# Agregar todos los archivos
git add .

# Crear commit inicial
git commit -m "Initial commit - Fitness Coach App"

# Agregar remote (reemplaza TU-USUARIO)
git remote add origin https://github.com/TU-USUARIO/fitness-coach-app.git

# Subir a GitHub
git branch -M main
git push -u origin main
```

---

## Paso 3: Deploy en Vercel

### 3.1 Importar proyecto
1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Click en **"Add New..."** > **"Project"**
3. Importa tu repositorio de GitHub `fitness-coach-app`
4. Click en **"Import"**

### 3.2 Configurar variables de entorno
Antes de hacer deploy, configura las variables:

1. Expand **"Environment Variables"**
2. Agrega estas variables:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://postgres.[REF]:[PASS]@...pooler.supabase.com:6543/postgres` |
| `DIRECT_DATABASE_URL` | `postgresql://postgres.[REF]:[PASS]@...pooler.supabase.com:5432/postgres` |
| `NEXTAUTH_SECRET` | Ejecuta `openssl rand -base64 32` y usa el resultado |
| `NEXTAUTH_URL` | `https://tu-app.vercel.app` (tu URL de Vercel) |

> 💡 **Tip:** Puedes dejar NEXTAUTH_URL vacío inicialmente y actualizarlo después con tu URL real.

### 3.3 Deploy
1. Click en **"Deploy"**
2. Espera ~3-5 minutos
3. ¡Listo! Tu app está en producción

### 3.4 Post-deploy
1. Ve a tu proyecto en Vercel
2. Copia la URL de tu app (ej: `https://fitness-coach-app.vercel.app`)
3. Ve a **Settings** > **Environment Variables**
4. Actualiza `NEXTAUTH_URL` con tu URL real
5. Redeploy para aplicar los cambios

---

## Paso 4: Migración de datos existentes

Si tienes datos en SQLite que quieres migrar:

### 4.1 Exportar datos
```bash
# En tu entorno local
bun run db:export-data
```

### 4.2 Importar en producción
```bash
# Configura las variables de producción temporalmente
export DATABASE_URL="tu-url-de-produccion"

# Importa los datos
bun run db:import-data
```

---

## 🔧 Comandos útiles

```bash
# Generar cliente Prisma
bun run db:generate

# Crear migración
bun run db:migrate

# Aplicar migraciones en producción
bun run db:migrate:deploy

# Ver datos en Prisma Studio
bunx prisma studio
```

---

## ❗ Solución de problemas

### Error: "Can't reach database server"
- Verifica que DATABASE_URL y DIRECT_DATABASE_URL estén correctos
- Asegúrate de usar los puertos correctos (6543 para app, 5432 para migraciones)

### Error: "Authentication failed"
- Verifica la contraseña de la base de datos
- Regenera las credenciales en Supabase si es necesario

### Error: "JWT session error"
- Verifica NEXTAUTH_SECRET y NEXTAUTH_URL
- Asegúrate de que NEXTAUTH_URL no tenga slash al final

### La app no carga datos
- Verifica las variables de entorno en Vercel
- Revisa los logs en Vercel Dashboard > Deployments > Function Logs

---

## 📱 Soporte

- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Prisma](https://www.prisma.io/docs)
