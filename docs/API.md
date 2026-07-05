# 🔌 API

> Endpoints REST del sistema implementados con Next.js API Routes.

---

## Endpoints de Usuarios

Todas las rutas bajo `/api/usuarios` requieren autenticación. Las operaciones de gestión (crear, editar, eliminar, listar) requieren token de **superadmin**.

### `GET /api/usuarios`
Listar todos los usuarios del sistema.

**Acceso**: Solo superadmin

**Respuesta exitosa** (200):
```json
[
  {
    "uid": "firebase-uid",
    "email": "barbero@email.com",
    "name": "Nombre Barbero",
    "phone": "+584121234567",
    "role": "barber",
    "primerInicio": true,
    "bloqueado": false,
    "creadoEn": "2026-06-21T00:00:00.000Z",
    "creadoPor": "superadmin-uid"
  }
]
```

**Errores**:
- `401` — No autenticado
- `403` — No es superadmin
- `500` — Error del servidor

---

### `POST /api/usuarios`
Crear un nuevo usuario en Firebase Auth + Firestore.

**Acceso**: Solo superadmin

**Body**:
```json
{
  "email": "usuario@email.com",
  "password": "contraseña123",
  "name": "Nombre del Usuario",
  "phone": "+584121234567",
  "role": "admin" | "barber"
}
```

**Proceso**:
1. Verificar token de autenticación (Firebase Admin SDK)
2. Verificar que el usuario autenticado es superadmin (Firestore `users/{uid}`)
3. Crear usuario en Firebase Auth con email/password
4. Crear documento en Firestore `users/{uid}` con todos los campos:
   - `role` según lo indicado en el body
   - `primerInicio: true` si el rol es `barber`, `false` si es `admin`
   - `bloqueado: false`
   - `creadoEn: new Date().toISOString()`
   - `creadoPor: uid del superadmin`
5. Crear cuenta bancaria en `bank/{uid}` con saldo inicial $0 (solo si rol es `barber` o `admin`)

**Respuesta exitosa** (201):
```json
{
  "uid": "firebase-generated-uid",
  "message": "Usuario creado exitosamente"
}
```

**Errores**:
- `400` — Email, contraseña o nombre faltantes, o email ya existe
- `401` — No autenticado
- `403` — No es superadmin
- `500` — Error del servidor

---

### `PATCH /api/usuarios/[uid]`
Actualizar datos de un usuario: nombre, teléfono, role, bloqueado.

**Acceso**: Solo superadmin

**Body** (todos los campos opcionales):
```json
{
  "name": "Nuevo Nombre",
  "phone": "+584121234567",
  "role": "admin" | "barber",
  "bloqueado": true | false
}
```

**Proceso**:
1. Verificar token y rol superadmin
2. Actualizar campos en Firestore `users/{uid}`
3. Si se cambia `role`, actualizar también en Firebase Auth (custom claims)

**Respuesta exitosa** (200):
```json
{
  "message": "Usuario actualizado exitosamente"
}
```

**Errores**:
- `400` — Ningún campo para actualizar
- `401` — No autenticado
- `403` — No es superadmin
- `404` — Usuario no encontrado
- `500` — Error del servidor

---

### `DELETE /api/usuarios/[uid]`
Eliminar un usuario del sistema (Firebase Auth + Firestore).

**Acceso**: Solo superadmin

**Proceso**:
1. Verificar token y rol superadmin
2. Eliminar usuario de Firebase Auth
3. Eliminar documento de Firestore `users/{uid}`
4. (La cuenta bancaria en `bank/{uid}` se mantiene por ahora)

**Respuesta exitosa** (200):
```json
{
  "message": "Usuario eliminado exitosamente"
}
```

**Errores**:
- `401` — No autenticado
- `403` — No es superadmin
- `404` — Usuario no encontrado
- `500` — Error del servidor

---

### `PATCH /api/usuarios/[uid]/cambiar-contrasena`
Cambiar la contraseña del propio usuario autenticado. Marca `primerInicio: false`.

**Acceso**: El propio usuario autenticado (token requerido, sin verificar superadmin)

**Body**:
```json
{
  "nuevaContrasena": "nuevaClave123"
}
```

**Validación**: La nueva contraseña debe tener mínimo 6 caracteres.

**Proceso**:
1. Verificar token de autenticación
2. Verificar que el `uid` del token coincide con el `[uid]` de la URL (solo puede cambiarse a sí mismo)
3. Validar que `nuevaContrasena` tenga al menos 6 caracteres
4. Actualizar contraseña en Firebase Auth
5. Actualizar `primerInicio: false` en Firestore `users/{uid}`

**Respuesta exitosa** (200):
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

**Errores**:
- `400` — Contraseña muy corta (mín 6 caracteres)
- `401` — No autenticado
- `403` — No autorizado (el uid no coincide)
- `500` — Error del servidor

---

## Middleware de Autenticación

Implementado en `src/middleware.ts` (Next.js Edge Middleware):

```typescript
// Protege todas las rutas /dashboard/*
// Redirige a /login si no hay sesión
```

---

## Autenticación en API Routes

Las API routes usan Firebase Admin SDK para verificar tokens:

```typescript
// src/lib/firebaseAdmin.ts
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Verificación en cada endpoint:
const token = request.headers.get("authorization")?.split("Bearer ")[1];
const decodedToken = await adminAuth.verifyIdToken(token);
const uid = decodedToken.uid;
```

---

### `GET /api/bcv-rate`
Obtener la tasa BCV actual. Con caché automática de 6 horas en Firestore.

**Acceso**: Público (autenticación no requerida)

**Proceso**:
1. Leer documento `settings/bcv` en Firestore
2. Si `lastUpdated` tiene menos de 6 horas → retornar `{ rate, cached: true }`
3. Si el caché expiró → consultar `https://ve.dolarapi.com/v1/dolares/oficial`
4. Extraer campo `promedio` de la respuesta
5. Guardar en `settings/bcv` con `rate`, `lastUpdated: now()`, `source: "ve.dolarapi.com"`
6. Retornar `{ rate, cached: false }`

**Respuesta exitosa** (200):
```json
{
  "rate": 52.34,
  "cached": false
}
```

**Errores**:
- `500` — Error al consultar API externa (fallback: retorna último rate cacheado)

---

## Pendiente / Futuro

- Endpoints para reservas/citas
- Endpoints para reportes financieros
- Webhooks para notificaciones

---

## Ver también
- [[Arquitectura del Sistema]]
- [[Roles y Permisos]]
- [[Reglas de Seguridad]]
- [[Flujo de Usuarios]]
