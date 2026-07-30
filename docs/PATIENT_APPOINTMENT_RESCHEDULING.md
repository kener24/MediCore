# Reprogramacion de citas del paciente

La ruta `POST /api/patient-portal/appointments/{id}/reschedule/` modifica la misma cita bajo una transaccion y bloqueo de base de datos.

Valida propiedad, clinica, estado activo, configuracion, modalidad, fecha futura y disponibilidad. Registra fecha y hora anteriores en auditoria, motivo, usuario, fecha de reprogramacion y una clave idempotente. Repetir la misma operacion no crea una segunda cita ni una segunda auditoria.

Solo pueden reprogramarse citas pendientes, confirmadas o ya reprogramadas. Las citas canceladas, atendidas, no asistidas o inactivas se rechazan de forma controlada.
