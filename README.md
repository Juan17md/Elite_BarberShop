# 💈 Elite BarberShop | Ecosistema de Gestión Interna

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_&_Store-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)

**Elite BarberShop Gestión** es una plataforma administrativa de alto rendimiento diseñada bajo la estética *Surgical Edge*. Centraliza la operación completa de una barbería moderna, permitiendo un control milimétrico sobre las finanzas, el personal y la experiencia del cliente en un entorno robusto y escalable.

## 🎯 Vista General

Optimizar el flujo de trabajo diario a través de un panel inteligente segmentado por roles. Los **Administradores** obtienen una visión global del negocio (360°), mientras que los **Barberos** acceden a herramientas de autogestión para su rendimiento y objetivos.

La plataforma está orientada a:

- Control de reservas y agenda milimétrica.
- Seguimiento de ingresos y distribución automatizada de ganancias.
- Consulta de estadísticas avanzadas y métricas de rendimiento.
- Gestión integral de clientes, personal y servicios.
- Visualización de historial operativo con auditoría.
- Acceso segmentado por roles (Admin/Barbero).

## ✨ Características principales

- **Autenticación y control de acceso por roles**
  - Tres niveles: Superadmin, Admin y Barbero
  - Protección de rutas con AuthGuard y detección en tiempo real
  - Bloqueo/desbloqueo de usuarios en vivo

- **Dashboard operativo**
  - Resumen de ingresos diarios, semanales y mensuales
  - Métricas de servicios realizados
  - Visualización de rendimiento por barbero
  - Navegación cíclica por periodos (Lun→Sáb + Domingos independientes)

- **Gestión financiera**
  - Registro de servicios con método de pago (BCV / Divisa)
  - Cálculo y distribución automática 60/40
  - Propina voluntaria (100% barbero) con conversión Bs→USD
  - Sistema de fiado (Por Cobrar) con cobro diferido
  - Edición y eliminación con reversión automática de saldos
  - Tasa BCV automática con caché de 6 horas

- **Gestión de personal**
  - Cuentas bancarias virtuales individuales
  - Registro de pagos con modalidad total, parcial o adelanto
  - Edición de pagos con ajuste automático de saldo
  - Historial de transacciones con paginación

- **Módulos del sistema**
  - Actas y Gastos
  - Citas
  - Clientes
  - Estadísticas
  - Finanzas
  - Historial (búsqueda y filtros)
  - Inventario (equipos y materiales)
  - Objetivos (metas de rendimiento)
  - Perfil (cuenta bancaria personal)
  - Personal (gestión de barberos y pagos)
  - Servicios (catálogo personalizable)
  - Usuarios (CRUD completo — solo superadmin)

- **Responsive design**
  - Interfaz adaptativa escritorio/móvil
  - Bottom navigation móvil con bottom sheet
  - Navegación táctil optimizada

- **Progressive Web App (PWA)**
  - Service Worker y Manifest para instalación en dispositivos

## 🛠️ Stack Tecnológico de Vanguardia

### 💻 Frontend & UI
- **Next.js 16 (App Router)** & **React 19**: Lógica de vanguardia para una experiencia SPA fluida.
- **TypeScript**: Tipado estricto para un mantenimiento robusto.
- **Tailwind CSS 4**: Arquitectura de diseño de última generación con CSS nativo.
- **Framer Motion**: Animaciones fluidas para una interfaz premium.
- **shadcn/ui** & **Lucide React**: Componentes de alta calidad y set de iconos consistente.
- **Recharts**: Representación visual de datos financieros y métricas.

### ⚙️ Backend & Infraestructura
- **Firebase Authentication**: Autenticación segura con email y contraseña.
- **Firebase Firestore**: Base de datos NoSQL en tiempo real con suscripciones `onSnapshot`.
- **Firebase Admin SDK**: Operaciones privilegiadas desde servidor (API Routes).
- **Firebase Emulator Suite**: Entorno de desarrollo local aislado (Auth + Firestore).
- **Next.js API Routes**: Endpoints REST para operaciones críticas.
- **Vercel**: Hosting y despliegue continuo.

### 🧪 Utilidades de Ingeniería
- **React Hook Form** + **Zod**: Validación de esquemas y formularios de alta precisión.
- **date-fns**: Manejo profesional de tiempos y cronologías.
- **Sonner**: Sistema de notificaciones elegante y no intrusivo.
- **ImageKit**: CDN para capturas de pago.
- **clsx** + **tailwind-merge**: Utilidades de composición de clases.

## Arquitectura del proyecto

La aplicación utiliza la estructura basada en `App Router` de Next.js y organiza sus módulos principales dentro de `src/app`.

```bash
src/
├── app/
│   ├── api/
│   │   ├── usuarios/          → CRUD de usuarios (Firebase Admin SDK)
│   │   └── bcv-rate/          → Tasa BCV con caché en Firestore
│   ├── bloqueado/             → Página de usuario bloqueado
│   ├── cambiar-contrasena/    → Formulario primer inicio (barberos)
│   ├── dashboard/
│   │   ├── actas/             → Ingresos y gastos operativos
│   │   ├── citas/             → Gestión de citas
│   │   ├── clientes/          → Registro de clientes
│   │   ├── estadisticas/      → Rankings y analíticas
│   │   ├── finanzas/          → Núcleo financiero (1197 líneas)
│   │   ├── historial/         → Historial con búsqueda y filtros
│   │   ├── inventario/        → Equipos y materiales
│   │   ├── objetivos/         → Metas de rendimiento
│   │   ├── perfil/            → Perfil y cuenta bancaria
│   │   ├── personal/          → Barberos, pagos e historial
│   │   ├── servicios/         → Catálogo de servicios
│   │   ├── usuarios/          → CRUD de usuarios (superadmin)
│   │   └── layout.tsx         → Shell del dashboard
│   └── login/                 → Autenticación
├── components/
│   ├── providers/
│   │   └── AuthGuard.tsx       → Guardián de rutas protegidas
│   ├── RegisterServiceModal.tsx → Modal registro de servicios
│   ├── RegistrarPagoModal.tsx  → Modal registro de pagos
│   └── EditarPagoModal.tsx     → Modal edición de pagos
├── context/
│   └── AuthContext.tsx         → Proveedor de autenticación (onSnapshot)
├── lib/
│   ├── types.ts               → Interfaces TypeScript
│   ├── firebase.ts            → Cliente Firebase
│   ├── firebaseAdmin.ts       → Admin SDK (servidor)
│   └── utils.ts               → Utilidades de fecha (America/Caracas)
└── middleware.ts               → Protección de rutas (Edge Runtime)
```

## Experiencia del sistema

El sistema contempla dos enfoques principales dentro del dashboard:

### Administrador
Permite supervisar la operación completa del negocio:

- Ingresos del día, semana y mes
- Top de barberos con ranking
- Servicios recientes
- Distribución de ganancias por barbero
- Visión global del rendimiento del negocio
- Gestión de personal y pagos
- Edición de pagos con ajuste automático de saldo

### Barbero
Ofrece una experiencia centrada en la operación individual:

- Consulta de ingresos propios
- Revisión de reservas
- Acceso a estadísticas personales
- Seguimiento de objetivos
- Historial de servicios realizados
- Cuenta bancaria personal con transacciones

## Instalación y ejecución local

### 1. Clonar el repositorio
```bash
git clone <TU_REPOSITORIO>
cd elite_barber_shop_gestion
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env.local
# Editar .env.local con las credenciales de Firebase
```

### 3. Instalar dependencias
```bash
npm install
```

### 4. Ejecutar el entorno de desarrollo

**Opción A — Producción (requiere Firebase real):**
```bash
npm run dev
```

**Opción B — Desarrollo local con emuladores (aislado):**
```bash
# Terminal 1: Iniciar emuladores de Firebase (requiere Java 21+)
npm run emu

# Terminal 2: Poblar datos de prueba
npm run emu:seed

# Terminal 2 (o 3): Iniciar Next.js apuntando a emuladores
npm run dev:emu
```

La aplicación estará disponible en:
```bash
http://localhost:3000
```

La UI de los emuladores de Firebase se accede en:
```bash
http://localhost:4000
```

## Scripts disponibles

```bash
npm run dev          # Entorno de desarrollo estándar
npm run dev:emu      # Desarrollo apuntando a emuladores Firebase
npm run build        # Build de producción
npm run start        # Iniciar servidor de producción
npm run lint         # Linting con ESLint 9
npm run emu          # Iniciar emuladores Firebase (Auth + Firestore)
npm run emu:seed     # Poblar emuladores con datos de prueba
```

## Configuración esperada

Para ejecutar correctamente el proyecto, se requiere configurar las credenciales y variables relacionadas con Firebase según el entorno local o de despliegue.

El archivo `.env.example` contiene la plantilla con las variables necesarias:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Credenciales públicas del cliente Firebase |
| `FIREBASE_CLIENT_EMAIL` | Email de cuenta de servicio para Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Clave privada para Admin SDK |
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase |
| `NEXT_PUBLIC_USE_EMULATOR` | `true` para usar emuladores locales |

Dependiendo de tu implementación, también puede ser necesario configurar:

- Reglas e índices de Firestore (`firestore.rules`, `firestore.indexes.json`)
- Configuración de hosting en `firebase.json`

## 🚩 Estado del Proyecto

Proyecto en desarrollo activo bajo los más altos estándares de calidad UI/UX (*Surgical Edge Design*). Enfocado en construir una solución sólida, escalable y visualmente impactante para la administración de barberías de gama alta.

### Últimas actualizaciones

- Edición de pagos en historial con ajuste automático de saldo bancario
- Validación: el pago no puede superar el saldo acumulado
- Firebase Emulator Suite para desarrollo local aislado
- Bottom navigation móvil con bottom sheet animado
- Fix race condition en listeners de Personal
- Conversión Bs→USD en tiempo real para propinas y servicios
- Sistema de fiado (Por Cobrar) con cobro diferido

## ✍️ Autor

Desarrollado con dedicación por **[Juan17md](https://github.com/Juan17md)**.

---

*Elite BarberShop — Engineering for Excellence.*
