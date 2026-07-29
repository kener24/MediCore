# Flujo de recepcion de compras

## Secuencia

```text
Proveedor -> Orden -> Aprobacion -> Recepcion -> Lote -> Movimiento -> Stock
```

La accion `POST /api/purchases/orders/{id}/receive/`:

1. Bloquea la orden y sus lineas.
2. Exige estado `aprobada` o `recibida_parcial`.
3. valida clinica, producto, cantidades, lotes, vencimientos y costos.
4. Verifica que el acumulado no supere lo pendiente.
5. Crea una recepcion y sus lineas.
6. Crea o reutiliza el lote compatible.
7. Genera una entrada de inventario por lote.
8. Actualiza recibido y pendiente.
9. Marca la orden parcial o completa.
10. Registra auditoria y notificacion.

## Idempotencia

El cliente envia `Idempotency-Key` o `idempotency_key`. El alcance incluye clinica, orden, usuario y clave. Un reintento devuelve la recepcion original con HTTP 200 y no repite movimiento, stock, auditoria exitosa ni notificacion.

## Varios lotes

Una linea de orden puede incluir varios renglones de recepcion si cada lote es distinto. El backend rechaza repetir el mismo producto/lote dentro de una recepcion.

## Estados

- Sin cantidad recibida: `aprobada`.
- Parte recibida: `recibida_parcial`.
- Todo recibido: `recibida`.
- Una devolucion o reversion puede regresar la orden a parcial o aprobada sin borrar historial.

