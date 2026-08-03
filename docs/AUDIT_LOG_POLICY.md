# Política de auditoría append-only

AuditLog registra actor, rol, clínica, acción, recurso, resultado, severidad, IP protegida, user-agent, método, ruta, fecha y `request_id`. Los cambios guardan estructura mínima antes/después.

No se guardan contraseñas, access/refresh tokens, Authorization, claves, archivos ni texto clínico completo. Las claves sensibles se eliminan o enmascaran recursivamente.

La API es de solo lectura. `save`, `delete`, `QuerySet.update` y `QuerySet.delete` están bloqueados. El comando histórico de purga ahora solo informa candidatos y no elimina. La retención futura debe usar archivo externo aprobado sin alterar el original.
