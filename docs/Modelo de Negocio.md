# 💰 Modelo de Negocio

## Reparto de Ganancias

Cada servicio realizado se divide automáticamente:

| Beneficiario | Porcentaje | Fórmula |
|---|---|---|
| **Barbero** | 60% | `totalAmount * 0.6` |
| **Barbería** | 40% | `totalAmount * 0.4` |

Este reparto es **fijo** y está implementado en `src/app/dashboard/finanzas/page.tsx:260-261`.

---

## Métodos de Pago

Cada servicio tiene **dos precios** según el método de pago:

| Método | Descripción | Precio |
|---|---|---|
| **BCV** | Pago en bolívares a tasa del Banco Central de Venezuela | Precio base (`price`) |
| **Divisa** | Pago en USD físico o USDT por Binance | Precio promocional (`priceDivisa`) |

Al registrar un servicio, se debe seleccionar el método de pago. Si es BCV, se registra además la **tasa BCV del día** (Bs/USD).

---

## Servicios Predefinidos

Definidos en `src/lib/types.ts`:

| ID | Servicio | Precio BCV | Precio Divisa | Duración |
|---|---|---|---|---|
| 1 | Corte de Cabello Simple | $7 | $5 | 45 min |
| 2 | Corte de Cabello Completo | $8 | $6 | 45 min |
| 3 | Barba | $4 | $2 | 45 min |
| 4 | Corte de Cabello + Barba | $10 | $8 | 45 min |

### Servicios Personalizados

Los administradores y barberos pueden crear servicios adicionales desde el módulo [[Modulos del Sistema#Servicios|Servicios]]. Estos se cargan dinámicamente y se fusionan con los servicios base.

---

## Ejemplo de Cálculo

**Servicio: Corte de Cabello Simple pagado en Divisa ($5)**

```
totalAmount = $5.00 (precio promocional divisa)

barberShare  = 5.00 × 0.6 = $3.00 → Banco del barbero
barberiaShare = 5.00 × 0.4 = $2.00 → Banco de la barbería
```

**Servicio: Corte de Cabello Simple pagado en BCV a tasa 65.50 Bs/USD ($7)**

```
totalAmount = $7.00 (precio BCV)
bcvRate = 65.50

barberShare  = 7.00 × 0.6 = $4.20 → Banco del barbero
barberiaShare = 7.00 × 0.4 = $2.80 → Banco de la barbería
Equivalente en Bs = 7.00 × 65.50 = Bs 458.50
```

### Impacto en el Sistema

Al registrar un servicio se actualizan **automáticamente**:

1. `finances/` → Registro financiero con `paymentMethod`, `bcvRate` (si BCV) y desglose
2. `bank/{barberId}` → Balance del barbero (+$4.80)
3. `bank_transactions/` → Transacción tipo "earning" para el barbero
4. `bank/barbershop` → Balance de la barbería (+$3.20)
5. `bank_transactions/` → Transacción para la barbería
6. `objectives/` → Progreso del objetivo del barbero (si existe)

---

## Cuentas Bancarias Virtuales

Cada barbero y la barbería tienen una cuenta en la colección `bank/`:

| Campo | Descripción |
|---|---|
| `balance` | Saldo actual disponible |
| `totalEarned` | Total acumulado ganado (histórico) |
| `totalPaid` | Total retirado/pagado |
| `lastUpdated` | Última modificación |

### Tipos de Transacción

Registradas en `bank_transactions/`:

| Tipo | Descripción |
|---|---|
| `earning` | Ganancia por servicio (+ al balance) |
| `withdrawal` | Retiro de fondos (- al balance) |
| `adjustment` | Ajuste manual (+/- al balance) |

---

## Balance Neto Global

Calculado en el módulo de [[Modulos del Sistema#Finanzas|Finanzas]]:

```
Balance Neto = Ingresos (actas) - Egresos (gastos) + BarberiaShare (histórico global)
```

- **Ingresos**: Suma de todas las actas en `transacciones/` con `tipo = "acta"`
- **Egresos**: Suma de todos los gastos en `transacciones/` con `tipo = "gasto"`
- **BarberiaShare**: Suma histórica de la comisión de la barbería (40% de todos los servicios)

---

## Actas y Gastos

Independientes del registro de servicios. Se gestionan en el módulo **Actas** (`/dashboard/actas`):

| Tipo | Significado |
|---|---|
| `acta` | Ingreso adicional (ej: venta de productos) |
| `gasto` | Egreso operativo (ej: alquiler, suministros) |

No afectan las cuentas bancarias individuales, solo el Balance Neto Global.

---

## Liquidación de Pagos a Barberos

El sistema permite al administrador registrar pagos de forma flexible, sin necesidad de reinicios de periodos ni colecciones adicionales. Los pagos se modelan como **retiros (withdrawal)** sobre la cuenta bancaria virtual del barbero.

### Casos de Uso Soportados

| Caso | Descripción | Ejemplo |
|---|---|---|
| **Pago Semanal Completo** | Se paga el 100% de lo ganado en la semana (Lun-Sáb) | Barbero ganó $45 en la semana → se le pagan $45 → balance vuelve a $0 |
| **Pago Parcial** | Se paga solo una parte del saldo acumulado | Barbero tiene $120 acumulados → se le pagan $70 → restan $50 para futuros pagos |
| **Pago de Domingo** | Se liquida lo ganado un domingo específico | Domingo 15 ganó $12 → se le pagan $12 ese mismo día o después |
| **Adelanto de Domingo** | El admin adelanta dinero el mismo domingo mientras se siguen registrando servicios | Se registran $20 en servicios el domingo → el admin adelanta $10 → balance restante $10 |
| **Adelanto Semanal** | Se adelanta dinero al barbero aunque no tenga saldo suficiente (sobregiro) | Barbero tiene $5 de balance → se adelantan $20 → balance queda en -$15 |

### Mecanismo

Cada pago se registra a través del modal `RegistrarPagoModal` (`src/components/RegistrarPagoModal.tsx`) accesible desde:
- **Personal** (`/dashboard/personal`): botón "Registrar Pago" en la tarjeta de cada barbero
- **Finanzas** (`/dashboard/finanzas`): botón de billetera junto a las ganancias en el desglose semanal

Al confirmar:
1. `bank/{barberId}.balance` disminuye en el monto pagado
2. `bank/{barberId}.totalPaid` aumenta en el monto pagado
3. Se crea transacción `type: "withdrawal"` en `bank_transactions/`

> [!WARNING] Los pagos **no bloquean ni reinician** el saldo de periodos anteriores. El balance es acumulativo desde el inicio de operaciones. Esto permite pagos por partes sin perder trazabilidad histórica.

---

## Ver también
- [[Gestion Financiera]]
- [[Flujo de Registro de Servicio]]
- [[Base de Datos]]
