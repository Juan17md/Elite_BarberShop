# 📦 Módulos del Sistema

> Descripción de cada módulo accesible desde el sidebar del dashboard.

---

## Panel de Navegación

El sidebar (`src/components/Sidebar.tsx`) muestra diferentes opciones según el rol:

| Módulo | Superadmin | Admin | Barbero |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Actas | ✅ | ✅ | ❌ |
| Finanzas | ✅ | ✅ (solo sus registros) | ✅ (solo sus registros) |
| Historial | ✅ | ✅ (solo su historial) | ✅ (solo su historial) |
| Estadísticas | ✅ | ✅ (solo sus stats) | ✅ (solo sus stats) |
| Objetivos | ✅ | ✅ (solo sus objetivos) | ✅ (solo sus objetivos) |
| Citas | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | ✅ |
| Personal | ✅ | ✅ | ❌ |
| Servicios | ✅ | ✅ | ✅ |
| Inventario | ✅ | ✅ | ❌ |
| Usuarios | ✅ | ❌ | ❌ |
| Perfil | ✅ | ✅ | ✅ |

---

## Descripción de Módulos

### 📊 Dashboard (`/dashboard`)
**Archivo**: `src/app/dashboard/page.tsx`

Vista principal con resumen operativo. Navegación cíclica por posición (Lun→Sáb + Domingos independientes).

**Admin**:
- Cards de ingresos: Hoy, Semana, Mes
- Top barberos con ranking
- Distribución de ganancias por barbero
- Servicios recientes (vista móvil: cards con layout compacto, badge de pago anclado a la derecha)

**Barbero**:
- Ingresos propios del día/semana/mes
- Acciones rápidas
- Distribución semanal de ganancias (solo su parte 60%, sin Barbería)
- Ranking de barberos por ganancia personal

---

### 📝 Actas (`/dashboard/actas`)
**Archivo**: `src/app/dashboard/actas/page.tsx` (244 líneas)

Registro de ingresos extra (actas) y gastos operativos.

- **Pestaña Actas**: Ingresos adicionales (venta de productos, propinas, etc.)
- **Pestaña Gastos**: Egresos (alquiler, suministros, servicios)
- Modal de registro rápido
- Filtro por semana
- Solo admin

---

### 💰 Finanzas (`/dashboard/finanzas`)
**Archivo**: `src/app/dashboard/finanzas/page.tsx` (1197 líneas)

**Núcleo financiero del sistema.** Ver [[Gestion Financiera]] para detalles completos.

- Registro de servicios realizados
- Selección de método de pago: BCV (bolívares) o Divisa (USD/USDT)
- Tasa BCV automática desde API (ve.dolarapi.com) con caché 6h en Firestore
- Precio dinámico según método de pago (price para BCV, priceDivisa para Divisa)
- Reparto automático 60/40
- Navegación cíclica por posición (Lun→Sáb + Domingos independientes)
- Desglose por barbero con barras visuales (incluye Propina)
- Card Propina en resumen de métricas
- **Sistema Fiado**: Toggle en modal de registro → sección "Por Cobrar" debajo del desglose semanal con lista de pendientes y botón "Pagado" que ejecuta lógica bancaria al cobrar
- Balance Neto Global (ingresos - egresos + barberiaShare)
- Edición y eliminación con reversión automática
- Paginación (10 registros/página)
- **Responsive móvil**: Cards en 2 columnas con iconos compactos (w-10, size=20), padding reducido (p-4), texto escalado (text-xl a text-2xl, text-[9px]) y gap consistente

---

### 📜 Historial (`/dashboard/historial`)
**Archivo**: `src/app/dashboard/historial/page.tsx` (920 líneas)

Historial completo de servicios con búsqueda y filtros.

- Búsqueda por texto (servicio, barbero, cliente)
- Filtro por barbero (admin)
- Navegación cíclica por posición (Lun→Sáb + Domingos independientes)
- Columna "Pago" con badge BCV/Divisa
- Edición y eliminación con reversión bancaria (incluye método de pago y tasa BCV)
- Filtros responsive: selects en grilla de 2 columnas en móvil con padding reducido
- Badge de periodo actual arriba del navegador de semana, centrado
- Sin puntos suspensivos en los selects (salto de línea natural)
- Paginación (15 registros/página)

---

### 📈 Estadísticas (`/dashboard/estadisticas`)
**Archivo**: `src/app/dashboard/estadisticas/page.tsx` (524 líneas)

Analíticas de rendimiento semanal. Navegación cíclica por posición (Lun→Sáb + Domingos independientes).

- Revenue por barbero y tipo de servicio
- Top servicio más realizado
- Top barbero por ingresos
- Ranking de servicios con barras de progreso

---

### 🎯 Objetivos (`/dashboard/objetivos`)
**Archivo**: `src/app/dashboard/objetivos/page.tsx` (452 líneas)

Metas de rendimiento para barberos.

- CRUD de objetivos (nombre, monto objetivo, monto actual, fecha límite)
- Barra de progreso con porcentaje
- Registro manual de avance
- Actualización automática al registrar servicios
- Admin ve todos los objetivos; barbero solo los propios

---

### 📅 Citas (`/dashboard/citas`)
Gestión de citas agendadas. Índices compuestos para consultas eficientes por barbero, estado y cliente.

---

### 👥 Clientes (`/dashboard/clientes`)
Registro de clientes con nombre, teléfono, email y notas. Cada cliente queda asociado al barbero/admin que lo creó.

---

### 👤 Barberos (`/dashboard/personal`)
**Archivo**: `src/app/dashboard/personal/page.tsx`

Gestión de barberos y pagos. **Solo admin y superadmin**.

- Cards de estadísticas del equipo (total barberos, servicios, promedio, saldo pendiente)
- Cards individuales por barbero con nombre, rol, servicios, ingresos, saldo acumulado, ganancia del periodo y botón "Registrar Pago"
- Modal de pago reutilizando `RegistrarPagoModal` (concepto, monto, banco)
- Historial de pagos con navegación semanal y total pagado en el periodo

---

### ✂️ Servicios (`/dashboard/servicios`)
Catálogo de servicios personalizables. CRUD completo accesible por barberos y admins. Cada servicio tiene precio BCV (price) y precio promocional Divisa (priceDivisa). Los servicios personalizados se fusionan con los 3 servicios base (Corte, Barba, Corte+Barba) en el formulario de registro.

---

### 📦 Inventario (`/dashboard/inventario`)
Equipos y materiales de la barbería. Solo admin.

- Categorías: `equipos` | `materiales`
- Estados: `nuevo` | `regular` | `malo`
- Alerta de stock bajo (`minQuantity`)

---

### 🛡️ Gestión de Usuarios (`/dashboard/usuarios`)
**Archivo**: `src/app/dashboard/usuarios/page.tsx`

Gestión completa de usuarios del sistema. **Solo superadmin**.

- Crear nuevos usuarios (selección de rol: admin o barber)
- Lista de usuarios con email, nombre, teléfono, rol y fecha de creación
- Editar datos del usuario (nombre, teléfono, rol)
- Bloquear / Desbloquear usuarios (toggle)
- Eliminar usuarios del sistema
- Indicador visual de `primerInicio` para barberos nuevos
- Badge de estado: bloqueado (rojo) / activo (verde)
- Uso de los endpoints de `/api/usuarios` para todas las operaciones

---

### 👤 Perfil (`/dashboard/perfil`)
**Archivo**: `src/app/dashboard/perfil/page.tsx`

- Edición de datos personales (nombre, teléfono)
- Vista de cuenta bancaria (balance, total ganado, total retirado)
- Historial de transacciones bancarias con scroll personalizado
- ~~Gestión de barberos~~ → Movida a `/dashboard/usuarios` (solo superadmin)

---

## Ver también
- [[Gestion Financiera]]
- [[Roles y Permisos]]
- [[Base de Datos]]
- [[Flujo de Usuarios]]
