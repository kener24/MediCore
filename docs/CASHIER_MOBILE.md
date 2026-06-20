# Caja móvil MediCore

## Alcance

Módulo móvil básico para caja/pagos. Permite ver resumen de caja, facturas pendientes, buscar facturas, abrir detalle, registrar pagos básicos y revisar historial de pagos.

No incluye POS completo, facturación fiscal avanzada, impresión PDF ni reportes financieros avanzados.

## Estabilización Sprint 6.1

- Textos visibles corregidos con tildes.
- Mensajes de factura/pago faltante estandarizados.
- Validación interna para evitar doble envío de pago.
- Validación de sobrepago con mensaje claro.
- Rol caja puede resolverse por rol directo o permiso explícito.
- Errores globales del API normalizados en español.
- TypeScript validado.

## Acceso desde recepción

En la operación actual, caja móvil queda visible dentro del módulo de recepción como una tab llamada `Caja`. No necesitas iniciar sesión con un rol cajero separado para probar este flujo.

## Roles permitidos

El helper `isCashierRole` acepta:

- `cajero`
- `caja`
- `cashier`
- `billing`
- `billing_staff`
- `recepcion_caja`
- `recepcionista_caja`

Recepción puede acceder al flujo de caja desde sus tabs operativas.

No permite paciente, médico, doctor, enfermería, nurse ni superadmin.

## Pantallas

- `CashierDashboard`
- `CashierPendingInvoices`
- `CashierInvoiceSearch`
- `CashierInvoiceDetail`
- `CashierRegisterPayment`
- `CashierPaymentDetail`
- `CashierPaymentsHistory`
- `CashierProfile`
- `CashierSecurity`
- `CashierChangePassword`

## Endpoints usados

- `GET /billing/dashboard/`
- `GET /cashier/dashboard/`
- `GET /payments/dashboard/`
- `GET /billing/invoices/`
- `GET /invoices/`
- `GET /billing/invoices/{id}/`
- `GET /invoices/{id}/`
- `POST /billing/invoices/{id}/payments/`
- `POST /billing/payments/`
- `GET /billing/payments/`
- `GET /payments/`
- `GET /billing/payments/{id}/`
- `GET /payments/{id}/`
- `GET /billing/invoices/{id}/payments/`
- `GET /auth/me/`
- `GET /cashier/profile/`
- `POST /auth/change-password/`
- `POST /users/change-password/`

La base URL ya incluye `/api`, por eso no se duplica en los servicios.

## Flujo de facturas pendientes

1. Entrar a Pendientes.
2. Filtrar pendientes, parciales o todas.
3. Abrir detalle de factura.
4. Registrar pago si la factura tiene saldo.

## Flujo de búsqueda

1. Entrar a Buscar.
2. Escribir al menos 2 caracteres.
3. Buscar por número, paciente, identidad, teléfono o estado si el backend lo permite.
4. Abrir detalle o registrar pago.

## Pago parcial

1. Abrir factura con saldo.
2. Registrar un monto menor al saldo.
3. Confirmar que el backend devuelve saldo actualizado o estado parcial.

## Pago total

1. Abrir factura con saldo.
2. Registrar monto igual al saldo.
3. Confirmar que el backend devuelve saldo cero o estado pagada.

## Validaciones de pago

- Monto requerido.
- Monto mayor a 0.
- Bloqueo de monto mayor al saldo pendiente.
- Referencia requerida para métodos distintos de efectivo.
- Botón bloqueado mientras se procesa para evitar doble pago.

## Seguridad

- Todas las peticiones usan `apiClient` con JWT Bearer.
- Si el backend responde 401, la sesión se limpia desde el interceptor.
- Caja solo muestra información financiera necesaria.
- Caja no muestra notas clínicas profundas.
- Caja no registra signos vitales.
- Caja no crea consultas médicas.
- Caja no administra medicamentos.

## Pruebas en Android físico

- Login con rol caja/cajero.
- Redirección a dashboard.
- Médico, enfermería, paciente y superadmin no deben entrar a caja.
- Ver facturas pendientes y parciales.
- Buscar factura.
- Abrir detalle.
- Registrar pago efectivo.
- Registrar transferencia con referencia.
- Validar monto 0, negativo, texto y sobrepago.
- Confirmar que no se puede hacer doble tap.
- Revisar historial y detalle de pago.
- Abrir perfil y cerrar sesión.

## Limitaciones actuales

- Si el backend no expone dashboard de caja, se calcula un resumen con facturas y pagos disponibles.
- Si no existe endpoint dedicado de pagos por factura, se intenta `POST /billing/payments/`.
- No se procesan tarjetas reales ni se guardan datos sensibles de tarjeta.
- No hay PDF ni impresión en este sprint.
- El estado final de pago parcial o total depende de la respuesta real del backend.
