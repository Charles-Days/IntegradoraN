# División de Trabajo - Sistema Hotel Housekeeping

## 👥 Equipo (5 personas)

1. **Benjamin** - Autenticación y Gestión de Usuarios
2. **Alejandro** - Gestión de Habitaciones y Estados
3. **Antonio** - Asignaciones y Registro de Limpiezas
4. **Irving** - Sistema de Incidencias y Fotos
5. **Abril** - PWA y Funcionalidad Offline

---

## 📋 Módulo 1: Autenticación y Gestión de Usuarios
**Responsable: Benjamin**

### Archivos a Estudiar:
- `lib/auth.ts` - Configuración NextAuth
- `app/api/auth/[...nextauth]/route.ts` - Endpoint de autenticación
- `app/api/users/route.ts` - Listar usuarios
- `app/api/users/create/route.ts` - Crear usuarios
- `app/api/users/[id]/route.ts` - Editar/Eliminar usuarios
- `app/admin/page.tsx` - Panel de administración (gestión de usuarios)
- `app/auth/signin/page.tsx` - Página de login
- `types/next-auth.d.ts` - Tipos de TypeScript para NextAuth

### Conceptos Clave:
- **NextAuth.js**: Sistema de autenticación
- **JWT (JSON Web Tokens)**: Tokens de sesión
- **bcrypt**: Hash de contraseñas
- **Roles y Permisos**: ADMIN, RECEPTION, HOUSEKEEPER
- **Middleware de Seguridad**: Validación de roles en API routes

### Código Principal:

#### 1. Configuración de Autenticación (`lib/auth.ts`)
```typescript
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import { UserRole } from '@/lib/enums';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // 1. Buscar usuario por email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // 2. Verificar contraseña con bcrypt
        const isValid = await bcrypt.compare(
          credentials.password, 
          user.password || ''
        );

        // 3. Retornar datos del usuario si es válido
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      // Agregar role al token
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Agregar role a la sesión
      if (session.user) {
        session.user.role = token.role as UserRole;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
```

#### 2. Crear Usuario (Admin) (`app/api/users/create/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  // 1. Verificar que el usuario es ADMIN
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Hashear contraseña con bcrypt
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Crear usuario en la base de datos
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role as string,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
```

#### 3. Editar Usuario (`app/api/users/[id]/route.ts`)
```typescript
export async function PATCH(request, { params }) {
  const updateData: any = {};
  
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (role) updateData.role = role;
  
  // Solo actualizar contraseña si se proporciona
  if (password && password.length >= 6) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(user);
}
```

### Preguntas para Explicar:
1. ¿Cómo funciona NextAuth con Credentials Provider?
2. ¿Por qué usamos bcrypt para las contraseñas?
3. ¿Cómo se validan los roles en las API routes?
4. ¿Qué es JWT y cómo se usa en las sesiones?
5. ¿Cómo funciona el flujo de login completo?

---

## 📋 Módulo 2: Gestión de Habitaciones y Estados
**Responsable: Alejandro**

### Archivos a Estudiar:
- `prisma/schema.prisma` - Modelo Room
- `app/api/rooms/route.ts` - CRUD de habitaciones
- `app/api/rooms/[id]/route.ts` - Eliminar habitación
- `app/admin/page.tsx` - Gestión de habitaciones (admin)
- `app/reception/page.tsx` - Gestión de estados (recepción)
- `components/RoomCard.tsx` - Componente visual de habitación
- `lib/enums.ts` - RoomStatus enum

### Conceptos Clave:
- **Estados de Habitación**: OCCUPIED, VACANT, CLEANING_PENDING, CLEAN, DISABLED
- **CRUD Operations**: Create, Read, Update, Delete
- **Prisma ORM**: Operaciones de base de datos
- **Validación de Permisos**: Solo admin puede crear/editar/eliminar

### Código Principal:

#### 1. Modelo de Habitación (`prisma/schema.prisma`)
```prisma
model Room {
  id          String   @id @default(cuid())
  number      String   @unique
  floor       Int?
  status      String    @default("VACANT")
  isOccupied  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  assignments Assignment[]
  cleanings   Cleaning[]
  incidents   Incident[]
}
```

#### 2. Crear Habitación (`app/api/rooms/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  // 1. Verificar permisos (ADMIN o RECEPTION)
  if (session.user.role !== UserRole.RECEPTION && 
      session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Extraer datos del body
  const { number, floor, status, isOccupied } = body;

  // 3. Crear habitación en la base de datos
  const room = await prisma.room.create({
    data: {
      number,
      floor,
      status: status || RoomStatus.VACANT,
      isOccupied: isOccupied || false,
    },
  });

  return NextResponse.json(room, { status: 201 });
}
```

#### 3. Actualizar Estado de Habitación
```typescript
export async function PATCH(request: NextRequest) {
  const { id, status, isOccupied, number, floor } = body;

  const updateData: any = {};
  if (status) updateData.status = status;
  if (isOccupied !== undefined) updateData.isOccupied = isOccupied;
  if (number) updateData.number = number;
  if (floor !== undefined) updateData.floor = floor;

  const room = await prisma.room.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(room);
}
```

#### 4. Eliminar Habitación (`app/api/rooms/[id]/route.ts`)
```typescript
export async function DELETE(request, { params }) {
  // Solo ADMIN puede eliminar
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.room.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
```

### Preguntas para Explicar:
1. ¿Cuáles son los diferentes estados de una habitación?
2. ¿Cómo funciona Prisma para hacer operaciones CRUD?
3. ¿Qué validaciones se hacen al crear/editar una habitación?
4. ¿Cómo se relacionan las habitaciones con asignaciones, limpiezas e incidencias?
5. ¿Qué pasa cuando se elimina una habitación? (cascada)

---

## 📋 Módulo 3: Asignaciones y Registro de Limpiezas
**Responsable: Antonio**

### Archivos a Estudiar:
- `prisma/schema.prisma` - Modelos Assignment y Cleaning
- `app/api/assignments/route.ts` - CRUD de asignaciones
- `app/api/cleanings/route.ts` - Registro de limpiezas
- `app/reception/page.tsx` - Asignar habitaciones a camareras
- `app/housekeeper/page.tsx` - Marcar habitaciones como limpias

### Conceptos Clave:
- **Asignaciones Diarias**: Una habitación puede asignarse a una camarera por fecha
- **Registro de Limpieza**: Timestamp y usuario que limpió
- **Relaciones Prisma**: Room → Assignment → User
- **Actualización de Estados**: Al limpiar, cambia el estado de la habitación

### Código Principal:

#### 1. Modelos de Base de Datos
```prisma
model Assignment {
  id          String   @id @default(cuid())
  roomId      String
  userId      String
  assignedAt  DateTime @default(now())
  date        DateTime @default(now())
  completed   Boolean  @default(false)

  room        Room     @relation(...)
  user        User     @relation(...)

  @@unique([roomId, userId, date])  // Una habitación solo puede asignarse una vez por día
}

model Cleaning {
  id          String   @id @default(cuid())
  roomId      String
  userId      String
  cleanedAt   DateTime @default(now())
  date        DateTime @default(now())

  room        Room     @relation(...)
  user        User     @relation(...)
}
```

#### 2. Asignar Habitaciones (`app/api/assignments/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  const { roomIds, userId, date } = body;

  // Crear múltiples asignaciones en una transacción
  const assignments = await prisma.$transaction(
    roomIds.map((roomId: string) =>
      prisma.assignment.upsert({
        where: {
          roomId_userId_date: {
            roomId,
            userId,
            date: new Date(date),
          },
        },
        update: {},
        create: {
          roomId,
          userId,
          date: new Date(date),
        },
      })
    )
  );

  return NextResponse.json(assignments, { status: 201 });
}
```

#### 3. Registrar Limpieza (`app/api/cleanings/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  const { roomId, date } = body;

  // 1. Crear registro de limpieza
  const cleaning = await prisma.cleaning.create({
    data: {
      roomId,
      userId: session.user.id,
      date: cleaningDate,
      cleanedAt: new Date(),
    },
  });

  // 2. Actualizar estado de la habitación
  await prisma.room.update({
    where: { id: roomId },
    data: {
      status: RoomStatus.CLEAN,
    },
  });

  // 3. Marcar asignación como completada
  await prisma.assignment.updateMany({
    where: {
      roomId,
      userId: session.user.id,
      date: cleaningDate,
    },
    data: {
      completed: true,
    },
  });

  return NextResponse.json(cleaning, { status: 201 });
}
```

#### 4. Ver Asignaciones de una Camarera
```typescript
export async function GET(request: NextRequest) {
  if (session.user.role === UserRole.HOUSEKEEPER) {
    const assignments = await prisma.assignment.findMany({
      where: {
        userId: session.user.id,
        date: new Date(date),
      },
      include: {
        room: {
          include: {
            cleanings: {
              where: {
                date: new Date(date),
                userId: session.user.id,
              },
            },
          },
        },
      },
    });
  }
}
```

### Preguntas para Explicar:
1. ¿Cómo funciona el sistema de asignaciones diarias?
2. ¿Qué es una transacción en Prisma y por qué se usa?
3. ¿Qué pasa cuando una camarera marca una habitación como limpia?
4. ¿Cómo se relacionan Assignment, Cleaning y Room?
5. ¿Por qué usamos `upsert` en lugar de `create` para asignaciones?

---

## 📋 Módulo 4: Sistema de Incidencias y Fotos
**Responsable: Irving**

### Archivos a Estudiar:
- `prisma/schema.prisma` - Modelos Incident e IncidentPhoto
- `app/api/incidents/route.ts` - CRUD de incidencias
- `app/housekeeper/page.tsx` - Crear incidencia con fotos
- `app/reception/page.tsx` - Ver y resolver incidencias
- `app/reception/rooms/[id]/page.tsx` - Historial de incidencias

### Conceptos Clave:
- **Subida de Archivos**: FormData y File API
- **Almacenamiento de Fotos**: Sistema de archivos local
- **Estados de Incidencia**: OPEN, RESOLVED
- **Relación 1 a Muchos**: Una incidencia puede tener múltiples fotos
- **Efecto en Habitación**: Al crear incidencia, la habitación se deshabilita

### Código Principal:

#### 1. Modelos de Incidencias
```prisma
model Incident {
  id          String        @id @default(cuid())
  roomId      String
  userId      String
  description String
  status      String        @default("OPEN")
  createdAt   DateTime      @default(now())
  resolvedAt  DateTime?
  resolvedBy  String?

  room        Room          @relation(...)
  user        User          @relation(...)
  photos      IncidentPhoto[]
}

model IncidentPhoto {
  id         String   @id @default(cuid())
  incidentId String
  url        String
  createdAt  DateTime @default(now())

  incident   Incident @relation(...)
}
```

#### 2. Crear Incidencia con Fotos (`app/api/incidents/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  // 1. Obtener FormData (no JSON porque hay archivos)
  const formData = await request.formData();
  const roomId = formData.get('roomId') as string;
  const description = formData.get('description') as string;
  const photos = formData.getAll('photos') as File[];

  // 2. Validar máximo 3 fotos
  if (photos.length > 3) {
    return NextResponse.json({ error: 'Maximum 3 photos allowed' }, { status: 400 });
  }

  // 3. Crear incidencia
  const incident = await prisma.incident.create({
    data: {
      roomId,
      userId: session.user.id,
      description,
      status: IncidentStatus.OPEN,
    },
  });

  // 4. Guardar cada foto en el servidor
  for (const photo of photos) {
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${incident.id}-${Date.now()}-${photo.name}`;
    const path = join(process.cwd(), 'public', 'uploads', 'incidents', filename);

    await writeFile(path, buffer);

    // 5. Guardar URL en la base de datos
    await prisma.incidentPhoto.create({
      data: {
        incidentId: incident.id,
        url: `/uploads/incidents/${filename}`,
      },
    });
  }

  // 6. Deshabilitar la habitación
  await prisma.room.update({
    where: { id: roomId },
    data: {
      status: RoomStatus.DISABLED,
    },
  });

  return NextResponse.json(incident, { status: 201 });
}
```

#### 3. Resolver Incidencia (Recepción)
```typescript
export async function PATCH(request: NextRequest) {
  const { id, status, roomId } = body;

  const updateData: any = {
    status,
    resolvedAt: status === IncidentStatus.RESOLVED ? new Date() : null,
    resolvedBy: status === IncidentStatus.RESOLVED ? session.user.id : null,
  };

  const incident = await prisma.incident.update({
    where: { id },
    data: updateData,
  });

  // Rehabilitar habitación cuando se resuelve
  if (status === IncidentStatus.RESOLVED && roomId) {
    await prisma.room.update({
      where: { id: roomId },
      data: {
        status: RoomStatus.CLEAN,
      },
    });
  }

  return NextResponse.json(incident);
}
```

#### 4. Capturar Fotos desde el Frontend
```typescript
const handlePhotoCapture = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';  // Usar cámara trasera
  input.multiple = true;
  
  input.onchange = (e) => {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    if (photos.length + files.length > 3) {
      alert('Máximo 3 fotos permitidas');
      return;
    }
    setPhotos([...photos, ...files]);
  };
  
  input.click();
};
```

### Preguntas para Explicar:
1. ¿Cómo se manejan archivos en Next.js API routes?
2. ¿Por qué usamos FormData en lugar de JSON?
3. ¿Qué es Buffer y cómo se usa para guardar archivos?
4. ¿Cómo funciona la relación entre Incident e IncidentPhoto?
5. ¿Qué pasa con la habitación cuando se crea/resuelve una incidencia?

---

## 📋 Módulo 5: PWA y Funcionalidad Offline
**Responsable: Abril**

### Archivos a Estudiar:
- `next.config.js` - Configuración next-pwa
- `public/manifest.json` - Manifest de PWA
- `app/layout.tsx` - Metadata PWA
- `lib/db.ts` - Configuración IndexedDB (Dexie)
- `app/housekeeper/page.tsx` - Lógica offline y sincronización
- `app/api/sync/route.ts` - Sincronización de datos pendientes

### Conceptos Clave:
- **Service Worker**: Script que corre en background
- **IndexedDB**: Base de datos del navegador
- **Dexie.js**: Wrapper para IndexedDB
- **Sincronización**: Enviar datos pendientes cuando vuelve la conexión
- **PWA Manifest**: Configuración para instalar la app

### Código Principal:

#### 1. Configuración PWA (`next.config.js`)
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',              // Donde se genera el service worker
  register: true,              // Registro automático
  skipWaiting: true,           // Actualizar inmediatamente
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',  // Intenta red primero, luego caché
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});
```

#### 2. IndexedDB con Dexie (`lib/db.ts`)
```typescript
import Dexie, { Table } from 'dexie';

export interface PendingCleaning {
  id?: number;
  roomId: string;
  userId: string;
  cleanedAt: string;
  date: string;
  synced: boolean;  // Flag para saber si ya se sincronizó
}

export interface PendingIncident {
  id?: number;
  roomId: string;
  userId: string;
  description: string;
  photos: string[];  // Array de data URLs (base64)
  createdAt: string;
  synced: boolean;
}

class OfflineDB extends Dexie {
  pendingCleanings!: Table<PendingCleaning>;
  pendingIncidents!: Table<PendingIncident>;

  constructor() {
    super('HotelHousekeepingDB');
    this.version(1).stores({
      pendingCleanings: '++id, roomId, userId, synced',
      pendingIncidents: '++id, roomId, userId, synced',
    });
  }
}

export const db = new OfflineDB();
```

#### 3. Guardar Limpieza Offline (`app/housekeeper/page.tsx`)
```typescript
const markCleanMutation = useMutation({
  mutationFn: async (roomId: string) => {
    // Si no hay conexión, guardar en IndexedDB
    if (!isOnline) {
      await db.pendingCleanings.add({
        roomId,
        userId: session?.user?.id || '',
        cleanedAt: new Date().toISOString(),
        date: selectedDate,
        synced: false,  // Marcar como no sincronizado
      });
      return { offline: true };
    }

    // Si hay conexión, enviar directamente al servidor
    const res = await fetch('/api/cleanings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, date: selectedDate }),
    });
    return res.json();
  },
});
```

#### 4. Sincronización Automática
```typescript
const syncPendingData = async () => {
  if (!isOnline) return;

  // 1. Obtener datos pendientes de IndexedDB
  const pendingCleanings = await db.pendingCleanings
    .filter((c) => !c.synced)
    .toArray();
  
  const pendingIncidents = await db.pendingIncidents
    .filter((i) => !i.synced)
    .toArray();

  if (pendingCleanings.length === 0 && pendingIncidents.length === 0) return;

  // 2. Enviar al servidor
  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cleanings: pendingCleanings,
      incidents: pendingIncidents,
    }),
  });

  // 3. Si se sincronizó correctamente, eliminar de IndexedDB
  if (res.ok) {
    for (const cleaning of pendingCleanings) {
      if (cleaning.id) {
        await db.pendingCleanings.delete(cleaning.id);
      }
    }
    // Similar para incidencias...
  }
};

// Sincronizar cuando vuelve la conexión
useEffect(() => {
  if (isOnline) {
    syncPendingData();
  }
}, [isOnline]);
```

#### 5. Guardar Incidencia Offline con Fotos
```typescript
if (!isOnline) {
  const photoUrls: string[] = [];
  
  // Convertir cada foto a base64 (data URL)
  for (const photo of photos) {
    const reader = new FileReader();
    const url = await new Promise<string>((resolve) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(photo);  // Convierte a base64
    });
    photoUrls.push(url);
  }

  // Guardar en IndexedDB
  await db.pendingIncidents.add({
    roomId,
    userId: session?.user?.id || '',
    description,
    photos: photoUrls,  // Array de data URLs
    createdAt: new Date().toISOString(),
    synced: false,
  });
}
```

#### 6. Sincronizar Incidencias con Fotos (`app/api/sync/route.ts`)
```typescript
for (const incident of incidents) {
  // 1. Convertir data URLs de vuelta a archivos
  for (let i = 0; i < incident.photos.length; i++) {
    const photoDataUrl = incident.photos[i];
    const base64Data = photoDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 2. Guardar archivo en el servidor
    const filename = `${incident.id}-${Date.now()}-${i}.jpg`;
    const path = join(uploadsDir, filename);
    await writeFile(path, buffer);
    
    // 3. Guardar referencia en la base de datos
    await prisma.incidentPhoto.create({
      data: {
        incidentId: incident.id,
        url: `/uploads/incidents/${filename}`,
      },
    });
  }
}
```

### Preguntas para Explicar:
1. ¿Qué es un Service Worker y cómo funciona?
2. ¿Cómo funciona IndexedDB y por qué lo usamos?
3. ¿Qué es Dexie y qué ventajas tiene sobre IndexedDB directo?
4. ¿Cómo se convierte una foto a base64 y por qué?
5. ¿Cómo funciona la sincronización automática?
6. ¿Qué es el manifest.json y para qué sirve?

---

## 🔄 Flujo Completo del Sistema

### Flujo Diario de Limpieza:
1. **Recepción** marca habitaciones como ocupadas
2. **Recepción** asigna habitaciones a camareras
3. **Camarera** ve sus habitaciones asignadas
4. **Camarera** marca habitaciones como limpias (funciona offline)
5. **Sistema** sincroniza automáticamente cuando hay conexión

### Flujo de Incidencia:
1. **Camarera** detecta problema en habitación
2. **Camarera** toma fotos (hasta 3) y escribe descripción
3. **Sistema** guarda incidencia (offline si es necesario)
4. **Habitación** se marca como DISABLED automáticamente
5. **Recepción** ve la incidencia y la resuelve
6. **Habitación** vuelve a estar disponible

---

## 📚 Recursos de Estudio por Módulo

### Benjamin (Autenticación):
- NextAuth.js Documentation: https://next-auth.js.org/
- JWT Explained: https://jwt.io/introduction
- bcrypt: https://www.npmjs.com/package/bcryptjs

### Alejandro (Habitaciones):
- Prisma Documentation: https://www.prisma.io/docs
- REST API Best Practices
- SQLite vs PostgreSQL

### Antonio (Asignaciones/Limpiezas):
- Prisma Relations: https://www.prisma.io/docs/concepts/components/prisma-schema/relations
- Database Transactions
- Date handling in JavaScript

### Irving (Incidencias):
- File Upload in Next.js: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- FormData API: https://developer.mozilla.org/en-US/docs/Web/API/FormData
- File System in Node.js

### Abril (PWA/Offline):
- PWA Guide: https://web.dev/progressive-web-apps/
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Dexie.js: https://dexie.org/
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

---

## ✅ Checklist de Presentación

Cada persona debe poder explicar:
- [ ] Su módulo completo (código y funcionalidad)
- [ ] Cómo se integra con otros módulos
- [ ] Los conceptos técnicos clave
- [ ] Flujos de usuario relacionados
- [ ] Posibles mejoras o extensiones

---

## 🎯 Próximos Pasos

1. Cada persona estudia su módulo asignado
2. Revisar el código en detalle
3. Probar la funcionalidad localmente
4. Preparar explicación de 10-15 minutos
5. Presentar al equipo y hacer preguntas

¡Éxito con la presentación! 🚀

