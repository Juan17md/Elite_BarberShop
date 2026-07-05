# 🗄️ Base de Datos

Firebase Firestore (NoSQL) con las siguientes colecciones:

---

## Colecciones

### `users/`
Perfiles de usuario del sistema.

```
users/{uid}
  uid*: string
  email*: string
  name*: string
  phone: string
  role*: "superadmin" | "admin" | "barber"
  primerInicio*: boolean (true = debe cambiar contraseña al entrar)
  bloqueado*: boolean (true = usuario bloqueado, redirige a /bloqueado)
  creadoEn*: string (fecha ISO de creación)
  creadoPor?: string (UID del superadmin que lo creó)
```

| Regla | Descripción |
|---|---|
| Lectura | Autenticados |
| Escritura | Solo superadmin |
| Creación | Solo superadmin |

---

### `settings/`
Configuración global del sistema. Un solo documento `settings/bcv` para la tasa BCV cacheada.

```
settings/bcv
  rate*: number (tasa BCV promedio)
  lastUpdated*: timestamp (fecha de última consulta a la API)
  source: string (URL de la API consultada)
```

| Regla | Descripción |
|---|---|
| Lectura | Autenticados |
| Escritura | Solo admins |

---

### `services/`
Catálogo de servicios ofrecidos.

```
services/{id}
  id: string
  name*: string
  price*: number (precio en BCV)
  priceDivisa*: number (precio promocional en divisa/USDT)
  duration*: number (minutos)
  description: string
```

| Regla | Descripción |
|---|---|
| Lectura | Autenticados |
| Escritura | Barbers y admins |

---

### `clients/`
Registro de clientes de la barbería.

```
clients/{id}
  id: string
  name*: string
  phone*: string
  email: string
  notes: string
  createdAt: timestamp
  createdBy: string (uid)
```

| Regla | Descripción |
|---|---|
| Lectura | Autenticados |
| Escritura | Barbers y admins |

---

### `finances/`
**Colección central del sistema financiero.** Un documento por cada servicio realizado.

```
finances/{id}
  id: string
  serviceId*: string
  serviceName*: string
  barberId*: string
  barberName*: string
  clientName*: string
  totalAmount*: number
  barberShare*: number (60%)
  barberiaShare*: number (40%)
  date*: string (YYYY-MM-DD, zona America/Caracas)
  createdAt: timestamp
  paymentMethod*: "bcv" | "divisa" (método de pago)
  bcvRate: number (tasa BCV al momento del pago, solo si paymentMethod = "bcv")
  estado?: "pendiente" | "pagado" (fiado: pendiente = no cobrado, pagado/undefined = cobrado)
  propina?: number (propina voluntaria 100% barbero)
  numeroReferencia?: string (últimos 4 dígitos)
  capturaURL?: string (URL de captura en ImageKit)
  capturaFileId?: string (fileId para limpieza CRON)
```

| Regla | Descripción |
|---|---|
| Lectura | Autenticados |
| Escritura | Barbers y admins |

---

### `transacciones/`
Actas (ingresos) y gastos operativos.

```
transacciones/{id}
  id: string
  tipo*: "acta" | "gasto"
  concepto*: string
  monto*: number
  fechaString: string (YYYY-MM-DD)
  creadoAt: timestamp
```

| Regla | Descripción |
|---|---|
| Lectura | Autenticados |
| Escritura | Barbers y admins |

---

### `bank/`
Cuentas bancarias virtuales. Una por barbero + una para la barbería (`"barbershop"`).

```
bank/{userId}
  id: string
  userId*: string
  userName*: string
  balance*: number
  totalEarned*: number
  totalPaid*: number
  lastUpdated: timestamp
```

| userId especial | Propietario |
|---|---|
| `{uid del barbero}` | Cuenta personal del barbero |
| `"barbershop"` | Cuenta de la barbería |

| Regla | Descripción |
|---|---|
| Lectura | Dueño, admin, o barbers para "barbershop" |
| Escritura | Dueño, admin, o barbers para "barbershop" |

---

### `bank_transactions/`
Historial de movimientos de cuentas bancarias.

```
bank_transactions/{id}
  id: string
  userId*: string
  userName*: string
  type*: "earning" | "withdrawal" | "adjustment"
  amount*: number
  description*: string
  date*: string (YYYY-MM-DD)
  createdAt: timestamp
```

| Regla | Descripción |
|---|---|
| Lectura | Autenticados |
| Creación | Admins, barbers, o el propio usuario |
| Escritura | Solo admins |

---

### `objectives/`
Metas de rendimiento para barberos.

```
objectives/{id}
  id: string
  name*: string
  targetAmount*: number
  currentAmount*: number
  endDate*: timestamp
  createdAt: timestamp
  barberoId: string
  type: "weekly" | "monthly" (legacy)
  createdByName: string
```

| Regla | Descripción |
|---|---|
| Lectura | Admin o barbero dueño del objetivo |
| Creación | Admin o barbero (propio) |
| Actualización | Admin o barbero dueño (sin cambiar dueño) |
| Eliminación | Admin o barbero dueño |

---

### `inventory/`
Equipos y materiales de la barbería.

```
inventory/{id}
  id: string
  name*: string
  quantity: number
  minQuantity: number (umbral de alerta)
  price: number
  estado: "nuevo" | "regular" | "malo"
  categoria: "equipos" | "materiales"
  addedAt: timestamp
  addedBy: string (uid)
```

| Regla | Descripción |
|---|---|
| Lectura | Autenticados |
| Escritura | Solo admins |

---

### `citas/`
Citas agendadas. Índices compuestos:
- `barberoId` ASC + `fecha` ASC
- `estado` ASC + `fecha` ASC
- `clienteId` ASC + `fecha` DESC

---

### `reservas/`
Reservas del sistema.

---

### `blocked_times/`
Bloqueos de tiempo en el calendario.

---

## Índices Compuestos

Definidos en `firestore.indexes.json`:

| Colección | Campos | Orden |
|---|---|---|
| `citas` | barberoId, fecha | ASC, ASC |
| `citas` | estado, fecha | ASC, ASC |
| `citas` | clienteId, fecha | ASC, DESC |
| `actas` | barberoId, fecha | ASC, DESC |
| `actas` | fecha, barberoId | DESC, ASC |
| `finanzas` | tipo, fecha | ASC, DESC |
| `finanzas` | categoria, fecha | ASC, DESC |
| `inventario` | categoria, nombre | ASC, ASC |

---

## Ver también
- [[Reglas de Seguridad]]
- [[Modelo de Negocio]]
- [[Gestion Financiera]]
- [[Flujo de Usuarios]]
