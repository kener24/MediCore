# Flujo de citas del paciente

## Solicitud

1. La API identifica al paciente por la sesion JWT.
2. El paciente selecciona especialidad, medico, modalidad, fecha y horario.
3. La disponibilidad se calcula con horario del medico, duracion, citas existentes, bloqueos, fecha actual y zona horaria.
4. Al confirmar, el backend vuelve a validar medico, clinica, modalidad y horario dentro de una transaccion.
5. La solicitud usa `Idempotency-Key`; un reintento devuelve la cita existente sin duplicar notificacion ni auditoria.
6. La cita queda en estado pendiente y aparece en el listado del paciente.

## Reglas

- El cliente no envia `patient_id` ni `clinic_id`.
- Una clinica sin citas en linea puede seguir aceptando citas presenciales.
- No se admiten fechas pasadas, medicos inactivos ni horarios ocupados.
- Un horario que se ocupa antes de confirmar devuelve conflicto y solicita elegir otro.
