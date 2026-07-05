# ⚙️ Stack Tecnológico

## Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| **Next.js** | 16.2.1 | Framework React con App Router |
| **React** | 19.2.4 | Biblioteca UI |
| **TypeScript** | 5 | Tipado estático estricto |
| **Tailwind CSS** | 4 | Estilos utility-first |
| **Framer Motion** | 12 | Animaciones fluidas |
| **shadcn/ui** | 4 | Componentes accesibles |
| **Lucide React** | latest | Iconografía |
| **Recharts** | 3.8 | Gráficos y visualizaciones |
| **date-fns** | 4.1 | Manejo de fechas |
| **Sonner** | 2.0 | Notificaciones toast |

## Backend y Base de Datos

| Tecnología | Uso |
|---|---|
| **Firebase Auth** | Autenticación de usuarios |
| **Firebase Firestore** | Base de datos NoSQL en tiempo real |
| **Firebase Admin SDK** | Operaciones privilegiadas (servidor) |
| **Next.js API Routes** | Endpoints REST |

## Formularios y Validación

| Tecnología | Versión | Uso |
|---|---|---|
| **React Hook Form** | 7.72 | Manejo de formularios |
| **Zod** | 4.3 | Validación de esquemas |
| **@hookform/resolvers** | 5.2 | Integración RHF + Zod |

## Utilidades

| Tecnología | Uso |
|---|---|
| **ImageKit** | CDN de imágenes |
| **clsx + tailwind-merge** | Utilidades de clases CSS |

## Infraestructura y Herramientas

| Herramienta | Uso |
|---|---|
| **Vercel** | Hosting y despliegue |
| **ESLint 9** | Linting |
| **PWA** | Service Worker + Manifest |
| **Firebase Emulator Suite** | Desarrollo local aislado (Auth + Firestore) |
| **Java 21+** | Requisito de Firebase Emulator Suite |
| **Git** | Control de versiones |

### Desarrollo Local con Emuladores

```bash
# Terminal 1: emuladores
npm run emu

# Terminal 2: seed de datos de prueba
npm run emu:seed

# Terminal 2 (o 3): Next.js apuntando a emulador
npm run dev:emu
```

El flag `NEXT_PUBLIC_USE_EMULATOR=true` activa `connectFirestoreEmulator` y `connectAuthEmulator` en `firebase.ts` para redirigir todo el tráfico a `localhost:8080` (Firestore) y `localhost:9099` (Auth). La UI de administración está en `http://localhost:4000`.|

---

## Estructura de Dependencias

```json
{
  "dependencies": {
    "next": "^16.2.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "firebase": "latest",
    "firebase-admin": "^13.0.0",
    "framer-motion": "^12.0.0",
    "recharts": "^3.8.0",
    "date-fns": "^4.1.0",
    "sonner": "^2.0.0",
    "react-hook-form": "^7.72.0",
    "zod": "^4.3.0",
    "@hookform/resolvers": "^5.2.0",
    "lucide-react": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  }
}
```

---

## Convenciones del Proyecto

- **Formato de fecha**: `YYYY-MM-DD` en strings
- **Zona horaria**: `America/Caracas` (hardcodeada)
- **Semana financiera**: Domingo → Sábado
- **Moneda**: USD ($)
- **Idioma**: Español (interfaz y notificaciones)
- **Tema**: Oscuro (*Surgical Edge*)
- **Mobile-first**: Diseño responsive con sidebar colapsable

---

## Ver también
- [[Arquitectura del Sistema]]
- [[Base de Datos]]
