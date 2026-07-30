# Generación de cargos hospitalarios

## Origen de cargos

Los consumos de medicamentos e insumos guardan cantidad, precio unitario y condición facturable. Solo los consumos activos y no cancelados se incorporan a la factura.

Cada ítem usa la combinación `source_type` y `source_id` para evitar duplicados. Una omisión, rechazo, falta de stock o programación no genera consumo y, por tanto, no puede generar cargo.

## Estancia

El cargo de estancia se agrega una sola vez si la clínica tiene un servicio activo configurado con código `HOSPITAL_STAY`, `ESTANCIA` o un nombre equivalente. El sistema no inventa una tarifa cuando no existe configuración.

## Reintentos

La generación puede repetirse de forma segura. La factura está vinculada uno a uno con el internamiento y los cargos existentes se reutilizan. Una factura pagada o fiscalmente emitida no se reconstruye.

