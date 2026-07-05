# 🔐 Roles y Permisos

## Roles del Sistema

| Rol | Descripción | Acceso |
|---|---|---|
| **superadmin** | Super administrador del sistema | Control total + gestión de usuarios |
| **admin** | Dueño/gestor de la barbería | Control del negocio (sin gestión de usuarios) |
| **barber** | Barbero empleado | Autogestión (solo sus datos) |

---

## Matriz de Acceso por Módulo

| Módulo | superadmin | admin | barber |
|---|---|---|---|
| **Dashboard** | Ve todos los ingresos y rankings | Ve todos los ingresos y rankings | Solo sus ingresos y stats |
| **Actas** | ✅ Completo | ✅ Completo | ❌ Sin acceso |
| **Finanzas** | Registra para cualquier barbero | Registra para cualquier barbero | Solo se registra a sí mismo |
| **Historial** | Ve todo el historial | Ve todo el historial | Solo su historial |
| **Estadísticas** | Stats de todos | Stats de todos | Solo sus estadísticas |
| **Objetivos** | CRUD de todos los objetivos | CRUD de todos los objetivos | Solo sus propios objetivos |
| **Citas** | ✅ Todas las citas | ✅ Todas las citas | ✅ Sus citas |
| **Clientes** | ✅ Todos los clientes | ✅ Todos los clientes | ✅ Clientes que registró |
| **Personal** | ✅ Completo | ✅ Completo | ❌ Sin acceso |
| **Servicios** | ✅ CRUD completo | ✅ CRUD completo | ✅ CRUD completo |
| **Inventario** | ✅ Completo | ✅ Completo | ❌ Sin acceso |
| **Usuarios** | ✅ CRUD completo | ❌ Sin acceso | ❌ Sin acceso |
| **Perfil** | Edita su perfil | Edita su perfil | Solo edita su perfil |

---

## Implementación

### 1. AuthContext (`src/context/AuthContext.tsx`)

El rol se obtiene de Firestore al iniciar sesión mediante `onSnapshot`, lo que permite cambios en tiempo real:

```typescript
interface UserRole {
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: "superadmin" | "admin" | "barber";
  primerInicio: boolean;
  bloqueado: boolean;
  creadoEn: string;
  creadoPor?: string;
}
```

### 2. AuthGuard (`src/components/providers/AuthGuard.tsx`)

Componente que envuelve las rutas protegidas del dashboard. Orden de verificación:

1. **Loading** → spinner mientras se cargan auth y Firestore
2. **No autenticado** → redirige a `/login`
3. **Primer inicio** (`primerInicio: true` y rol `barber`) → redirige a `/cambiar-contrasena`
4. **Bloqueado** (`bloqueado: true`) → redirige a `/bloqueado`
5. **Roles** → renderiza children si el rol tiene acceso

Rutas públicas (sin protección): `/login`, `/bloqueado`, `/cambiar-contrasena`

### 3. Middleware (`src/middleware.ts`)

Protección a nivel de ruta. Si no hay sesión, redirige a `/login`.

### 4. Firestore Rules (`firestore.rules`)

Reglas a nivel de base de datos. Ver [[Reglas de Seguridad]].

### 5. Lógica en Componentes

Cada módulo usa `userRole?.role` para condicionar la UI y las consultas:

```typescript
const { userRole } = useAuth();
const esSuperadmin = userRole?.role === "superadmin";
const esAdmin = userRole?.role === "admin" || userRole?.role === "superadmin";

// Admin/Superadmin ven todos los registros
const consulta = esAdmin
  ? query(collection(db, "finances"), orderBy("date", "desc"))
  : query(collection(db, "finances"), where("barberId", "==", userRole.uid), orderBy("date", "desc"));
```

---

## Usuarios del Sistema

Definidos en `src/lib/types.ts`:

| Rol | Descripción | Gestión |
|---|---|---|
| **superadmin** | Super administrador | Creado manualmente en Firestore |
| **admin** | Dueño de barbería | Creado por superadmin desde `/dashboard/usuarios` |
| **barber** | Barbero empleado | Creado por superadmin desde `/dashboard/usuarios` |

Los usuarios son creados por el **superadmin** desde:
1. **Dashboard → Usuarios** → `/dashboard/usuarios` (UI)
2. **API** → `POST /api/usuarios` (Firebase Admin SDK)

Solo el superadmin puede gestionar usuarios (crear, editar, bloquear, eliminar). El admin gestiona el negocio pero no puede administrar usuarios.

---

## Flujo de Autorización

```
Usuario accede a una ruta del dashboard
  │
  ├─ AuthGuard: ¿Cargando auth/Firestore?
  │   └─ SÍ → Spinner de carga
  │
  ├─ AuthGuard: ¿Autenticado?
  │   └─ NO → Redirige a /login
  │
  ├─ AuthGuard: ¿primerInicio === true y es barber?
  │   └─ SÍ → Redirige a /cambiar-contrasena
  │
  ├─ AuthGuard: ¿bloqueado === true?
  │   └─ SÍ → Redirige a /bloqueado
  │
  ├─ AuthGuard: ¿Rol autorizado para esta ruta?
  │   └─ NO → Redirige al dashboard principal
  │
  ├─ Componente: ¿esAdmin?
  │   ├─ SÍ → query sin where (todos los registros)
  │   └─ NO → query con where("barberId", "==", uid)
  │
  └─ Firestore Rules: Validación final en el servidor
      └─ ¿El rol tiene permiso para esta operación?
```

---

## Ver también
- [[Reglas de Seguridad]]
- [[Modulos del Sistema]]
- [[Arquitectura del Sistema]]
- [[Flujo de Usuarios]]
