# 💈 Elite BarberShop - Documentación

> Plataforma de gestión interna para barbería de gama alta. Control financiero, personal, clientes y operaciones bajo un diseño *Surgical Edge*.

---

## 🧭 Mapa del Vault

### Arquitectura y Negocio
- [[Arquitectura del Sistema]] — Estructura del proyecto, componentes y capas
- [[Modelo de Negocio]] — Reparto 60/40, servicios, comisiones
- [[Stack Tecnologico]] — Tecnologías utilizadas

### Base de Datos
- [[Base de Datos]] — Esquema completo de Firestore
- [[Reglas de Seguridad]] — Firestore security rules

### Gestión Financiera
- [[Gestion Financiera]] — Lógica financiera completa
- [[Flujo de Registro de Servicio]] — Paso a paso del registro de un servicio

### Módulos y Acceso
- [[Modulos del Sistema]] — Descripción de cada módulo del dashboard
- [[Roles y Permisos]] — RBAC: Superadmin vs Admin vs Barbero
- [[API]] — Endpoints disponibles
- [[Flujo de Usuarios]] — Sistema de creación, primer ingreso y bloqueo

---

## 🔑 Datos Clave

| Concepto | Valor |
|---|---|
| **Reparto** | 60% Barbero / 40% Barbería |
| **Zona Horaria** | `America/Caracas` (Venezuela) |
| **Semana** | Lunes → Sábado (domingos independientes) |
| **Servicios Base** | Corte Simple ($7 BCV / $5 Div), Barba ($4 BCV / $2 Div), Corte+Barba ($10 BCV / $8 Div) |
| **Métodos de Pago** | BCV (Bolívares a tasa BCV) / Divisa (USD físico o USDT Binance) |
| **Roles** | superadmin (gestión usuarios), admin (gestión negocio), barber (autogestión) |
| **Usuarios** | Eduardo (superadmin), Franyer (barber), Brayan (barber) |
| **Autenticación** | Firebase Auth + Firestore roles + AuthGuard con onSnapshot |
| **Hosting** | Vercel (Next.js) |

---

## 📂 Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── usuarios/          → CRUD de usuarios (superadmin)
│   │   │   └── [uid]/
│   │   │       └── cambiar-contrasena/
│   │   └── bcv-rate/          → Tasa BCV con caché
│   ├── bloqueado/             → Página de usuario bloqueado
│   ├── cambiar-contrasena/    → Formulario primer inicio
│   ├── dashboard/
│   │   ├── actas/             → Registro de actas y gastos
│   │   ├── citas/             → Gestión de citas
│   │   ├── clientes/          → Gestión de clientes
│   │   ├── estadisticas/      → Rankings y estadísticas
│   │   ├── finanzas/          → Núcleo financiero
│   │   ├── historial/         → Historial con filtros
│   │   ├── inventario/        → Equipos y materiales
│   │   ├── objetivos/         → Metas de rendimiento
│   │   ├── perfil/            → Perfil personal
│   │   ├── personal/          → Barberos (pagos e historial)
│   │   ├── servicios/         → Catálogo de servicios
│   │   ├── usuarios/          → Gestión de usuarios (superadmin)
│   │   └── layout.tsx         → Shell del dashboard
│   └── login/                 → Autenticación
├── components/
│   └── providers/
│       └── AuthGuard.tsx       → Guardián de rutas protegidas
├── context/AuthContext         → Proveedor de autenticación (onSnapshot)
├── lib/
│   ├── types.ts               → Interfaces TypeScript
│   ├── firebase.ts            → Cliente Firebase
│   ├── firebaseAdmin.ts       → Admin SDK (servidor)
│   └── utils.ts               → Utilidades de fecha (Venezuela)
└── middleware.ts               → Protección de rutas
```

---

## 📋 Handover / Bitácora de Sesiones

- [[04_Handover_Sesion]] — Handover sesión 4
- [[05_Handover_Sesion]] — Handover sesión 5
- [[06_Handover_Sesion]] — Handover sesión 6

## 🚀 Estado

**En desarrollo activo** — 20+ commits. Rebranding reciente de "The Doctor Barber Shop" → "Elite BarberShop".
**Responsive Móvil**: Dashboard, Finanzas e Historial ajustados con layout responsive compacto para móvil.

[[documentacion]] — Bitácora de desarrollo con historial completo de cambios.
