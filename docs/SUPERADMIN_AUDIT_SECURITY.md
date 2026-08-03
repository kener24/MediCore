# Auditoría y seguridad del superadministrador

`AuditLog` es append-only: su modelo rechaza `save()` sobre registros existentes y cualquier `delete()`.

Se auditan altas y cambios de clínicas, activación/suspensión, cambios de planes y suscripciones, consultas de estado, exportaciones y revocaciones de sesión. Los eventos guardan actor, rol, clínica afectada, acción, objeto, antes/después, motivo, resultado, IP, agente y fecha cuando están disponibles.

No se guardan contraseñas, tokens, cabeceras Authorization, secretos, credenciales SMTP/AWS ni contenido clínico detallado.

`AuditPermissionDeniedMiddleware` registra las respuestas 403 de usuarios autenticados con actor, rol, clínica, método y ruta. No conserva el cuerpo de la solicitud. Así quedan trazados tanto los intentos de otros roles contra el control SaaS como los intentos del superadministrador contra contenido clínico restringido.

El superadministrador puede ver sus propias sesiones y las de administradores de clínica. No recibe acceso arbitrario a sesiones de médicos, enfermería, recepción o pacientes. Revocar exige motivo y no expone tokens.

No existe impersonación en este sprint.
