# 🏗️ Arquitectura del Sistema

## Visión General

Elite BarberShop sigue una arquitectura **cliente-servidor** con Next.js App Router, donde el frontend y backend coexisten en el mismo proyecto. La capa de datos utiliza **Firebase Firestore** como base de datos NoSQL en tiempo real.

---

## Capas del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENTE (Navegador)                     │
│  React 19 + Tailwind CSS 4 + shadcn/ui + Framer Motion   │
├─────────────────────────────────────────────────────────┤
│                   MIDDLEWARE (Next.js)                    │
│         Protección de rutas por autenticación             │
├─────────────────────────────────────────────────────────┤
│               API ROUTES (Next.js API)                    │
│        Endpoints REST para operaciones críticas           │
├─────────────────────────────────────────────────────────┤
│              FIREBASE (Backend as a Service)              │
│    ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│    │ Firebase Auth │  │  Firestore   │  │ Admin SDK   │  │
│    │ (autenticación)│  │  (base datos)│  │ (servidor)  │  │
│    └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Componentes Clave

### 1. Frontend (`src/app/`, `src/components/`)

- **App Router**: Cada módulo del dashboard es una ruta bajo `/dashboard/`
- **Componentes**: shadcn/ui personalizados con tema oscuro *Surgical Edge*
- **Componentes Reutilizables de Negocio**: `RegisterServiceModal` (`src/components/RegisterServiceModal.tsx`) encapsula la lógica compleja de registro de servicios, actualizaciones de saldos bancarios, objetivos y transacciones en Firestore, sirviendo tanto al dashboard principal de administración como al módulo de finanzas.
- **Estado**: React Context para autenticación (`AuthContext`), estado local con `useState`/`useMemo`
- **Tiempo real**: `onSnapshot` de Firestore para datos en vivo

### 2. Autenticación (`src/context/AuthContext.tsx`)

- Firebase Auth con `onAuthStateChanged`
- Resuelve el rol del usuario desde Firestore (`users/{uid}`) mediante **`onSnapshot`** para detección en tiempo real de cambios (bloqueo, cambio de rol, etc.)
- Provee `user`, `userRole` y `loading` a toda la app

### 3. AuthGuard (`src/components/providers/AuthGuard.tsx`)

Componente que envuelve las rutas protegidas del dashboard. Verifica en orden:
1. Estado de carga (auth + Firestore)
2. Sesión activa
3. `primerInicio` (barberos nuevos deben cambiar contraseña)
4. `bloqueado` (usuarios bloqueados son redirigidos)
5. Roles y permisos para la ruta

Gracias al `onSnapshot` en AuthContext, los cambios en Firestore (bloqueo, cambio de rol) se detectan en tiempo real sin necesidad de recargar la página.

### 4. Middleware (`src/middleware.ts`)

- Protege rutas `/dashboard/*` → redirige a `/login` si no hay sesión
- Ejecutado en el edge runtime de Next.js

### 5. API Routes (`src/app/api/`)

- **`/api/usuarios`**: CRUD de usuarios (superadmin-only, usa Firebase Admin SDK)
- **`/api/usuarios/[uid]/cambiar-contrasena`**: Cambio de contraseña (propio usuario)
- **`/api/bcv-rate`**: Tasa BCV con caché de 6 horas
- Operaciones que requieren privilegios elevados o lógica compleja

### 6. Capa de Datos (`src/lib/`)

| Archivo | Propósito |
|---|---|
| `firebase.ts` | Cliente Firebase (frontend). Conecta a emuladores si `NEXT_PUBLIC_USE_EMULATOR=true` |
| `firebaseAdmin.ts` | Admin SDK (servidor, operaciones privilegiadas) |
| `types.ts` | Interfaces TypeScript para todas las entidades |
| `utils.ts` | Utilidades de fecha con zona horaria `America/Caracas` |

---

## Flujo de Datos

```
Usuario → Login (Firebase Auth) → AuthContext (rol + onSnapshot)
  → AuthGuard (verificación: carga → sesión → primerInicio → bloqueado → roles)
    → Dashboard Layout (Sidebar + Header)
      → Módulo específico (ej: Finanzas)
        → Firestore (onSnapshot / addDoc / updateDoc / deleteDoc)
          → Actualización en tiempo real de la UI
```

### Firestore: Tiempo Real

Todos los módulos usan `onSnapshot` para suscripciones en vivo. Esto significa que los cambios hechos por un usuario se reflejan instantáneamente en la UI de todos los usuarios conectados.

---

## Decisiones de Diseño

1. **App Router sobre Pages Router**: Renderizado del lado del cliente con `"use client"` en todas las páginas del dashboard para aprovechar hooks de React y Firestore en tiempo real.

2. **Firebase como BaaS**: Elimina la necesidad de un backend tradicional. Firestore maneja la persistencia, Auth maneja la autenticación, y las API Routes cubren operaciones que requieren el Admin SDK.

3. **Reparto 60/40 hardcodeado**: La división de ganancias está calculada en el frontend (`totalAmount * 0.6`, `totalAmount * 0.4`) al momento del registro. No es configurable por el usuario final.

4. **Zona horaria fija**: `America/Caracas` hardcodeada en `getLocalDateString()`. Las fechas se almacenan como strings `YYYY-MM-DD` en Firestore.

5. **Reversión automática**: Editar o eliminar un registro financiero revierte automáticamente los saldos bancarios, transacciones y progreso de objetivos.

6. **AuthGuard con onSnapshot**: El AuthContext usa `onSnapshot` en lugar de `getDoc` para el documento del usuario. Esto permite que cambios en Firestore (bloqueo, cambio de rol) se reflejen instantáneamente en el frontend sin recargar la página.

7. **Roles de 3 niveles**: `superadmin` (gestión de usuarios), `admin` (gestión del negocio), `barber` (autogestión). Separación clara de responsabilidades: solo el superadmin puede crear, editar, bloquear o eliminar usuarios.

---

## Ver también
- [[Modelo de Negocio]]
- [[Stack Tecnologico]]
- [[Base de Datos]]
