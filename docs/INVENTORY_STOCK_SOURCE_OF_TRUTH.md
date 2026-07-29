# Fuente unica de stock

## Regla operativa

`InventoryItem.stock_current` es el saldo agregado operativo que consulta la API. Toda variacion debe ocurrir al crear un `InventoryMovement`; no se expone una escritura directa de stock en formularios.

Para productos con lotes, `InventoryLot.quantity_current` conserva el saldo operativo de cada lote y debe cumplirse:

```text
InventoryItem.stock_current = suma de lotes activos con saldo del producto
```

Para productos sin lotes, el saldo agregado del producto es la existencia operativa.

`InventoryMovement` es el historial inmutable que explica cada cambio. Guarda cantidad, tipo, lote, costo, responsable, referencia, saldo general anterior/posterior y saldo de lote anterior/posterior.

## Garantias

- `transaction.atomic()` mantiene movimiento y saldos en una sola transaccion.
- `select_for_update()` bloquea producto, lote y lineas de compra durante operaciones criticas.
- Constraints de base de datos impiden saldos o movimientos negativos.
- Activar o desactivar control por lotes se bloquea si deja saldos inconsistentes.
- Los movimientos confirmados no se editan ni eliminan.

## Diagnostico

`python manage.py audit_inventory_consistency` detecta diferencias producto/lotes, lotes negativos o inactivos con saldo, lotes vencidos con saldo, productos sin unidad, recepciones o consumos sin movimiento y referencias de movimiento duplicadas. Es solo lectura.

