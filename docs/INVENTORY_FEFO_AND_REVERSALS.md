# Inventario FEFO y reversiones clínicas

## Selección FEFO

Para productos con lotes, MediCore consume primero la existencia con vencimiento más cercano. La consulta excluye lotes vencidos, inactivos o sin existencia y mantiene el alcance de la clínica.

El orden aplicado es:

1. Lotes con fecha de vencimiento, de la fecha más próxima a la más lejana.
2. Fecha de recepción e identificador como desempate estable.
3. Lotes sin fecha de vencimiento al final.

Si un lote no cubre la cantidad, el servicio divide la salida entre los siguientes lotes vigentes. Una selección manual se valida contra producto, clínica, vigencia y existencia.

## Concurrencia

El proceso usa `transaction.atomic()` y `select_for_update()` sobre producto, lotes y clave idempotente. `InventoryMovement` es la única pieza que modifica `stock_current` y `quantity_current`, evitando descuentos paralelos o stock negativo.

## Reversión

La reversión no edita ni borra el movimiento original. Crea una entrada referenciada al consumo, con usuario, fecha y motivo, y devuelve la cantidad al mismo lote. Las partes de un consumo dividido se revierten de forma individual y trazable.

## Evidencia automatizada

Las pruebas cubren división FEFO, exclusión de lote vencido, stock insuficiente, reintento idempotente, otra clínica, movimientos generados y restauración exacta de cada lote.
