---
tags: [handover, progreso, frontend, fiado, por-cobrar]
date: 2026-06-23
status: activo
---

# 🪪 Handover — Sesión 23/06/2026

## Módulo: Sistema Fiado (Por Cobrar) + Línea Propina en Finanzas

### Cambios Realizados (Sesión Base)

1. **Nuevo campo `estado` en `finances/`**: Se agregó `estado?: "pendiente" | "pagado"` a `FinancialRecord`. Los registros sin `estado` se tratan como `"pagado"` (backwards compatible).

2. **Toggle "Fiado" en modal de registro**: Nuevo toggle púrpura en `RegisterServiceModal` que al activarse crea el registro con `estado: "pendiente"` y omite toda la lógica bancaria (banco barbero, barbería, transacciones, objetivos). Al desactivarse, se crea con `estado: "pagado"` y fluye normal.

3. **Nueva pestaña "Por Cobrar" en Finanzas**: Tab alterno en la página de finanzas que lista todos los servicios con `estado: "pendiente"`.

4. **Botón "Pagado" en Por Cobrar**: Al hacer clic, cambia `estado: "pagado"`, actualiza `date` a la fecha actual, y ejecuta toda la lógica bancaria.

5. **Filtro en reportes**: Dashboard, Historial, Estadísticas y Personal ahora excluyen `estado === "pendiente"`.

6. **Card de Propina en Finanzas**: Nueva card ámbar en métricas. Línea "Propina" siempre visible en el desglose.

7. **Scroll modal**: Scroll interno en el modal de registro con clase `no-scrollbar`.

### Cambios Realizados (Sesión Actual — Refinamiento UI)

8. **Columnas de Historial combinadas**: Tabla escritorio pasó de 12 a 7-8 columnas. Pago unifica badge + ref # + captura (stack vertical). Total muestra propina inline `(+$X.XX)`. Reparto unifica 60%/40% en una celda.

9. **Icono Captura mejorado**: Se reemplazó `ImageIcon` (genérico) por `Camera` (lucide). Ref más resaltada con `font-semibold` y `text-white`.

10. **Propina siempre visible en distribución**: La línea Propina en cada card de barbero del Dashboard ahora siempre se muestra (incluso en $0.00).

11. **Ranking sin propina**: El ranking de barberos en Dashboard ahora usa `barberShare - propina` para que solo refleje ingresos por servicios (60%), sin incluir propina.

### Archivos modificados
- `src/lib/types.ts` — campo `estado` en `FinancialRecord`
- `src/components/RegisterServiceModal.tsx` — toggle fiado + scroll interno
- `src/app/dashboard/finanzas/page.tsx` — pestaña Por Cobrar + card propina + filtro pendiente + handler pago
- `src/app/dashboard/historial/page.tsx` — columnas combinadas (Pago unifica badge+ref+captura, Total incluye propina inline, Reparto unifica 60%/40%), reemplazo ImageIcon por Camera
- `src/app/dashboard/estadisticas/page.tsx` — filtro `estado !== "pendiente"`
- `src/app/dashboard/personal/page.tsx` — filtro `estado !== "pendiente"`
- `src/app/dashboard/page.tsx` — filtro `estado !== "pendiente"`; propina siempre visible en cards de distribución; ranking usa `barberShare - propina`

### Lecciones Técnicas
- El filtro `estado !== "pendiente"` se aplica del lado del cliente (JavaScript filter) en lugar de Firestore queries para evitar índices compuestos adicionales y mantener compatibilidad con registros legacy sin el campo `estado`.
- La lógica bancaria al marcar como pagado duplica la lógica de `RegisterServiceModal`. Considerar extraer a una función compartida si se repite.

### Cambios Realizados (Sesión Actual — Fix UX)

12. **Modal personalizado para eliminar fiado**: Se reemplazó el `confirm()` nativo del navegador en `handleEliminarFiado` por un modal personalizado con el estilo del sistema (fondo blur, borde danger, cancelar/eliminar). El flujo ahora usa estado `recordAEliminar` para controlar la apertura.

13. **Reorden de campos en RegisterServiceModal**: Cliente se movió arriba del método de pago. Fiado se movió entre Cliente y Método de Pago.

14. **Campos ocultos al marcar Fiado**: Cuando `esFiado=true` se ocultan Método de Pago, N° Referencia, Propina y Captura. El precio cambia a "Monto Fiado" sin tasa BCV ni propina.

15. **Modal de Cobro Fiado**: `handleMarcarPagado` ahora abre un modal con los datos del registro (servicio, barbero, cliente, monto fijo) y campos para capturar el pago: método de pago (3 columnas), tasa BCV automática con monto en azul grande, propina, referencia y captura. Al confirmar se actualiza el registro con todos los datos y se ejecuta la lógica bancaria.

16. **Conversión propina Bs→USD**: Cuando el método de pago es BCV, la propina se ingresa en bolívares y se convierte a USD dividiendo entre la tasa BCV (`propinaUSD = propinaBs / bcvRate`). Placeholder dinámico según método de pago ("Monto en Bs" / "Monto en USD ($)") e indicador visual de conversión debajo del input. Aplica en:
    - RegisterServiceModal (registro normal)
    - Modal de Cobro Fiado
    - Modal de edición en Historial (propina ahora editable con conversión)

### Archivos modificados
- `src/components/RegisterServiceModal.tsx` — reorden de campos, ocultar inputs cuando esFiado, conversión propina Bs→USD
- `src/app/dashboard/finanzas/page.tsx` — modal cobro fiado con todos los campos de pago, handleMarcarPagado redirige a modal, handleConfirmarCobro con lógica bancaria, conversión propina Bs→USD
- `src/app/dashboard/historial/page.tsx` — propina editable en modal de edición con conversión Bs→USD

### Pendiente
- Verificar que el sistema fiado funcione correctamente con datos reales.
- Confirmar que los balances bancarios se actualicen correctamente al cobrar un fiado.

### Primera tarea próxima sesión
Verificar funcionamiento del flujo fiado completo con datos reales.
