# Certificacion de inventario y compras

## Alcance

El Sprint 1.5 certifica los modulos existentes de categorias, productos, lotes, movimientos, proveedores, ordenes, recepciones, devoluciones y alertas. No crea un almacen independiente ni una aplicacion movil nueva.

## Resultado funcional

- Productos, categorias, proveedores y compras quedan aislados por clinica.
- Las cantidades, costos y precios usan `Decimal`.
- El backend rechaza stock negativo y lotes vencidos en consumos.
- Las salidas con lotes usan FEFO y pueden dividirse entre varios lotes.
- Cada entrada o salida confirmada genera un movimiento inmutable con saldo anterior y posterior.
- Las recepciones requieren una orden aprobada, aceptan parciales y varios lotes, y son idempotentes.
- Las devoluciones y reversiones conservan la recepcion original y generan movimientos inversos.
- Los productos bajo minimo y los lotes por vencer o vencidos generan alertas sin duplicacion activa.
- El comando `python manage.py audit_inventory_consistency` revisa datos sin modificarlos.

## Modelos reutilizados

`InventoryCategory`, `InventoryItem`, `InventoryLot`, `InventoryMovement`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseReceipt`, `PurchaseReceiptItem`, `ClinicalSupplyUsage`, `Notification` y `AuditLog`.

Se agrego un flujo minimo de devolucion mediante `PurchaseReturn` y `PurchaseReturnItem` porque no existia un equivalente. No se duplicaron catalogos ni servicios ya disponibles.

## Reglas cerradas

- No se edita ni elimina un movimiento confirmado.
- No se modifica la cantidad disponible de un lote desde la API de lotes.
- No se desactiva un lote con saldo.
- No se recibe mas de lo pendiente.
- No se recibe una orden no aprobada.
- No se reutiliza una recepcion al repetir su clave idempotente.
- No se revierte una recepcion si parte del stock ya fue consumida.
- No se devuelve mas de la cantidad recibida o disponible.
- Una orden parcial conserva su pendiente; una completa cambia a `recibida`.

## Limitaciones declaradas

- No existe un catalogo formal de unidades ni conversion caja/fraccion. Se opera en la unidad configurada en el producto.
- No existe un modulo completo de conteo fisico. El conteo se registra como ajuste por diferencia, con motivo y auditoria.
- El costo vigente conserva la politica existente: costo por lote y costo registrado en el movimiento. No se cambio a promedio ponderado.
- El flujo de aprobacion actual es simple por rol; aprobacion por monto queda para una version futura.
- No existen pantallas moviles de almacen. El movil solo reutiliza inventario real para consumo clinico del medico.

## Comandos de certificacion

```bash
python manage.py check
python manage.py audit_inventory_consistency --json
python manage.py test apps.inventory apps.purchases apps.notifications apps.audit
```

