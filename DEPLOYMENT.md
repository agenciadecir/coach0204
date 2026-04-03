# Guía de Deployment - Gym Coach App

Esta guía te llevará paso a paso para deployar la aplicación en **Supabase** (base de datos PostgreSQL) y **Vercel** (hosting).

---

## Resumen de lo que necesitarás

1. Cuenta en [Supabase](https://supabase.com) (gratis)
2. Cuenta en [Vercel](https://vercel.com) (gratis)
3. Repositorio en GitHub con el código

---

## PARTE 1: Configuración de Supabase

### Paso 1.1: Crear cuenta y proyecto

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Haz clic en **"New Project"**
3. Completa los datos:
   - **Name**: `gym-coach` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura y **GUÁRDALA**
   - **Region**: Elige la más cercana a tus usuarios (ej: South America - São Paulo)
4. Haz clic en **"Create new project"**
5. Espera unos minutos mientras se crea el proyecto

### Paso 1.2: Obtener las credenciales de conexión

1. En tu proyecto de Supabase, ve a **Settings** (icono de engranaje) → **Database**
2. Busca la sección **"Connection string"** → selecciona **"URI"**
3. Copia la URI de conexión, tendrá este formato:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
4. **IMPORTANTE**: Cambia `[PASSWORD]` por tu contraseña real

### Paso 1.3: Obtener credenciales de API (opcional, para features adicionales)

1. Ve a **Settings** → **API**
2. Copia:
   - **Project URL**: `https://[PROJECT-REF].supabase.co`
   - **anon public key**: La clave pública

---

## PARTE 2: Preparar el Repositorio en GitHub

### Paso 2.1: Crear repositorio

1. Ve a [GitHub](https://github.com) y crea un nuevo repositorio
   - **Name**: `gym-coach-app`
   - **Visibility**: Private (recomendado) o Public
   - **NO** inicialices con README, .gitignore o license

### Paso 2.2: Subir el código

En tu terminal local:

```bash
# Inicializa git si no está inicializado
git init

# Agrega todos los archivos
git add .

# Crea commit inicial
git commit -m "Initial commit - Gym Coach App"

# Agrega el remote de tu repositorio
git remote add origin https://github.com/TU-USUARIO/gym-coach-app.git

# Sube el código
git push -u origin master
```

---

## PARTE 3: Configuración de Vercel

### Paso 3.1: Crear cuenta y conectar repositorio

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta
2. Puedes usar tu cuenta de GitHub para facilitar la conexión
3. Haz clic en **"Add New..."** → **"Project"**
4. En **"Import Git Repository"**, selecciona tu repositorio `gym-coach-app`

### Paso 3.2: Configurar el proyecto

En la pantalla de configuración:

1. **Framework Preset**: Next.js (se detecta automáticamente)
2. **Root Directory**: `./` (dejar por defecto)
3. **Build Command**: `bun run build` (o dejar por defecto si usa npm)
4. **Output Directory**: `.next` (se detecta automáticamente)

### Paso 3.3: Configurar variables de entorno

**MUY IMPORTANTE**: Antes de hacer deploy, configura las variables de entorno.

Haz clic en **"Environment Variables"** y agrega las siguientes:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres` | Conexión a Supabase (con `?pgbouncer=true` al final) |
| `DIRECT_URL` | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres` | Conexión directa para migraciones |
| `NEXTAUTH_SECRET` | (generar con comando abajo) | Secreto para JWT |
| `NEXTAUTH_URL` | `https://tu-app.vercel.app` | URL de producción |

**Para generar NEXTAUTH_SECRET:**
```bash
# En tu terminal local, ejecuta:
openssl rand -base64 32
```
O usa este generado: `gym-coach-nextauth-secret-2024-production-secure-key`

### Paso 3.4: Deploy

1. Haz clic en **"Deploy"**
2. Espera a que termine el build (puede tomar 2-5 minutos)
3. Si hay errores, revisa los logs y consulta la sección de troubleshooting

---

## PARTE 4: Ejecutar Migraciones en Supabase

### Paso 4.1: Migraciones automáticas (Recomendado)

El proyecto está configurado para ejecutar migraciones automáticamente durante el build de Vercel gracias al script `postinstall` en `package.json`.

### Paso 4.2: Migraciones manuales (Alternativa)

Si necesitas ejecutar migraciones manualmente:

1. Instala la CLI de Vercel:
   ```bash
   npm i -g vercel
   ```

2. Enlaza tu proyecto local:
   ```bash
   vercel link
   ```

3. Descarga las variables de entorno:
   ```bash
   vercel env pull .env.local
   ```

4. Ejecuta las migraciones:
   ```bash
   npx prisma migrate deploy
   ```

### Paso 4.3: Crear el primer usuario (Coach)

1. Usa el **SQL Editor** de Supabase, o
2. Accede a la app y usa el flujo de registro del primer usuario

---

## PARTE 5: Verificación Post-Deploy

### Paso 5.1: Verificar funcionamiento

1. Ve a tu URL de Vercel: `https://tu-app.vercel.app`
2. Verifica que cargue la página de login
3. Registra el primer usuario (Coach)
4. Prueba las funcionalidades principales

### Paso 5.2: Configurar dominio personalizado (Opcional)

1. En Vercel, ve a **Settings** → **Domains**
2. Agrega tu dominio personalizado
3. Actualiza `NEXTAUTH_URL` con el nuevo dominio

---

## Troubleshooting

### Error: "Can't reach database server"

**Causa**: URL de conexión incorrecta o bloqueada

**Solución**:
1. Verifica que la URL tenga el formato correcto
2. Asegúrate de usar el puerto `6543` con `?pgbouncer=true` para pooler
3. Verifica que la IP de Vercel no esté bloqueada en Supabase

### Error: "Prisma Client could not be generated"

**Causa**: Incompatibilidad de versiones o schema inválido

**Solución**:
1. Verifica que el schema de Prisma sea válido
2. Asegúrate de usar `postgresql` como provider

### Error: "NEXTAUTH_SECRET is required"

**Causa**: Variable de entorno faltante

**Solución**:
1. Agrega `NEXTAUTH_SECRET` en las variables de entorno de Vercel
2. Re-deploya el proyecto

### Error: "JWT session error"

**Causa**: `NEXTAUTH_URL` incorrecto

**Solución**:
1. Verifica que `NEXTAUTH_URL` coincida exactamente con tu URL de Vercel
2. Incluye `https://` en la URL

### Error en migraciones

**Causa**: Base de datos ya tiene datos o tablas

**Solución**:
1. En Supabase, ve a Table Editor
2. Elimina todas las tablas existentes
3. Re-deploya o ejecuta migraciones nuevamente

---

## Archivos de Configuración Importantes

### `.env.example` (no subir a Git)

```env
# Database - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# NextAuth
NEXTAUTH_SECRET="tu-secreto-generado-aqui"
NEXTAUTH_URL="https://tu-app.vercel.app"
```

### Variables de Entorno en Vercel

```
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres
NEXTAUTH_SECRET=tu-secreto-generado-aqui
NEXTAUTH_URL=https://tu-app.vercel.app
```

---

## Checklist Final

- [ ] Cuenta de Supabase creada
- [ ] Proyecto de Supabase creado
- [ ] URLs de conexión obtenidas
- [ ] Repositorio de GitHub creado con el código
- [ ] Cuenta de Vercel creada
- [ ] Proyecto importado en Vercel
- [ ] Variables de entorno configuradas
- [ ] Deploy realizado exitosamente
- [ ] Primer usuario (Coach) creado
- [ ] Funcionalidades probadas

---

## Soporte

Si tienes problemas, revisa:
1. Los logs de build en Vercel
2. Los logs de runtime en Vercel (Functions → Logs)
3. Los logs de Supabase (Logs → Postgres)
4. La documentación de [Prisma con Supabase](https://www.prisma.io/docs/guides/database/supabase)

---

**¡Buena suerte con tu deployment!**
