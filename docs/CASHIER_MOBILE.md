# Caja movil MediCore

## Alcance Sprint 6.0

Modulo movil basico para caja/pagos. Permite ver resumen de caja, facturas pendientes, buscar facturas, abrir detalle, registrar pagos basicos y revisar historial de pagos.

No incluye POS completo, facturacion fiscal avanzada, impresion PDF ni reportes financieros avanzados.

## Roles permitidos

El helper `isCashierRole` acepta:

- `cajero`
- `caja`
- `cashier`
- `billing`
- `billing_staff`
- `recepcion_caja`
- `recepcionista_caja`

No permite paciente, medico, doctor, enfermeria, nurse ni superadmin.

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

## Flujo de prueba

1. Iniciar sesion con un usuario de rol caja/cajero.
2. Confirmar que abre el dashboard de caja.
3. Abrir facturas pendientes.
4. Filtrar pendientes, parciales y todas.
5. Abrir detalle de factura.
6. Revisar datos financieros, paciente, items y pagos.
7. Registrar pago efectivo menor o igual al saldo.
8. Registrar pago por transferencia con referencia.
9. Intentar monto 0, negativo o mayor al saldo y confirmar validacion.
10. Abrir historial de pagos.
11. Abrir detalle de pago.
12. Abrir perfil, seguridad y cambio de contrasena.
13. Cerrar sesion y verificar que no vuelve al modulo con el boton atras.

## Seguridad

- Todas las peticiones usan `apiClient` con JWT Bearer.
- Si el backend responde 401, la sesion se limpia desde el interceptor.
- Caja solo muestra informacion financiera necesaria.
- Caja no muestra notas clinicas profundas.
- Caja no registra signos vitales.
- Caja no crea consultas medicas.
- Caja no administra medicamentos.

## Limitaciones actuales

- Si el backend no expone dashboard de caja, se calcula un resumen con facturas y pagos disponibles.
- Si no existe endpoint dedicado de pagos por factura, se intenta `POST /billing/payments/`.
- No se procesan tarjetas reales ni se guardan datos sensibles de tarjeta.
- No hay PDF ni impresion en este sprint.
- Acceso de recepcion a caja queda limitado a roles explicitos como `recepcion_caja` o `recepcionista_caja`.
