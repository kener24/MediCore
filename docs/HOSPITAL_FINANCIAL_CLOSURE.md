# Cierre financiero del internamiento

La factura hospitalaria está asociada de forma única al internamiento, paciente y clínica. Reúne consumos válidos aún no facturados y el servicio de estancia configurado.

Antes del alta se recalculan los totales del backend. Un saldo mayor que cero bloquea el egreso, excepto cuando un administrador de clínica marca la autorización explícita de saldo pendiente. Esa decisión queda en el evento y la auditoría del alta.

Las facturas pagadas o fiscales emitidas no se regeneran. Una administración con consumo ya facturado, pagado o fiscal no puede revertirse desde el flujo clínico; requiere el proceso financiero correspondiente para conservar trazabilidad.

