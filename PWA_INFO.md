# Información sobre la Funcionalidad PWA

## Ubicación de los Archivos PWA

### 1. Configuración Principal
**Archivo**: `next.config.js`

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',              // Donde se genera el service worker
  register: true,              // Registra automáticamente el SW
  skipWaiting: true,           // Actualiza inmediatamente
  disable: process.env.NODE_ENV === 'development', // Deshabilitado en dev
  runtimeCaching: [            // Estrategia de caché
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst', // Intenta red primero, luego caché
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

**Qué hace**: Configura `next-pwa` para generar el Service Worker automáticamente.

### 2. Manifest de la Aplicación
**Archivo**: `public/manifest.json`

Define:
- Nombre de la aplicación
- Iconos (requiere crear `/public/icon-192.png` y `/public/icon-512.png`)
- Colores del tema
- Modo de visualización (standalone)
- Orientación (portrait)

### 3. Metadata en Layout
**Archivo**: `app/layout.tsx`

```typescript
export const metadata: Metadata = {
  manifest: '/manifest.json',
  themeColor: '#0ea5e9',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Housekeeping',
  },
};
```

**Qué hace**: Configura los metadatos para que los navegadores reconozcan la PWA.

### 4. Service Worker Generado
**Archivo**: `public/sw.js` (generado automáticamente)

**Qué hace**: 
- Se genera durante `npm run build`
- Maneja el caché offline
- Permite que la app funcione sin conexión

### 5. Funcionalidad Offline (IndexedDB)
**Archivos**:
- `lib/db.ts` - Configuración de Dexie (IndexedDB)
- `app/housekeeper/page.tsx` - Lógica de sincronización offline

**Qué hace**:
- Almacena limpiezas e incidencias localmente cuando no hay conexión
- Sincroniza automáticamente cuando vuelve la conexión

## Cómo Funciona

### En Desarrollo
- PWA está **deshabilitada** (`disable: process.env.NODE_ENV === 'development'`)
- El Service Worker no se registra
- Puedes probar la funcionalidad offline manualmente

### En Producción
1. Al hacer `npm run build`, se genera `public/sw.js`
2. El Service Worker se registra automáticamente
3. La app se puede instalar en dispositivos móviles
4. Funciona offline con caché y IndexedDB

## Para Habilitar PWA en Desarrollo

Si quieres probar la PWA en desarrollo, cambia en `next.config.js`:

```javascript
disable: false, // Cambiar a false
```

**Nota**: Tendrás que hacer rebuild después del cambio.

## Iconos Requeridos

La PWA necesita iconos en `/public/`:
- `icon-192.png` (192x192 píxeles)
- `icon-512.png` (512x512 píxeles)

**Estado actual**: Los iconos están referenciados en `manifest.json` pero no existen físicamente. Necesitas crearlos.

## Verificar que PWA Funciona

1. **Build de producción**: `npm run build`
2. **Iniciar servidor**: `npm start`
3. **Abrir en navegador**: `http://localhost:3000`
4. **DevTools > Application > Service Workers**: Deberías ver el SW registrado
5. **DevTools > Application > Manifest**: Deberías ver el manifest cargado

## Instalación en Dispositivos

### Android (Chrome)
- Aparecerá un banner "Agregar a pantalla de inicio"
- O menú > "Agregar a pantalla de inicio"

### iOS (Safari)
- Compartir > "Agregar a pantalla de inicio"

## Resumen de Archivos PWA

```
├── next.config.js          # Configuración next-pwa
├── public/
│   ├── manifest.json       # Manifest de la PWA
│   ├── sw.js              # Service Worker (generado)
│   └── icon-*.png         # Iconos (necesitas crearlos)
├── app/
│   └── layout.tsx         # Metadata PWA
└── lib/
    └── db.ts              # IndexedDB para offline
```

