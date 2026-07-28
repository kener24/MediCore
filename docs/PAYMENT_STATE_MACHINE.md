# Maquina de estados de pagos y facturas

## Factura

| Condicion | Estado |
|---|---|
| Sin pago y activa | `pendiente` |
| Pago acumulado menor al total | `parcialmente_pagada` |
| Saldo igual a cero | `pagada` |
| Anulada por flujo autorizado | `anulada` |

El estado fiscal (`draft`, `issued`, `cancelled`, `void`) se conserva separado del estado financiero.

## Pago

- `aplicado`: participa en pagado y saldo.
- `anulado`: se conserva para trazabilidad, deja de participar en el saldo y nunca se elimina.

## Idempotencia

`POST /api/billing/invoices/{id}/payments/` y `POST /api/billing/payments/` aceptan `Idempotency-Key`.

- La misma clave en la misma factura retorna el pago existente con HTTP 200.
- No reaplica el monto, no crea otro movimiento y no repite la auditoria exitosa.
- Reusar la clave en otra factura se rechaza.
- La clave es unica dentro de la clinica.
- La factura y la clinica se bloquean en una transaccion para proteger saldo y numeracion interna.

## Reversion

La anulacion conserva el pago original. Si fue efectivo y la caja sigue abierta, crea un movimiento `reverso`; si la caja cerro, el sistema bloquea la anulacion y exige un ajuste administrativo posterior.
