---
tags: [handover, fix, propina, conversion, bcv, emulador, desarrollo]
date: 2026-06-24
status: activo
---

# 🛠️ Handover — Sesión 24/06/2026

## Módulo: Fix Propina Bs→USD + Emuladores Firebase

### Cambios Realizados

1. **Fix conversión propina Bs→USD**: Cuando el método de pago es BCV, la propina se ingresa en bolívares y debe convertirse a USD (`propinaUSD = propinaBs / tasaBCV`). Si el documento `settings/bcv` no existía en Firestore (emulador o primera ejecución), `bcvRateDb` era `null` y el sistema guardaba el monto en Bs como si fueran USD (ej: 1000 Bs → 1000 USD incorrecto, en vez de ~1.62 USD).

2. **Fetch automático de tasa BCV**: Al abrir cualquier modal que maneje propina (registro, cobro fiado, edición historial), se dispara `fetch("/api/bcv-rate")` para asegurar que el documento `settings/bcv` exista en Firestore antes de que el usuario complete el formulario.

3. **Validación al guardar**: En los 3 componentes se agregó un guard que verifica:
   - Si hay propina ingresada (`rawPropina > 0`)
   - El método de pago es BCV (`paymentMethod === "bcv"`)
   - La tasa BCV no está disponible (`!bcvRateDb`)
   - → Muestra error y bloquea el envío

4. **Configuración de Firebase Emulator Suite**: Entorno de desarrollo local aislado:
   - `firebase.json` con emuladores de Auth y Firestore
   - `src/lib/firebase.ts` con conexión condicional via `NEXT_PUBLIC_USE_EMULATOR=true`
   - `scripts/seed-emulator.mjs` que crea: 3 usuarios (superadmin, admin, barber), cuentas bancarias, servicios base y `settings/bcv` con tasa inicial de Bs 55
   - Scripts npm: `emu`, `emu:seed`, `dev:emu`

5. **Documentación**: `.env.example` creado y `seed-emulator.mjs` agregado a `.gitignore`.

6. **Fix columna 60%/40% en historial**: La columna de reparto mostraba `r.barberShare` (que incluye propina). Se corrigió para mostrar solo la comisión del servicio: `r.barberShare - r.propina`. Aplica tanto en tabla escritorio como cards móviles.

7. **Propina debajo del total**: En la columna Total de la tabla escritorio, la propina se movió de inline `(+$X.XX)` a una línea separada debajo del monto para mejor legibilidad.

### Archivos modificados
- `src/components/RegisterServiceModal.tsx` — fetch BCV rate + validación propina
- `src/app/dashboard/finanzas/page.tsx` — fetch BCV rate + validación propina en cobro fiado
- `src/app/dashboard/historial/page.tsx` — fetch BCV rate + validación propina en edición
- `firebase.json` — sección emulators (auth:9099, firestore:8080, ui:4000)
- `src/lib/firebase.ts` — conexión condicional a emuladores
- `package.json` — scripts dev:emu, emu, emu:seed
- `.gitignore` — ignore seed-emulator.mjs

**Archivos nuevos:**
- `.env.example` — template de variables de entorno
- `scripts/seed-emulator.mjs` — seed para emulador (gitignored)

### Lecciones Técnicas
- El documento `settings/bcv` debe existir en Firestore para que la conversión propina Bs→USD funcione. Si no existe, `bcvRateDb` es `null` y el raw input se guarda sin convertir.
- `fetch("/api/bcv-rate")` consulta la API externa de dolarapi.com y escribe en `settings/bcv` con TTL de 6 horas. Llamarlo al abrir modales asegura que el documento exista.
- Los emuladores de Firebase requieren Java 21+. En Debian/Ubuntu: `sudo apt install openjdk-21-jre`.
- La UI de emuladores está en `http://localhost:4000`. Los datos del emulador son completamente aislados de producción.

### Pruebas Realizadas ✅
- [x] Propina BCV: 1000 Bs → ~$1.62 USD correcto
- [x] Propina sin tasa BCV: bloquea con error
- [x] Cobro fiado con propina: conversión y balance correctos
- [x] Edición historial: reconversión Bs↔USD correcta
- [x] Propina con divisa: sin conversión, valor directo en USD
- [x] Columna 60%/40% ya no suma propina al 60%
- [x] Propina ahora debajo del monto en columna Total (escritorio)

8. **Conversión Bs en tiempo real (Servicios)**: Se agregó `onSnapshot` a `settings/bcv` para obtener la tasa BCV automáticamente. En las cards de servicio, debajo del precio BCV ($X) se muestra `Bs X.XX`. En el modal de creación/edición, la conversión a Bs aparece en vivo dentro del input al escribir el precio.

9. **Scrollbar personalizada en Sidebar**: Se agregó la clase `scrollbar-personalizada` al nav del sidebar para que use los estilos del proyecto (thin, thumb translúcido, sin botones) cuando el contenido excede la altura disponible.

### Archivos modificados (cont.)
- `src/app/dashboard/servicios/page.tsx` — onSnapshot bcvRate, conversión en card y dentro del input del modal
- `src/components/Sidebar.tsx` — clase scrollbar-personalizada agregada al nav
- `src/components/Header.tsx` — BCV inline con ONLINE, fecha debajo en contenedor único
- `src/components/MobileBottomNav.tsx` (nuevo) — bottom nav 5 items + bottom sheet
- `src/components/DashboardLayout.tsx` — integración MobileBottomNav + padding inferior
- `src/hooks/useLockBodyScroll.ts` (nuevo) — hook para bloquear scroll del body
- `src/app/globals.css` — animación slide-up y safe-area-inset-bottom

10. **Bottom nav móvil**: Se reemplazó el menú hamburguesa del Header por una barra de navegación inferior fija con 5 elementos: Resumen, Finanzas, Menú (central), Estadísticas y Barberos (o Perfil si el rol no tiene acceso a Barberos). El botón central "Menú" abre/cierra un bottom sheet con todas las opciones restantes del sidebar filtradas por rol (Servicios, Inventario, Historial, Objetivos, Administración, Perfil, Usuarios). La barra es flotante (no pegada al borde inferior) con bordes redondeados, sombra y ancho máximo acotado. Se eliminó el botón hamburguesa del Header.

11. **Refinamientos bottom nav**: La barra pasó a layout `grid grid-cols-5` para que el botón Menú quede exactamente centrado. El texto de los botones se mantuvo en `text-[9px]`. El bottom sheet ahora tiene animación `slide-up` al abrir y `slide-down` al cerrar (sin setTimeout, usando `animationend` nativo con `{ once: true }` para un timing preciso). Se agregaron animaciones de opacidad en el backdrop y se eliminó el parpadeo al restaurar el scroll del body con un retardo de 100ms. Se eliminó el hook `useLockBodyScroll` (reemplazado por gestión directa en el padre).

12. **Fix race condition en Personal**: Los 3 listeners `onSnapshot` (users, bank, finances) competían entre sí. Si `users` se disparaba después de `finances`, pisaba los datos y los barberos quedaban en 0. Se separó `financeStats` en su propio estado (como `bankBalances`) y se fusiona todo en `barbersWithBank` via `useMemo`. Además, `loading` ahora espera a que ambos listeners (users + finances) hayan cargado antes de mostrar la UI.

13. **Cards de estadísticas eliminadas**: Se retiraron las 4 cards de métricas (Total Equipo, Servicios, Promedio x Barbero, Saldo Pendiente) de la página Personal por solicitud del usuario. También se limpió el import de `Activity` de lucide.

### Archivos modificados (cont.)
- `src/components/MobileBottomNav.tsx` — grid 5 columnas, toggle close, animaciones slide-up/down, native animationend listener, backdrop con transición CSS, gestión de body scroll en padre
- `src/app/globals.css` — keyframes slide-up, slide-down, fade-in, fade-out
- `src/hooks/useLockBodyScroll.ts` — eliminado (reemplazado por lógica inline)
- `src/app/dashboard/personal/page.tsx` — fix race condition listeners, eliminar cards estadísticas

### Primera tarea próxima sesión
Continuar con mejoras en el sistema de fiado o siguiente módulo pendiente.
