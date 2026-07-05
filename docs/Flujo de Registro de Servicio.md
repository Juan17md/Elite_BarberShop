# 🔄 Flujo de Registro de Servicio

> Paso a paso de lo que ocurre cuando se registra un servicio en el sistema.

---

## Diagrama de Flujo

```
Usuario hace clic en "Registrar Servicio"
  │
  ├─ 1. Validación del formulario
  │    ├─ Servicio seleccionado
  │    ├─ Método de pago seleccionado: BCV o Divisa
  │    ├─ Si BCV: tasa BCV del día (Bs/USD)
  │    ├─ Barbero asignado (admin elige, barbero = él mismo)
   │    ├─ N° Referencia opcional (últimos 4 dígitos)
   │    ├─ Propina opcional: toggle "Incluir Propina" + input de monto
   │    ├─ Fiado opcional: toggle "Fiado (Paga después)" — marca servicio como pendiente de cobro
   │    └─ Estado isSubmitting = true (previene doble clic)
  │
  ├─ 2. Determinación del precio + propina
  │    ├─ paymentMethod = formData.paymentMethod
  │    ├─ Si es "divisa" y existe priceDivisa → totalAmount = service.priceDivisa
  │    ├─ Si es "bcv" o no hay priceDivisa → totalAmount = service.price
  │    ├─ propina = monto ingresado (si toggle activado, 0 si no)
  │    ├─ barberShare = totalAmount × 0.6 + propina (100% barbero)
  │    ├─ barberiaShare = totalAmount × 0.4
  │    └─ date = getLocalDateString() → "YYYY-MM-DD"
  │
  ├─ 3. Verificar si es fiado
   │    ├─ ¿esFiado === true?
   │    │   ├─ SÍ → Crear registro con `estado: "pendiente"` → saltar pasos 4-8 → ir a 9
   │    │   └─ NO → Crear registro con `estado: "pagado"` → continuar a paso 4
   │    └─ addDoc(collection(db, "finances"), { serviceId, serviceName, ..., estado })
   │
   ├─ 4. Actualizar banco del barbero (bank/{barberId})
  │    ├─ ¿Existe cuenta?
  │    │   ├─ SÍ → updateDoc(balance: increment(barberShare))
  │    │   └─ NO → setDoc(balance: barberShare, totalEarned: barberShare)
  │    └─ lastUpdated = new Date()
  │
  ├─ 5. Registrar transacción del barbero (bank_transactions/)
  │    └─ addDoc({ type: "earning", amount: barberShare, ... })
  │
  ├─ 6. Actualizar banco de la barbería (bank/barbershop)
  │    ├─ ¿Existe cuenta?
  │    │   ├─ SÍ → updateDoc(balance: increment(barberiaShare))
  │    │   └─ NO → setDoc(balance: barberiaShare, totalEarned: barberiaShare)
  │    └─ lastUpdated = new Date()
  │
  ├─ 7. Registrar transacción de la barbería (bank_transactions/)
  │    └─ addDoc({ type: "earning", amount: barberiaShare, userId: "barbershop" })
  │
  ├─ 8. Actualizar objetivos del barbero (objectives/)
  │    ├─ Buscar objetivo activo del barbero
  │    ├─ ¿Existe?
  │    │   ├─ SÍ → updateDoc(currentAmount: increment(barberShare))
  │    │   └─ NO → saltar
  │    └─ (solo si la fecha del servicio está dentro del rango del objetivo)
  │
  └─ 9. UI se actualiza automáticamente (onSnapshot)
       ├─ Toast de éxito con Sonner
       ├─ Cierre del modal
       └─ Reset del formulario
```

---

## Código Fuente

Lógica principal en `src/app/dashboard/finanzas/page.tsx:239-360` (función `handleRegisterService`).

### Ejemplo con datos reales:

```typescript
// Servicio: Corte de Cabello Simple
// Barbero: Franyer
// Método de pago: BCV (tasa 65.50 Bs/USD)

totalAmount = 7.00 (precio BCV)
barberShare = 7.00 * 0.6 = 4.20
barberiaShare = 7.00 * 0.4 = 2.80
bcvRate = 65.50

// 1. finances/{id}
{
  serviceName: "Corte de Cabello Simple",
  barberName: "Franyer",
  clientName: "Juan Pérez",
  totalAmount: 7.00,
  barberShare: 4.20,
  barberiaShare: 2.80,
  paymentMethod: "bcv",
  bcvRate: 65.50,
  date: "2026-06-17"
}

// 2. bank/barber-franyer → balance += 4.20
// 3. bank_transactions/{id} → { type: "earning", amount: 4.20, userId: "barber-franyer" }
// 4. bank/barbershop → balance += 2.80
// 5. bank_transactions/{id} → { type: "earning", amount: 2.80, userId: "barbershop" }
// 6. objectives/{id} → currentAmount += 4.20 (si Franyer tiene objetivo activo)
```

```typescript
// Servicio: Barba
// Barbero: Franyer
// Método de pago: Divisa (USD físico / USDT)

totalAmount = 2.00 (precio promocional divisa)
barberShare = 2.00 * 0.6 = 1.20
barberiaShare = 2.00 * 0.4 = 0.80

// finances/{id}
{
  serviceName: "Barba",
  barberName: "Franyer",
  clientName: "Carlos Gómez",
  totalAmount: 2.00,
  barberShare: 1.20,
  barberiaShare: 0.80,
  paymentMethod: "divisa",
  date: "2026-06-17"
}
```

---

## Prevención de Duplicados

El sistema usa `isSubmitting` como flag booleano:
1. Al iniciar el registro → `setIsSubmitting(true)`
2. El botón se desactiva y muestra un spinner
3. Al terminar (éxito o error) → `setIsSubmitting(false)`

Esto evita que clics repetidos generen registros duplicados y afecten incorrectamente los saldos bancarios.

---

## Reversión (Editar/Eliminar)

### Eliminación (`handleDeleteRecord`)
1. Revertir saldo del barbero: `balance -= barberShare`, `totalEarned -= barberShare`
2. Registrar transacción de reversión en `bank_transactions/`
3. Revertir saldo de la barbería: `balance -= barberiaShare`, `totalEarned -= barberiaShare`
4. Registrar transacción de reversión para la barbería
5. Revertir progreso de objetivo: `currentAmount -= barberShare`
6. Eliminar documento de `finances/`

### Edición (`handleEditRecord`)
1. Ejecutar reversión completa del registro anterior (como eliminación)
2. Crear nuevo registro con los datos actualizados (como registro nuevo)  
3. Actualizar el documento existente en `finances/` (sin usar `addDoc`)

---

## Ver también
- [[Modelo de Negocio]]
- [[Gestion Financiera]]
- [[Base de Datos]]
