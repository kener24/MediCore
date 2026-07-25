# Flujo de órdenes médicas

## Modelo reutilizado

Se amplió `MedicalOrder` sin duplicar catálogos ni endpoints. Toda orden conserva clínica, paciente, médico, consulta, número, tipo, prioridad, responsable, área de ejecución, vencimiento, resultado y trazabilidad de cancelación y revisión.

## Estados operativos

`pendiente -> en_proceso -> completada -> revisada`

Estados alternos: `cancelada` y `vencida`.

- Crear una orden la deja emitida operativamente en estado pendiente.
- Iniciar asigna responsable y fecha de inicio.
- Completar exige resultado resumido y guarda fecha de finalización.
- Revisar corresponde al médico propietario y conserva el resultado original.
- Cancelar exige motivo y no elimina el registro.
- Una orden vencida se conserva y no puede iniciarse.

## Tipos y prioridades

- Tipos: laboratorio, imagenología, procedimiento, interconsulta y otro.
- Prioridades: baja, normal, alta y urgente.
- Web y móvil envían los enums del backend; los alias móviles históricos continúan aceptándose para compatibilidad.

## Endpoints

- `GET|POST /api/consultations/{id}/medical-orders/`
- `GET|POST /api/medical-orders/`
- `GET|PATCH /api/medical-orders/{id}/`
- `PATCH /api/medical-orders/{id}/start/`
- `PATCH /api/medical-orders/{id}/complete/`
- `PATCH /api/medical-orders/{id}/review/`
- `PATCH /api/medical-orders/{id}/cancel/`
- `GET|POST /api/medical-orders/{id}/documents/`

El borrado físico está bloqueado. Los listados y detalles pasan por el alcance de clínica y rol.

## Responsabilidades

El médico crea y revisa. Médico, enfermería o admin clínico pueden ejecutar acciones operativas autorizadas. Recepción, caja, paciente y superadmin no reciben acceso de edición clínica. El resultado, responsable, inicio, finalización, revisión y cancelación generan trazabilidad de auditoría.
