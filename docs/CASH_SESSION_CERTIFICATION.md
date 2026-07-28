# Certificacion de sesiones de caja

## Politica real

MediCore permite una sesion abierta por usuario y clinica. No existe un modelo separado `CashRegister`; la sesion pertenece directamente a clinica y usuario.

## Apertura

`POST /api/billing/cash-sessions/open/` valida permiso, clinica, monto no negativo y ausencia de otra sesion abierta. La apertura registra trazabilidad y un movimiento `apertura` cuando el monto inicial es mayor a cero.

## Movimientos

Tipos certificados: `apertura`, `pago`, `ingreso`, `egreso`, `reverso`, `ajuste` y `cierre`.

- Un pago en efectivo crea exactamente un movimiento `pago` relacionado con pago y factura.
- Ingreso y egreso manual requieren monto positivo, motivo, caja abierta e idempotencia.
- Movimientos manuales no alteran facturas.
- Los movimientos no se eliminan.

## Cuadre

Efectivo esperado = apertura + pagos en efectivo + ingresos manuales - egresos manuales.

Tarjetas, transferencias, depositos, cheques y otros metodos se muestran en el resumen, pero no se suman al efectivo fisico.

`PATCH /api/billing/cash-sessions/{id}/close/` exige monto contado. Toda diferencia requiere nota; el cierre guarda esperado, contado, diferencia, usuario y fecha. Repetir el cierre retorna la sesion cerrada sin crear otro cierre.
