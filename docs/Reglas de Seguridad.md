# 🛡️ Reglas de Seguridad (Firestore)

> Definidas en `firestore.rules`. Controlan el acceso a nivel de base de datos.

---

## Funciones Auxiliares

```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

function getUserRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
}

function isAdmin() {
  return isAuthenticated() && (getUserRole() == "admin" || getUserRole() == "superadmin");
}

function isSuperadmin() {
  return isAuthenticated() && getUserRole() == "superadmin";
}

function isBarber() {
  return isAuthenticated() && (getUserRole() == "barber" || getUserRole() == "admin" || getUserRole() == "superadmin");
}
```

---

## Reglas por Colección

### `users/{userId}`
```
read:  isAuthenticated()
write: isSuperadmin()
create: isSuperadmin()
```
Todos los autenticados pueden ver usuarios. Solo superadmin puede crear, editar o eliminar usuarios.

### `services/{serviceId}`
```
read:   isAuthenticated()
write:  isBarber()
create: isBarber()
```
Barberos y admins pueden gestionar servicios.

### `clients/{clienteId}`
```
read:   isAuthenticated()
write:  isBarber()
create: isBarber()
```
Igual que servicios: barberos y admins.

### `reservas/{reservaId}`
```
read:   isAuthenticated()
write:  isBarber()
create: isAuthenticated()
```
Cualquier autenticado puede crear reservas.

### `blocked_times/{blockId}`
```
read:   isAuthenticated()
write:  isBarber()
create: isBarber()
```

### `inventory/{productoId}`
```
read:   isAuthenticated()
write:  isAdmin()
create: isAdmin()
```
Solo admins pueden modificar el inventario.

### `transacciones/{actaId}`
```
read:   isAuthenticated()
write:  isAdmin() || isBarber()
create: isAdmin() || isBarber()
```
Actas y gastos: acceso compartido admin/barber.

### `finances/{registroId}`
```
read:   isAuthenticated()
write:  isAdmin() || isBarber()
create: isAdmin() || isBarber()
```
Registros financieros: admin y barbers.

### `bank/{bankId}`
```
read:   isOwner(bankId) || isAdmin() || (isBarber() && bankId == "barbershop")
write:  isOwner(bankId) || isAdmin() || (isBarber() && bankId == "barbershop")
```
Regla especial: barberos necesitan leer/escribir `bank/barbershop` al registrar servicios.

### `bank_transactions/{registroId}`
```
read:   isAuthenticated()
create: isAdmin() || isBarber() || (isAuthenticated() && request.resource.data.userId == request.auth.uid)
write:  isAdmin()
```
Solo admins pueden modificar transacciones existentes. Creación amplia (barbers + propio usuario).

### `objectives/{objId}`
```
read:   isAdmin() || (isAuthenticated() && resource.data.barberoId == request.auth.uid)
create: isAdmin() || (isBarber() && request.resource.data.barberoId == request.auth.uid)
update: isAdmin() || (isBarber() && resource.data.barberoId == request.auth.uid && request.resource.data.barberoId == request.auth.uid)
delete: isAdmin() || (isBarber() && resource.data.barberoId == request.auth.uid)
```
Regla más compleja: barberos solo ven/gestionan sus propios objetivos. No pueden cambiar el `barberoId` en updates.

---

## Notas de Seguridad

1. **Doble capa**: La autorización ocurre tanto en el frontend (AuthGuard + UI condicional + queries filtradas) como en las Firestore Rules (servidor).
2. **`getUserRole()` usa una lectura extra**: Cada verificación de rol lee el documento `users/{uid}`. Esto tiene costo de lectura en Firestore.
3. **`bank/barbershop` compartido**: Los barberos necesitan acceso de escritura a la cuenta de la barbería para actualizar el balance al registrar servicios. Esto es intencional.
4. **Sin validación de datos**: Las reglas actuales no validan la estructura de los documentos (ej: que `barberShare` sea realmente 60%). Esto se confía al frontend.
5. **Superadmin como rol raíz**: `isSuperadmin()` es la única función que permite escritura en la colección `users/`. `isAdmin()` ahora incluye tanto `admin` como `superadmin` para acceso de negocio.
6. **Bloqueo y primer inicio**: Los campos `bloqueado` y `primerInicio` en `users/` son gestionados por el AuthGuard en frontend y por el superadmin vía API.

---

## Ver también
- [[Base de Datos]]
- [[Roles y Permisos]]
- [[Arquitectura del Sistema]]
- [[Flujo de Usuarios]]
