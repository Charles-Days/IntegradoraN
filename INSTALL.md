# Guía de Instalación

## Requisitos Previos

- Node.js 18+ 
- npm o yarn

## Pasos de Instalación

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Copia el archivo de ejemplo y edítalo:

```bash
cp .env.example .env
```

Edita `.env` y configura:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="genera-una-clave-secreta-aqui"
NODE_ENV="development"
```

**Importante**: Genera una clave secreta segura para `NEXTAUTH_SECRET`. Puedes usar:

```bash
openssl rand -base64 32
```

### 3. Inicializar Base de Datos

```bash
# Generar cliente Prisma
npx prisma generate

# Crear base de datos y aplicar schema
npx prisma db push

# Poblar con datos iniciales
npm run db:seed
```

El seed creará:
- 1 usuario de recepción: `reception@hotel.com` / `password123`
- 2 camareras: `camarera1@hotel.com` / `password123` y `camarera2@hotel.com` / `password123`
- 30 habitaciones (pisos 1-3, habitaciones 101-110, 201-210, 301-310)

### 4. Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Estructura de Usuarios Iniciales

### Recepción
- **Email**: `reception@hotel.com`
- **Password**: `password123`
- **Rol**: Recepción

### Camareras
- **Email**: `camarera1@hotel.com`
- **Password**: `password123`
- **Rol**: Camarera

- **Email**: `camarera2@hotel.com`
- **Password**: `password123`
- **Rol**: Camarera

## Comandos Útiles

### Base de Datos

```bash
# Ver datos en Prisma Studio
npm run db:studio

# Crear migración
npm run db:migrate

# Resetear base de datos (CUIDADO: borra todos los datos)
npx prisma migrate reset
```

### Desarrollo

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Ejecutar producción
npm start
```

## Solución de Problemas

### Error: "Prisma Client not generated"
```bash
npx prisma generate
```

### Error: "Database not found"
```bash
npx prisma db push
```

### Error: "NEXTAUTH_SECRET not set"
Asegúrate de tener un archivo `.env` con `NEXTAUTH_SECRET` configurado.

### Error al subir fotos
Asegúrate de que el directorio `public/uploads/incidents` existe:
```bash
mkdir -p public/uploads/incidents
```

## Producción

Para producción:

1. Cambia `DATABASE_URL` a PostgreSQL:
```env
DATABASE_URL="postgresql://user:password@host:5432/database"
```

2. Ejecuta migraciones:
```bash
npx prisma migrate deploy
```

3. Build:
```bash
npm run build
npm start
```

4. Considera usar almacenamiento en cloud (S3, Cloudinary) para las fotos de incidencias en lugar del sistema de archivos local.

