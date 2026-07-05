# 📊 Gestión Financiera

> Núcleo financiero del sistema. Controla el registro de servicios, distribución de ganancias, cuentas bancarias virtuales, actas, gastos y balance neto.

---

## Módulos Financieros

### 1. Finanzas (`/dashboard/finanzas`)
**Archivo**: `src/app/dashboard/finanzas/page.tsx` (1197 líneas) — el archivo más grande del proyecto.

#### Funcionalidades:
- **Registro de servicios**: Se realiza a través de un modal reutilizable (`RegisterServiceModal`). El admin selecciona barbero (visible solo si es admin), servicio, método de pago (Bolívares / Divisas), cliente (opcional), N° Referencia (opcional), captura de pago (opcional) y propina voluntaria (opcional). El barbero solo puede registrarse a sí mismo.
- **Método de pago**: Bolívares (BCV) o Divisa (USD físico / USDT Binance). Cada método tiene precio distinto (precio BCV más alto, precio Divisa promocional).
- **Tasa BCV**: Obtenida automáticamente de `ve.dolarapi.com/v1/dolares/oficial`, cacheada 6h en Firestore `settings/bcv`. Se muestra en Header como card azul no-editable. En el modal de registro de nuevos servicios **no se muestra al usuario**, sino que se lee e introduce automáticamente en segundo plano para registros en bolívares. Cada vez que se abre un modal (registro, cobro fiado, edición) se dispara `fetch("/api/bcv-rate")` para asegurar que `settings/bcv` exista en Firestore. Si la tasa no está disponible al guardar una propina con método BCV, el sistema bloquea el envío. El campo de tasa permanece visible y editable solo en los modales de edición financiera como respaldo histórico.
- **Precio dinámico**: El precio se ajusta automáticamente según el método de pago seleccionado.
- **Navegación cíclica por posición**: Flechas ← → para navegar. Posición 0 = semana actual (Lun→Sáb), posición 1 = domingo más reciente, posición 2 = semana anterior, posición 3 = domingo anterior, etc. Ciclo infinito hacia atrás. Badge verde para periodo actual, badge ámbar para domingos no actuales.
- **Resumen financiero**: Ingresos, Egresos, Barbería (solo admin), Balance Neto Global
- **Propina voluntaria**: Toggle en el modal de registro que habilita un input para monto de propina. La propina es 100% para el barbero (no se divide 60/40). Se almacena como campo separado `propina` en `finances/` y se suma al `barberShare`. Visible en todas las vistas del sistema con badge/barras color ámbar.
- **Conversión propina Bs→USD**: Cuando el método de pago es BCV, la propina se ingresa en bolívares y se convierte automáticamente a USD dividiendo entre la tasa BCV (`propinaUSD = propinaBs / tasaBCV`). Placeholder dinámico ("Monto en Bs" / "Monto en USD ($)") e indicador visual de conversión debajo del input. Si la tasa BCV no está disponible al momento de guardar, el sistema bloquea el envío con un mensaje de error en lugar de guardar datos incorrectos.
- **Card Propina**: Card ámbar en el resumen de métricas con total de propinas del periodo y leyenda "100% para el barbero".
- **Sistema Fiado (Por Cobrar)**: Toggle "Fiado (Paga después)" en el modal de registro. Al activarse, el servicio se crea con `estado: "pendiente"` y no afecta saldos bancarios hasta que se cobre.
- **Sección Por Cobrar**: Card debajo del desglose de Ingresos de la Semana. Lista todos los servicios fiados pendientes con badge contador. Cada item muestra servicio, barbero, cliente, fecha, montos y botón "Pagado". Al marcar como pagado, se actualiza `estado: "pagado"`, la fecha a hoy, y se ejecuta toda la lógica bancaria.
- **Desglose por barbero**: Barras visuales con % de ganancia. Incluye barra de propina (ámbar) siempre visible. Para barberos solo muestra su parte (60% + propina), sin Barbería
- **Edición con reversión**: Al editar un registro, se revierten y re-aplican saldos
- **Eliminación con reversión**: Modal de confirmación que revierte saldos bancarios, transacciones y objetivos
- **Paginación**: 10 registros por página en la tabla de historial

#### Métricas Calculadas:
```
totalRevenue   = Σ totalAmount de servicios de la semana
barberShare    = Σ (barberShare (60%) + propina) de la semana
barberiaShare  = Σ barberiaShare (40%) de la semana
propinaTotal   = Σ propina de la semana
ingresos       = Σ actas de la semana (transacciones tipo "acta")
egresos        = Σ gastos de la semana (transacciones tipo "gasto")
Balance Neto   = globalIngresos - globalEgresos + globalBarberiaShare
```

---

### 2. Historial (`/dashboard/historial`)
**Archivo**: `src/app/dashboard/historial/page.tsx` (920 líneas)

- Búsqueda por texto (servicio, barbero, cliente)
- Filtro por barbero
- Navegación cíclica por posición (Lun→Sáb + Domingos independientes)
- Columna "Pago" con badge BCV/Divisa en tabla
- Columna "Propina" con monto (+$X) en ámbar en tabla y cards móviles
- Edición con reversión bancaria automática (incluye cambio de método de pago y tasa BCV)
- Eliminación con reversión de saldos y objetivos
- Paginación: 15 registros por página

---

### 3. Actas y Gastos (`/dashboard/actas`)
**Archivo**: `src/app/dashboard/actas/page.tsx` (244 líneas)

- Pestañas: **Actas** (ingresos extra) | **Gastos** (egresos operativos)
- Registro rápido con modal
- Visualización filtrada por semana

---

### 4. Objetivos (`/dashboard/objetivos`)
**Archivo**: `src/app/dashboard/objetivos/page.tsx` (452 líneas)

- CRUD de objetivos con `targetAmount` y `currentAmount`
- Barra de progreso con porcentaje
- Registro manual de monto
- Admin ve quién creó cada objetivo

---

### 5. Estadísticas (`/dashboard/estadisticas`)
**Archivo**: `src/app/dashboard/estadisticas/page.tsx` (524 líneas)

- Revenue semanal por barbero y tipo de servicio
- Top servicio y Top barbero
- Ranking de servicios con barras de progreso visuales

---

### 6. Tasa BCV Automática
**Archivo**: `src/app/api/bcv-rate/route.ts` + `src/components/Header.tsx`

- **Endpoint** `GET /api/bcv-rate`: consulta `ve.dolarapi.com/v1/dolares/oficial`, extrae campo `promedio`, cachea en Firestore `settings/bcv` con timestamp.
- **Caché de 6h**: Si el dato en Firestore tiene menos de 6 horas, se retorna sin consultar la API externa.
- **Header card**: Card azul en `Header.tsx` con `onSnapshot` a `settings/bcv`, fetch inicial al montar y `setInterval` cada 6h.
- **Fallback**: Si la API externa falla, se retorna el último valor cacheado.
- **Estados visuales**: `--` con pulse animation mientras carga, valor normal cuando está disponible.

---

### 7. Perfil y Banco (`/dashboard/perfil`)
**Archivo**: `src/app/dashboard/perfil/page.tsx` (670 líneas)

- Vista de cuenta bancaria personal
- Balance, total ganado, total retirado
- Historial de transacciones bancarias
- Gestión de barberos (admin): crear/eliminar barberos vía API
- Edición de perfil

---

## Sistema de Cuentas Bancarias

```
┌─────────────────────────────────────────────┐
│              REGISTRO DE SERVICIO             │
│                                               │
│  Servicio: $8.00                              │
│  ├── Barbero (60%): $4.80 → bank/{barberId}  │
│  └── Barbería (40%): $3.20 → bank/barbershop  │
│                                               │
│  + Transacciones en bank_transactions/        │
│  + Actualización de objetivos                 │
└─────────────────────────────────────────────┘
```

### Propiedades de las cuentas:

| Campo | Descripción |
|---|---|
| `balance` | Saldo actual (ganado - retirado) |
| `totalEarned` | Total histórico de ganancias |
| `totalPaid` | Total histórico de retiros |
| `lastUpdated` | Fecha de última modificación |

### Tipos de movimiento:
- **earning**: +balance, +totalEarned (al registrar servicio)
- **withdrawal**: -balance, +totalPaid (al retirar fondos)
- **adjustment**: ±balance (ajuste manual)

---

## Reversión Automática

Cuando se **edita** o **elimina** un registro financiero, el sistema revierte automáticamente:

1. **Saldo bancario del barbero**: Se descuenta/reintegra el `barberShare`
2. **Saldo bancario de la barbería**: Se descuenta/reintegra el `barberiaShare`
3. **Transacciones bancarias**: Se registra el movimiento de reversión
4. **Progreso de objetivos**: Se ajusta el `currentAmount` del objetivo activo

Toda la lógica de reversión está implementada en:
- `src/app/dashboard/finanzas/page.tsx:394-480` (eliminación con reversión)
- `src/app/dashboard/finanzas/page.tsx:482-620` (edición con reversión)
- `src/app/dashboard/historial/page.tsx` (misma lógica duplicada)

---

## Dashboard Principal (`/dashboard`)

Vista diferente según rol:

### Admin
- Botón de acceso rápido para registrar servicios realizados mediante el modal reutilizable.
- Ingresos del día, semana y mes
- Top de barberos por ingresos
- Distribución de ganancias
- Servicios recientes

### Barbero
- Ingresos propios (día/semana/mes)
- Acciones rápidas
- Distribución semanal de ganancias

---

### 8. Gestión de Pagos a Barberos (`/dashboard/personal`, `/dashboard/finanzas`)
**Archivo**: `src/components/RegistrarPagoModal.tsx`

> [!INFO] Sistema de liquidación flexible implementado para gestionar pagos totales, parciales y adelantos en tiempo real.

#### Funcionalidades:
- **Modal premium reutilizable**: Accesible desde **Personal** (tarjeta de cada barbero) y **Finanzas** (desglose por barbero junto a sus ganancias del periodo).
- **Saldo en tiempo real**: Escucha `onSnapshot` de `bank/{barberId}` para mostrar el balance acumulado actualizado al instante.
- **Referencia del periodo**: Muestra las ganancias del periodo seleccionado (semana o domingo) como guía para el administrador.
- **Botones rápidos**: "Período" carga el monto ganado en el periodo actual, "Todo" carga el balance acumulado completo.
- **Conceptos predefinidos**: Pago Semanal, Pago Semanal - Parcial, Pago de Domingo, Adelanto de Domingo, Adelanto Semanal, u Otro (personalizado).
- **Alerta de sobregiro**: Si el monto a pagar supera el saldo disponible, muestra una advertencia visual indicando que la cuenta quedará en negativo (útil para adelantos).
- **Registro de transacción**: Al confirmar, se descuenta el monto de `bank/{barberId}.balance`, se incrementa `totalPaid`, y se crea una transacción tipo `"withdrawal"` en `bank_transactions/`.

#### Flujo de Pago:
```
Admin selecciona barbero → ve saldo acumulado y ganancias del periodo
  → ingresa monto a pagar (total o parcial)
  → selecciona concepto (semanal, domingo, adelanto, personalizado)
  → confirma
    → bank/{barberId}.balance -= monto
    → bank/{barberId}.totalPaid += monto
    → bank_transactions/{id} → { type: "withdrawal", amount: monto, description: concepto }
```

#### Ubicaciones de acceso:
1. **Personal** (`/dashboard/personal`): Botón "Registrar Pago" en cada tarjeta de barbero (solo admin).
2. **Finanzas** (`/dashboard/finanzas`): Botón con icono de billetera junto al nombre de cada barbero en el desglose semanal (solo admin).

> [!WARNING] **Adelantos de Domingo**: Las comisiones de los servicios dominicales se acreditan al balance del barbero en tiempo real al registrar el servicio. Si el admin necesita adelantar dinero ese mismo domingo, basta con registrar el pago con el concepto `"Adelanto de Domingo"`. El sistema restará el monto del balance de forma natural.

---

## Ver también
- [[Modelo de Negocio]]
- [[Flujo de Registro de Servicio]]
- [[Base de Datos]]
- [[Modulos del Sistema]]
