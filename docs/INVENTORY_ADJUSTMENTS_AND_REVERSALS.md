# Ajustes, devoluciones y reversiones

## Ajustes manuales

Solo administracion de clinica y superadministracion autorizada pueden registrar entradas, salidas o ajustes manuales. Toda accion requiere cantidad positiva y motivo; los ajustes negativos aplican FEFO cuando el producto maneja lotes.

Las rutas controladas son:

- `POST /api/inventory/items/{id}/stock-in/`
- `POST /api/inventory/items/{id}/stock-out/`
- `POST /api/inventory/items/{id}/adjust-stock/`

La creacion generica de movimientos esta deshabilitada para impedir que se omitan FEFO, bloqueo e idempotencia.

## Devolucion a proveedor

`POST /api/purchases/receipts/{id}/return-items/` conserva la recepcion, exige motivo, valida saldo y cantidad retornable, crea `PurchaseReturn`, genera una salida `devolucion_proveedor` y corrige recibido/pendiente.

## Reversion de recepcion

`POST /api/purchases/receipts/{id}/reverse/` exige motivo y disponibilidad completa. Genera movimientos `reversion` ligados a los movimientos originales, desactiva la recepcion y restaura los pendientes.

Si ya hubo consumo o devolucion parcial, la reversion total se bloquea. La correccion debe realizarse mediante el flujo administrativo correspondiente; nunca eliminando registros.

