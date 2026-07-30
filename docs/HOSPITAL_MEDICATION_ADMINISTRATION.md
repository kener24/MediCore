# Administración de medicamentos hospitalarios

## Alcance

MediCore separa la indicación del médico, la programación esperada y la administración realizada por enfermería. Crear o programar una indicación no modifica inventario ni genera cargos.

## Flujo certificado

1. El médico crea una indicación para un internamiento activo.
2. El backend valida clínica, paciente, producto, dosis, vía, frecuencia, fechas y alergias.
3. Se crean dosis programadas dentro de un horizonte máximo de siete días.
4. Enfermería confirma paciente, dosis, vía, cantidad y hora real.
5. Una transacción bloquea la administración y descuenta inventario mediante el servicio central.
6. Se registra consumo, lote, movimiento, responsable, fecha y auditoría.
7. El consumo queda disponible para la factura hospitalaria.

La acción `POST /api/hospitalization/medication-administrations/{id}/administer/` admite una clave de idempotencia. Un reintento con la misma clave devuelve el resultado previo sin repetir inventario, consumo ni auditoría de éxito.

## Excepciones

Omisión, rechazo, retraso y falta de existencia requieren un motivo. Estos estados guardan responsable y fecha, no descuentan inventario y no crean cargos. Una reversión solo puede autorizarla administración y se bloquea si ya existe una afectación financiera.

## Permisos

- Médico: crea, reemplaza, suspende y consulta indicaciones.
- Enfermería: consulta la cola y registra resultados de administración.
- Administrador de clínica: puede autorizar una reversión controlada.
- Recepción, paciente y superadministrador: no administran medicamentos.

