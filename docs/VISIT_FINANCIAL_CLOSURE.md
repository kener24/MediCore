# Cierre financiero de visita

## Estados relevantes

- `waiting_billing`: consulta terminada, factura pendiente.
- `waiting_payment`: factura con saldo pendiente.
- `paid`: saldo cero y consulta finalizada.
- `completed`: flujo operativo terminado.

## Reglas

`sync_visit_financial_state()` relaciona factura, consulta y visita dentro de una transaccion.

- Un pago parcial conserva `waiting_payment`.
- Anular un pago puede reabrir una visita financiera a `waiting_payment`.
- Una factura pagada no completa una consulta activa.
- No se completa con saldo porque no existe una configuracion formal de credito.
- Si `auto_complete_visit_after_payment` esta activo, saldo cero y consulta finalizada permiten `completed`.
- `POST /api/admissions/visits/{id}/complete-billing/` aplica las mismas reglas y es idempotente.

No se eliminan relaciones entre visita, consulta, factura, pagos o documentos al completar.
