# 📝 BITÁCORA DE DESARROLLO | The Doctor Barber Shop
## Ecosistema de Gestión Interna - Surgical Edge Engineering

Este documento sirve como registro cronológico de todas las modificaciones, mejoras y correcciones realizadas en el sistema. Es una herramienta de auditoría técnica y transparencia para el proceso de desarrollo, diseñada para ser parte integral de un portafolio profesional.

---

### 📅 Registro Cronológico

#### [2026-03-31] - Inicialización del Sistema de Documentación
- **Acción**: Creación y estructuración del archivo `documentacion.txt`.
- **Descripción**: Se establece este registro para centralizar el historial de cambios, facilitando el seguimiento de nuevas características, correcciones de errores y refactorizaciones.
- **Estado**: ✅ Finalizado

#### [2026-03-31] - Estandarización de Fecha y Lógica Semanal
- **Acción**: Sincronización de zona horaria y ajuste de calendario financiero.
- **Descripción**: 
  - Se estandarizó el manejo de fechas financieras utilizando la zona horaria de Venezuela (`America/Caracas`).
  - Se ajustó la lógica de cálculo semanal para que los periodos comiencen los domingos y finalicen los sábados, alineándose con las necesidades operativas de la barbería.
  - Mejora en la precisión de las comparaciones de cadenas de fecha para reportes semanales y mensuales.
- **Estado**: ✅ Finalizado

#### [2026-03-31] - Optimización de Estadísticas de Barberos
- **Acción**: Inclusión de todos los perfiles de barberos en el desglose semanal.
- **Descripción**: 
  - Se actualizó el panel de estadísticas para asegurar que todos los barberos registrados sean visibles en el reporte semanal, independientemente de su actividad.
  - Implementación de ordenamiento descendente por ingresos totales para mejorar la lectura del rendimiento.
  - Visualización clara de la distribución de ganancias entre el barbero y la barbería.
- **Estado**: ✅ Finalizado

#### [2026-03-31] - Acciones en Historial Financiero
- **Acción**: Implementación de Editar y Eliminar en registros de servicios.
- **Descripción**: 
  - Se añadieron capacidades de edición y eliminación en la tabla de historial financiero del dashboard.
  - Implementación de lógica de reversión automática para saldos bancarios de barberos y barbería al eliminar o modificar registros.
  - Sincronización automática de logs de transacciones y cumplimiento de objetivos de rendimiento.
- **Estado**: ✅ Finalizado

#### [2026-03-31] - Optimización de Interfaz y Espacios
- **Acción**: Rediseño del layout de Finanzas (Bento Grid).
- **Descripción**: 
  - Se reestructuró el dashboard de finanzas para aprovechar mejor el espacio, pasando de un diseño vertical a uno de filas horizontales compactas.
  - Se igualó el peso visual del "Balance Neto" con los indicadores de "Ingresos", "Egresos" y "Barbería".
  - Reducción de paddings internos (`p-8` → `p-6`) para minimizar el área vacía.
  - Ajuste de ancho máximo en la tabla de ganancias para mejorar la legibilidad en pantallas grandes.
- **Estado**: ✅ Finalizado

#### [2026-03-31] - Sincronización Automática de Fecha (Corte Medianoche)
- **Acción**: Implementación de actualización reactiva de fecha "Hoy" y limpieza de contadores.
- **Descripción**: 
  - Se corrigió un error donde los servicios del día anterior persistían en el contador de "Hoy" después de la medianoche.
  - Implementación de un mecanismo de refresco automático cada 60 segundos en todos los componentes clave (Dashboard, Finanzas, Historial, Estadísticas).
  - Refectorización de `getLocalDateString` para asegurar el formato `YYYY-MM-DD` de forma robusta e independiente de la configuración regional del navegador.
  - Garantía de que el cierre del día calendario (00:00:00) limpia automáticamente las métricas diarias sin requerir recarga manual de la página.
- **Estado**: ✅ Finalizado

#### [2026-03-31] - Prevención de Registros Duplicados
- **Acción**: Implementación de estado de carga en botones de formulario.
- **Descripción**: 
  - Se agregó un estado booleano (`isSubmitting`) en los formularios de registro y edición de servicios.
  - El botón se desactiva dinámicamente y expone un spinner visual de carga mientras interactúa con Firebase.
  - Esto soluciona problemas de doble registro ocasionados por clics repetitivos del usuario mientras se procesan las transacciones bancarias, comisiones y objetivos.
- **Estado**: ✅ Finalizado

#### [2026-03-31] - Modal Personalizado de Eliminación de Registros
- **Acción**: Reemplazo de alerta nativa del navegador.
- **Descripción**: 
  - Se removió la alerta estándar `window.confirm` empleada para la eliminación de servicios históricos.
  - Se diseñó y construyó un modal de confirmación con estética *Premium*, en línea con la interfaz general del dashboard `actas/gastos`.
  - El modal incluye estado de carga propio (`isDeleting`), bloqueando los botones para garantizar que el registro y las respectivas reversiones numéricas se procesen correctamente una sola vez de forma fiable.
  - Optimización de espacio manteniendo una estructura limpia, elegante y directa.
- **Estado**: ✅ Finalizado

#### [2026-06-18] - Implementación de Navegación por Posición (Ciclo Lun-Sáb + Domingos)
- **Acción**: Reemplazo de `getWeekRangeFromOffset` por `getPeriodFromPosition`.
- **Descripción**:
  - Se rediseñó el modelo de navegación temporal: la semana ahora es Lun→Sáb (no Dom→Sáb), y los domingos son periodos independientes que se intercalan entre semanas.
  - Nueva función `getPeriodFromPosition(position)`: posición 0 = semana actual (Lun-Sáb), posición 1 = domingo más reciente, posición 2 = semana anterior, posición 3 = domingo anterior, etc. Ciclo infinito hacia atrás.
  - Se actualizaron los 4 módulos que usan navegación (Dashboard, Finanzas, Historial, Estadísticas) para usar `position` como estado único.
  - Label dinámico: "Semana actual", "Domingo actual", badges verde/ámbar según corresponda.
- **Archivos afectados**:
  - `src/lib/utils.ts` — nueva función `getPeriodFromPosition`, `formatFecha` con `Intl.DateTimeFormat`
  - `src/app/dashboard/page.tsx` — navegación por posición
  - `src/app/dashboard/finanzas/page.tsx` — navegación por posición
  - `src/app/dashboard/historial/page.tsx` — navegación por posición
  - `src/app/dashboard/estadisticas/page.tsx` — navegación por posición
- **Estado**: ✅ Finalizado

#### [2026-06-18] - Sistema de Tasas BCV Automático con Caché
- **Acción**: Creación de API route `/api/bcv-rate` y componente de tasa en Header.
- **Descripción**:
  - Se creó `src/app/api/bcv-rate/route.ts`: endpoint GET que verifica Firestore `settings/bcv`, si el caché tiene menos de 6h lo retorna, si no consulta `ve.dolarapi.com/v1/dolares/oficial`, guarda en Firestore y retorna.
  - Se agregó card BCV azul en `src/components/Header.tsx` con `onSnapshot` a `settings/bcv`, fetch inicial al montar y `setInterval` cada 6h para refresco automático.
  - Mientras la tasa se carga por primera vez, muestra `--` con animación pulse.
  - Si la API externa falla, usa el último valor cacheado como fallback.
- **Archivos afectados**:
  - `src/app/api/bcv-rate/route.ts` (nuevo)
  - `src/components/Header.tsx` — card BCV con auto-refresh
  - `firestore.rules` — regla `settings/{settingId}`
- **Estado**: ✅ Finalizado

#### [2026-06-18] - Precios Duales BCV/Divisa en Servicios y Registro Financiero
- **Acción**: Implementación de modelo de precios duales en todo el sistema.
- **Descripción**:
  - Se agregó `priceDivisa` (precio promocional en USD) a la interfaz `Service` en `src/lib/types.ts`.
  - Se actualizaron las constantes `SERVICES` con precios duales: Corte ($7 BCV / $5 Div), Barba ($4 BCV / $2 Div), Corte+Barba ($10 BCV / $8 Div).
  - Se eliminó "Corte de Cabello Completo" ($8/$6) del listado de servicios base.
  - Se agregaron `paymentMethod` ("bcv" | "divisa") y `bcvRate` (tasa del día) a la interfaz `FinancialRecord`.
  - Se actualizó el formulario de registro en Finanzas: selector de método de pago, campo editable de tasa BCV, precio dinámico que cambia según el método seleccionado.
  - Se actualizó la tabla/cards de Finanzas e Historial para mostrar badge del método de pago.
  - Se actualizó el CRUD de Servicios con campo `priceDivisa` y visualización en tarjetas.
  - Se actualizó el modal de edición en Historial con campos de método de pago y tasa BCV.
- **Archivos afectados**:
  - `src/lib/types.ts` — interfaces y constantes actualizadas
  - `src/app/dashboard/finanzas/page.tsx` — registro con precios duales
  - `src/app/dashboard/historial/page.tsx` — badge pago, edición con método
  - `src/app/dashboard/servicios/page.tsx` — campo priceDivisa en CRUD
- **Estado**: ✅ Finalizado

#### [2026-06-18] - Sistema de Gestión de Pagos a Barberos (Pagos Parciales, Semanales y Adelantos)
- **Acción**: Implementación de modal de pago reutilizable e integración en Personal y Finanzas.
- **Descripción**:
  - Se creó `RegistrarPagoModal.tsx` como componente modal premium para que el administrador registre pagos a barberos.
  - El modal muestra el saldo acumulado en tiempo real (`onSnapshot` a `bank/{barberId}`) y las ganancias del periodo actual como referencia.
  - Incluye selector de concepto con opciones predefinidas: Pago Semanal, Pago Semanal - Parcial, Pago de Domingo, Adelanto de Domingo, Adelanto Semanal, u Otro (personalizado).
  - Botones rápidos "Período" y "Todo" para cargar automáticamente el monto correspondiente.
  - Alerta visual si el monto supera el saldo disponible (sobregiro/adelanto).
  - Al confirmar, descuenta el monto de `bank/{barberId}.balance`, incrementa `totalPaid` y crea transacción `type: "withdrawal"` en `bank_transactions/`.
  - Integrado en **Personal**: botón "Registrar Pago" en cada tarjeta de barbero (solo admin).
  - Integrado en **Finanzas**: botón de billetera junto al nombre de cada barbero en el desglose semanal (solo admin).
  - El desglose de barberos en Finanzas ahora incluye `barberId` para identificar correctamente al barbero al abrir el modal.
- **Archivos afectados**:
  - `src/components/RegistrarPagoModal.tsx` (nuevo)
  - `src/app/dashboard/personal/page.tsx` — integración del modal en tarjetas de barberos
  - `src/app/dashboard/finanzas/page.tsx` — integración del modal en desglose semanal + barberId en acumulador
  - `docs-obsidian/Gestion Financiera.md` — documentación del sistema de pagos
  - `docs-obsidian/Modelo de Negocio.md` — casos de uso de liquidación
- **Estado**: ✅ Finalizado

#### [2026-06-21] - Sistema de Gestión de Usuarios y Primer Ingreso
- **Acción**: Implementación completa del sistema de usuarios con 3 roles, AuthGuard, y flujo de primer inicio.
- **Descripción**:
  - Se implementó el sistema de 3 roles: `superadmin` (gestión total de usuarios), `admin` (gestión del negocio) y `barber` (autogestión).
  - **Nuevas páginas**: `/dashboard/usuarios` (gestión de usuarios solo superadmin), `/cambiar-contrasena` (primer inicio de barberos), `/bloqueado` (mensaje de bloqueo).
  - **AuthContext con onSnapshot**: Cambios en tiempo real. Si un superadmin bloquea a un usuario, el AuthGuard lo detecta inmediatamente y redirige a `/bloqueado`.
  - **AuthGuard** (`src/components/providers/AuthGuard.tsx`): Orden de verificación: loading → no autenticado → primer inicio → bloqueado → roles. Rutas públicas: `/login`, `/bloqueado`, `/cambiar-contrasena`.
  - **Nuevos campos en `users/`**: `primerInicio` (boolean), `bloqueado` (boolean), `creadoEn` (string ISO), `creadoPor` (UID opcional).
  - **Nuevos endpoints API**: `GET /api/usuarios`, `POST /api/usuarios`, `PATCH /api/usuarios/[uid]`, `DELETE /api/usuarios/[uid]`, `PATCH /api/usuarios/[uid]/cambiar-contrasena`.
  - Las rutas `/api/barbers` fueron reemplazadas por `/api/usuarios` como estándar.
  - Solo superadmin puede crear, editar, bloquear/desbloquear y eliminar usuarios.
  - Los barberos nuevos (`primerInicio: true`) deben cambiar su contraseña en el primer ingreso (mín 6 caracteres).
  - **Firestore Rules** actualizadas: `isAdmin()` ahora incluye `superadmin`, nueva función `isSuperadmin()`, `users/` solo escribible por superadmin.
- **Archivos afectados**:
  - `src/app/dashboard/usuarios/page.tsx` (nuevo)
  - `src/app/cambiar-contrasena/page.tsx` (nuevo)
  - `src/app/bloqueado/page.tsx` (nuevo)
  - `src/components/providers/AuthGuard.tsx` (nuevo)
  - `src/context/AuthContext.tsx` — onSnapshot para tiempo real
  - `src/app/api/usuarios/route.ts` (nuevo)
  - `src/app/api/usuarios/[uid]/route.ts` (nuevo)
  - `src/app/api/usuarios/[uid]/cambiar-contrasena/route.ts` (nuevo)
  - `src/lib/types.ts` — nuevos campos en UserRole
  - `firestore.rules` — nuevas funciones y reglas
  - `docs-obsidian/Flujo de Usuarios.md` (nuevo)
  - `docs-obsidian/Roles y Permisos.md` — 3 roles, nueva matriz
  - `docs-obsidian/Base de Datos.md` — nuevos campos users/
  - `docs-obsidian/Reglas de Seguridad.md` — isAdmin+isSuperadmin
  - `docs-obsidian/API.md` — endpoints actualizados
  - `docs-obsidian/Arquitectura del Sistema.md` — AuthGuard
  - `docs-obsidian/Modulos del Sistema.md` — módulo usuarios
  - `docs-obsidian/Home.md` — roles y datos clave
- **Estado**: ✅ Finalizado

---

#### [2026-06-22] - Limpieza de Barbería en Vistas de Barbero + N° Referencia en Registro
- **Contexto**: Sesión de refinamiento de UX eliminando información de Barbería (40%) para barberos en todas las vistas.
- **Descripción**:
  - **Dashboard barbero**: Eliminado el card de "Barbería (40%)" de la distribución de ganancias. Agregado ranking de todos los barberos ordenado por su ganancia personal (`barberShare`). Se agregó un segundo `onSnapshot` para obtener todos los registros necesarios para el ranking.
  - **Finanzas barbero**: Ocultada la card "Barbería (40%)" y las filas de Barbería en el desglose de "Ingresos de la semana". Grilla ajustada a 3 columnas. Subtítulo adaptado según rol.
  - **Historial barbero**: Ocultada la card de métrica "Barbería (40%)", la columna en la tabla y el card móvil de Barbería. Grillas ajustadas dinámicamente.
  - **Estadísticas barbero**: Ocultada la card "Barbería" y grilla ajustada a 4 columnas.
  - **Modal de registro**: Agregado campo opcional "N° Referencia" que solo almacena los últimos 4 dígitos numéricos. Se guarda en Firestore como `numeroReferencia` si se completa.
  - **Perfil barbero**: Eliminado botón "Retirar" y modal de retiro de ganancias del card de Banca. Agregada clase `scrollbar-personalizada` con estilos CSS para scroll del historial de transacciones (barra delgada semitransparente, fuera de `@layer` para compatibilidad con pseudo-elementos).
  - **Fix scrollbar desktop**: Los pseudo-elementos `::-webkit-scrollbar-button` y `::-webkit-scrollbar-corner` se ocultaron explícitamente para que la scrollbar personalizada funcione también en escritorio. Se agregó `min-height: 32px` al thumb y se elevó la opacidad para mejor visibilidad.
  - **Captura de pago en modal**: Agregado campo opcional para subir captura de pantalla del pago. Al hacer clic en "Registrar", si hay archivo seleccionado, se sube primero a ImageKit en la carpeta `/pagos/` via API Route protegida (solo imágenes, máx 5MB). Se almacenan `capturaURL` (URL pública) y `capturaFileId` (ID interno para limpieza) en el documento `finances/`.
  - **CRON limpieza 30 días**: Endpoint `/api/cron/limpiar-capturas` que se ejecuta diariamente (Vercel CRON `0 0 * * *`). Consulta registros `finances/` con `createdAt` > 30 días y `capturaFileId` existente, elimina las imágenes de ImageKit vía API y remueve los campos `capturaURL`/`capturaFileId` de Firestore.
- **Archivos afectados**:
  - `src/app/dashboard/page.tsx` — distribución, ranking
  - `src/app/dashboard/finanzas/page.tsx` — ocultar barbería
  - `src/app/dashboard/historial/page.tsx` — ocultar barbería
  - `src/app/dashboard/estadisticas/page.tsx` — ocultar barbería
  - `src/components/RegisterServiceModal.tsx` — campo N° Referencia + captura de pago
  - `src/app/dashboard/perfil/page.tsx` — eliminar retiro, limpiar imports
  - `src/app/globals.css` — scrollbar personalizada
  - `src/lib/types.ts` — capturaURL, capturaFileId en FinancialRecord
  - `src/app/api/upload-captura/route.ts` (nuevo) — subida a ImageKit
  - `src/app/api/cron/limpiar-capturas/route.ts` (nuevo) — limpieza 30 días
  - `vercel.json` (nuevo) — CRON schedule
- **Estado**: ✅ Finalizado

---
#### [2026-06-21] - Fix: Scroll en Android, Sidebar Back Gesture, Login Timeout, y Script de Reset
- **Contexto**: Sesión de corrección de bugs multiplataforma (iOS vs Android).
- **Descripción**:
  - **Scroll en Android**: El layout del dashboard usaba `flex-1` + `overflow-y-auto` sin `min-h-0`. Chrome Android requiere `min-height: 0` explícito en flex children para que `overflow-y: auto` funcione. iOS Safari era permisivo. Se agregó `min-h-0` al contenedor scrollable (`DashboardLayout.tsx`).
  - **Sidebar back gesture**: Se implementó cierre del sidebar con gesto de retroceso en móvil. Al abrir el sidebar se pushea un estado al historial; `popstate` vuelve a pushear el estado (cancela la navegación) y cierra el sidebar. Implementado en `Sidebar.tsx` con `useEffect` + `window.history.pushState`.
  - **Login timeout (Android)**: `signInWithEmailAndPassword` e `getIdToken` pueden colgarse en Android Chrome. Se agregó `Promise.race` con timeout de 10s en `handleLogin`. Además, se agregó `router.replace("/dashboard")` inmediato después de setear la cookie para no depender de `onAuthStateChanged`.
  - **Password change loop**: El cambio de contraseña vía Admin SDK invalidaba la sesión. Al redirigir con `window.location.href`, el middleware perdía la cookie y enviaba al login. Fix: re-autenticar al usuario con `signInWithEmailAndPassword` usando la nueva contraseña y renovar la cookie antes de redirigir.
  - **resetCompleto.js**: Script que borra TODOS los datos de Firestore y Firebase Auth excepto el superadmin (identificado por `role === "superadmin"`). Agregado a `.gitignore`.
- **Archivos afectados**:
  - `src/components/DashboardLayout.tsx` — `min-h-0` en scroll container
  - `src/components/Sidebar.tsx` — back gesture handler + `popstate` pushState
  - `src/app/login/page.tsx` — timeout 10s + redirect directo
  - `src/app/cambiar-contrasena/page.tsx` — re-auth con nueva contraseña + renovar cookie + `window.location.href`
  - `resetCompleto.js` (nuevo, ignorado por git)
  - `.gitignore` — agregado resetCompleto.js
  - `docs-obsidian/Flujo de Usuarios.md` — actualizado con re-auth y timeout
- **Lección técnica**: `min-height: 0` es necesario en flex children con `overflow-y: auto` para Chrome Android. `overscroll-behavior: contain` rompe scroll en Android. El cambio de contraseña vía Admin SDK puede invalidar la sesión; siempre re-autenticar al usuario con las nuevas credenciales.
- **Estado**: ✅ Finalizado

---
#### [2026-06-22] - Sistema de Propinas Voluntarias (100% Barbero)
- **Contexto**: Solicitud de funcionalidad para registrar propinas en los servicios.
- **Descripción**:
  - **Modal de registro**: Nuevo toggle "Incluir Propina" con estilo ámbar (consistente con diseño premium). Al activarse, aparece un input numérico para el monto. La propina se suma 100% al barbero (no se divide 60/40).
  - **Cálculo**: `barberShare = totalAmount × 0.6 + propina`. La propina se almacena como campo separado `propina` en `finances/` y también se refleja en `barberShare`.
  - **Banco barbero**: El depósito al banco del barbero incluye la propina (`balance += barberShare + propina`). La transacción de earning menciona la propina si existe.
  - **Visibilidad global**: La propina se muestra en Dashboard (distribución admin + barbero, ranking), Finanzas (desglose con barra ámbar), Historial (columna en tabla + card mobile) y Estadísticas (card de métrica "Propina").
  - **Ranking**: El ranking de barberos incluye la propina en el cálculo de ganancias totales.
  - **No editable**: La propina no se puede modificar desde el modal de edición del historial. Al editar un registro, se preserva el valor de propina original.
- **Archivos afectados**:
  - `src/lib/types.ts` — campo `propina` en FinancialRecord
  - `src/components/RegisterServiceModal.tsx` — toggle + input propina, lógica de cálculo
  - `src/app/dashboard/page.tsx` — distribución admin con propina, barber view con propina
  - `src/app/dashboard/finanzas/page.tsx` — desglose con barra de propina
  - `src/app/dashboard/historial/page.tsx` — columna propina en tabla, card mobile, preservación en edit
  - `src/app/dashboard/estadisticas/page.tsx` — card de métrica propina
  - `docs-obsidian/Flujo de Registro de Servicio.md` — actualizado con flujo de propina
  - `docs-obsidian/documentacion.txt` — entrada cronológica
- **Estado**: ✅ Finalizado

---
#### [2026-06-24] - Fix: Modal Personalizado para Eliminar Fiado
- **Contexto**: El botón de eliminar en la lista "Por Cobrar" usaba el `confirm()` nativo del navegador en lugar del sistema de modales personalizados.
- **Descripción**:
  - Se reemplazó el `window.confirm()` en `handleEliminarFiado` dentro de `finanzas/page.tsx`.
  - Se implementó el patrón estándar del sistema: estado `recordAEliminar` que al activarse renderiza un modal overlay con fondo blur, detalles del registro, y botones Cancelar/Eliminar con estilos danger.
  - La función `confirmarEliminacionFiado` ejecuta el `deleteDoc` y muestra toast de éxito/error.
  - Consistente con el modal de eliminación usado en Historial (`historial/page.tsx`).
- **Archivos afectados**:
  - `src/app/dashboard/finanzas/page.tsx` — nuevo estado, funciones y modal
  - `docs-obsidian/05_Handover_Sesion.md` — actualizado
- **Estado**: ✅ Finalizado

---
#### [2026-06-25] - Conversión Bs en Precio BCV + Scrollbar Sidebar
- **Contexto**: Mejora UX en página de servicios y sidebar.
- **Descripción**:
  - **Servicios**: Se agregó `onSnapshot` a `settings/bcv` para mostrar la tasa BCV en tiempo real. Debajo del precio BCV ($X) en las cards de servicio aparece el equivalente en bolívares (`Bs X.XX`). En el modal de Nuevo/Editar Servicio, al escribir el precio, la conversión a Bs se muestra en vivo dentro del mismo input (lado derecho, `pointer-events-none`).
  - **Sidebar**: Se agregó la clase `scrollbar-personalizada` al nav del sidebar para que cuando el contenido exceda la altura, la scrollbar use los estilos del proyecto (thin, thumb translúcido, sin botones) en lugar de la scrollbar nativa del navegador.
- **Archivos afectados**:
  - `src/app/dashboard/servicios/page.tsx` — onSnapshot bcvRate, conversión en card y dentro del input del modal
  - `src/components/Sidebar.tsx` — clase scrollbar-personalizada agregada al nav
  - `docs-obsidian/06_Handover_Sesion.md` — actualizado
- **Estado**: ✅ Finalizado

---
#### [2026-06-25] - Header: Unificar Online, Tasa BCV y Fecha
- **Contexto**: Refactor visual del Header para compactar información de estado.
- **Descripción**:
  - Se eliminó el badge azul independiente de la tasa BCV.
  - La tasa BCV ahora se muestra inline a la derecha de ONLINE, con un círculo azul similar al verde de ONLINE, dentro del mismo contenedor.
  - La fecha se movió debajo de ONLINE + BCV, en el mismo contenedor, con texto blanco.
  - Contenedor unificado con `rounded-xl` en lugar de elementos separados.
- **Archivos afectados**:
  - `src/components/Header.tsx` — reestructuración del layout derecho
- **Estado**: ✅ Finalizado

---
#### [2026-06-25] - Bottom Nav Móvil + Refinamientos UX
- **Contexto**: Reemplazo del menú hamburguesa por navegación inferior nativa en móvil, con múltiples refinamientos de animación y experiencia.
- **Descripción**:
  - **Bottom nav**: Barra flotante con `max-w-md`, bordes `rounded-2xl` y sombra. Layout `grid grid-cols-5` para centrar exactamente el botón Menú. Texto de botones en `text-[9px] font-bold tracking-widest uppercase`.
  - **5 elementos**: Resumen, Finanzas, Menú (central con glow rojo y ChevronDown que rota 180°), Estadísticas y Barberos o Perfil según el rol.
  - **Bottom sheet**: Se abre con `animate-slide-up` y cierra con `animate-slide-down`. El cierre usa listener nativo `animationend` con `{ once: true }` vía `useRef` en lugar de React synthetic events, asegurando timing exacto.
  - **Toggle**: Al hacer tap en Menú estando abierto, se cierra el sheet. El botón central cambia de escala/glow al abrir.
  - **Backdrop**: Usa `transition-opacity` CSS en lugar de keyframe animations para evitar flash del `backdrop-blur-sm` al desmontarse.
  - **Body scroll**: La gestión del scroll del body se movió al padre con `useEffect` sobre `sheetOpen`. Al cerrar, restaura el overflow con `setTimeout` de 100ms para evitar layout shift por reaparición de scrollbar.
  - Se eliminó el hook `useLockBodyScroll` en favor de lógica inline en el padre.
  - Se eliminó el botón hamburguesa del Header y su prop `onOpenSidebar`.
  - Se agregó `pb-24 lg:pb-12` al contenedor de contenido para evitar superposición con el bottom nav.
  - Utilidades CSS agregadas: `safe-area-inset-bottom`, `@keyframes slide-up`, `slide-down`, `fade-in`, `fade-out`.
- **Archivos afectados**:
  - `src/components/MobileBottomNav.tsx` — creación y todos los refinamientos posteriores
  - `src/hooks/useLockBodyScroll.ts` — creado y luego eliminado
  - `src/components/DashboardLayout.tsx` — integración bottom nav + padding
  - `src/components/Header.tsx` — eliminado hamburguesa, prop y Menu import
  - `src/app/globals.css` — animaciones slide-up/down, fade-in/out, safe-area
  - `src/app/dashboard/personal/page.tsx` — fix race condition y eliminación cards
- **Estado**: ✅ Finalizado

---
#### [2026-06-25] - Fix Personal: Race Condition + Limpieza UI
- **Contexto**: La página de Barberos no cargaba correctamente los datos en ocasiones. Además se solicitó eliminar las cards de estadísticas.
- **Descripción**:
  - **Race condition**: Los 3 `onSnapshot` (users, bank, finances) escribían sobre `barbers`. Si `users` se disparaba después de `finances`, pisaba los datos de finanzas dejando los barberos en 0 hasta el próximo cambio en la colección.
  - **Solución**: Se creó `financeStats` como estado independiente. `barbersWithBank` ahora fusina los 3 orígenes (barbers, bankBalances, financeStats) en un solo `useMemo`. Se agregaron flags `usersLoaded`/`financeLoaded` para que `loading` espere a ambos antes de mostrar la UI.
  - **Cards eliminadas**: Total Equipo, Servicios, Promedio x Barbero y Saldo Pendiente. Se limpió el import de `Activity`.
- **Archivos afectados**:
  - `src/app/dashboard/personal/page.tsx` — refactor listeners, eliminar cards
- **Estado**: ✅ Finalizado

---
#### [2026-06-24] - Flujo Fiado Completo: Ocultar Campos + Modal de Cobro
- **Contexto**: El modal de registro mostraba campos de pago innecesarios al marcar como fiado. Al cobrar un fiado, se necesitaba capturar método de pago, propina, referencia y captura.
- **Descripción**:
  - **RegisterServiceModal**: Al activar Fiado se ocultan Método de Pago, N° Referencia, Propina y Captura. El precio muestra "Monto Fiado" sin tasa BCV ni desglose de propina.
  - **Reorder de campos**: Cliente se movió arriba de Fiado y Método de Pago. Fiado quedó entre Cliente y Método de Pago.
  - **Modal de Cobro Fiado**: Nuevo modal en finanzas que se abre al hacer clic en "Pagado" en la lista Por Cobrar. Muestra datos del registro (barbero, servicio, cliente, monto fijo) y formulario completo de pago: método de pago (3 columnas igual que registro), tasa BCV automática con monto en bolívares grande en azul, propina opcional, referencia y captura.
  - `handleConfirmarCobro`: Sube captura a ImageKit si existe, actualiza el registro en Firestore con todos los campos (paymentMethod, bcvRate, propina, referencia, captura), recalcula barberShare con propina, y ejecuta lógica bancaria completa (bancos, transacciones, objetivos).
- **Archivos afectados**:
  - `src/components/RegisterServiceModal.tsx` — reorden, ocultar inputs en fiado
  - `src/app/dashboard/finanzas/page.tsx` — modal cobro, estados, handler confirmar
  - `docs-obsidian/05_Handover_Sesion.md` — actualizado
- **Estado**: ✅ Finalizado

---
#### [2026-06-24] - Conversión Propina Bs→USD con Tasa BCV
- **Contexto**: Las finanzas del sistema se manejan en USD, pero la propina en pagos BCV se ingresa en bolívares y debe convertirse.
- **Descripción**:
  - Fórmula de conversión: `propinaUSD = propinaBs / bcvRate`
  - **RegisterServiceModal**: propinaAmount se calcula dividiendo el input entre bcvRate si paymentMethod es "bcv". Placeholder dinámico "Monto en Bs" / "Monto en USD ($)". Indicador visual debajo del input: `≈ $15.27 (Bs 1000 ÷ 65.50)`.
  - **Cobro Fiado Modal** (finanzas): misma lógica de conversión, placeholder e indicador.
  - **Historial (edición)**: propina ahora editable. Al abrir el modal se revierte la conversión para mostrar el valor original en Bs. Al guardar se convierte aplicando la tasa BCV del formulario. Se persiste `propina` en `updateDoc`.
- **Archivos afectados**:
  - `src/components/RegisterServiceModal.tsx` — cálculo propinaAmount con conversión, placeholder dinámico
  - `src/app/dashboard/finanzas/page.tsx` — conversión en handleConfirmarCobro, placeholder e indicador
  - `src/app/dashboard/historial/page.tsx` — estados incluyePropinaEdit/propinaEditInput, inicialización, input editable y conversión
  - `docs-obsidian/05_Handover_Sesion.md` — actualizado
- **Estado**: ✅ Finalizado
