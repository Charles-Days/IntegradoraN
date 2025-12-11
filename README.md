# Hotel Housekeeping Management PWA

Sistema PWA para gestión de limpieza diaria de habitaciones de hotel con soporte offline.

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo .env
cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="cambia-esta-clave-por-una-segura"
NODE_ENV="development"
EOF

# 2.1. Generar clave secreta segura (opcional pero recomendado)
# Ejecuta: openssl rand -base64 32
# Y reemplaza "cambia-esta-clave-por-una-segura" con el resultado

# 3. Inicializar base de datos
npx prisma generate
npx prisma db push
npm run db:seed

# 4. Ejecutar aplicación
npm run dev
```

Luego accede a **http://localhost:3000** y usa:
- **Administrador**: `admin@hotel.com` / `password123`
- **Recepción**: `reception@hotel.com` / `password123`
- **Camarera**: `camarera1@hotel.com` / `password123`

## Características

- **Dos roles**: Recepción y Camarera
- **Gestión de habitaciones**: Estados, ocupación, asignaciones
- **Registro de limpieza**: Marcado de habitaciones como limpias
- **Gestión de incidencias**: Reporte con fotos (hasta 3), historial
- **Modo offline**: Funciona sin conexión, sincroniza automáticamente
- **PWA**: Instalable en dispositivos móviles

## Stack Tecnológico

- **Next.js 14** (App Router)
- **Prisma** + SQLite (desarrollo) / PostgreSQL (producción)
- **NextAuth.js** (autenticación)
- **React Query** (gestión de estado y sincronización)
- **Dexie.js** (IndexedDB para offline)
- **Tailwind CSS** (estilos)
- **TypeScript**

## Instalación

### Paso 1: Instalar Dependencias

```bash
npm install
```

**Nota**: Durante la instalación, Prisma intentará generar el cliente. Si ves errores sobre enums, no te preocupes, los solucionaremos en los siguientes pasos.

### Paso 2: Crear Archivo de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```bash
# Crear el archivo .env
cat > .env << 'EOF'
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="cambia-esta-clave-por-una-segura"

# Node Environment
NODE_ENV="development"
EOF
```

**Importante**: Para generar una clave secreta segura para `NEXTAUTH_SECRET`, ejecuta:

```bash
openssl rand -base64 32
```

Y reemplaza `"cambia-esta-clave-por-una-segura"` con el resultado.

### Paso 3: Inicializar Base de Datos

```bash
# Generar cliente Prisma (esto puede mostrar warnings, es normal)
npx prisma generate

# Crear base de datos y aplicar schema
npx prisma db push

# Poblar con datos iniciales (usuarios y habitaciones de prueba)
npm run db:seed
```

El seed creará:
- 1 usuario administrador: `admin@hotel.com` / `password123`
- 1 usuario de recepción: `reception@hotel.com` / `password123`
- 2 camareras: `camarera1@hotel.com` / `password123` y `camarera2@hotel.com` / `password123`
- 30 habitaciones (pisos 1-3, habitaciones 101-110, 201-210, 301-310)

### Paso 4: Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en **http://localhost:3000**

## Solución de Problemas Comunes

### Error: "Environment variable not found: DATABASE_URL"

**Causa**: Falta el archivo `.env` o no tiene la variable `DATABASE_URL`.

**Solución**: 
1. Crea el archivo `.env` en la raíz del proyecto (ver Paso 2 arriba)
2. Asegúrate de que contiene `DATABASE_URL="file:./dev.db"`

### Error: "You defined the enum X. But the current connector does not support enums"

**Causa**: SQLite no soporta enums nativos en Prisma. Este error ya está solucionado en el proyecto.

**Solución**: El proyecto ya está configurado para usar `String` en lugar de enums. Los enums están definidos en `lib/enums.ts` para mantener la tipificación en TypeScript.

Si ves este error:
1. Verifica que el schema de Prisma use `String` en lugar de enums
2. Ejecuta `npx prisma generate` nuevamente

### Error: "Prisma Client not generated"

**Solución**:
```bash
npx prisma generate
```

### Error: "Database not found" o "SQLite database dev.db not found"

**Solución**:
```bash
npx prisma db push
```

Esto creará la base de datos `dev.db` en la raíz del proyecto.

### Error al ejecutar `npm run db:seed`

**Causa**: La base de datos no existe o el schema no está aplicado.

**Solución**:
```bash
# Primero asegúrate de que la base de datos existe
npx prisma db push

# Luego ejecuta el seed
npm run db:seed
```

### Error: "NEXTAUTH_SECRET not set"

**Solución**: Asegúrate de que el archivo `.env` existe y contiene `NEXTAUTH_SECRET` con un valor válido.

### Error al subir fotos de incidencias

**Causa**: Falta el directorio para almacenar las fotos.

**Solución**:
```bash
mkdir -p public/uploads/incidents
```

### Error de compilación TypeScript

Si ves errores de tipos relacionados con enums:

1. Verifica que `lib/enums.ts` existe
2. Asegúrate de que todos los archivos importan desde `@/lib/enums` en lugar de `@prisma/client`
3. Ejecuta `npm run build` para ver todos los errores de tipo

### El servidor no inicia

**Verifica**:
1. ¿Existe el archivo `.env`? → Crear si falta
2. ¿La base de datos existe? → Ejecutar `npx prisma db push`
3. ¿Las dependencias están instaladas? → Ejecutar `npm install`
4. ¿Hay errores de compilación? → Revisar la salida de `npm run build`

## Estructura del Proyecto

```
├── app/
│   ├── api/              # API Routes
│   │   ├── assignments/  # Asignaciones de habitaciones
│   │   ├── auth/         # Autenticación NextAuth
│   │   ├── cleanings/    # Registro de limpiezas
│   │   ├── incidents/    # Gestión de incidencias
│   │   ├── rooms/        # Gestión de habitaciones
│   │   ├── rooms/[id]/   # Eliminar habitación (solo admin)
│   │   ├── sync/         # Sincronización offline
│   │   ├── users/        # Listado de usuarios
│   │   ├── users/create/ # Crear usuarios (solo admin)
│   │   └── users/[id]/   # Editar/Eliminar usuarios (solo admin)
│   ├── admin/            # Dashboard de administración
│   ├── auth/             # Páginas de autenticación
│   ├── reception/        # Dashboard de recepción
│   ├── housekeeper/      # Dashboard de camarera
│   └── layout.tsx        # Layout principal
├── components/           # Componentes reutilizables
│   └── RoomCard.tsx      # Tarjeta de habitación
├── lib/                  # Utilidades y configuración
│   ├── auth.ts           # Configuración NextAuth
│   ├── db.ts             # Configuración IndexedDB (Dexie)
│   ├── enums.ts          # Constantes de enums (UserRole, RoomStatus, etc.)
│   └── prisma.ts         # Cliente Prisma
├── prisma/               # Schema de Prisma
│   ├── schema.prisma     # Schema de base de datos
│   └── seed.ts           # Script de datos iniciales
└── public/               # Archivos estáticos y PWA
    ├── uploads/          # Fotos de incidencias
    └── manifest.json     # Manifest PWA
```

### Nota sobre Enums y SQLite

Debido a que SQLite no soporta enums nativos, el proyecto usa una arquitectura híbrida:

- **En Prisma Schema**: Los campos se definen como `String` con valores por defecto
- **En TypeScript**: Se usan constantes tipadas en `lib/enums.ts` para mantener la seguridad de tipos
- **En el código**: Se importan desde `@/lib/enums` en lugar de `@prisma/client`

Ejemplo:
```typescript
// lib/enums.ts
export const UserRole = {
  ADMIN: 'ADMIN',
  RECEPTION: 'RECEPTION',
  HOUSEKEEPER: 'HOUSEKEEPER',
} as const;

// Uso en el código
import { UserRole } from '@/lib/enums';
if (session.user.role === UserRole.RECEPTION) { ... }
```

Esto permite:
- ✅ Compatibilidad con SQLite
- ✅ Seguridad de tipos en TypeScript
- ✅ Fácil migración a PostgreSQL en producción (solo cambiar el schema)

## Funcionalidades por Rol

### Administrador

- **Gestión completa de usuarios**: 
  - Crear nuevos usuarios con roles de Recepción o Camarera
  - Editar usuarios existentes (nombre, email, rol, contraseña)
  - Eliminar usuarios (excepto su propio usuario)
  - Ver lista completa de usuarios del sistema
- **Gestión completa de habitaciones**: 
  - Crear nuevas habitaciones para el hotel
  - Editar habitaciones existentes (número, piso)
  - Eliminar habitaciones
  - Ver todas las habitaciones del sistema
- **Acceso completo**: Puede acceder a todas las funcionalidades de Recepción y Camarera
- **Panel de administración**: Interfaz dedicada en `/admin` con tablas interactivas y modales de edición

### Recepción

- Ver todas las habitaciones con su estado
- Marcar habitaciones como ocupadas/desocupadas
- Asignar habitaciones a camareras
- Ver y resolver incidencias
- Rehabilitar habitaciones después de incidencias

### Camarera

- Ver solo habitaciones asignadas
- Marcar habitaciones como limpias
- Reportar incidencias con fotos (hasta 3)
- Funciona offline, sincroniza automáticamente

## Desarrollo

### Scripts Disponibles

- `npm run dev`: Servidor de desarrollo
- `npm run build`: Build de producción
- `npm run start`: Servidor de producción
- `npm run db:generate`: Generar cliente Prisma (alias: `npx prisma generate`)
- `npm run db:push`: Sincronizar schema con DB (alias: `npx prisma db push`)
- `npm run db:seed`: Poblar base de datos con datos iniciales
- `npm run db:studio`: Abrir Prisma Studio (interfaz visual para la base de datos)

### Base de Datos

El proyecto usa Prisma como ORM con SQLite para desarrollo.

**Importante sobre SQLite y Enums:**
- SQLite no soporta enums nativos
- Los enums se definen como `String` en el schema
- Las constantes tipadas están en `lib/enums.ts` para TypeScript
- Esto permite mantener la seguridad de tipos sin problemas de compatibilidad

**Para modificar el schema:**

1. Editar `prisma/schema.prisma`
2. Ejecutar `npx prisma db push` (desarrollo) o crear migración para producción
3. Ejecutar `npx prisma generate` para regenerar el cliente

**Ver datos en la base de datos:**
```bash
npm run db:studio
```

Esto abrirá una interfaz web donde puedes ver y editar los datos.

## PWA

La aplicación está configurada como PWA con:

- Service Worker para caché offline
- Manifest.json para instalación
- Íconos en `/public/icon-*.png` (crear si no existen)

## Producción

1. Cambiar `DATABASE_URL` a PostgreSQL
2. Configurar `NEXTAUTH_SECRET` seguro
3. Configurar `NEXTAUTH_URL` con dominio real
4. Build: `npm run build`
5. Start: `npm run start`

## Notas Importantes

### Base de Datos

- **Desarrollo**: Usa SQLite (`file:./dev.db`) - la base de datos se crea automáticamente
- **Producción**: Se recomienda PostgreSQL
- **Enums**: SQLite no soporta enums, por lo que se usan `String` con constantes en `lib/enums.ts`

### Archivos de Configuración

- **`.env`**: Debe crearse manualmente (no está en el repositorio por seguridad)
- **`dev.db`**: Base de datos SQLite (se crea automáticamente con `npx prisma db push`)
- **`public/uploads/incidents/`**: Directorio para fotos de incidencias (se crea automáticamente)

### Almacenamiento de Fotos

- Las fotos de incidencias se guardan en `/public/uploads/incidents/`
- En producción, considera usar almacenamiento en cloud (S3, Cloudinary, etc.)
- El directorio se crea automáticamente, pero si hay errores, créalo manualmente: `mkdir -p public/uploads/incidents`

### Credenciales de Prueba

Después de ejecutar `npm run db:seed`, puedes usar:

**Administrador:**
- Email: `admin@hotel.com`
- Password: `password123`
- **Funcionalidades**: Crear usuarios, acceso completo al sistema

**Recepción:**
- Email: `reception@hotel.com`
- Password: `password123`
- **Funcionalidades**: Gestión de habitaciones, asignaciones e incidencias

**Camareras:**
- Email: `camarera1@hotel.com` o `camarera2@hotel.com`
- Password: `password123`
- **Funcionalidades**: Ver habitaciones asignadas, marcar como limpias, reportar incidencias

**⚠️ IMPORTANTE**: Cambia estas contraseñas en producción.


