# Flujo de consumos clínicos

## Regla funcional

Recetar no descuenta inventario. El stock baja únicamente cuando un producto se registra como utilizado, administrado, entregado o dispensado mediante un consumo clínico.

## Registro

El servicio central `consume_inventory_item()` valida clínica, producto activo, cantidad positiva, stock, lote y vencimiento dentro de una transacción. El consumo queda relacionado con paciente, consulta, visita cuando existe, producto, lote, usuario, movimiento y condición facturable.

Un requerimiento puede generar varias partes si necesita más de un lote. Todas comparten `consumption_group`, mientras la respuesta presenta la cantidad total y las asignaciones trazables.

## Idempotencia

Web y móvil envían `idempotency_key`. La combinación clínica/clave es única. Un doble toque o reintento devuelve el consumo existente con HTTP 200 y no repite movimientos, stock ni cargos.

## Endpoints

- `GET|POST /api/consultations/{id}/consumptions/`
- `GET|POST /api/clinical-consumptions/`
- `PATCH /api/clinical-consumptions/{id}/cancel/`

`DELETE` está bloqueado.

## Reversión

Cancelar requiere un motivo de al menos cinco caracteres. La operación bloquea el consumo, crea un movimiento inverso y restaura exactamente el producto y lote originales. No se puede cancelar un consumo ya facturado ni cancelar dos veces.

## Cargos facturables

Un consumo facturable queda disponible como cargo pendiente. El endpoint existente de facturación lo agrega una sola vez a una factura borrador y marca el consumo como facturado. No se modifica silenciosamente una factura emitida y la restricción de relación evita mezclar paciente o clínica.
